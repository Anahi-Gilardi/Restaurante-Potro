export interface FiscalCustomerDocument {
  documentType: 80 | 96 | 99;
  documentNumber: number;
  consumerFinal: boolean;
}

export const isValidArgentineCuit = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits)) return false;
  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = factors.reduce((total, factor, index) => total + Number(digits[index]) * factor, 0);
  const remainder = sum % 11;
  const verifier = remainder === 0 ? 0 : remainder === 1 ? (digits[0] === '5' ? 0 : 9) : 11 - remainder;
  return verifier === Number(digits[10]);
};

export const parseFiscalCustomerDocument = (value: string): FiscalCustomerDocument => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed === '' || trimmed === '99-99999999-9' || digits === '99999999999') {
    return { documentType: 99, documentNumber: 0, consumerFinal: true };
  }
  if (/^\d{7,8}$/.test(digits)) {
    return { documentType: 96, documentNumber: Number(digits), consumerFinal: false };
  }
  if (/^\d{11}$/.test(digits)) {
    if (!isValidArgentineCuit(digits)) throw new Error('El CUIT del cliente no supera la validación del dígito verificador.');
    return { documentType: 80, documentNumber: Number(digits), consumerFinal: false };
  }
  throw new Error('Ingrese un DNI de 7 u 8 dígitos, un CUIT válido o seleccione Consumidor Final.');
};
