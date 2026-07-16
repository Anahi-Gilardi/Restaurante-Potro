import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isSafeOrderItem, isSafeOrderItems } from '../../api/_orderValidation';

test('valida items de pedido con cantidades y precios acotados', () => {
  assert.equal(isSafeOrderItem({ id_producto: 'prod_1', nombre: 'Milanesa', cantidad: 2, precio_unitario: 8500 }), true);
  assert.equal(isSafeOrderItem({ id_producto: 'prod_1', nombre: 'Milanesa', cantidad: -1 }), false);
  assert.equal(isSafeOrderItem({ id_producto: 'prod_1', nombre: 'Milanesa', cantidad: 1.5 }), false);
  assert.equal(isSafeOrderItem({ id_producto: 'prod_1', nombre: 'Milanesa', cantidad: 1, precio_unitario: -10 }), false);
  assert.equal(isSafeOrderItems(new Array(101).fill({ id_producto: 'prod_1', nombre: 'Milanesa', cantidad: 1 })), false);
});

test('los endpoints de pedidos exigen una sesion autenticada y roles', () => {
  const files = [
    'api/pedidos/cargar.ts',
    'api/pedidos/[id_pedido].ts',
    'api/pedidos/[id_pedido]/agregar-item.ts',
  ];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /requireAuthenticatedDataClient\(req,/);
    assert.doesNotMatch(source, /const getSupabaseClient/);
    assert.match(source, /applyApiSecurityHeaders/);
  }
});
