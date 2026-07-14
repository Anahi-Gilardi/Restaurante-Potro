import assert from 'node:assert/strict';
import test from 'node:test';
import { __arcaTestables } from '../../api/arca';

test('Factura C no informa IVA separado', () => {
  const result = __arcaTestables.validateInvoicePayload({
    tipoComprobante: 11,
    total: 1500,
    neto: 1239.67,
    ivaTotal: 260.33,
    cliente: { tipoDoc: 99, nroDoc: 0, condicionIva: 6 },
  });
  assert.equal(result.net, 1500);
  assert.equal(result.vat, 0);
  assert.equal(result.isFacturaC, true);
});

test('rechaza importes cuyo neto e IVA no coinciden con el total', () => {
  assert.throws(() => __arcaTestables.validateInvoicePayload({
    tipoComprobante: 6,
    total: 121,
    neto: 80,
    ivaTotal: 21,
  }), /no coincide/);
});

test('la fecha fiscal usa formato AAAAMMDD', () => {
  assert.match(__arcaTestables.arcaDate(), /^\d{8}$/);
});

test('QR v1 usa CAE tipo E y omite documento para Consumidor Final', () => {
  const qr = __arcaTestables.buildFiscalQrPayload({
    date: '20260714',
    cuit: 27426946136,
    pointOfSale: 1,
    voucherType: 11,
    voucherNumber: 42,
    total: 1500,
    documentType: 99,
    documentNumber: 0,
    cae: '74123456789012',
  });
  assert.equal(qr.tipoCodAut, 'E');
  assert.equal(qr.ptoVta, 1);
  assert.equal('tipoDocRec' in qr, false);
  assert.equal('nroDocRec' in qr, false);
});

test('lee el CUIT del atributo X.509 serialNumber emitido por ARCA', () => {
  const value = __arcaTestables.getCertificateField({
    subject: {
      attributes: [{ name: 'serialNumber', type: '2.5.4.5', value: 'CUIT 27426946136' }],
    },
  } as any, 'serialNumber');
  assert.equal(value, 'CUIT 27426946136');
});
