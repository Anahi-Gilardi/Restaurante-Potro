export type InvoiceUiType = 'A' | 'B' | 'C' | 'X';

export interface InvoiceTypeOption {
  value: InvoiceUiType;
  label: string;
  disabled: boolean;
  fiscal: boolean;
}

/** Politica vigente para el emisor configurado como monotributista. */
export const MONOTRIBUTO_INVOICE_OPTIONS: readonly InvoiceTypeOption[] = [
  { value: 'A', label: 'Factura A (solo Responsable Inscripto)', disabled: true, fiscal: true },
  { value: 'B', label: 'Factura B (solo Responsable Inscripto)', disabled: true, fiscal: true },
  { value: 'C', label: 'Factura C (Monotributo)', disabled: false, fiscal: true },
  { value: 'X', label: 'Comprobante X (interno, sin valor fiscal)', disabled: false, fiscal: false },
] as const;

export const canIssueFiscalVoucherAsMonotributo = (type: InvoiceUiType): boolean => type === 'C';
