// Proxy cliente para ARCA. Los certificados y la clave privada viven
// exclusivamente en variables de entorno del servidor de Vercel.

import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';

const API_URL = '/api/arca';
const STATUS_TTL_MS = 60_000;

export interface ArcaStatus {
  configured: boolean;
  connected: boolean;
  environment: 'homologacion' | 'produccion' | null;
  puntoVenta: number | null;
  cuitMasked: string | null;
  message: string;
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
  message,
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
    const status: ArcaStatus = {
      configured: Boolean(data.configured),
      connected: Boolean(data.connected),
      environment: data.environment === 'produccion' ? 'produccion' : data.environment === 'homologacion' ? 'homologacion' : null,
      puntoVenta: Number.isInteger(data.puntoVenta) ? data.puntoVenta : null,
      cuitMasked: typeof data.cuitMasked === 'string' ? data.cuitMasked : null,
      message: String(data.message || ''),
    };
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
    const status: ArcaStatus = {
      configured: Boolean(data.configured),
      connected: response.ok && Boolean(data.success),
      environment: data.environment === 'produccion' ? 'produccion' : data.environment === 'homologacion' ? 'homologacion' : null,
      puntoVenta: Number.isInteger(data.puntoVenta) ? data.puntoVenta : null,
      cuitMasked: typeof data.cuitMasked === 'string' ? data.cuitMasked : null,
      message: String(data.message || data.error || ''),
    };
    statusCache = { value: status, expiresAt: Date.now() + STATUS_TTL_MS };
    return response.ok
      ? { success: true, status }
      : { success: false, status, error: String(data.error || `HTTP ${response.status}`) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, status: disconnectedStatus(message), error: message };
  }
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
