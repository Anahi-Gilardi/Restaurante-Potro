import { AfipConfig, WsaaCredentials, AFIP_ENDPOINTS } from './types';

const TA_CACHE_KEY = 'afip_ta_cache';
const TA_CACHE_DURATION_MS = 11 * 60 * 60 * 1000; // 11 horas (token dura 12)

function getTaCache(): { ta: string; expiresAt: number } | null {
  try {
    const raw = localStorage.getItem(TA_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(TA_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}

function setTaCache(ta: string) {
  try {
    localStorage.setItem(TA_CACHE_KEY, JSON.stringify({ ta, expiresAt: Date.now() + TA_CACHE_DURATION_MS }));
  } catch { /* noop */ }
}

/** Genera el CMS (Ticket de Requerimiento) firmado con el certificado */
function buildTicketReq(service: string, cuit: number, cert: string): string {
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const genTime = new Date().toISOString().replace(/[:\-]/g, '').slice(0, 14);
  const expTime = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().replace(/[:\-]/g, '').slice(0, 14);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genTime}</generationTime>
    <expirationTime>${expTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;

  // En Vercel no tenemos acceso a crypto.sign con certificados X.509 fácilmente.
  // La firma CMS debe hacerse del lado del servidor.
  // Este wrapper delega a una API serverless (Vercel Function) que tiene acceso a los certs.
  return btoa(xml);
}

/** Parsea el TA (XML de respuesta del WSAA) */
function parseTaResponse(xml: string, cuit: number): WsaaCredentials {
  const token = xml.match(/<token>([^<]+)<\/token>/)?.[1] || '';
  const sign = xml.match(/<sign>([^<]+)<\/sign>/)?.[1] || '';
  const expiresAt = new Date();

  const expStr = xml.match(/<expirationTime>([^<]+)<\/expirationTime>/)?.[1];
  if (expStr) {
    const y = expStr.slice(0, 4);
    const M = expStr.slice(4, 6);
    const d = expStr.slice(6, 8);
    const h = expStr.slice(8, 10);
    const m = expStr.slice(10, 12);
    const s = expStr.slice(12, 14);
    expiresAt.setFullYear(+y, +M - 1, +d);
    expiresAt.setHours(+h, +m, +s, 0);
  }

  return { token, sign, expiresAt, cuit };
}

/** Obtiene un TA válido (desde cache o renovándolo) */
export async function getAccessToken(config: AfipConfig, service = 'wsfe'): Promise<WsaaCredentials> {
  const cached = getTaCache();
  if (cached) {
    const ta = parseTaResponse(atob(cached.ta), config.cuit);
    if (ta.token) return ta;
  }

  const ticketReq = buildTicketReq(service, config.cuit, config.certBase64);

  // La firma CMS debe hacerse server-side con la clave privada.
  // En Vercel, esto se ejecuta en una Serverless Function con crypto de Node.js.
  const payload = { service, ticketReq, cuit: config.cuit, cert: config.certBase64, key: config.keyBase64 };

  const res = await fetch('/api/afip/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`WSAA error: ${res.status} ${await res.text()}`);

  const taXml = await res.text();
  setTaCache(btoa(taXml));
  return parseTaResponse(taXml, config.cuit);
}
