"use strict";

import forge from "node-forge";
import https from "node:https";
import { createClient } from "@supabase/supabase-js";

interface VercelRequest {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): unknown;
  setHeader(name: string, value: string): void;
  end(): unknown;
}

const URLS = {
  homologacion: {
    wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  },
  produccion: {
    wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  },
} as const;

type EnvironmentName = keyof typeof URLS;

interface ServerCredentials {
  cuit: number;
  key: string;
  cert: string;
  environment: EnvironmentName;
  puntoVenta: number;
}

interface CachedAccessTicket {
  token: string;
  sign: string;
  expiresAt: number;
}

interface InvoicePayload {
  tipoComprobante?: number;
  puntoVenta?: number;
  cliente?: {
    tipoDoc?: number;
    nroDoc?: number;
    nombre?: string;
    condicionIva?: number;
  };
  total: number;
  neto?: number;
  ivaTotal?: number;
}

const globalCache = globalThis as typeof globalThis & {
  __elPatronArcaTa?: Record<string, CachedAccessTicket>;
};
const taCache = globalCache.__elPatronArcaTa ??= {};

const envValue = (...names: string[]): string => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
};

const decodePem = (plainNames: string[], base64Names: string[]): string => {
  const plain = envValue(...plainNames);
  if (plain) return plain.replace(/\\n/g, "\n");
  const encoded = envValue(...base64Names);
  if (!encoded) return "";
  return Buffer.from(encoded, "base64").toString("utf8").replace(/\\n/g, "\n");
};

const positiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

function getServerCredentials(): ServerCredentials | null {
  const cuitText = envValue("ARCA_CUIT", "AFIP_CUIT").replace(/\D/g, "");
  const key = decodePem(["ARCA_KEY"], ["ARCA_KEY_BASE64", "AFIP_KEY_BASE64"]);
  const cert = decodePem(["ARCA_CERT"], ["ARCA_CERT_BASE64", "AFIP_CERT_BASE64"]);
  if (!/^\d{11}$/.test(cuitText) || !key || !cert) return null;

  const environmentText = envValue("ARCA_ENV", "AFIP_ENV").toLowerCase();
  const production = envValue("ARCA_PRODUCTION").toLowerCase() === "true"
    || environmentText === "produccion"
    || environmentText === "production";

  return {
    cuit: Number(cuitText),
    key,
    cert,
    environment: production ? "produccion" : "homologacion",
    puntoVenta: positiveInteger(envValue("ARCA_PUNTO_VENTA"), 1),
  };
}

const publicStatus = (credentials: ServerCredentials | null) => ({
  configured: Boolean(credentials),
  connected: false,
  environment: credentials?.environment ?? null,
  puntoVenta: credentials?.puntoVenta ?? null,
  cuitMasked: credentials ? `*******${String(credentials.cuit).slice(-4)}` : null,
  message: credentials
    ? "Credenciales fiscales configuradas en el servidor."
    : "Faltan ARCA_CUIT, ARCA_CERT/ARCA_CERT_BASE64 y ARCA_KEY/ARCA_KEY_BASE64 en Vercel.",
});

async function hasAuthenticatedUser(req: VercelRequest): Promise<boolean> {
  const rawAuthorization = req.headers?.authorization;
  const authorization = Array.isArray(rawAuthorization) ? rawAuthorization[0] : rawAuthorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = envValue("SUPABASE_URL", "VITE_SUPABASE_URL");
  const supabaseKey = envValue(
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
  );
  if (!token || !supabaseUrl || !supabaseKey) return false;
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(token);
  return !error && Boolean(data.user);
}

function sanitizePem(pem: string, defaultType: "CERTIFICATE" | "PRIVATE KEY"): string {
  let cleaned = pem.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let type: string = defaultType;
  if (cleaned.includes("RSA PRIVATE KEY")) type = "RSA PRIVATE KEY";
  else if (cleaned.includes("PRIVATE KEY")) type = "PRIVATE KEY";
  else if (cleaned.includes("CERTIFICATE")) type = "CERTIFICATE";

  const begin = `-----BEGIN ${type}-----`;
  const end = `-----END ${type}-----`;
  if (!cleaned.includes(begin)) cleaned = `${begin}\n${cleaned}`;
  if (!cleaned.includes(end)) cleaned = `${cleaned.replace(/---+[^-]*$/, "").trim()}\n${end}`;
  return cleaned;
}

