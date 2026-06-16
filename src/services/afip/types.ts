export type AfipEnvironment = 'homologacion' | 'produccion';

export interface AfipConfig {
  environment: AfipEnvironment;
  cuit: number;
  certBase64: string;
  keyBase64: string;
}

export interface WsaaCredentials {
  token: string;
  sign: string;
  expiresAt: Date;
}

export interface AfipInvoiceRequest {
  /** 1=Productos, 2=Servicios, 3=Productos y Servicios */
  Concepto: 1 | 2 | 3;
  /** 80=CUIT, 96=DNI, etc */
  DocTipo: number;
  /** Número de documento */
  DocNro: number;
  /** 1=Fiscal A, 6=Fiscal B, 11=Fiscal C */
  CbteTipo: 1 | 6 | 11;
  /** Punto de venta (4 dígitos) */
  PtoVta: number;
  /** Importe total */
  ImpTotal: number;
  /** Importe neto gravado */
  ImpNeto: number;
  /** Importe de IVA */
  ImpIVA: number;
  /** Importe de tributos */
  ImpTrib?: number;
  /** Moneda (default PES) */
  MonId?: string;
  /** Cotización (default 1) */
  MonCotiz?: number;
  /** Fecha del comprobante (yyyy-mm-dd) */
  FechaCbte: string;
  /** Array de IVA */
  Iva?: Array<{ Id: number; BaseImp: number; Importe: number }>;
}

export interface AfipInvoiceResponse {
  CAE: string;
  CAEFchVto: string;
  Resultado: 'A' | 'O' | 'R';
  Obs?: Array<{ Code: number; Msg: string }>;
  vto: string;
}

export interface ArcaQrData {
  ver: number;
  fecha: string;
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  moneda: string;
  ctz: number;
  tipoDocRec: number;
  nroDocRec: number;
  tipoCodAut: number;
  codAut: number;
}

export const AFIP_ENDPOINTS: Record<AfipEnvironment, { wsaa: string; wsfe: string }> = {
  homologacion: {
    wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  },
  produccion: {
    wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
    wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
  },
};

export const IVA_ALIQUOTS = [
  { id: 3, desc: '0%', alicuota: 0 },
  { id: 4, desc: '10.5%', alicuota: 10.5 },
  { id: 5, desc: '21%', alicuota: 21 },
  { id: 6, desc: '27%', alicuota: 27 },
] as const;
