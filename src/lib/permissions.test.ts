import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessView, getAllowedViews } from './permissions';

test('superadmin tiene acceso total', () => {
  assert.equal(canAccessView('superadmin', 'sistema'), true);
  assert.equal(canAccessView('superadmin', 'backups'), true);
  assert.equal(canAccessView('superadmin', 'caja'), true);
  assert.equal(canAccessView('superadmin', 'usuarios'), true);
});

test('administrador no puede acceder a sistema ni backups', () => {
  assert.equal(canAccessView('administrador', 'caja'), true);
  assert.equal(canAccessView('administrador', 'usuarios'), true);
  assert.equal(canAccessView('administrador', 'backups'), false);
  assert.equal(canAccessView('administrador', 'sistema'), false);
});

test('mozo tiene el mismo acceso que administrador (excepto sistema/backups)', () => {
  assert.equal(canAccessView('mozo', 'mozo'), true);
  assert.equal(canAccessView('mozo', 'reservas'), true);
  assert.equal(canAccessView('mozo', 'caja'), true);
  assert.equal(canAccessView('mozo', 'menu'), true);
  assert.equal(canAccessView('mozo', 'inventario'), true);
  assert.equal(canAccessView('mozo', 'reportes'), true);
  assert.equal(canAccessView('mozo', 'sistema'), false);
  assert.equal(canAccessView('mozo', 'backups'), false);
});

test('cocina no puede administrar caja ni usuarios', () => {
  assert.deepEqual(getAllowedViews('cocina'), ['home', 'panel', 'cocina']);
  assert.equal(canAccessView('cocina', 'caja'), false);
  assert.equal(canAccessView('cocina', 'usuarios'), false);
});
