import assert from 'node:assert/strict';
import test from 'node:test';
import type { Factura } from './facturacionService';
import { validateSaleBundle } from './salesPersistenceService';

const factura: Factura = {
  id_factura: 'fac_1',
  nro_ticket: 'X-0001-00000001',
  cliente: 'Consumidor Final',
  cuit: '',
  total: 1000,
  iva_veintiuno: 0,
  medio_pago: 'efectivo',
  fecha: '12:00 hs',
  estado: 'borrador',
  tipo: 'ticket',
};

test('valida un cobro cuyo desglose coincide con el comprobante', () => {
  assert.doesNotThrow(() => validateSaleBundle({
    factura,
    pagos: [{ id_pago: 'pag_1', id_factura: 'fac_1', monto: 1000, metodo: 'efectivo', fecha: new Date().toISOString() }],
  }));
});

test('rechaza pagos huérfanos o con suma diferente', () => {
  assert.throws(() => validateSaleBundle({
    factura,
    pagos: [{ id_pago: 'pag_2', id_factura: 'otra', monto: 1000, metodo: 'efectivo', fecha: new Date().toISOString() }],
  }), /desglose/);
  assert.throws(() => validateSaleBundle({
    factura,
    pagos: [{ id_pago: 'pag_3', id_factura: 'fac_1', monto: 900, metodo: 'efectivo', fecha: new Date().toISOString() }],
  }), /no coincide/);
});
