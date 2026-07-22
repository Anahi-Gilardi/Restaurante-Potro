import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pedido } from '../types';
import { isSameTable, mergeTableOrders } from './tableOrders';

const order = (overrides: Partial<Pedido> = {}): Pedido => ({
  id_pedido: 1,
  id_mesa: 4,
  numero_mesa: 'Mesa 4',
  mozo: 'Enzo',
  estado_comanda: 'entregado',
  items: [],
  fecha_hora: new Date('2026-07-21T20:00:00-03:00'),
  minutos_transcurridos: 10,
  origen: 'Mozo',
  ...overrides,
});

test('identifica la mesa por id o nombre normalizado sin mezclar delivery', () => {
  assert.equal(isSameTable({ id_mesa: 4, numero_mesa: 'Mesa 4' }, { id_mesa: 4, numero_mesa: '4' }), true);
  assert.equal(isSameTable({ numero_mesa: 'Mesa VIP-1' }, { numero_mesa: 'vip-1' }), true);
  assert.equal(isSameTable({ id_mesa: 4, numero_mesa: 'DELIVERY Rappi 10' }, { id_mesa: 4, numero_mesa: 'DELIVERY Rappi 11' }), false);
});

test('consolida cantidades cuando producto y precio historico coinciden', () => {
  const merged = mergeTableOrders([
    order({ items: [{ id_producto: 'cafe', nombre: 'Cafe', cantidad: 1, categoria: 'Bebidas', precio_unitario: 2500 }] }),
    order({ id_pedido: 2, items: [{ id_producto: 'cafe', nombre: 'Cafe', cantidad: 2, categoria: 'Bebidas', precio_unitario: 2500 }] }),
  ], [{ id_producto: 'cafe', precio_venta: 3500 }]);

  assert.equal(merged?.items.length, 1);
  assert.equal(merged?.items[0].cantidad, 3);
  assert.equal(merged?.items[0].precio_unitario, 2500);
});

test('conserva lineas separadas si el precio cambio entre comandas', () => {
  const merged = mergeTableOrders([
    order({ items: [{ id_producto: 'cafe', nombre: 'Cafe', cantidad: 1, categoria: 'Bebidas', precio_unitario: 2500 }] }),
    order({ id_pedido: 2, items: [{ id_producto: 'cafe', nombre: 'Cafe', cantidad: 1, categoria: 'Bebidas', precio_unitario: 3500 }] }),
  ], [{ id_producto: 'cafe', precio_venta: 3500 }]);

  assert.deepEqual(merged?.items.map(item => item.precio_unitario), [2500, 3500]);
});

test('no descarta lineas antiguas aunque falte el identificador de producto', () => {
  const legacyItem = { id_producto: '', nombre: 'Item manual', cantidad: 1, categoria: 'Cocina', precio_unitario: 1000 };
  const merged = mergeTableOrders([order({ items: [legacyItem] })], []);
  assert.deepEqual(merged?.items, [legacyItem]);
});
