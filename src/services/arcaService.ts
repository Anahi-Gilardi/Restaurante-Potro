// arcaService.ts — Proxy para la API de ARCA
// Las llamadas reales a @arcasdk/core se hacen desde /api/arca.ts (server-side)

interface ArcaCredentials {
  cuit: number;
  key: string;
  cert: string;
  production?: boolean;
}

const STORAGE_KEY = 'el_patron_arca_creds';

const API_URL = '/api/arca';

function getStoredCredentials(): ArcaCredentials | null {
  try {
    const env = (import.meta as any).env || {};
    const envCuit = env.VITE_ARCA_CUIT;
    const envKey = env.VITE_ARCA_KEY;
    const envCert = env.VITE_ARCA_CERT;
    if (envCuit && envKey && envCert) {
      return { cuit: Number(envCuit), key: envKey, cert: envCert, production: env.VITE_ARCA_PROD === 'true' };
    }
    // Only store non-sensitive metadata, credentials must be in env vars or entered each session
    return null;
  } catch { return null; }
}

export function isArcaConfigured(): boolean {
  return getStoredCredentials() !== null;
}

export async function testArcaConnection(): Promise<boolean> {
  const creds = getStoredCredentials();
  if (!creds) return false;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test', credentials: creds }),
    });
    return res.ok;
  } catch { return false; }
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
  docTipo?: number;
  docNro?: number;
  condicionIva?: number;
  total: number;
  neto: number;
  ivaTotal: number;
  ivaItems?: { Id: number; BaseImp: number; Importe: number }[];
}

export interface ArcaInvoiceResult {
  success: boolean;
  cae?: string;
  vencimiento?: string;
  CodAutorizacion?: string;
  CAE?: string;
  Vencimiento?: string;
  CAEFchVto?: string;
}

export async function createArcaInvoice(payload: ArcaInvoicePayload): Promise<ArcaInvoiceResult> {
  const creds = getStoredCredentials();
  if (!creds) throw new Error('ARCA no está configurado');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'createInvoice', credentials: creds, payload }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión con ARCA' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data;
}

// ─── Tipos de comprobante y lookup helpers ───────────────────

export const TIPOS_COMPROBANTE = {
  'factura_a': { id: 1, label: 'Factura A', requiereCuit: true, condicionIva: 1 },
  'factura_b': { id: 6, label: 'Factura B', requiereCuit: false, condicionIva: 5 },
  'factura_c': { id: 11, label: 'Factura C', requiereCuit: false, condicionIva: 6 },
  'ticket_a': { id: 201, label: 'Ticket Factura A', requiereCuit: true, condicionIva: 1 },
  'ticket_b': { id: 206, label: 'Ticket Factura B', requiereCuit: false, condicionIva: 5 },
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
