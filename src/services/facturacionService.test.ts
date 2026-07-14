import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeFacturas, type Factura } from './facturacionService';

const factura = (id: string, total: number): Factura => ({
  id_factura: id,
  nro_ticket: id,
  cliente: 'Consumidor Final',
  cuit: '99-99999999-9',
  total,
  iva_veintiuno: total * 0.21,
  medio_pago: 'efectivo',
  fecha: '12:00 hs',
  estado: 'autorizado'
});

test('combina respaldo local y remoto sin duplicar comprobantes', () => {
  const merged = mergeFacturas(
    [factura('fac_2', 200), factura('fac_1', 150)],
    [factura('fac_1', 100), factura('fac_0', 50)]
  );

  assert.deepEqual(merged.map(item => item.id_factura), ['fac_2', 'fac_1', 'fac_0']);
  assert.equal(merged.find(item => item.id_factura === 'fac_1')?.total, 150);
});
