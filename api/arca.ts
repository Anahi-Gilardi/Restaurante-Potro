"use strict";

import forge from "node-forge";
import https from "node:https";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
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
  legalName: string;
  tradeName: string;
  commercialAddress: string;
  grossIncomeNumber: string;
  activityStartDate: string;
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
  legal_name: string | null;
  trade_name: string | null;
  commercial_address: string | null;
  gross_income_number: string | null;
  activity_start_date: string | null;
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

interface ArcaPointOfSale {
  number: number;
  emissionType: string;
  blocked: boolean;
  disabledAt: string | null;
}

interface CachedPointsOfSale {
  points: ArcaPointOfSale[];
  expiresAt: number;
}

interface InvoicePayload {
  idempotencyKey?: string;
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

interface ValidatedInvoice {
  total: number;
  voucherType: 11 | 13;
  pointOfSale: number;
  documentType: number;
  documentNumber: number;
  vatCondition: number;
  net: number;
  vat: number;
  isFacturaC: true;
  idempotencyKey: string;
}

interface StoredEmission {
  id: string;
  idempotency_key: string;
  request_hash: string;
  request_payload: ValidatedInvoice;
  created_by: string;
  environment: EnvironmentName;
  cuit: string;
  punto_venta: number;
  cbte_tipo: 11 | 13;
  cbte_nro: number | null;
  cbte_fecha: string | null;
  status: "authorizing" | "authorized" | "observed" | "rejected" | "uncertain";
  resultado: "A" | "O" | "R" | null;
  cae: string | null;
  cae_vencimiento: string | null;
  qr_payload: Record<string, string | number> | null;
  observaciones: Array<{ code: number; msg: string }>;
  error_message: string | null;
  related_emission_id: string | null;
  created_at: string;
  updated_at: string;
}

const globalCache = globalThis as typeof globalThis & {
  __elPatronArcaTa?: Record<string, CachedAccessTicket>;
  __elPatronArcaPointsOfSale?: Record<string, CachedPointsOfSale>;
};
const taCache = globalCache.__elPatronArcaTa ??= {};
const pointsOfSaleCache = globalCache.__elPatronArcaPointsOfSale ??= {};

const DEFAULT_ALLOWED_ORIGINS = new Set([
  "https://restaurante-potro.vercel.app",
  "https://restaurante-potro-anahi.vercel.app",
]);

const envValue = (...names: string[]): string => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
};

function requestOrigin(req: VercelRequest): string {
  const raw = req.headers?.origin;
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true;
  const configured = envValue("APP_ALLOWED_ORIGINS")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  return DEFAULT_ALLOWED_ORIGINS.has(origin) || configured.includes(origin);
}

function configureCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = requestOrigin(req);
  if (!isAllowedOrigin(origin)) return false;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return true;
}

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
  const puntoVenta = positiveInteger(envValue("ARCA_PUNTO_VENTA"), 0);
  if (!/^\d{11}$/.test(cuitText) || !key || !cert || !puntoVenta) return null;

  const environmentText = envValue("ARCA_ENV", "AFIP_ENV").toLowerCase();
  const production = envValue("ARCA_PRODUCTION").toLowerCase() === "true"
    || environmentText === "produccion"
    || environmentText === "production";

  return {
    cuit: Number(cuitText),
    key,
    cert,
    environment: production ? "produccion" : "homologacion",
    puntoVenta,
    taxProfile: "monotributo",
    source: "environment",
    legalName: envValue("ARCA_LEGAL_NAME"),
    tradeName: envValue("ARCA_TRADE_NAME"),
    commercialAddress: envValue("ARCA_COMMERCIAL_ADDRESS"),
    grossIncomeNumber: envValue("ARCA_GROSS_INCOME_NUMBER"),
    activityStartDate: envValue("ARCA_ACTIVITY_START_DATE"),
  };
}

const hasCompleteLegalData = (credentials: ServerCredentials | null): boolean => Boolean(
  credentials?.legalName
  && credentials.tradeName
  && credentials.commercialAddress
  && credentials.grossIncomeNumber
  && /^\d{4}-\d{2}-\d{2}$/.test(credentials.activityStartDate),
);

