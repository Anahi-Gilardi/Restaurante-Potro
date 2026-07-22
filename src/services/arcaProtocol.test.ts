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

test('CORS fiscal acepta solo los dominios administrados', () => {
  assert.equal(__arcaTestables.isAllowedOrigin('https://restaurante-potro.vercel.app'), true);
  assert.equal(__arcaTestables.isAllowedOrigin('https://restaurante-potro-anahi.vercel.app'), true);
  assert.equal(__arcaTestables.isAllowedOrigin('https://sitio-malicioso.example'), false);
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

test('rechaza CUIT receptor con dígito verificador inválido', () => {
  assert.equal(__arcaTestables.isValidArgentineCuit('27426946136'), true);
  assert.throws(() => __arcaTestables.validateInvoicePayload({
    idempotencyKey: 'fac_test_bad_cuit',
    tipoComprobante: 11,
    total: 1500,
    cliente: { tipoDoc: 80, nroDoc: 27426946137, condicionIva: 6 },
  }), /verificador/);
});

test('rechaza una condición IVA receptor fuera de la tabla admitida', () => {
  assert.throws(() => __arcaTestables.validateInvoicePayload({
    idempotencyKey: 'fac_test_bad_vat',
    tipoComprobante: 11,
    total: 1500,
    cliente: { tipoDoc: 96, nroDoc: 42694613, condicionIva: 99 },
  }), /condicion frente al IVA/);
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

test('interpreta los puntos de venta CAE informados por FEParamGetPtosVenta', () => {
  const points = __arcaTestables.parseArcaPointsOfSale(`
    <FEParamGetPtosVentaResult>
      <ResultGet>
        <PtoVenta><Nro>2</Nro><EmisionTipo>CAE - MONOTRIBUTO</EmisionTipo><Bloqueado>N</Bloqueado><FchBaja>NULL</FchBaja></PtoVenta>
        <PtoVenta><Nro>7</Nro><EmisionTipo>CAEA</EmisionTipo><Bloqueado>S</Bloqueado><FchBaja>20260720</FchBaja></PtoVenta>
      </ResultGet>
    </FEParamGetPtosVentaResult>
  `);

  assert.deepEqual(points, [
    { number: 2, emissionType: 'CAE - MONOTRIBUTO', blocked: false, disabledAt: null },
    { number: 7, emissionType: 'CAEA', blocked: true, disabledAt: '20260720' },
  ]);
});

test('bloquea un punto no habilitado y enumera solamente alternativas CAE activas', () => {
  const result = __arcaTestables.pointOfSaleValidation(1, [
    { number: 2, emissionType: 'CAE - MONOTRIBUTO', blocked: false, disabledAt: null },
    { number: 3, emissionType: 'CAE', blocked: true, disabledAt: null },
    { number: 4, emissionType: 'CAEA', blocked: false, disabledAt: null },
  ]);

  assert.equal(result.valid, false);
  assert.deepEqual(result.available, [2]);
  assert.match(result.message, /00001/);
  assert.match(result.message, /RECE para aplicativo y web services/);
});

test('acepta el tipo CAE - MONOTRIBUTO informado por ARCA sin confundirlo con CAEA', () => {
  const valid = __arcaTestables.pointOfSaleValidation(2, [
    { number: 2, emissionType: 'CAE - MONOTRIBUTO', blocked: false, disabledAt: null },
  ]);
  const caea = __arcaTestables.pointOfSaleValidation(4, [
    { number: 4, emissionType: 'CAEA', blocked: false, disabledAt: null },
  ]);

  assert.equal(valid.valid, true);
  assert.deepEqual(valid.available, [2]);
  assert.equal(caea.valid, false);
});

test('traduce el rechazo 10005 a una accion concreta sin sugerir otro numero', () => {
  const message = __arcaTestables.safeErrorMessage(new Error(
    '[10005] NO AUTORIZADO A EMITIR COMPROBANTES - EL PUNTO DE VENTA INFORMADO DEBE ESTAR DADO DE ALTA Y SER DEL TIPO RECE',
  ));

  assert.match(message, /ABM de puntos de venta/);
  assert.match(message, /RECE para aplicativo y web services/);
  assert.doesNotMatch(message, /punto de venta 2/i);
});
