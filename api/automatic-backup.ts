"use strict";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "./_types";
import {
  AUTOMATIC_BACKUP_COLLECTIONS,
  AUTOMATIC_BACKUP_SOURCE_TABLES,
  argentinaDateKey,
  buildAutomaticBackupSnapshot,
  expiredAutomaticBackupIds,
  type BackupTableRows,
} from "../src/lib/automaticBackup.js";

const RETENTION_DAYS = 30;
const MAX_BACKUP_BYTES = 25_000_000;
const PAGE_SIZE = 1_000;

const serviceClient = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase no está configurado para respaldos automáticos.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};

const header = (req: VercelRequest, name: string): string => {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
};

const readAllRows = async (client: SupabaseClient, table: string) => {
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const columns = table === "usuarios"
      ? "id_usuario,nombre,apellido,username,rol,activo,auth_user_id,mail"
      : "*";
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
    const page = (data ?? []) as unknown as Array<Record<string, unknown>>;
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
};

const collectRows = async (client: SupabaseClient): Promise<BackupTableRows> => {
  const entries = await Promise.all(AUTOMATIC_BACKUP_SOURCE_TABLES.map(async table => (
    [table, await readAllRows(client, table)] as const
  )));
  return Object.fromEntries(entries);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");

  return res.status(403).json({
    success: false,
    error: "Los respaldos automáticos se encuentran desactivados por configuración.",
  });
}
