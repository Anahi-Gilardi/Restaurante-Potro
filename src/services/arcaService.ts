// Proxy cliente para ARCA. Los certificados y la clave privada nunca se
// persisten en el navegador: el backend los cifra o usa secretos de Vercel.

import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';

const API_URL = '/api/arca';
const STATUS_TTL_MS = 60_000;

export interface ArcaStatus {
  configured: boolean;
  connected: boolean;
  environment: 'homologacion' | 'produccion' | null;
  puntoVenta: number | null;
  cuitMasked: string | null;
  taxProfile: 'monotributo' | null;
  source: 'database' | 'environment' | null;
  message: string;
}

export interface ArcaAdminConfig extends ArcaStatus {
  certificateConfigured: boolean;
  privateKeyConfigured: boolean;
  certificateSubject: string | null;
  certificateSerial: string | null;
  certificateValidFrom: string | null;
  certificateValidTo: string | null;
  updatedAt: string | null;
}

export interface SaveArcaConfigInput {
  cuit: string;
  puntoVenta: number;
  environment: 'homologacion' | 'produccion';
  taxProfile: 'monotributo';
  certificate?: File | null;
  privateKey?: File | null;
}

interface CachedStatus {
  value: ArcaStatus;
  expiresAt: number;
}

let statusCache: CachedStatus | null = null;

const disconnectedStatus = (message: string): ArcaStatus => ({
  configured: false,
  connected: false,
  environment: null,
  puntoVenta: null,
  cuitMasked: null,
  taxProfile: null,
  source: null,
  message,
});

const parseStatus = (data: any, connected = false): ArcaStatus => ({
  configured: Boolean(data.configured),
  connected,
  environment: data.environment === 'produccion' ? 'produccion' : data.environment === 'homologacion' ? 'homologacion' : null,
  puntoVenta: Number.isInteger(data.puntoVenta) ? data.puntoVenta : null,
  cuitMasked: typeof data.cuitMasked === 'string' ? data.cuitMasked : null,
  taxProfile: data.taxProfile === 'monotributo' ? 'monotributo' : null,
  source: data.source === 'database' ? 'database' : data.source === 'environment' ? 'environment' : null,
  message: String(data.message || data.error || ''),
});

const parseAdminConfig = (data: any): ArcaAdminConfig => ({
  ...parseStatus(data, false),
  certificateConfigured: Boolean(data.certificateConfigured),
  privateKeyConfigured: Boolean(data.privateKeyConfigured),
  certificateSubject: typeof data.certificateSubject === 'string' ? data.certificateSubject : null,
  certificateSerial: typeof data.certificateSerial === 'string' ? data.certificateSerial : null,
  certificateValidFrom: typeof data.certificateValidFrom === 'string' ? data.certificateValidFrom : null,
  certificateValidTo: typeof data.certificateValidTo === 'string' ? data.certificateValidTo : null,
  updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
});

async function readJson(response: Response): Promise<any> {
  return response.json().catch(() => ({}));
}

async function authenticatedHeaders(): Promise<Record<string, string>> {
  const client = tryGetActiveSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado para validar la sesión.');
  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error('Debe iniciar sesión para operar con ARCA.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getArcaStatus(force = false): Promise<ArcaStatus> {
  if (!force && statusCache && statusCache.expiresAt > Date.now()) return statusCache.value;
  try {
    const response = await fetch(API_URL, { method: 'GET', headers: { Accept: 'application/json' } });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    const status = parseStatus(data, Boolean(data.connected));
    statusCache = { value: status, expiresAt: Date.now() + STATUS_TTL_MS };
    return status;
  } catch (error) {
    return disconnectedStatus(error instanceof Error ? error.message : 'No se pudo consultar el estado de ARCA.');
  }
}

export async function testArcaConnection(): Promise<{ success: boolean; status: ArcaStatus; error?: string }> {
  try {
    const headers = await authenticatedHeaders();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'test' }),
    });
    const data = await readJson(response);
    const status = parseStatus(data, response.ok && Boolean(data.success));
    statusCache = { value: status, expiresAt: Date.now() + STATUS_TTL_MS };
    return response.ok
      ? { success: true, status }
      : { success: false, status, error: String(data.error || `HTTP ${response.status}`) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, status: disconnectedStatus(message), error: message };
  }
}

