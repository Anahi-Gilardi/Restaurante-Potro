import assert from 'node:assert/strict';
import test from 'node:test';
import { canDeleteFactura, mergeFacturas, toDbFacturaPayload, type Factura } from './facturacionService';

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

test('conserva el tipo Factura C cuando fue revertida por nota de credito', () => {
  const original = { ...factura('fac_3', 350), tipo: 'C' as const, estado: 'nota_credito' as const };
  const payload = toDbFacturaPayload(original);

  assert.equal(payload.tipo_comprobante, 'Factura C');
  assert.equal(payload.fiscal_status, 'credited');
});

test('persiste el snapshot legal del cliente y los items', () => {
  const source: Factura = {
    ...factura('fac_4', 500),
    tipo: 'C',
    cliente: 'Cliente de prueba',
    documento_tipo_receptor: 96,
    moneda: 'PES',
    items: [{ descripcion: 'Cena', cantidad: 2, precio_unitario: 250, subtotal: 500 }],
  };
  const payload = toDbFacturaPayload(source);

  assert.equal(payload.cliente_nombre, 'Cliente de prueba');
  assert.equal(payload.documento_tipo_receptor, 96);
  assert.deepEqual(payload.items_json, source.items);
  assert.equal(payload.moneda, 'PES');
});

test('un comprobante con CAE no puede eliminarse', () => {
  assert.equal(canDeleteFactura({ estado: 'borrador' }), true);
  assert.equal(canDeleteFactura({ estado: 'autorizado', afip_cae: '74123456789012' }), false);
  assert.equal(canDeleteFactura({ estado: 'nota_credito', afip_cae: '74123456789013' }), false);
});
