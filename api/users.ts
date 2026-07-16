"use strict";

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "./_types";
import {
  ApiAccessError,
  applyApiSecurityHeaders,
  requestBodyIsTooLarge,
  requireAuthenticatedProfile,
} from "./_security.js";

const ROLES = new Set(["mozo", "cocina", "administrador", "superadmin"]);
const USERNAME_PATTERN = /^[a-z0-9._-]{3,40}$/;
const SAFE_PROFILE_COLUMNS = "id_usuario,nombre,apellido,username,rol,activo,auth_user_id,mail";

const serviceClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiAccessError(503, "La administración de usuarios no está configurada.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};

const cleanText = (value: unknown, maximum: number): string => String(value ?? "").trim().slice(0, maximum);
const cleanUsername = (value: unknown): string => cleanText(value, 40).toLowerCase();
const cleanPassword = (value: unknown): string => String(value ?? "");

const assertPassword = (password: string) => {
  if (password.length < 4 || password.length > 128) {
    throw new ApiAccessError(403, "La contraseña debe tener entre 4 y 128 caracteres.");
  }
};

const canManageRole = (actorRole: string, targetRole: string): boolean => (
  actorRole === "superadmin" || !["superadmin", "administrador"].includes(targetRole)
);

const internalEmail = (username: string): string => `${username}@usuarios.elpatron.internal`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyApiSecurityHeaders(req, res, ["POST"])) {
    return res.status(403).json({ success: false, error: "Origen no autorizado." });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).end();
  }
  if (requestBodyIsTooLarge(req, 16_384)) {
    return res.status(413).json({ success: false, error: "Solicitud demasiado grande." });
  }

  try {
    const actor = await requireAuthenticatedProfile(req, ["superadmin", "administrador"]);
    const admin = serviceClient();
    const action = cleanText(req.body?.action, 40);

    if (action === "create") {
      const username = cleanUsername(req.body?.username);
      const password = cleanPassword(req.body?.password);
      const nombre = cleanText(req.body?.nombre, 80);
      const apellido = cleanText(req.body?.apellido, 80);
      const rol = cleanText(req.body?.rol, 30);
      if (!USERNAME_PATTERN.test(username)) throw new ApiAccessError(403, "El usuario debe tener entre 3 y 40 caracteres válidos.");
      assertPassword(password);
      if (nombre.length < 2 || !ROLES.has(rol)) throw new ApiAccessError(403, "Los datos del usuario son inválidos.");
      if (!canManageRole(actor.profile.rol, rol)) throw new ApiAccessError(403, "No puede crear un usuario con ese rol.");

      const { data: existingCredential } = await admin
        .from("app_login_credentials")
        .select("profile_id")
        .eq("username", username)
        .maybeSingle();
      if (existingCredential) return res.status(409).json({ success: false, error: "Ese nombre de usuario ya existe." });

      const { data: highestProfile, error: highestError } = await admin
        .from("usuarios")
        .select("id_usuario")
        .order("id_usuario", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (highestError) throw highestError;
      const profileId = Number(highestProfile?.id_usuario ?? 0) + 1;
      const email = internalEmail(username);
      const authPassword = randomBytes(32).toString("base64url");
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password: authPassword,
        email_confirm: true,
        user_metadata: { app_username: username, display_name: `${nombre} ${apellido}`.trim() },
      });
      if (authError || !authData.user) {
        if (/already|registered|exists/i.test(authError?.message ?? "")) {
          return res.status(409).json({ success: false, error: "Ese nombre de usuario ya existe." });
        }
        throw authError ?? new Error("No se pudo crear la identidad de acceso.");
      }

      try {
        const { error: profileError } = await admin.from("usuarios").insert({
          id_usuario: profileId,
          nombre,
          apellido,
          username,
          password: "",
          pin: null,
          contrasena: null,
          rol,
          activo: true,
          auth_user_id: authData.user.id,
          mail: email,
        });
        if (profileError) throw profileError;
        const { error: credentialError } = await admin.rpc("provision_app_username_login", {
          p_profile_id: profileId,
          p_username: username,
          p_password: password,
          p_auth_user_id: authData.user.id,
          p_auth_email: email,
        });
        if (credentialError) throw credentialError;
      } catch (error) {
        await admin.from("usuarios").delete().eq("id_usuario", profileId);
        await admin.auth.admin.deleteUser(authData.user.id);
        throw error;
      }

      const { data: profile, error: readError } = await admin
        .from("usuarios")
        .select(SAFE_PROFILE_COLUMNS)
        .eq("id_usuario", profileId)
        .single();
      if (readError) throw readError;
      return res.status(201).json({ success: true, user: { ...profile, password: "" } });
    }

    const targetId = Number(req.body?.idUsuario);
    if (!Number.isInteger(targetId) || targetId < 1) throw new ApiAccessError(403, "Usuario inválido.");
    const { data: target, error: targetError } = await admin
      .from("usuarios")
      .select(SAFE_PROFILE_COLUMNS)
      .eq("id_usuario", targetId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return res.status(404).json({ success: false, error: "Usuario no encontrado." });
    if (!canManageRole(actor.profile.rol, String(target.rol))) {
      throw new ApiAccessError(403, "No puede administrar ese usuario.");
    }

    if (action === "changePassword") {
      const password = cleanPassword(req.body?.password);
      assertPassword(password);
      const { data: storedCredential, error: credentialReadError } = await admin
        .from("app_login_credentials")
        .select("username,auth_user_id,auth_email")
        .eq("profile_id", targetId)
        .maybeSingle();
      if (credentialReadError) throw credentialReadError;
      let credential = storedCredential;
      let newlyCreatedAuthUserId: string | null = null;
      if (!credential) {
        const currentUsername = String(target.username ?? "").trim().toLowerCase();
        const baseUsername = currentUsername.includes("@")
          ? currentUsername.split("@")[0].replace(/[^a-z0-9._-]/g, "_")
          : currentUsername.replace(/[^a-z0-9._-]/g, "_");
        let username = USERNAME_PATTERN.test(baseUsername) ? baseUsername : `usuario_${targetId}`;
        const { data: collision } = await admin
          .from("app_login_credentials")
          .select("profile_id")
          .eq("username", username)
          .maybeSingle();
        if (collision && Number(collision.profile_id) !== targetId) username = `${username}_${targetId}`;
        const email = internalEmail(username);
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email,
          password: randomBytes(32).toString("base64url"),
          email_confirm: true,
          user_metadata: { app_username: username, display_name: `${target.nombre} ${target.apellido}`.trim() },
        });
        if (authError || !authData.user) throw authError ?? new Error("No se pudo crear la identidad de acceso.");
        newlyCreatedAuthUserId = authData.user.id;
        credential = { username, auth_user_id: authData.user.id, auth_email: email };
      }
      const wasActive = target.activo !== false;
      const { error } = await admin.rpc("provision_app_username_login", {
        p_profile_id: targetId,
        p_username: credential.username,
        p_password: password,
        p_auth_user_id: credential.auth_user_id,
        p_auth_email: credential.auth_email,
      });
      if (error) {
        if (newlyCreatedAuthUserId) await admin.auth.admin.deleteUser(newlyCreatedAuthUserId);
        throw error;
      }
      if (!wasActive) await admin.from("usuarios").update({ activo: false }).eq("id_usuario", targetId);
      const { data: updated, error: updatedError } = await admin
        .from("usuarios")
        .select(SAFE_PROFILE_COLUMNS)
        .eq("id_usuario", targetId)
        .single();
      if (updatedError) throw updatedError;
      return res.status(200).json({ success: true, user: { ...updated, password: "" } });
    }

    if (action === "update") {
      const nombre = cleanText(req.body?.nombre, 80);
      const apellido = cleanText(req.body?.apellido, 80);
      const rol = cleanText(req.body?.rol, 30);
      if (nombre.length < 2 || !ROLES.has(rol)) throw new ApiAccessError(403, "Los datos del usuario son inválidos.");
      if (!canManageRole(actor.profile.rol, rol)) throw new ApiAccessError(403, "No puede asignar ese rol.");
      const { data: updated, error } = await admin
        .from("usuarios")
        .update({ nombre, apellido, rol, password: "", pin: null, contrasena: null })
        .eq("id_usuario", targetId)
        .select(SAFE_PROFILE_COLUMNS)
        .single();
      if (error) throw error;
      return res.status(200).json({ success: true, user: { ...updated, password: "" } });
    }

    if (action === "setActive") {
      if (targetId === actor.profile.id_usuario && req.body?.activo === false) {
        throw new ApiAccessError(403, "No puede desactivar su propia sesión.");
      }
      const activo = req.body?.activo === true;
      const { data: updated, error } = await admin
        .from("usuarios")
        .update({ activo })
        .eq("id_usuario", targetId)
        .select(SAFE_PROFILE_COLUMNS)
        .single();
      if (error) throw error;
      return res.status(200).json({ success: true, user: { ...updated, password: "" } });
    }

    if (action === "delete") {
      if (targetId === actor.profile.id_usuario) throw new ApiAccessError(403, "No puede eliminar su propia cuenta.");
      if (["superadmin", "administrador"].includes(String(target.rol))) {
        const { count, error: countError } = await admin
          .from("usuarios")
          .select("id_usuario", { count: "exact", head: true })
          .in("rol", ["superadmin", "administrador"])
          .eq("activo", true);
        if (countError) throw countError;
        if ((count ?? 0) <= 1) throw new ApiAccessError(403, "No se puede eliminar el último administrador activo.");
      }
      if (target.auth_user_id) {
        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(String(target.auth_user_id));
        if (deleteAuthError) throw deleteAuthError;
      }
      const { error } = await admin.from("usuarios").delete().eq("id_usuario", targetId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: "Acción no reconocida." });
  } catch (error) {
    if (error instanceof ApiAccessError) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error("[users]", error);
    return res.status(500).json({ success: false, error: "No se pudo completar la administración del usuario." });
  }
}