function buildLoginTicketRequest(service = "wsfe"): string {
  const generationTime = new Date(Date.now() - 2 * 60 * 1000).toISOString().split(".")[0] + "Z";
  const expirationTime = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString().split(".")[0] + "Z";
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Date.now()}</uniqueId>
    <generationTime>${generationTime}</generationTime>
    <expirationTime>${expirationTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

function signLoginTicket(xml: string, cert: string, key: string): string {
  const certPem = sanitizePem(cert, "CERTIFICATE");
  const keyPem = sanitizePem(key, "PRIVATE KEY");
  const forgeCert = forge.pki.certificateFromPem(certPem);
  const forgeKey = forge.pki.privateKeyFromPem(keyPem);
  const signedData = forge.pkcs7.createSignedData();
  signedData.content = forge.util.createBuffer(xml, "utf8");
  signedData.addCertificate(forgeCert);
  signedData.addSigner({
    key: forgeKey,
    certificate: forgeCert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime },
    ],
  });
  signedData.sign();
  return forge.util.encode64(forge.asn1.toDer(signedData.toAsn1()).getBytes());
}

function requestSoap(
  url: string,
  soapAction: string,
  body: string,
  timeoutMs = 25_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = https.request({
      method: "POST",
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        SOAPAction: soapAction,
      },
      ciphers: "DEFAULT:@SECLEVEL=1",
      timeout: timeoutMs,
    }, response => {
      let data = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { data += chunk; });
      response.on("end", () => {
        const status = response.statusCode ?? 500;
        if (status < 200 || status >= 300) {
          reject(new Error(`ARCA respondio HTTP ${status}.`));
          return;
        }
        resolve(data);
      });
    });
    request.on("timeout", () => request.destroy(new Error("ARCA tardo demasiado en responder.")));
    request.on("error", reject);
    request.end(body);
  });
}

const decodeXmlEntities = (value: string): string => value
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, "&");

const xmlTag = (xml: string, tag: string): string => {
  const match = xml.match(new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
};

function soapFault(xml: string): string | null {
  const message = xmlTag(xml, "faultstring") || xmlTag(xml, "Message");
  return /<(?:[\w-]+:)?Fault(?:\s|>)/i.test(xml) ? (decodeXmlEntities(message) || "ARCA rechazo la solicitud SOAP.") : null;
}

async function getAccessTicket(credentials: ServerCredentials): Promise<CachedAccessTicket> {
  const cacheKey = `${credentials.environment}:${credentials.cuit}`;
  const cached = taCache[cacheKey];
  if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) return cached;

  const cms = signLoginTicket(buildLoginTicketRequest(), credentials.cert, credentials.key);
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov.ar">
  <soap:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soap:Body>
</soap:Envelope>`;
  const response = await requestSoap(URLS[credentials.environment].wsaa, "", soap);
  const fault = soapFault(response);
  if (fault) throw new Error(fault);
  const decoded = decodeXmlEntities(response);
  const token = xmlTag(decoded, "token");
  const sign = xmlTag(decoded, "sign");
  const parsedExpiry = Date.parse(xmlTag(decoded, "expirationTime"));
  if (!token || !sign) throw new Error("WSAA no devolvio un Token de Acceso valido.");

  const accessTicket = {
    token,
    sign,
    expiresAt: Number.isFinite(parsedExpiry) ? parsedExpiry : Date.now() + 10 * 60 * 60 * 1000,
  };
  taCache[cacheKey] = accessTicket;
  return accessTicket;
}

const authXml = (credentials: ServerCredentials, auth: CachedAccessTicket) => `
      <fe:Auth>
        <fe:Token>${auth.token}</fe:Token>
        <fe:Sign>${auth.sign}</fe:Sign>
        <fe:Cuit>${credentials.cuit}</fe:Cuit>
      </fe:Auth>`;

async function getLastAuthorized(
  credentials: ServerCredentials,
  auth: CachedAccessTicket,
  pointOfSale: number,
  voucherType: number,
): Promise<number> {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fe="http://ar.gov.afip.dif.FEV1/">
  <soap:Body><fe:FECompUltimoAutorizado>${authXml(credentials, auth)}
    <fe:PtoVta>${pointOfSale}</fe:PtoVta><fe:CbteTipo>${voucherType}</fe:CbteTipo>
  </fe:FECompUltimoAutorizado></soap:Body>
</soap:Envelope>`;
  const response = await requestSoap(
    URLS[credentials.environment].wsfe,
    "http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado",
    soap,
  );
  const fault = soapFault(response);
  if (fault) throw new Error(fault);
  const number = Number(xmlTag(response, "CbteNro"));
  if (!Number.isInteger(number) || number < 0) throw new Error("ARCA no devolvio el ultimo comprobante autorizado.");
  return number;
}

