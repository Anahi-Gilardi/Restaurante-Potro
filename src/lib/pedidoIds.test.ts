import assert from 'node:assert/strict';
import test from 'node:test';
import { createClientPedidoId } from './pedidoIds';

test('createClientPedidoId genera ids numericos con tiempo y aleatorio', () => {
  assert.equal(createClientPedidoId([], 1710000000000, 0.123), 1710000000000123);
});

test('createClientPedidoId evita colision con ids existentes mayores', () => {
  assert.equal(createClientPedidoId([999999999999], 1000, 0.123), 1000000000000);
});
