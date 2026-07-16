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

/** Numeracion propia de tickets de consumo. Nunca usa punto de venta ni secuencia ARCA. */
export const internalTicketPreview = (
  existingVoucherNumbers: readonly string[] = [],
): string => {
  const lastInternalNumber = existingVoucherNumbers
    .filter(value => value.startsWith('T-'))
    .map(value => Number(value.split('-').pop() ?? 0))
    .reduce((maximum, value) => Math.max(maximum, Number.isFinite(value) ? value : 0), 0);
  return `T-${String(lastInternalNumber + 1).padStart(8, '0')}`;
};

const padPointOfSale = (value: number | null | undefined): string | null =>
  Number.isInteger(value) && Number(value) > 0 ? String(value).padStart(4, '0') : null;

export const fiscalVoucherPreview = (
  type: 'C' | 'X',
  pointOfSale: number | null | undefined,
  existingVoucherNumbers: readonly string[] = [],
): string => {
  if (type === 'C') {
    const point = padPointOfSale(pointOfSale);
    return point ? `C-${point}-PENDIENTE-ARCA` : 'C-PV-PENDIENTE-ARCA';
  }

  const lastInternalNumber = existingVoucherNumbers
    .filter(value => value.startsWith('X-'))
    .map(value => Number(value.split('-').pop() ?? 0))
    .reduce((maximum, value) => Math.max(maximum, Number.isFinite(value) ? value : 0), 0);
  return `X-0000-${String(lastInternalNumber + 1).padStart(8, '0')}`;
};