const roundMoney = (value: number): number => Number(value.toFixed(2));

function validateInvoicePayload(payload: InvoicePayload | undefined) {
  if (!payload) throw new Error("Payload de factura faltante.");
  const total = Number(payload.total);
  const voucherType = positiveInteger(payload.tipoComprobante, 6);
  const allowedVoucherTypes = new Set([1, 6, 11, 201, 206]);
  if (!Number.isFinite(total) || total <= 0) throw new Error("El total de la factura debe ser mayor que cero.");
  if (!allowedVoucherTypes.has(voucherType)) throw new Error("Tipo de comprobante ARCA no soportado.");

  const pointOfSale = positiveInteger(payload.puntoVenta, 0);
  const documentType = Number(payload.cliente?.tipoDoc ?? 99);
  const documentNumber = Number(payload.cliente?.nroDoc ?? 0);
  const vatCondition = positiveInteger(payload.cliente?.condicionIva, 5);
  if (!Number.isInteger(documentType) || ![80, 96, 99].includes(documentType)) throw new Error("Tipo de documento receptor invalido.");
  if (!Number.isInteger(documentNumber) || documentNumber < 0) throw new Error("Numero de documento receptor invalido.");

  const isFacturaC = voucherType === 11;
  const net = isFacturaC ? roundMoney(total) : roundMoney(Number(payload.neto) || total / 1.21);
  const vat = isFacturaC ? 0 : roundMoney(Number(payload.ivaTotal) || total - net);
  if (Math.abs(roundMoney(net + vat) - roundMoney(total)) > 0.02) {
    throw new Error("El neto mas IVA no coincide con el total.");
  }
  return { total: roundMoney(total), voucherType, pointOfSale, documentType, documentNumber, vatCondition, net, vat, isFacturaC };
}

function arcaDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return `${value("year")}${value("month")}${value("day")}`;
}

function collectArcaMessages(xml: string): Array<{ code: number; msg: string }> {
  const messages: Array<{ code: number; msg: string }> = [];
  const blocks = xml.match(/<(?:[\w-]+:)?(?:Obs|Err)>[\s\S]*?<\/(?:[\w-]+:)?(?:Obs|Err)>/gi) ?? [];
  for (const block of blocks) {
    const code = Number(xmlTag(block, "Code"));
    const msg = decodeXmlEntities(xmlTag(block, "Msg"));
    if (code || msg) messages.push({ code, msg });
  }
  return messages;
}

