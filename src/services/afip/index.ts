export { solicitarCae, generarQrData } from './wsfe';
export { getAccessToken } from './auth';
export type { AfipConfig, AfipInvoiceRequest, AfipInvoiceResponse, AfipEnvironment } from './types';

export const AFIP_PTO_VTA = 1; // Punto de venta por defecto

/** Determina tipo de comprobante según CUIT del cliente */
export function determinarTipoComprobante(cuit: string): 1 | 6 | 11 {
  if (!cuit || cuit === '99-99999999-9') return 6; // Factura B (Consumidor Final)
  const prefix = cuit.replace(/-/g, '').slice(0, 2);
  if (prefix === '20' || prefix === '27' || prefix === '30' || prefix === '33') return 1; // Factura A (RI)
  return 6; // Factura B (Monotributo / CF)
}

/** Parsea CUIT con formato 20-12345678-9 a número */
export function parseCuit(cuit: string): number {
  return parseInt(cuit.replace(/-/g, ''), 10);
}

/** Calcula IVA 21% a partir del neto */
export function calcularIva(neto: number, alicuota = 21): number {
  return parseFloat((neto * alicuota / 100).toFixed(2));
}
