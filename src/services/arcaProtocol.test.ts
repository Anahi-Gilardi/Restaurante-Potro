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