async function callAdminAction(action: string, body: Record<string, unknown> = {}): Promise<any> {
  const headers = await authenticatedHeaders();
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...body }),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export async function getArcaAdminConfig(): Promise<ArcaAdminConfig> {
  return parseAdminConfig(await callAdminAction('adminStatus'));
}

export async function saveArcaConfiguration(input: SaveArcaConfigInput): Promise<ArcaAdminConfig> {
  const hasCertificate = Boolean(input.certificate);
  const hasPrivateKey = Boolean(input.privateKey);
  if (hasCertificate !== hasPrivateKey) {
    throw new Error('Debe seleccionar juntos el certificado y la clave privada.');
  }
  for (const file of [input.certificate, input.privateKey]) {
    if (file && file.size > 50_000) throw new Error(`${file.name} supera el limite permitido de 50 KB.`);
  }
  const certificate = input.certificate ? await input.certificate.text() : undefined;
  const privateKey = input.privateKey ? await input.privateKey.text() : undefined;
  const data = await callAdminAction('saveConfig', {
    config: {
      cuit: input.cuit,
      puntoVenta: input.puntoVenta,
      environment: input.environment,
      taxProfile: input.taxProfile,
      certificate,
      privateKey,
    },
  });
  statusCache = null;
  return parseAdminConfig(data);
}

export async function deleteArcaConfiguration(): Promise<ArcaAdminConfig> {
  const data = await callAdminAction('deleteConfig');
  statusCache = null;
  return parseAdminConfig(data);
}

export interface ArcaInvoicePayload {
  tipoComprobante: number;
  puntoVenta?: number;
  cliente?: {
    tipoDoc: number;
    nroDoc: number;
    nombre?: string;
    condicionIva: number;
  };
  items?: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    ivaId: number;
    ivaBase: number;
    ivaImporte: number;
  }>;
  total: number;
  neto: number;
  ivaTotal: number;
}

export interface ArcaInvoiceResult {
  success: boolean;
  resultado?: string;
  cae?: string;
  vencimiento?: string;
  CodAutorizacion?: string;
  CAE?: string;
  Vencimiento?: string;
  CAEFchVto?: string;
  nroCmp?: number;
  puntoVenta?: number;
  tipoComprobante?: number;
  qrData?: string;
  observaciones?: Array<{ code: number; msg: string }>;
}

export const buildArcaInvoiceRequest = (payload: ArcaInvoicePayload) => ({
  action: 'createInvoice' as const,
  payload,
});

export async function createArcaInvoice(payload: ArcaInvoicePayload): Promise<ArcaInvoiceResult> {
  const headers = await authenticatedHeaders();
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildArcaInvoiceRequest(payload)),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export const TIPOS_COMPROBANTE = {
  factura_a: { id: 1, label: 'Factura A', requiereCuit: true, condicionIva: 1 },
  factura_b: { id: 6, label: 'Factura B', requiereCuit: false, condicionIva: 5 },
  factura_c: { id: 11, label: 'Factura C', requiereCuit: false, condicionIva: 6 },
  ticket_a: { id: 201, label: 'Ticket Factura A', requiereCuit: true, condicionIva: 1 },
  ticket_b: { id: 206, label: 'Ticket Factura B', requiereCuit: false, condicionIva: 5 },
} as const;

export const TIPOS_DOCUMENTO = [
  { id: 99, label: 'Consumidor Final' },
  { id: 80, label: 'CUIT' },
  { id: 96, label: 'DNI' },
];

export const CONDICIONES_IVA_RECEPTOR = [
  { id: 1, label: 'IVA Responsable Inscripto' },
  { id: 2, label: 'IVA No Responsable' },
  { id: 3, label: 'IVA Exento' },
  { id: 4, label: 'IVA Sujeto Exento' },
  { id: 5, label: 'Consumidor Final' },
  { id: 6, label: 'IVA Monotributo' },
  { id: 12, label: 'IVA No Alcanzado' },
];
