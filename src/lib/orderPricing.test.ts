import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePedidoTotal, canMergePedidoItems, resolvePedidoItemUnitPrice, roundCurrency } from './orderPricing';

const menu = [{ id_producto: 'cafe', precio_venta: 3500 }];

test('conserva el precio histórico aunque el menú haya cambiado', () => {
  const item = { id_producto: 'cafe', precio_unitario: 2500 };
  assert.equal(resolvePedidoItemUnitPrice(item, menu), 2500);
  assert.equal(calculatePedidoTotal({ items: [{ ...item, nombre: 'Café', cantidad: 2, categoria: 'Bebidas' }] }, menu), 5000);
});

test('respeta un producto bonificado con precio histórico cero', () => {
  assert.equal(resolvePedidoItemUnitPrice({ id_producto: 'cafe', precio_unitario: 0 }, menu), 0);
});

test('usa el precio actual únicamente para pedidos antiguos sin snapshot', () => {
  assert.equal(resolvePedidoItemUnitPrice({ id_producto: 'cafe' }, menu), 3500);
  assert.equal(resolvePedidoItemUnitPrice({ id_producto: 'eliminado' }, menu), 0);
});

test('redondea importes monetarios de forma reproducible a centavos', () => {
  assert.equal(roundCurrency(0.1 + 0.2), 0.3);
  assert.equal(roundCurrency(123.456), 123.46);
});

test('solo fusiona agregados del mismo producto cuando conservan el mismo precio', () => {
  const current = { id_producto: 'p1', precio_unitario: 100, estado: 'pendiente' as const };
  assert.equal(canMergePedidoItems(current, { id_producto: 'p1', precio_unitario: 100 }, menu), true);
  assert.equal(canMergePedidoItems(current, { id_producto: 'p1', precio_unitario: 120 }, menu), false);
  assert.equal(canMergePedidoItems(current, { id_producto: 'p2', precio_unitario: 100 }, menu), false);
});
