"use strict";

import type { VercelRequest, VercelResponse } from "./_types";

const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw45APBuDOZrZY5P2EBQyR50HdXRSF6CrLNP01ipu0X11_u42IgnhxbuJdO_t-YS-e94Q/exec";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const url = new URL(GOOGLE_SHEETS_WEBAPP_URL);
      if (req.query) {
        for (const [key, val] of Object.entries(req.query)) {
          if (val !== undefined) {
            url.searchParams.set(key, Array.isArray(val) ? val[0] : String(val));
          }
        }
      }

      const gasRes = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      const text = await gasRes.text();
      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch {
        return res.status(200).json({ success: true, result: { operation: "acknowledged" }, raw: text.slice(0, 200) });
      }
    }

    if (req.method === "POST") {
      let bodyText = "";
      if (typeof req.body === "string") {
        bodyText = req.body;
      } else if (req.body && typeof req.body === "object") {
        bodyText = JSON.stringify(req.body);
      } else {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          if (chunks.length > 0) {
            bodyText = Buffer.concat(chunks).toString("utf8");
          }
        } catch {}
      }

      const url = new URL(GOOGLE_SHEETS_WEBAPP_URL);
      if (req.query) {
        for (const [key, val] of Object.entries(req.query)) {
          if (val !== undefined) {
            url.searchParams.set(key, Array.isArray(val) ? val[0] : String(val));
          }
        }
      }

      // Si el body contiene table o action, agregarlos también a la URL por seguridad
      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText);
          if (parsed && typeof parsed === "object") {
            if (parsed.table && !url.searchParams.has("table")) {
              url.searchParams.set("table", String(parsed.table));
            }
            if (parsed.action && !url.searchParams.has("action")) {
              url.searchParams.set("action", String(parsed.action));
            }
          }
        } catch {}
      }

      const gasRes = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: bodyText
      });

      const text = await gasRes.text();
      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch {
        return res.status(200).json({ success: true, result: { operation: "acknowledged" }, raw: text.slice(0, 200) });
      }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("[api/sheets] Proxy error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Error conectando con Google Sheets" });
  }
}
