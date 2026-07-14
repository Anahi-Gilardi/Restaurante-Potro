"use strict";

import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "./_types";

const TRUSTED_ORIGINS = new Set([
  "https://restaurante-potro.vercel.app",
  "https://restaurante-potro-anahi.vercel.app",
  ...(process.env.APP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean),
]);

const readHeader = (req: VercelRequest, name: string): string => {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
};

const applyCors = (req: VercelRequest, res: VercelResponse): boolean => {
  const origin = readHeader(req, "origin");
  if (!origin) return true;
  if (!TRUSTED_ORIGINS.has(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
  return true;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (!applyCors(req, res)) {
    return res.status(403).json({ success: false, error: "Origen no autorizado." });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).end();
  }

  const contentLength = Number(readHeader(req, "content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 8_192) {
    return res.status(413).json({ success: false, error: "Solicitud demasiado grande." });
  }

  const username = String(req.body?.username ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || password.length < 4 || password.length > 128) {
    return res.status(401).json({ success: false, error: "Usuario o contraseña incorrectos." });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ success: false, error: "El acceso interno no está configurado." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("verify_app_username_login", {
    p_username: username,
    p_password: password,
  });
  const credential = Array.isArray(data) ? data[0] : null;
  if (error || !credential?.auth_email || !credential?.auth_user_id) {
    return res.status(401).json({ success: false, error: "Usuario o contraseña incorrectos." });
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: credential.auth_email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash || linkData.user?.id !== credential.auth_user_id) {
    return res.status(503).json({ success: false, error: "No se pudo iniciar una sesión segura." });
  }

  return res.status(200).json({ success: true, tokenHash, verificationType: "magiclink" });
}
