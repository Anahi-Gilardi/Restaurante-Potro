import assert from 'node:assert/strict';
import test from 'node:test';
import { parseIntents, procesarComando } from './MesaAsistente';

const mesas = [
  { id_mesa: 1, numero_mesa: 'Mesa 1', capacidad: 2, zona: 'alta', estado: 'Libre' },
  { id_mesa: 2, numero_mesa: 'Mesa 2', capacidad: 2, zona: 'alta', estado: 'Ocupada' },
  { id_mesa: 3, numero_mesa: 'Mesa 3', capacidad: 2, zona: 'alta', estado: 'Libre' },
] as const;

test('distingue la cantidad de personas del numero de mesa', () => {
  assert.deepEqual(parseIntents('Sentar 2 personas en mesa 1').numeros, [1]);
  assert.equal(procesarComando('Sentar 2 personas en mesa 1', [...mesas]).mesa_id, 1);
});

test('reconoce varias mesas al solicitar una union', () => {
  const action = procesarComando('Unir mesa 1 y mesa 2', [...mesas]);
  assert.equal(action.accion, 'combinar_mesas');
  assert.deepEqual(action.mesa_id, [1, 2]);
});

test('mantiene como objetivo la mesa explicita cuando la capacidad no alcanza', () => {
  const action = procesarComando('Sentar 4 personas en mesa 3', [...mesas]);
  assert.equal(action.accion, 'sugerencia');
  assert.equal(action.mesa_id, 3);
});

test('prioriza la capacidad real configurada para la mesa', () => {
  const customMesas = [
    { id_mesa: 1, numero_mesa: 'Mesa 1', capacidad: 4, zona: 'alta', estado: 'Libre' },
  ] as const;
  const action = procesarComando('Sentar 4 personas en mesa 1', [...customMesas]);
  assert.equal(action.accion, 'cambio_estado');
  assert.equal(action.comensales, 4);
});

test('admite identificadores de mesa de tres digitos presentes en el salon', () => {
  const customMesas = [
    { id_mesa: 101, numero_mesa: 'VIP-1', capacidad: 6, zona: 'vip', estado: 'Libre' },
  ] as const;
  const action = procesarComando('Sentar 5 personas en mesa 101', [...customMesas]);
  assert.equal(action.accion, 'cambio_estado');
  assert.equal(action.mesa_id, 101);
});
