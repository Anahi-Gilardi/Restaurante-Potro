"use strict";

import forge from "node-forge";
import https from "node:https";
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
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
  taxProfile: "monotributo";
  source: "database" | "environment";
}

interface StoredArcaConfig {
  id: string;
  cuit: string;
  punto_venta: number;
  environment: EnvironmentName;
  tax_profile: "monotributo";
  secret_ciphertext: string;
  secret_iv: string;
  secret_tag: string;
  certificate_subject: string | null;
  certificate_serial: string | null;
  certificate_valid_from: string | null;
  certificate_valid_to: string | null;
  updated_at: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
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

function getEnvironmentCredentials(): ServerCredentials | null {
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
    taxProfile: "monotributo",
    source: "environment",
  };
}

const publicStatus = (credentials: ServerCredentials | null) => ({
  configured: Boolean(credentials),
  connected: false,
  environment: credentials?.environment ?? null,
  puntoVenta: credentials?.puntoVenta ?? null,
  cuitMasked: credentials ? `*******${String(credentials.cuit).slice(-4)}` : null,
  taxProfile: credentials?.taxProfile ?? null,
  source: credentials?.source ?? null,
  message: credentials
    ? "Credenciales fiscales configuradas de forma segura en el servidor."
    : "La firma digital de ARCA todavia no esta configurada.",
});

function getBearerToken(req: VercelRequest): string {
  const rawAuthorization = req.headers?.authorization;
  const authorization = Array.isArray(rawAuthorization) ? rawAuthorization[0] : rawAuthorization;
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
}