async function createInvoice(credentials: ServerCredentials, auth: CachedAccessTicket, payload: InvoicePayload) {
  const invoice = validateInvoicePayload(payload);
  if (invoice.pointOfSale && invoice.pointOfSale !== credentials.puntoVenta) {
    throw new Error("El punto de venta solicitado no coincide con el configurado en el servidor.");
  }
  const pointOfSale = credentials.puntoVenta;
  const voucherNumber = await getLastAuthorized(credentials, auth, pointOfSale, invoice.voucherType) + 1;
  const vatBlock = invoice.isFacturaC ? "" : `
          <fe:Iva><fe:AlicIva><fe:Id>5</fe:Id><fe:BaseImp>${invoice.net.toFixed(2)}</fe:BaseImp><fe:Importe>${invoice.vat.toFixed(2)}</fe:Importe></fe:AlicIva></fe:Iva>`;
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fe="http://ar.gov.afip.dif.FEV1/">
  <soap:Body><fe:FECAESolicitar>${authXml(credentials, auth)}
    <fe:FeCAEReq><fe:FeCabReq><fe:CantReg>1</fe:CantReg><fe:PtoVta>${pointOfSale}</fe:PtoVta><fe:CbteTipo>${invoice.voucherType}</fe:CbteTipo></fe:FeCabReq>
      <fe:FeDetReq><fe:FECAEDetRequest>
        <fe:Concepto>1</fe:Concepto><fe:DocTipo>${invoice.documentType}</fe:DocTipo><fe:DocNro>${invoice.documentNumber}</fe:DocNro>
        <fe:CbteDesde>${voucherNumber}</fe:CbteDesde><fe:CbteHasta>${voucherNumber}</fe:CbteHasta><fe:CbteFch>${arcaDate()}</fe:CbteFch>
        <fe:CondicionIVAReceptorId>${invoice.vatCondition}</fe:CondicionIVAReceptorId>
        <fe:ImpTotal>${invoice.total.toFixed(2)}</fe:ImpTotal><fe:ImpTotConc>0.00</fe:ImpTotConc><fe:ImpNeto>${invoice.net.toFixed(2)}</fe:ImpNeto>
        <fe:ImpOpEx>0.00</fe:ImpOpEx><fe:ImpTrib>0.00</fe:ImpTrib><fe:ImpIVA>${invoice.vat.toFixed(2)}</fe:ImpIVA>
        <fe:MonId>PES</fe:MonId><fe:MonCotiz>1</fe:MonCotiz>${vatBlock}
      </fe:FECAEDetRequest></fe:FeDetReq>
    </fe:FeCAEReq>
  </fe:FECAESolicitar></soap:Body>
</soap:Envelope>`;
  const response = await requestSoap(
    URLS[credentials.environment].wsfe,
    "http://ar.gov.afip.dif.FEV1/FECAESolicitar",
    soap,
  );
  const fault = soapFault(response);
  if (fault) throw new Error(fault);

  const result = xmlTag(response, "Resultado");
  const cae = xmlTag(response, "CAE");
  const expiry = xmlTag(response, "CAEFchVto");
  const observations = collectArcaMessages(response);
  if (result !== "A" || !cae) {
    return {
      success: false,
      resultado: result || "R",
      observaciones: observations,
      error: `ARCA rechazo la solicitud: ${observations.map(item => `[${item.code}] ${item.msg}`).join("; ") || "sin detalle"}`,
    };
  }

  const qrData = JSON.stringify({
    ver: 1,
    fecha: `${arcaDate().slice(0, 4)}-${arcaDate().slice(4, 6)}-${arcaDate().slice(6, 8)}`,
    cuit: credentials.cuit,
    ptoVta: pointOfSale,
    tipoCmp: invoice.voucherType,
    nroCmp: voucherNumber,
    importe: invoice.total,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: invoice.documentType,
    nroDocRec: invoice.documentNumber,
    tipoCodAut: 1,
    codAut: Number(cae),
  });
  return {
    success: true,
    resultado: result,
    cae,
    vencimiento: expiry,
    CodAutorizacion: cae,
    CAE: cae,
    Vencimiento: expiry,
    CAEFchVto: expiry,
    nroCmp: voucherNumber,
    puntoVenta: pointOfSale,
    tipoComprobante: invoice.voucherType,
    qrData,
    observaciones: observations,
  };
}

const safeErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (/alreadyAuthenticated/i.test(message)) {
    return "ARCA ya tiene un Token de Acceso activo. Espere unos minutos y vuelva a probar.";
  }
  if (/timeout|timed out|tardo demasiado|ECONN|ENOTFOUND|fetch failed/i.test(message)) {
    return "No se pudo conectar con ARCA. Revise la red e intente nuevamente.";
  }
  return message || "Error interno de ARCA.";
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const credentials = getServerCredentials();
  if (req.method === "GET") return res.status(200).json(publicStatus(credentials));
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }

  const action = req.body?.action;
  if (action === "status") return res.status(200).json(publicStatus(credentials));
  if (!credentials) {
    return res.status(503).json({
      success: false,
      error: "ARCA no esta configurado en el servidor.",
      ...publicStatus(null),
    });
  }

  let authenticated = false;
  try {
    authenticated = await hasAuthenticatedUser(req);
  } catch {
    authenticated = false;
  }
  if (!authenticated) {
    return res.status(401).json({
      success: false,
      error: "Debe iniciar sesion para operar con ARCA.",
    });
  }

  try {
    const auth = await getAccessTicket(credentials);
    if (action === "test") {
      await getLastAuthorized(credentials, auth, credentials.puntoVenta, 6);
      return res.status(200).json({
        ...publicStatus(credentials),
        connected: true,
        success: true,
        message: "Conexion a ARCA establecida con exito.",
      });
    }
    if (action === "createInvoice") {
      const result = await createInvoice(credentials, auth, req.body?.payload);
      return res.status(result.success ? 200 : 422).json(result);
    }
    return res.status(400).json({ success: false, error: `Accion '${String(action)}' no soportada.` });
  } catch (error) {
    console.error("ARCA proxy error:", error instanceof Error ? error.message : error);
    return res.status(502).json({ success: false, error: safeErrorMessage(error) });
  }
}

export const __arcaTestables = {
  arcaDate,
  buildLoginTicketRequest,
  collectArcaMessages,
  sanitizePem,
  validateInvoicePayload,
};
