import assert from 'node:assert/strict';
import test from 'node:test';
import { __arcaTestables } from '../../api/arca';

test('Factura C no informa IVA separado', () => {
  const result = __arcaTestables.validateInvoicePayload({
    idempotencyKey: 'fac_test_001',
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

test('rechaza tipos de comprobante incompatibles con Monotributo', () => {
  assert.throws(() => __arcaTestables.validateInvoicePayload({
    idempotencyKey: 'fac_test_002',
    tipoComprobante: 6,
    total: 121,
    neto: 80,
    ivaTotal: 21,
  }), /no soportado/);
});

test('exige idempotencia e identificacion en operaciones grandes a consumidor final', () => {
  assert.throws(() => __arcaTestables.validateInvoicePayload({
    tipoComprobante: 11,
    total: 1000,
    cliente: { tipoDoc: 99, nroDoc: 0, condicionIva: 5 },
  }), /idempotencia/);

  assert.throws(() => __arcaTestables.validateInvoicePayload({
    idempotencyKey: 'fac_test_003',
    tipoComprobante: 11,
    total: 10_000_000,
    cliente: { tipoDoc: 99, nroDoc: 0, condicionIva: 5 },
  }), /identificar/);
});

test('acepta Factura C identificada con DNI y condicion IVA obligatoria', () => {
  const result = __arcaTestables.validateInvoicePayload({
    idempotencyKey: 'fac_test_004',
    tipoComprobante: 11,
    total: 10_000_000,
    cliente: { tipoDoc: 96, nroDoc: 42694613, condicionIva: 5 },
  });
  assert.equal(result.documentType, 96);
  assert.equal(result.vatCondition, 5);
});

test('la fecha fiscal usa formato AAAAMMDD', () => {
  assert.match(__arcaTestables.arcaDate(), /^\d{8}$/);
});

test('el uniqueId de WSAA respeta el rango unsignedInt del schema', () => {
  const xml = __arcaTestables.buildLoginTicketRequest();
  const uniqueId = Number(xml.match(/<uniqueId>(\d+)<\/uniqueId>/)?.[1]);
  assert.ok(Number.isInteger(uniqueId));
  assert.ok(uniqueId >= 0 && uniqueId <= 4_294_967_295);
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
