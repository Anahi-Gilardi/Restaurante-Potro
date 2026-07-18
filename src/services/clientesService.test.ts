process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import test from 'node:test';
import { clientesService } from './clientesService';

const storage: Record<string, string> = {};

global.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
  key: (index: number) => Object.keys(storage)[index] || null,
  get length() { return Object.keys(storage).length; },
} as Storage;
global.window = { localStorage: global.localStorage } as unknown as Window & typeof globalThis;

test('clientesService devuelve una lista vacía sin crear clientes ficticios', async () => {
  localStorage.clear();
  const clientes = await clientesService.list();
  assert.deepEqual(clientes, []);
  assert.equal(localStorage.getItem('el_patron_clientes'), null);
});

test('clientesService elimina clientes de demostración heredados del cache', async () => {
  localStorage.setItem('el_patron_clientes', JSON.stringify([
    { id_cliente: 'cli_001', dni_cuit: 'demo', nombre: 'Demo', puntos: 0, fecha_registro: new Date().toISOString() },
    { id_cliente: 'cli_real', dni_cuit: '30123456', nombre: 'Cliente real', puntos: 15, fecha_registro: new Date().toISOString() },
  ]));

  const clientes = await clientesService.list();
  assert.deepEqual(clientes.map(cliente => cliente.id_cliente), ['cli_real']);
  assert.deepEqual(JSON.parse(localStorage.getItem('el_patron_clientes') || '[]').map((cliente: { id_cliente: string }) => cliente.id_cliente), ['cli_real']);
});
