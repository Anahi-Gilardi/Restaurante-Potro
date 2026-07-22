// Proxy cliente para ARCA. Los certificados y la clave privada nunca se
// persisten en el navegador: el backend los cifra o usa secretos de Vercel.

import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';

const SECURE_ARCA_ORIGIN = 'https://restaurante-potro-anahi.vercel.app';
const STATUS_TTL_MS = 60_000;

export function getArcaApiEndpoint(
  locationLike: Pick<Location, 'hostname'> | undefined = globalThis.location,
): string {
  const configured = String((import.meta as { env?: Record<string, unknown> }).env?.VITE_ARCA_API_URL ?? '').trim();
  if (configured) return configured;
  if (locationLike?.hostname === 'restaurante-potro.vercel.app') {
    return `${SECURE_ARCA_ORIGIN}/api/arca`;
  }
  return '/api/arca';
}

export interface ArcaStatus {
  configured: boolean;
  connected: boolean;
  environment: 'homologacion' | 'produccion' | null;
  puntoVenta: number | null;
  cuitMasked: string | null;
  taxProfile: 'monotributo' | null;
  source: 'database' | 'environment' | null;
  legalDataComplete: boolean;
  pointOfSaleValid: boolean | null;
  authorizedPointsOfSale: number[];
  message: string;
}

export interface ArcaAdminConfig extends ArcaStatus {
  certificateConfigured: boolean;
  privateKeyConfigured: boolean;
  certificateSubject: string | null;
  certificateSerial: string | null;
  certificateValidFrom: string | null;
  certificateValidTo: string | null;
  legalName: string;
  tradeName: string;
  commercialAddress: string;
  grossIncomeNumber: string;
  activityStartDate: string;
  updatedAt: string | null;
}

export interface SaveArcaConfigInput {
  cuit: string;
  puntoVenta: number;
  environment: 'homologacion' | 'produccion';
  taxProfile: 'monotributo';
  legalName: string;
  tradeName: string;
  commercialAddress: string;
  grossIncomeNumber: string;
  activityStartDate: string;
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
  legalDataComplete: false,
  pointOfSaleValid: null,
  authorizedPointsOfSale: [],
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
  legalDataComplete: Boolean(data.legalDataComplete),
  pointOfSaleValid: typeof data.pointOfSaleValid === 'boolean' ? data.pointOfSaleValid : null,
  authorizedPointsOfSale: Array.isArray(data.authorizedPointsOfSale)
    ? data.authorizedPointsOfSale.filter((value: unknown) => Number.isInteger(value) && Number(value) > 0).map(Number)
    : [],
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
  legalName: typeof data.legalName === 'string' ? data.legalName : '',
  tradeName: typeof data.tradeName === 'string' ? data.tradeName : '',
  commercialAddress: typeof data.commercialAddress === 'string' ? data.commercialAddress : '',
  grossIncomeNumber: typeof data.grossIncomeNumber === 'string' ? data.grossIncomeNumber : '',
  activityStartDate: typeof data.activityStartDate === 'string' ? data.activityStartDate : '',
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
    const response = await fetch(getArcaApiEndpoint(), { method: 'GET', headers: { Accept: 'application/json' } });
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
    const response = await fetch(getArcaApiEndpoint(), {
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
  const response = await fetch(getArcaApiEndpoint(), {
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
      legalName: input.legalName,
      tradeName: input.tradeName,
      commercialAddress: input.commercialAddress,
      grossIncomeNumber: input.grossIncomeNumber,
      activityStartDate: input.activityStartDate,
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
  idempotencyKey: string;
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
  emissionId?: string;
  fiscalStatus?: 'authorizing' | 'authorized' | 'observed' | 'rejected' | 'uncertain';
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
  emitter?: {
    cuit: string;
    legalName: string;
    tradeName: string;
    commercialAddress: string;
    grossIncomeNumber: string;
    activityStartDate: string;
    taxCondition: 'Monotributo';
  };
  error?: string;
}

export const buildArcaInvoiceRequest = (payload: ArcaInvoicePayload) => ({
  action: 'createInvoice' as const,
  payload,
});

export async function createArcaInvoice(payload: ArcaInvoicePayload): Promise<ArcaInvoiceResult> {
  const headers = await authenticatedHeaders();
  const response = await fetch(getArcaApiEndpoint(), {
    method: 'POST',
    headers,
    body: JSON.stringify(buildArcaInvoiceRequest(payload)),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export async function createArcaCreditNote(relatedEmissionId: string, idempotencyKey: string): Promise<ArcaInvoiceResult> {
  const headers = await authenticatedHeaders();
  const response = await fetch(getArcaApiEndpoint(), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'createCreditNote', relatedEmissionId, idempotencyKey }),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export async function reconcileArcaInvoice(emissionId: string): Promise<ArcaInvoiceResult> {
  const headers = await authenticatedHeaders();
  const response = await fetch(getArcaApiEndpoint(), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'reconcileInvoice', emissionId }),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export const TIPOS_COMPROBANTE = {
  factura_c: { id: 11, label: 'Factura C', requiereCuit: false, condicionIva: 6 },
  nota_credito_c: { id: 13, label: 'Nota de Credito C', requiereCuit: false, condicionIva: 6 },
} as const;

export const TIPOS_DOCUMENTO = [
  { id: 99, label: 'Consumidor Final' },
  { id: 80, label: 'CUIT' },
  { id: 96, label: 'DNI' },
];

export const CONDICIONES_IVA_RECEPTOR = [
  { id: 1, label: 'IVA Responsable Inscripto' },
  { id: 4, label: 'IVA Sujeto Exento' },
  { id: 5, label: 'Consumidor Final' },
  { id: 6, label: 'IVA Monotributo' },
  { id: 7, label: 'Sujeto No Categorizado' },
  { id: 8, label: 'Proveedor del Exterior' },
  { id: 9, label: 'Cliente del Exterior' },
  { id: 10, label: 'IVA Liberado - Ley 19.640' },
  { id: 13, label: 'Monotributista Social' },
  { id: 15, label: 'IVA No Alcanzado' },
  { id: 16, label: 'Monotributo Trabajador Independiente Promovido' },
];
