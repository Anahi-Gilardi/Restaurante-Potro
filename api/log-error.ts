"use strict";

import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "./_types";
import {
  ApiAccessError,
  applyApiSecurityHeaders,
  requestBodyIsTooLarge,
  requireAuthenticatedProfile,
} from "./_security.js";

const cleanText = (value: unknown, maximum: number): string => (
  String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maximum)
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyApiSecurityHeaders(req, res, ["POST"])) {
    return res.status(403).json({ success: false, error: "Origen no autorizado." });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).end();
  }
  if (requestBodyIsTooLarge(req, 4_096)) {
    return res.status(413).json({ success: false, error: "Solicitud demasiado grande." });
  }

  try {
    const actor = await requireAuthenticatedProfile(
      req,
      ["superadmin", "administrador", "mozo", "cocina"],
    );
    const moduleName = cleanText(req.body?.module, 80) || "aplicacion";
    const message = cleanText(req.body?.message, 500);
    if (!message) {
      return res.status(400).json({ success: false, error: "El mensaje de error es obligatorio." });
    }

    const { error } = await actor.client.from("auditoria_eventos").insert({
      id: `client_error_${Date.now()}_${randomUUID()}`,
      tipo: "sistema",
      mensaje: `[CLIENT ERROR][${moduleName}] ${message}`,
      timestamp: new Date().toISOString(),
    });
    if (error) throw error;
    return res.status(204).end();
  } catch (error) {
    if (error instanceof ApiAccessError) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error("[log-error]", error);
    return res.status(500).json({ success: false, error: "No se pudo registrar el error." });
  }
}