const publicStatus = (credentials: ServerCredentials | null) => ({
  configured: Boolean(credentials),
  connected: false,
  environment: credentials?.environment ?? null,
  puntoVenta: credentials?.puntoVenta ?? null,
  cuitMasked: credentials ? `*******${String(credentials.cuit).slice(-4)}` : null,
  taxProfile: credentials?.taxProfile ?? null,
  source: credentials?.source ?? null,
  legalDataComplete: hasCompleteLegalData(credentials),
  message: credentials
    ? hasCompleteLegalData(credentials)
      ? "Credenciales y datos legales configurados de forma segura en el servidor."
      : "Credenciales configuradas; faltan datos legales obligatorios para habilitar la emision."
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

async function getApplicationRole(user: AuthenticatedUser): Promise<string | null> {
  const client = getServiceSupabaseClient();
  if (!client) return null;
  const email = user.email.replace(/[(),]/g, "");
  const filter = email
    ? `auth_user_id.eq.${user.id},username.eq.${email},mail.eq.${email}`
    : `auth_user_id.eq.${user.id}`;
  const query = client.from("usuarios").select("rol, activo").or(filter);
  const { data, error } = await query.limit(10);
  if (error) throw new Error(`No se pudo verificar el rol administrativo: ${error.message}`);
  const profile = (data ?? []).find(item => item.activo !== false);
  return typeof profile?.rol === "string" ? profile.rol : null;
}

async function isSuperAdmin(user: AuthenticatedUser): Promise<boolean> {
  return (await getApplicationRole(user)) === "superadmin";
}

async function canIssueFiscalDocuments(user: AuthenticatedUser): Promise<boolean> {
  return ["superadmin", "administrador"].includes(await getApplicationRole(user) ?? "");
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
      legalName: row.legal_name ?? "",
      tradeName: row.trade_name ?? "",
      commercialAddress: row.commercial_address ?? "",
      grossIncomeNumber: row.gross_income_number ?? "",
      activityStartDate: row.activity_start_date ?? "",
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
  legalName: row?.legal_name ?? credentials?.legalName ?? "",
  tradeName: row?.trade_name ?? credentials?.tradeName ?? "",
  commercialAddress: row?.commercial_address ?? credentials?.commercialAddress ?? "",
  grossIncomeNumber: row?.gross_income_number ?? credentials?.grossIncomeNumber ?? "",
  activityStartDate: row?.activity_start_date ?? credentials?.activityStartDate ?? "",
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
  const legalName = String(body?.legalName ?? "").trim();
  const tradeName = String(body?.tradeName ?? "").trim();
  const commercialAddress = String(body?.commercialAddress ?? "").trim();
  const grossIncomeNumber = String(body?.grossIncomeNumber ?? "").trim();
  const activityStartDate = String(body?.activityStartDate ?? "").trim();
  if (legalName.length < 3 || legalName.length > 120) throw new Error("La razon social o nombre legal es obligatorio.");
  if (tradeName.length < 2 || tradeName.length > 120) throw new Error("El nombre comercial es obligatorio.");
  if (commercialAddress.length < 5 || commercialAddress.length > 180) throw new Error("El domicilio comercial es obligatorio.");
  // Permite guardar primero la firma digital aunque la constancia provincial
  // todavia no este disponible. Mientras este dato quede vacio,
  // hasCompleteLegalData() mantiene bloqueada la emision fiscal.
  if (grossIncomeNumber && (grossIncomeNumber.length < 2 || grossIncomeNumber.length > 40)) {
    throw new Error("Informe Ingresos Brutos o la condicion de no contribuyente.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(activityStartDate) || Number.isNaN(Date.parse(`${activityStartDate}T00:00:00Z`))) {
    throw new Error("La fecha de inicio de actividades es invalida.");
  }

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
    legal_name: legalName,
    trade_name: tradeName,
    commercial_address: commercialAddress,
    gross_income_number: grossIncomeNumber,
    activity_start_date: activityStartDate,
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
  // WSAA define uniqueId como xsd:unsignedInt. Date.now() (milisegundos) excede ese rango.
  const uniqueId = Math.floor(Date.now() / 1000) >>> 0;
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
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
          const fault = soapFault(data);
          reject(new Error(fault || `ARCA respondio HTTP ${status}.`));
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

function parseArcaPointsOfSale(xml: string): ArcaPointOfSale[] {
  const blocks = xml.match(/<(?:[\w-]+:)?PtoVenta(?:\s[^>]*)?>[\s\S]*?<\/(?:[\w-]+:)?PtoVenta>/gi) ?? [];
  return blocks.flatMap(block => {
    const number = Number(xmlTag(block, "Nro"));
    if (!Number.isInteger(number) || number < 1 || number > 99_998) return [];
    const disabledAt = xmlTag(block, "FchBaja");
    return [{
      number,
      emissionType: decodeXmlEntities(xmlTag(block, "EmisionTipo")).trim().toUpperCase(),
      blocked: xmlTag(block, "Bloqueado").trim().toUpperCase() === "S",
      disabledAt: disabledAt && disabledAt !== "00000000" ? disabledAt : null,
    }];
  });
}

const formatPointOfSale = (value: number): string => String(value).padStart(5, "0");

function pointOfSaleValidation(
  configuredPointOfSale: number,
  points: ArcaPointOfSale[],
): { valid: boolean; message: string; available: number[] } {
  const configured = points.find(point => point.number === configuredPointOfSale);
  const available = points
    .filter(point => point.emissionType === "CAE" && !point.blocked && !point.disabledAt)
    .map(point => point.number)
    .sort((left, right) => left - right);
  const label = formatPointOfSale(configuredPointOfSale);
  const availableText = available.length
    ? ` ARCA informo como puntos CAE activos: ${available.map(formatPointOfSale).join(", ")}.`
    : " ARCA no informo puntos CAE activos para este CUIT.";

  if (!configured) {
    return {
      valid: false,
      available,
      message: `El punto de venta ${label} no esta habilitado en ARCA para Web Services con CAE.${availableText} Ingrese al ABM de puntos de venta de ARCA, cree o regularice uno del tipo \"RECE para aplicativo y web services\" y configure aqui ese mismo numero.`,
    };
  }
  if (configured.blocked) {
    return {
      valid: false,
      available,
      message: `El punto de venta ${label} esta bloqueado en ARCA. Regularicelo en el ABM de puntos de venta antes de emitir.${availableText}`,
    };
  }
  if (configured.disabledAt) {
    return {
      valid: false,
      available,
      message: `El punto de venta ${label} esta dado de baja en ARCA desde ${configured.disabledAt}. Configure un punto CAE activo antes de emitir.${availableText}`,
    };
  }
  if (configured.emissionType !== "CAE") {
    return {
      valid: false,
      available,
      message: `El punto de venta ${label} esta habilitado para ${configured.emissionType || "otro tipo de emision"}, pero este sistema solicita CAE.${availableText}`,
    };
  }
  return {
    valid: true,
    available,
    message: `Punto de venta ${label} habilitado por ARCA para emitir con CAE.`,
  };
}

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

async function getAuthorizedPointsOfSale(
  credentials: ServerCredentials,
  auth: CachedAccessTicket,
  force = false,
): Promise<ArcaPointOfSale[]> {
  const cacheKey = `${credentials.environment}:${credentials.cuit}`;
  const cached = pointsOfSaleCache[cacheKey];
  if (!force && cached && cached.expiresAt > Date.now()) return cached.points;

  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fe="http://ar.gov.afip.dif.FEV1/">
  <soap:Body><fe:FEParamGetPtosVenta>${authXml(credentials, auth)}
  </fe:FEParamGetPtosVenta></soap:Body>
</soap:Envelope>`;
  const response = await requestSoap(
    URLS[credentials.environment].wsfe,
    "http://ar.gov.afip.dif.FEV1/FEParamGetPtosVenta",
    soap,
  );
  const fault = soapFault(response);
  if (fault) throw new Error(fault);
  const errors = collectArcaMessages(response).filter(message => message.code || message.msg);
  if (errors.length) {
    throw new Error(`ARCA no pudo consultar los puntos de venta: ${errors.map(item => `[${item.code}] ${item.msg}`).join("; ")}`);
  }
  const points = parseArcaPointsOfSale(response);
  pointsOfSaleCache[cacheKey] = { points, expiresAt: Date.now() + 60_000 };
  return points;
}

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

function isValidArgentineCuit(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = factors.reduce((total, factor, index) => total + Number(value[index]) * factor, 0);
  const remainder = sum % 11;
  const verifier = remainder === 0 ? 0 : remainder === 1 ? (value[0] === "5" ? 0 : 9) : 11 - remainder;
  return verifier === Number(value[10]);
}

function validateInvoicePayload(payload: InvoicePayload | undefined): ValidatedInvoice {
  if (!payload) throw new Error("Payload de factura faltante.");
  const total = Number(payload.total);
  const voucherType = positiveInteger(payload.tipoComprobante, 0) as 11 | 13;
  const allowedVoucherTypes = new Set([11, 13]);
  const idempotencyKey = String(payload.idempotencyKey ?? "").trim();
  if (!/^[A-Za-z0-9:_-]{8,120}$/.test(idempotencyKey)) {
    throw new Error("Falta una clave de idempotencia valida para la emision.");
  }
  if (!Number.isFinite(total) || total <= 0) throw new Error("El total de la factura debe ser mayor que cero.");
  if (total > 99_999_999_999_999.99) throw new Error("El total supera el maximo admitido por ARCA.");
  if (!allowedVoucherTypes.has(voucherType)) throw new Error("Tipo de comprobante ARCA no soportado.");

  const pointOfSale = positiveInteger(payload.puntoVenta, 0);
  const documentType = Number(payload.cliente?.tipoDoc ?? 99);
  const documentNumber = Number(payload.cliente?.nroDoc ?? 0);
  const vatCondition = positiveInteger(payload.cliente?.condicionIva, 5);
  if (!Number.isInteger(documentType) || ![80, 96, 99].includes(documentType)) throw new Error("Tipo de documento receptor invalido.");
  if (!Number.isInteger(documentNumber) || documentNumber < 0) throw new Error("Numero de documento receptor invalido.");
  if (documentType === 99 && documentNumber !== 0) throw new Error("Consumidor Final debe informarse sin numero de documento.");
  if (documentType === 80 && !/^\d{11}$/.test(String(documentNumber))) throw new Error("El CUIT receptor debe tener 11 digitos.");
  if (documentType === 80 && !isValidArgentineCuit(String(documentNumber))) throw new Error("El CUIT receptor tiene un digito verificador invalido.");
  if (documentType === 96 && !/^\d{7,8}$/.test(String(documentNumber))) throw new Error("El DNI receptor debe tener 7 u 8 digitos.");
  if (total >= 10_000_000 && documentType === 99) {
    throw new Error("ARCA exige identificar al consumidor final para operaciones de $10.000.000 o mas.");
  }
  const allowedVatConditions = new Set([1, 4, 5, 6, 7, 8, 9, 10, 13, 15, 16]);
  if (!Number.isInteger(vatCondition) || !allowedVatConditions.has(vatCondition)) {
    throw new Error("La condicion frente al IVA del receptor es invalida.");
  }

  const isFacturaC = true as const;
  const net = roundMoney(total);
  const vat = 0;
  if (Math.abs(roundMoney(net + vat) - roundMoney(total)) > 0.02) {
    throw new Error("El neto mas IVA no coincide con el total.");
  }
  return { total: roundMoney(total), voucherType, pointOfSale, documentType, documentNumber, vatCondition, net, vat, isFacturaC, idempotencyKey };
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

async function authorizeInvoice(
  credentials: ServerCredentials,
  auth: CachedAccessTicket,
  invoice: ValidatedInvoice,
  voucherNumber: number,
  associated?: { voucherType: number; pointOfSale: number; voucherNumber: number; date: string },
) {
  if (invoice.pointOfSale && invoice.pointOfSale !== credentials.puntoVenta) {
    throw new Error("El punto de venta solicitado no coincide con el configurado en el servidor.");
  }
  const pointOfSale = credentials.puntoVenta;
  const associatedBlock = associated ? `
        <fe:CbtesAsoc><fe:CbteAsoc><fe:Tipo>${associated.voucherType}</fe:Tipo><fe:PtoVta>${associated.pointOfSale}</fe:PtoVta><fe:Nro>${associated.voucherNumber}</fe:Nro><fe:Cuit>${credentials.cuit}</fe:Cuit><fe:CbteFch>${associated.date}</fe:CbteFch></fe:CbteAsoc></fe:CbtesAsoc>` : "";
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
        <fe:MonId>PES</fe:MonId><fe:MonCotiz>1</fe:MonCotiz>${associatedBlock}
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
  if (!["A", "O"].includes(result) || !cae) {
    const rawError = `ARCA rechazo la solicitud: ${observations.map(item => `[${item.code}] ${item.msg}`).join("; ") || "sin detalle"}`;
    return {
      success: false,
      resultado: result || "R",
      observaciones: observations,
      error: safeErrorMessage(new Error(rawError)),
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

const publicEmitter = (credentials: ServerCredentials) => ({
  cuit: String(credentials.cuit),
  legalName: credentials.legalName,
  tradeName: credentials.tradeName,
  commercialAddress: credentials.commercialAddress,
  grossIncomeNumber: credentials.grossIncomeNumber,
  activityStartDate: credentials.activityStartDate,
  taxCondition: "Monotributo",
});

const invoiceHash = (invoice: ValidatedInvoice, credentials: ServerCredentials): string => createHash("sha256")
  .update(JSON.stringify({ ...invoice, pointOfSale: credentials.puntoVenta, environment: credentials.environment, cuit: credentials.cuit }))
  .digest("hex");

function storedEmissionResponse(emission: StoredEmission, credentials: ServerCredentials) {
  const success = ["authorized", "observed"].includes(emission.status) && Boolean(emission.cae);
  return {
    success,
    emissionId: emission.id,
    fiscalStatus: emission.status,
    resultado: emission.resultado ?? (success ? "A" : "R"),
    cae: emission.cae ?? undefined,
    vencimiento: emission.cae_vencimiento ?? undefined,
    CodAutorizacion: emission.cae ?? undefined,
    CAE: emission.cae ?? undefined,
    Vencimiento: emission.cae_vencimiento ?? undefined,
    CAEFchVto: emission.cae_vencimiento ?? undefined,
    nroCmp: emission.cbte_nro ?? undefined,
    puntoVenta: emission.punto_venta,
    tipoComprobante: emission.cbte_tipo,
    qrData: emission.qr_payload ? JSON.stringify(emission.qr_payload) : undefined,
    observaciones: emission.observaciones ?? [],
    error: success ? undefined : emission.error_message ?? "La emision fiscal no fue autorizada.",
    emitter: publicEmitter(credentials),
  };
}

async function queryAuthorizedVoucher(
  credentials: ServerCredentials,
  auth: CachedAccessTicket,
  voucherType: number,
  voucherNumber: number,
) {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fe="http://ar.gov.afip.dif.FEV1/">
  <soap:Body><fe:FECompConsultar>${authXml(credentials, auth)}
    <fe:FeCompConsReq><fe:CbteTipo>${voucherType}</fe:CbteTipo><fe:CbteNro>${voucherNumber}</fe:CbteNro><fe:PtoVta>${credentials.puntoVenta}</fe:PtoVta></fe:FeCompConsReq>
  </fe:FECompConsultar></soap:Body>
</soap:Envelope>`;
  const response = await requestSoap(
    URLS[credentials.environment].wsfe,
    "http://ar.gov.afip.dif.FEV1/FECompConsultar",
    soap,
  );
  const fault = soapFault(response);
  if (fault) throw new Error(fault);
  const cae = xmlTag(response, "CodAutorizacion") || xmlTag(response, "CAE");
  if (!/^\d{14}$/.test(cae)) return null;
  const total = Number(xmlTag(response, "ImpTotal"));
  const date = xmlTag(response, "CbteFch");
  return {
    cae,
    expiry: xmlTag(response, "FchVto") || xmlTag(response, "CAEFchVto"),
    total: Number.isFinite(total) ? roundMoney(total) : null,
    date: /^\d{8}$/.test(date) ? date : arcaDate(),
    observations: collectArcaMessages(response),
  };
}

async function enforceEmissionRateLimit(client: ReturnType<typeof getServiceSupabaseClient>, userId: string) {
  if (!client) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables privadas de Vercel.");
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await client
    .from("arca_emisiones")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", since);
  if (error) throw new Error(`No se pudo verificar el limite fiscal: ${error.message}`);
  if ((count ?? 0) >= 10) throw new Error("Se alcanzo el limite de 10 operaciones fiscales por minuto.");
}

async function reconcileEmission(
  client: NonNullable<ReturnType<typeof getServiceSupabaseClient>>,
  emission: StoredEmission,
  credentials: ServerCredentials,
  auth: CachedAccessTicket,
): Promise<StoredEmission> {
  if (!emission.cbte_nro) return emission;
  const authorized = await queryAuthorizedVoucher(credentials, auth, emission.cbte_tipo, emission.cbte_nro);
  if (!authorized) return emission;
  if (authorized.total !== null && Math.abs(authorized.total - Number(emission.request_payload.total)) > 0.01) {
    throw new Error("ARCA devolvio un comprobante con importe distinto durante la reconciliacion.");
  }
  const qrPayload = buildFiscalQrPayload({
    date: authorized.date,
    cuit: credentials.cuit,
    pointOfSale: credentials.puntoVenta,
    voucherType: emission.cbte_tipo,
    voucherNumber: emission.cbte_nro,
    total: Number(emission.request_payload.total),
    documentType: Number(emission.request_payload.documentType),
    documentNumber: Number(emission.request_payload.documentNumber),
    cae: authorized.cae,
  });
  const updates = {
    status: "authorized",
    resultado: "A",
    cae: authorized.cae,
    cae_vencimiento: authorized.expiry,
    cbte_fecha: authorized.date,
    qr_payload: qrPayload,
    observaciones: authorized.observations,
    error_message: null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from("arca_emisiones").update(updates).eq("id", emission.id).select("*").single();
  if (error) throw new Error(`No se pudo guardar la reconciliacion fiscal: ${error.message}`);
  return data as StoredEmission;
}

async function runIdempotentEmission(
  credentials: ServerCredentials,
  authenticated: AuthenticatedUser,
  invoice: ValidatedInvoice,
  related?: StoredEmission,
) {
  const client = getServiceSupabaseClient();
  if (!client) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables privadas de Vercel.");
  if (!hasCompleteLegalData(credentials)) {
    throw new Error("Complete en Sistema la razon social, domicilio, Ingresos Brutos y fecha de inicio antes de emitir.");
  }
  const hash = invoiceHash(invoice, credentials);
  const { data: previous, error: previousError } = await client
    .from("arca_emisiones")
    .select("*")
    .eq("idempotency_key", invoice.idempotencyKey)
    .maybeSingle();
  if (previousError) throw new Error(`No se pudo consultar la idempotencia fiscal: ${previousError.message}`);
  if (previous) {
    const existing = previous as StoredEmission;
    if (existing.request_hash !== hash) throw new Error("La clave de idempotencia ya fue usada con otros datos.");
    if (existing.status === "uncertain") {
      const auth = await getAccessTicket(credentials);
      return storedEmissionResponse(await reconcileEmission(client, existing, credentials, auth), credentials);
    }
    return storedEmissionResponse(existing, credentials);
  }
  const auth = await getAccessTicket(credentials);
  const pointsOfSale = await getAuthorizedPointsOfSale(credentials, auth);
  const pointValidation = pointOfSaleValidation(credentials.puntoVenta, pointsOfSale);
  if (!pointValidation.valid) throw new Error(pointValidation.message);
  await enforceEmissionRateLimit(client, authenticated.id);

  const emissionId = randomUUID();
  const now = new Date().toISOString();
  const initial = {
    id: emissionId,
    idempotency_key: invoice.idempotencyKey,
    request_hash: hash,
    request_payload: invoice,
    created_by: authenticated.id,
    environment: credentials.environment,
    cuit: String(credentials.cuit),
    punto_venta: credentials.puntoVenta,
    cbte_tipo: invoice.voucherType,
    status: "authorizing",
    related_emission_id: related?.id ?? null,
    created_at: now,
    updated_at: now,
  };
  const { data: inserted, error: insertError } = await client.from("arca_emisiones").insert(initial).select("*").single();
  if (insertError) throw new Error(`No se pudo iniciar la auditoria fiscal: ${insertError.message}`);
  let emission = inserted as StoredEmission;
  const lockKey = `${credentials.environment}:${credentials.cuit}:${credentials.puntoVenta}:${invoice.voucherType}`;
  const leaseOwner = randomUUID();
  const { data: claimed, error: leaseError } = await client.rpc("claim_arca_sequence_lease", {
    p_lock_key: lockKey,
    p_owner: leaseOwner,
    p_seconds: 60,
  });
  if (leaseError) throw new Error(`No se pudo serializar la numeracion fiscal: ${leaseError.message}`);
  if (!claimed) {
    await client.from("arca_emisiones").update({ status: "rejected", error_message: "Otra emision fiscal esta en curso.", updated_at: new Date().toISOString() }).eq("id", emissionId);
    throw new Error("Otra emision fiscal esta en curso. Espere unos segundos y vuelva a intentar.");
  }

  try {
    const voucherNumber = await getLastAuthorized(credentials, auth, credentials.puntoVenta, invoice.voucherType) + 1;
    const issueDate = arcaDate();
    const { data: reserved, error: reserveError } = await client
      .from("arca_emisiones")
      .update({ cbte_nro: voucherNumber, cbte_fecha: issueDate, updated_at: new Date().toISOString() })
      .eq("id", emissionId)
      .select("*")
      .single();
    if (reserveError) throw new Error(`No se pudo reservar la numeracion fiscal: ${reserveError.message}`);
    emission = reserved as StoredEmission;
    const associated = related?.cbte_nro ? {
      voucherType: related.cbte_tipo,
      pointOfSale: related.punto_venta,
      voucherNumber: related.cbte_nro,
      date: related.cbte_fecha ?? issueDate,
    } : undefined;
    const result = await authorizeInvoice(credentials, auth, invoice, voucherNumber, associated);
    const status = result.success ? (result.resultado === "O" ? "observed" : "authorized") : "rejected";
    const updates = result.success ? {
      status,
      resultado: result.resultado,
      cae: result.cae,
      cae_vencimiento: result.vencimiento,
      qr_payload: JSON.parse(result.qrData),
      observaciones: result.observaciones,
      error_message: null,
      updated_at: new Date().toISOString(),
    } : {
      status: "rejected",
      resultado: "R",
      observaciones: result.observaciones,
      error_message: result.error,
      updated_at: new Date().toISOString(),
    };
    const { data: saved, error: saveError } = await client.from("arca_emisiones").update(updates).eq("id", emissionId).select("*").single();
    if (saveError) throw new Error(`ARCA respondio pero no se pudo guardar el resultado: ${saveError.message}`);
    return storedEmissionResponse(saved as StoredEmission, credentials);
  } catch (error) {
    if (emission.cbte_nro) {
      await client.from("arca_emisiones").update({
        status: "uncertain",
        error_message: "Resultado incierto; se debe reconciliar antes de reintentar.",
        updated_at: new Date().toISOString(),
      }).eq("id", emissionId);
    } else {
      await client.from("arca_emisiones").update({
        status: "rejected",
        error_message: error instanceof Error ? error.message.slice(0, 500) : "No se pudo iniciar la emision fiscal.",
        updated_at: new Date().toISOString(),
      }).eq("id", emissionId);
    }
    throw error;
  } finally {
    await client.rpc("release_arca_sequence_lease", { p_lock_key: lockKey, p_owner: leaseOwner });
  }
}

const safeErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (/\b10005\b|NO AUTORIZADO A EMITIR COMPROBANTES[\s\S]*PUNTO DE VENTA|PUNTO DE VENTA[\s\S]*TIPO RECE/i.test(message)) {
    return "El punto de venta configurado no esta habilitado en ARCA para Web Services. Ingrese al ABM de puntos de venta de ARCA, cree o regularice uno del tipo \"RECE para aplicativo y web services\" y configure aqui ese mismo numero.";
  }
  if (/alreadyAuthenticated/i.test(message)) {
    return "ARCA ya tiene un Token de Acceso activo. Espere unos minutos y vuelva a probar.";
  }
  if (/timeout|timed out|tardo demasiado|ECONN|ENOTFOUND|fetch failed/i.test(message)) {
    return "No se pudo conectar con ARCA. Revise la red e intente nuevamente.";
  }
  return message || "Error interno de ARCA.";
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!configureCors(req, res)) {
    return res.status(403).json({ success: false, error: "Origen no autorizado." });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  const rawContentLength = req.headers?.["content-length"];
  const contentLength = Number(Array.isArray(rawContentLength) ? rawContentLength[0] : rawContentLength ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 120_000) {
    return res.status(413).json({ success: false, error: "La solicitud fiscal supera el limite permitido." });
  }
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
    if (!(await canIssueFiscalDocuments(authenticated))) {
      return res.status(403).json({ success: false, error: "El usuario no tiene permiso para operar la facturacion fiscal." });
    }
    if (action === "test") {
      const auth = await getAccessTicket(credentials);
      const pointsOfSale = await getAuthorizedPointsOfSale(credentials, auth, true);
      const pointValidation = pointOfSaleValidation(credentials.puntoVenta, pointsOfSale);
      if (!pointValidation.valid) {
        return res.status(422).json({
          ...publicStatus(credentials),
          connected: false,
          success: false,
          pointOfSaleValid: false,
          authorizedPointsOfSale: pointValidation.available,
          message: pointValidation.message,
          error: pointValidation.message,
        });
      }
      await getLastAuthorized(credentials, auth, credentials.puntoVenta, 11);
      return res.status(200).json({
        ...publicStatus(credentials),
        connected: true,
        success: true,
        pointOfSaleValid: true,
        authorizedPointsOfSale: pointValidation.available,
        message: `Conexion a ARCA establecida. ${pointValidation.message}`,
      });
    }
    if (action === "createInvoice") {
      if (credentials.taxProfile === "monotributo" && Number(req.body?.payload?.tipoComprobante) !== 11) {
        return res.status(422).json({
          success: false,
          error: "El emisor es monotributista: ARCA solo permite emitir Factura C (tipo 11).",
        });
      }
      const invoice = validateInvoicePayload(req.body?.payload);
      const result = await runIdempotentEmission(credentials, authenticated, invoice);
      const status = result.success ? 200 : ["uncertain", "authorizing"].includes(result.fiscalStatus ?? "") ? 409 : 422;
      return res.status(status).json(result);
    }
    if (action === "createCreditNote") {
      const client = getServiceSupabaseClient();
      if (!client) return res.status(503).json({ success: false, error: "Falta configurar el backend fiscal seguro." });
      const relatedEmissionId = String(req.body?.relatedEmissionId ?? "").trim();
      const idempotencyKey = String(req.body?.idempotencyKey ?? "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(relatedEmissionId)) return res.status(422).json({ success: false, error: "Comprobante fiscal asociado invalido." });
      const { data, error } = await client.from("arca_emisiones").select("*").eq("id", relatedEmissionId).maybeSingle();
      if (error) throw new Error(`No se pudo consultar el comprobante asociado: ${error.message}`);
      const related = data as StoredEmission | null;
      if (!related || !["authorized", "observed"].includes(related.status) || related.cbte_tipo !== 11 || !related.cbte_nro) {
        return res.status(422).json({ success: false, error: "Solo puede emitirse Nota de Credito C sobre una Factura C autorizada." });
      }
      const invoice = validateInvoicePayload({
        ...related.request_payload,
        idempotencyKey,
        tipoComprobante: 13,
      });
      const result = await runIdempotentEmission(credentials, authenticated, invoice, related);
      return res.status(result.success ? 200 : 422).json(result);
    }
    if (action === "reconcileInvoice") {
      const client = getServiceSupabaseClient();
      if (!client) return res.status(503).json({ success: false, error: "Falta configurar el backend fiscal seguro." });
      const emissionId = String(req.body?.emissionId ?? "").trim();
      const { data, error } = await client.from("arca_emisiones").select("*").eq("id", emissionId).maybeSingle();
      if (error) throw new Error(`No se pudo consultar la emision: ${error.message}`);
      const emission = data as StoredEmission | null;
      if (!emission) return res.status(404).json({ success: false, error: "Emision fiscal no encontrada." });
      if (emission.status !== "uncertain") return res.status(200).json(storedEmissionResponse(emission, credentials));
      const auth = await getAccessTicket(credentials);
      const reconciled = await reconcileEmission(client, emission, credentials, auth);
      return res.status(reconciled.status === "uncertain" ? 409 : 200).json(storedEmissionResponse(reconciled, credentials));
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
  getAccessTicket,
  getAuthorizedPointsOfSale,
  getCertificateField,
  getLastAuthorized,
  isAllowedOrigin,
  isValidArgentineCuit,
  parseArcaPointsOfSale,
  pointOfSaleValidation,
  safeErrorMessage,
  sanitizePem,
  validateCertificatePair,
  validateInvoicePayload,
};
