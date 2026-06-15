import { Arca } from '@arcasdk/core';
import type { InvoiceData } from '@arcasdk/core';

interface ArcaConfig {
  cuit: number;
  key: string;
  cert: string;
  production?: boolean;
}

let arcaInstance: Arca | null = null;
let arcaConfig: ArcaConfig | null = null;

const STORAGE_KEY = 'el_patron_arca_config';

export function saveArcaConfig(config: ArcaConfig): void {
  arcaConfig = config;
  arcaInstance = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, key: '', cert: '' }));
  } catch {}
}

export function getArcaConfig(): ArcaConfig | null {
  if (arcaConfig) return arcaConfig;
  try {
    const env = (import.meta as any).env || {};
    const envCuit = env.VITE_ARCA_CUIT;
    const envKey = env.VITE_ARCA_KEY;
    const envCert = env.VITE_ARCA_CERT;
    if (envCuit && envKey && envCert) {
      arcaConfig = { cuit: Number(envCuit), key: envKey, cert: envCert, production: env.VITE_ARCA_PROD === 'true' };
      return arcaConfig;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.cuit) return parsed;
    }
  } catch {}
  return null;
}

export function isArcaConfigured(): boolean {
  return getArcaConfig() !== null;
}

async function getArca(): Promise<Arca> {
  if (arcaInstance) return arcaInstance;
  const config = getArcaConfig();
  if (!config) throw new Error('ARCA no está configurado. Configure CUIT, clave y certificado en Sistema > ARCA.');
  arcaInstance = new Arca({
    key: config.key,
    cert: config.cert,
    cuit: config.cuit,
    production: config.production ?? false,
  });
  return arcaInstance;
}

export async function clearArcaInstance(): Promise<void> {
  arcaInstance = null;
}

// ─── Factura A / B / Ticket ──────────────────────────────────────

export interface ArcaInvoicePayload {
  tipoComprobante: 1 | 6 | 11 | 201 | 206; // 1=Factura A, 6=Factura B, 11=Factura C, 201=Ticket A, 206=Ticket B
  puntoVenta: number;
  cliente: { tipoDoc: number; nroDoc: number; nombre: string; condicionIva: number };
  items: { descripcion: string; cantidad: number; precioUnitario: number; ivaId: number; ivaBase: number; ivaImporte: number }[];
  total: number;
  neto: number;
  ivaTotal: number;
}

export async function createArcaInvoice(payload: ArcaInvoicePayload) {
  const arca = await getArca();

  const comprobanteTipo = payload.tipoComprobante;
  const docTipo = payload.cliente.tipoDoc;
  const docNro = payload.cliente.nroDoc;
  const posicionIva = payload.cliente.condicionIva;

  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().split('T')[0].replace(/\-/g, '');

  const ivaItems = payload.items
    .filter(item => item.ivaId && item.ivaBase > 0)
    .map(item => ({
      Id: item.ivaId,
      BaseImp: item.ivaBase,
      Importe: item.ivaImporte,
    }));

  const invoicePayload: any = {
    CantReg: 1,
    PtoVta: payload.puntoVenta,
    CbteTipo: comprobanteTipo,
    Concepto: 1,
    DocTipo: docTipo,
    DocNro: docNro,
    CbteDesde: 1,
    CbteHasta: 1,
    CbteFch: date,
    ImpTotal: payload.total,
    ImpTotConc: 0,
    ImpNeto: payload.neto,
    ImpOpEx: 0,
    ImpIVA: payload.ivaTotal,
    ImpTrib: 0,
    MonId: 'PES',
    MonCotiz: 1,
    CondicionIVAReceptorId: posicionIva,
  };

  if (ivaItems.length > 0) {
    invoicePayload.Iva = ivaItems;
  }

  return await arca.electronicBillingService.createInvoice(invoicePayload);
}

// ─── Tipos de comprobante ARCA ──────────────────────────────────

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
  { id: 7, label: 'IVA No Alcanzado' },
];
