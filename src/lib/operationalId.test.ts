import assert from 'node:assert/strict';
import test from 'node:test';

import { createOperationalId } from './operationalId';

test('genera IDs legibles con el prefijo solicitado', () => {
  assert.match(createOperationalId('MOV', 1_750_000_000_000), /^MOV-[A-Z0-9]+-00$/);
  assert.match(createOperationalId('OC', 1_750_000_000_001), /^OC-[A-Z0-9]+-00$/);
});

test('no repite IDs aunque se creen dentro del mismo milisegundo', () => {
  const timestamp = 1_750_000_000_100;
  const first = createOperationalId('MOV', timestamp);
  const second = createOperationalId('MOV', timestamp);

  assert.notEqual(first, second);
  assert.match(first, /-00$/);
  assert.match(second, /-01$/);
});
