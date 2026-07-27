import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260727060000_atomic_orders_and_stock.sql'),
  'utf8'
);
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');

test('pedido, mesa y stock se confirman mediante funciones transaccionales', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.save_order_transaction/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.transition_order_transaction/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.close_table_orders_transaction/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /app_apply_order_stock/);
  assert.match(migration, /La mesa conserva comandas activas fuera del cierre/);
  assert.match(migration, /PERFORM public\.app_apply_order_stock\(v_order_id, false, p_allow_negative\)/);
});

test('la aplicacion usa las transacciones para crear, avanzar y cerrar comandas', () => {
  assert.match(app, /orderTransactionService\.saveOrder/);
  assert.match(app, /orderTransactionService\.transitionOrder/);
  assert.match(app, /orderTransactionService\.closeOrders/);
  assert.doesNotMatch(app, /Background save for new order failed/);
});
