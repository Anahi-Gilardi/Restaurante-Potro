"use strict";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "./_types";
import {
  ApiAccessError,
  applyApiSecurityHeaders,
  requestBodyIsTooLarge,
  requireAuthenticatedProfile,
} from "./_security.js";
import { analyzeDataIntegrity, type IntegrityDataSet } from "../src/lib/dataIntegrity.js";

const TABLES = [
  "mesas",
  "insumos",
  "productos_menu",
  "recetas_escandallo",
  "pedidos_cabecera",
  "pedido_detalle",
  "facturas",
  "pagos",
  "pagos_integridad_revision",
  "movimientos_inventario",
] as const;

const serviceClient = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiAccessError(503, "La auditoría de Supabase no está configurada.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};

const readDataSet = async (client: SupabaseClient): Promise<IntegrityDataSet> => {
  const usersPromise = client
    .from("usuarios")
    .select("id_usuario,nombre,apellido,username,rol,activo,mail,auth_user_id");
  const tablePromises = TABLES.map(async table => {
    const { data, error } = await client.from(table).select("*");
    if (error) {
      if (table === "pagos_integridad_revision" && ["42P01", "PGRST205"].includes(error.code ?? "")) {
        return [table, []] as const;
      }
      throw error;
    }
    return [table, data ?? []] as const;
  });
  const [{ data: usuarios, error: usersError }, ...entries] = await Promise.all([usersPromise, ...tablePromises]);
  if (usersError) throw usersError;
  return Object.assign({ usuarios: usuarios ?? [] }, Object.fromEntries(entries));
};

const safeCleanup = async (client: SupabaseClient) => {
  const data = await readDataSet(client);
  const products = (data.productos_menu ?? []) as Array<Record<string, any>>;
  const ingredients = new Set(((data.insumos ?? []) as Array<Record<string, any>>).map(row => String(row.id_insumo)));
  const productIds = new Set(products.map(row => String(row.id_producto)));
  const recipes = (data.recetas_escandallo ?? []) as Array<Record<string, any>>;
  const actions: Array<{ action: string; count: number; ids: string[] }> = [];

  const invalidRecipeIds = recipes
    .filter(row => (
      !productIds.has(String(row.id_producto))
      || !ingredients.has(String(row.id_insumo))
      || !Number.isFinite(Number(row.cantidad_a_descontar))
      || Number(row.cantidad_a_descontar) <= 0
    ))
    .map(row => String(row.id_receta));
  if (invalidRecipeIds.length > 0) {
    const { error } = await client.from("recetas_escandallo").delete().in("id_receta", invalidRecipeIds);
    if (error) throw error;
    actions.push({ action: "removed_invalid_recipes", count: invalidRecipeIds.length, ids: invalidRecipeIds.slice(0, 20) });
  }

  const recipeCounts = new Map<string, number>();
  recipes.forEach(row => recipeCounts.set(String(row.id_producto), (recipeCounts.get(String(row.id_producto)) ?? 0) + 1));
  const groups = new Map<string, Array<Record<string, any>>>();
  products.filter(row => row.activo !== false).forEach(row => {
    const key = `${String(row.nombre ?? "").trim().toLocaleLowerCase("es-AR")}|${Number(row.precio_venta)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  const duplicateProductsToDeactivate: string[] = [];
  groups.forEach(group => {
    if (group.length < 2) return;
    const canonical = [...group].sort((a, b) => (
      (recipeCounts.get(String(b.id_producto)) ?? 0) - (recipeCounts.get(String(a.id_producto)) ?? 0)
    ))[0];
    if ((recipeCounts.get(String(canonical.id_producto)) ?? 0) === 0) return;
    group.forEach(row => {
      if (row.id_producto !== canonical.id_producto && (recipeCounts.get(String(row.id_producto)) ?? 0) === 0) {
        duplicateProductsToDeactivate.push(String(row.id_producto));
      }
    });
  });
  if (duplicateProductsToDeactivate.length > 0) {
    const { error } = await client
      .from("productos_menu")
      .update({ activo: false })
      .in("id_producto", duplicateProductsToDeactivate);
    if (error) throw error;
    actions.push({ action: "deactivated_duplicate_products", count: duplicateProductsToDeactivate.length, ids: duplicateProductsToDeactivate });
  }

  if (actions.length > 0) {
    await client.from("auditoria_eventos").insert({
      id: `integrity_${Date.now()}`,
      tipo: "sistema",
      mensaje: `Integridad Supabase: limpieza segura aplicada (${actions.map(item => `${item.action}:${item.count}`).join(", ")}).`,
      timestamp: new Date().toISOString(),
    });
  }

  return { actions, report: analyzeDataIntegrity(await readDataSet(client)) };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyApiSecurityHeaders(req, res, ["GET", "POST"])) {
    return res.status(403).json({ success: false, error: "Origen no autorizado." });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method ?? '')) {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).end();
  }
  if (requestBodyIsTooLarge(req, 8_192)) {
    return res.status(413).json({ success: false, error: "Solicitud demasiado grande." });
  }

  try {
    await requireAuthenticatedProfile(req, ["superadmin", "administrador"]);
    const client = serviceClient();
    if (req.method === "GET") {
      return res.status(200).json({ success: true, report: analyzeDataIntegrity(await readDataSet(client)) });
    }
    if (req.body?.action === "merge_duplicate_ingredients") {
      const canonicalId = String(req.body?.canonicalId ?? "").trim();
      const duplicateIds = Array.isArray(req.body?.duplicateIds)
        ? req.body.duplicateIds.map((value: unknown) => String(value ?? "").trim()).filter(Boolean)
        : [];
      const finalStock = Number(req.body?.finalStock);
      if (!canonicalId || canonicalId.length > 120 || duplicateIds.length < 1 || duplicateIds.length > 20
          || duplicateIds.some((id: string) => id.length > 120) || !Number.isFinite(finalStock) || finalStock < 0) {
        return res.status(400).json({ success: false, error: "Los datos de fusión son inválidos." });
      }
      const { data: merge, error: mergeError } = await client.rpc("merge_duplicate_ingredients", {
        p_canonical_id: canonicalId,
        p_duplicate_ids: duplicateIds,
        p_final_stock: finalStock,
      });
      if (mergeError) {
        const safeMessages = [
          "Debe elegir un insumo principal",
          "El stock fisico final es invalido",
          "El insumo principal no puede estar entre los duplicados",
          "La lista de duplicados contiene identificadores repetidos",
          "El insumo principal no existe",
          "Los registros elegidos no representan el mismo insumo",
          "No se pudieron retirar todos los duplicados",
        ];
        const safeMessage = safeMessages.find(message => mergeError.message?.startsWith(message));
        throw new ApiAccessError(409, safeMessage ?? "No se pudo completar la fusión de insumos.");
      }
      return res.status(200).json({
        success: true,
        merge,
        report: analyzeDataIntegrity(await readDataSet(client)),
      });
    }
    if (req.body?.action !== "cleanup_safe") {
      return res.status(400).json({ success: false, error: "Acción no reconocida." });
    }
    const result = await safeCleanup(client);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ApiAccessError) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error("[data-integrity]", error);
    return res.status(500).json({ success: false, error: "No se pudo completar la auditoría de integridad." });
  }
}
