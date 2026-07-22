import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateMesaDragPosition } from './mesaDrag';

test('mueve la mesa conservando el punto exacto donde se la toma', () => {
  assert.deepEqual(calculateMesaDragPosition({
    pointerX: 210,
    pointerY: 180,
    offsetX: 20,
    offsetY: 15,
    width: 60,
    height: 42,
  }), { x: 190, y: 165 });
});

test('limita la mesa al interior del plano', () => {
  assert.deepEqual(calculateMesaDragPosition({
    pointerX: -100,
    pointerY: 900,
    offsetX: 20,
    offsetY: 15,
    width: 60,
    height: 42,
  }), { x: 15, y: 563 });
});

test('ajusta a una grilla fina solamente al finalizar', () => {
  assert.deepEqual(calculateMesaDragPosition({
    pointerX: 212,
    pointerY: 184,
    offsetX: 20,
    offsetY: 15,
    width: 60,
    height: 42,
    snap: 5,
  }), { x: 190, y: 170 });
});
