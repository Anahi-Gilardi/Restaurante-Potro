import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const mozoSource = readFileSync(resolve('src/components/MozoTerminal.tsx'), 'utf8');

test('la terminal de Mozo usada por App bloquea doble envío y captura precio', () => {
  assert.match(mozoSource, /checkoutInFlightRef/);
  assert.match(mozoSource, /createMozoCartIdempotencyKey/);
  assert.match(mozoSource, /precio_unitario:\s*product\.precio_venta/);
  assert.match(mozoSource, /await onCrearPedido/);
});

test('la terminal informa los comensales reales al ocupar la mesa', () => {
  assert.match(mozoSource, /comensales,/);
});