function getPublicSupabaseClient() {
  const supabaseUrl = envValue("SUPABASE_URL", "VITE_SUPABASE_URL");
  const supabaseKey = envValue(
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
  );
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function getServiceSupabaseClient() {
  const supabaseUrl = envValue("SUPABASE_URL", "VITE_SUPABASE_URL");
  const serviceRoleKey = envValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function getAuthenticatedUser(req: VercelRequest): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(req);
  const client = getPublicSupabaseClient();
  if (!token || !client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email?.trim().toLowerCase() ?? "" };
}

async function isSuperAdmin(user: AuthenticatedUser): Promise<boolean> {
  const client = getServiceSupabaseClient();
  if (!client) return false;
  const email = user.email.replace(/[(),]/g, "");
  const filter = email
    ? `auth_user_id.eq.${user.id},username.eq.${email},mail.eq.${email}`
    : `auth_user_id.eq.${user.id}`;
  const query = client.from("usuarios").select("rol, activo").or(filter);
  const { data, error } = await query.limit(10);
  if (error) throw new Error(`No se pudo verificar el rol administrativo: ${error.message}`);
  return (data ?? []).some(profile => profile.rol === "superadmin" && profile.activo !== false);
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

const ARCA_CONFIG_ID = "primary";
const ARCA_CONFIG_AAD = Buffer.from("el-patron:arca-config:v1", "utf8");

function getConfigEncryptionKey(): Buffer {
  const encoded = envValue("ARCA_CONFIG_ENCRYPTION_KEY");
  if (!encoded) throw new Error("Falta ARCA_CONFIG_ENCRYPTION_KEY en las variables privadas de Vercel.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("ARCA_CONFIG_ENCRYPTION_KEY debe ser una clave Base64 de 32 bytes.");
  }
  return key;
}

function encryptSecrets(cert: string, key: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getConfigEncryptionKey(), iv);
  cipher.setAAD(ARCA_CONFIG_AAD);
  const plaintext = Buffer.from(JSON.stringify({ cert, key }), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    secret_ciphertext: ciphertext.toString("base64"),
    secret_iv: iv.toString("base64"),
    secret_tag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptSecrets(row: StoredArcaConfig): { cert: string; key: string } {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getConfigEncryptionKey(),
    Buffer.from(row.secret_iv, "base64"),
  );
  decipher.setAAD(ARCA_CONFIG_AAD);
  decipher.setAuthTag(Buffer.from(row.secret_tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(row.secret_ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const parsed = JSON.parse(plaintext);
  if (typeof parsed.cert !== "string" || typeof parsed.key !== "string") {
    throw new Error("La configuracion fiscal cifrada es invalida.");
  }
  return parsed;
}

function getCertificateField(certificate: forge.pki.Certificate, name: string): string {
  const field = certificate.subject.attributes.find(attribute => (
    attribute.name === name
    || attribute.shortName === name
    || (name === "serialNumber" && attribute.type === "2.5.4.5")
  ));
  return String(field?.value ?? "");
}

function validateCertificatePair(certificateInput: string, privateKeyInput: string, expectedCuit: string) {
  if (certificateInput.length > 50_000 || privateKeyInput.length > 50_000) {
    throw new Error("El certificado o la clave privada supera el tamano permitido.");
  }
  const cert = sanitizePem(certificateInput, "CERTIFICATE");
  const key = sanitizePem(privateKeyInput, "PRIVATE KEY");
  let certificate: forge.pki.Certificate;
  let privateKey: forge.pki.rsa.PrivateKey;
  try {
    certificate = forge.pki.certificateFromPem(cert);
    privateKey = forge.pki.privateKeyFromPem(key) as forge.pki.rsa.PrivateKey;
  } catch {
    throw new Error("El certificado o la clave privada no tienen un formato PEM valido.");
  }
  const certificatePublicKey = certificate.publicKey as forge.pki.rsa.PublicKey;
  const certificateModulus = Buffer.from(certificatePublicKey.n.toString(16).padStart(2, "0"), "hex");
  const privateModulus = Buffer.from(privateKey.n.toString(16).padStart(2, "0"), "hex");
  const modulusMatches = certificateModulus.length === privateModulus.length
    && timingSafeEqual(certificateModulus, privateModulus);
  if (!modulusMatches || certificatePublicKey.e.compareTo(privateKey.e) !== 0) {
    throw new Error("La clave privada no corresponde al certificado seleccionado.");
  }
  const serialNumber = getCertificateField(certificate, "serialNumber");
  const certificateCuit = serialNumber.replace(/\D/g, "").slice(-11);
  if (certificateCuit !== expectedCuit) {
    throw new Error(`El certificado pertenece al CUIT ${certificateCuit || "desconocido"}, no al emisor indicado.`);
  }
  const now = new Date();
  if (certificate.validity.notBefore > now) throw new Error("El certificado todavia no esta vigente.");
  if (certificate.validity.notAfter <= now) throw new Error("El certificado ARCA esta vencido.");
  return {
    cert,
    key,
    subject: certificate.subject.attributes.map(field => `${field.shortName || field.name}=${field.value}`).join(", "),
    serial: certificate.serialNumber,
    validFrom: certificate.validity.notBefore.toISOString(),
    validTo: certificate.validity.notAfter.toISOString(),
  };
}

async function readStoredConfig(): Promise<StoredArcaConfig | null> {
  const client = getServiceSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from("arca_config").select("*").eq("id", ARCA_CONFIG_ID).maybeSingle();
  if (error) {
    if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) return null;
    throw new Error(`No se pudo leer la configuracion ARCA: ${error.message}`);
  }
  return data as StoredArcaConfig | null;
}

async function getServerCredentials(): Promise<ServerCredentials | null> {
  const row = await readStoredConfig();
  if (row) {
    const { cert, key } = decryptSecrets(row);
    return {
      cuit: Number(row.cuit),
      cert,
      key,
      environment: row.environment,
      puntoVenta: row.punto_venta,
      taxProfile: "monotributo",
      source: "database",
    };
  }
  return getEnvironmentCredentials();
}

const adminStatus = (row: StoredArcaConfig | null, credentials: ServerCredentials | null) => ({
  ...publicStatus(credentials),
  certificateConfigured: Boolean(credentials?.cert),
  privateKeyConfigured: Boolean(credentials?.key),
  certificateSubject: row?.certificate_subject ?? null,
  certificateSerial: row?.certificate_serial ?? null,
  certificateValidFrom: row?.certificate_valid_from ?? null,
  certificateValidTo: row?.certificate_valid_to ?? null,
  updatedAt: row?.updated_at ?? null,
});

async function saveStoredConfig(body: any, user: AuthenticatedUser): Promise<StoredArcaConfig> {
  const client = getServiceSupabaseClient();
  if (!client) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables privadas de Vercel.");
  const cuit = String(body?.cuit ?? "").replace(/\D/g, "");
  const puntoVenta = positiveInteger(body?.puntoVenta, 0);
  const environment: EnvironmentName = body?.environment === "produccion" ? "produccion" : "homologacion";
  if (!/^\d{11}$/.test(cuit)) throw new Error("El CUIT emisor debe tener exactamente 11 numeros.");
  if (!puntoVenta || puntoVenta > 99999) throw new Error("El punto de venta es invalido.");
  if (body?.taxProfile !== "monotributo") throw new Error("Esta integracion esta configurada para Monotributo y Factura C.");

  const existing = await readStoredConfig();
  const certificateInput = typeof body?.certificate === "string" ? body.certificate : "";
  const privateKeyInput = typeof body?.privateKey === "string" ? body.privateKey : "";
  if (Boolean(certificateInput) !== Boolean(privateKeyInput)) {
    throw new Error("Debe seleccionar juntos el certificado y la clave privada correspondientes.");
  }

  let encrypted: Pick<StoredArcaConfig, "secret_ciphertext" | "secret_iv" | "secret_tag">;
  let metadata: Pick<StoredArcaConfig, "certificate_subject" | "certificate_serial" | "certificate_valid_from" | "certificate_valid_to">;
  if (certificateInput && privateKeyInput) {
    const validated = validateCertificatePair(certificateInput, privateKeyInput, cuit);
    encrypted = encryptSecrets(validated.cert, validated.key);
    metadata = {
      certificate_subject: validated.subject,
      certificate_serial: validated.serial,
      certificate_valid_from: validated.validFrom,
      certificate_valid_to: validated.validTo,
    };
  } else if (existing) {
    encrypted = {
      secret_ciphertext: existing.secret_ciphertext,
      secret_iv: existing.secret_iv,
      secret_tag: existing.secret_tag,
    };
    metadata = {
      certificate_subject: existing.certificate_subject,
      certificate_serial: existing.certificate_serial,
      certificate_valid_from: existing.certificate_valid_from,
      certificate_valid_to: existing.certificate_valid_to,
    };
  } else {
    throw new Error("Para la primera configuracion debe subir el certificado y la clave privada.");
  }

  const payload = {
    id: ARCA_CONFIG_ID,
    cuit,
    punto_venta: puntoVenta,
    environment,
    tax_profile: "monotributo",
    ...encrypted,
    ...metadata,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from("arca_config").upsert(payload).select("*").single();
  if (error) throw new Error(`No se pudo guardar la configuracion ARCA: ${error.message}`);
  Object.keys(taCache).forEach(key => delete taCache[key]);
  return data as StoredArcaConfig;
}

async function deleteStoredConfig(): Promise<void> {
  const client = getServiceSupabaseClient();
  if (!client) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables privadas de Vercel.");
  const { error } = await client.from("arca_config").delete().eq("id", ARCA_CONFIG_ID);
  if (error) throw new Error(`No se pudo eliminar la configuracion ARCA: ${error.message}`);
  Object.keys(taCache).forEach(key => delete taCache[key]);
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

function buildFiscalQrPayload(input: {
  date: string;
  cuit: number;
  pointOfSale: number;
  voucherType: number;
  voucherNumber: number;
  total: number;
  documentType: number;
  documentNumber: number;
  cae: string;
}) {
  const qrPayload: Record<string, string | number> = {
    ver: 1,
    fecha: `${input.date.slice(0, 4)}-${input.date.slice(4, 6)}-${input.date.slice(6, 8)}`,
    cuit: input.cuit,
    ptoVta: input.pointOfSale,
    tipoCmp: input.voucherType,
    nroCmp: input.voucherNumber,
    importe: input.total,
    moneda: "PES",
    ctz: 1,
    tipoCodAut: "E",
    codAut: Number(input.cae),
  };
  if (input.documentType !== 99 && input.documentNumber > 0) {
    qrPayload.tipoDocRec = input.documentType;
    qrPayload.nroDocRec = input.documentNumber;
  }
  return qrPayload;
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

  const qrPayload = buildFiscalQrPayload({
    date: arcaDate(),
    cuit: credentials.cuit,
    pointOfSale,
    voucherType: invoice.voucherType,
    voucherNumber,
    total: invoice.total,
    documentType: invoice.documentType,
    documentNumber: invoice.documentNumber,
    cae,
  });
  const qrData = JSON.stringify(qrPayload);
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
  let credentials: ServerCredentials | null = null;
  try {
    credentials = await getServerCredentials();
  } catch (error) {
    console.error("ARCA configuration error:", error instanceof Error ? error.message : error);
  }
  if (req.method === "GET") return res.status(200).json(publicStatus(credentials));
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }

  const action = req.body?.action;
  if (action === "status") return res.status(200).json(publicStatus(credentials));
  let authenticated: AuthenticatedUser | null = null;
  try {
    authenticated = await getAuthenticatedUser(req);
  } catch {
    authenticated = null;
  }
  if (!authenticated) {
    return res.status(401).json({
      success: false,
      error: "Debe iniciar sesion para operar con ARCA.",
    });
  }

  try {
    if (["adminStatus", "saveConfig", "deleteConfig"].includes(action)) {
      if (!(await isSuperAdmin(authenticated))) {
        return res.status(403).json({ success: false, error: "Solo un superadministrador puede configurar la firma digital." });
      }
      if (action === "adminStatus") {
        const row = await readStoredConfig();
        return res.status(200).json(adminStatus(row, credentials));
      }
      if (action === "saveConfig") {
        const row = await saveStoredConfig(req.body?.config, authenticated);
        credentials = await getServerCredentials();
        return res.status(200).json({
          success: true,
          ...adminStatus(row, credentials),
          message: "Configuracion fiscal cifrada y guardada correctamente.",
        });
      }
      await deleteStoredConfig();
      credentials = getEnvironmentCredentials();
      return res.status(200).json({
        success: true,
        ...adminStatus(null, credentials),
        message: credentials
          ? "Se elimino la configuracion subida. Sigue activa la configuracion privada de Vercel."
          : "Firma digital desconectada y eliminada del servidor.",
      });
    }

    if (!credentials) {
      return res.status(503).json({
        success: false,
        error: "ARCA no esta configurado en el servidor.",
        ...publicStatus(null),
      });
    }
    const auth = await getAccessTicket(credentials);
    if (action === "test") {
      await getLastAuthorized(credentials, auth, credentials.puntoVenta, 11);
      return res.status(200).json({
        ...publicStatus(credentials),
        connected: true,
        success: true,
        message: "Conexion a ARCA establecida con exito.",
      });
    }
    if (action === "createInvoice") {
      if (credentials.taxProfile === "monotributo" && Number(req.body?.payload?.tipoComprobante) !== 11) {
        return res.status(422).json({
          success: false,
          error: "El emisor es monotributista: ARCA solo permite emitir Factura C (tipo 11).",
        });
      }
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
  buildFiscalQrPayload,
  buildLoginTicketRequest,
  collectArcaMessages,
  getCertificateField,
  sanitizePem,
  validateCertificatePair,
  validateInvoicePayload,
};
