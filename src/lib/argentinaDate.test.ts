import assert from 'node:assert/strict';
import test from 'node:test';
import { argentinaDateIso } from './argentinaDate';

test('mantiene el día comercial argentino durante el turno noche', () => {
  assert.equal(argentinaDateIso(new Date('2026-07-15T01:30:00.000Z')), '2026-07-14');
});

test('cambia de día a medianoche de Buenos Aires', () => {
  assert.equal(argentinaDateIso(new Date('2026-07-15T03:00:00.000Z')), '2026-07-15');
});
