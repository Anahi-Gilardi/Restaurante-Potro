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

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || header(req, "authorization") !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, error: "No autorizado." });
  }

  try {
    const client = serviceClient();
    const now = new Date();
    const dateKey = argentinaDateKey(now);
    const snapshot = buildAutomaticBackupSnapshot(await collectRows(client));
    const serialized = JSON.stringify(snapshot);
    const sizeBytes = Buffer.byteLength(serialized, "utf8");
    if (sizeBytes > MAX_BACKUP_BYTES) {
      throw new Error("El respaldo excede el límite operativo de 25 MB.");
    }

    const idBackup = `auto_${dateKey}`;
    const { error: backupError } = await client.from("backups").upsert({
      id_backup: idBackup,
      nombre_archivo: `Backup automático ${dateKey}`,
      fecha: now.toISOString(),
      tamano: `${(sizeBytes / 1024).toFixed(1)} KB`,
      tablas: AUTOMATIC_BACKUP_COLLECTIONS.join(", "),
      contenido: serialized,
    });
    if (backupError) throw backupError;

    const { data: automaticRows, error: retentionReadError } = await client
      .from("backups")
      .select("id_backup,fecha")
      .like("id_backup", "auto_%")
      .order("fecha", { ascending: false })
      .limit(1_000);
    if (retentionReadError) throw retentionReadError;
    const expiredIds = expiredAutomaticBackupIds(automaticRows ?? [], RETENTION_DAYS);
    if (expiredIds.length > 0) {
      const { error: deleteError } = await client.from("backups").delete().in("id_backup", expiredIds);
      if (deleteError) throw deleteError;
    }

    await client.from("auditoria_eventos").upsert({
      id: `auto_backup_${dateKey}`,
      tipo: "sistema",
      mensaje: `BACKUP: copia automática diaria guardada (${AUTOMATIC_BACKUP_COLLECTIONS.length} colecciones, ${(sizeBytes / 1024).toFixed(1)} KB).`,
      timestamp: now.toISOString(),
    });

    return res.status(200).json({
      success: true,
      idBackup,
      collections: AUTOMATIC_BACKUP_COLLECTIONS.length,
      sizeBytes,
      expiredRemoved: expiredIds.length,
    });
  } catch (error) {
    console.error("[automatic-backup]", error);
    return res.status(500).json({ success: false, error: "No se pudo completar el respaldo automático." });
  }
}
