import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessView, getAllowedViews } from './permissions';

test('el administrador puede acceder a módulos sensibles', () => {
  assert.equal(canAccessView('administrador', 'caja'), true);
  assert.equal(canAccessView('administrador', 'usuarios'), true);
  assert.equal(canAccessView('administrador', 'backups'), true);
});

test('el mozo queda limitado a la operación de salón', () => {
  assert.equal(canAccessView('mozo', 'mozo'), true);
  assert.equal(canAccessView('mozo', 'reservas'), true);
  assert.equal(canAccessView('mozo', 'caja'), false);
  assert.equal(canAccessView('mozo', 'sistema'), false);
});

test('cocina no puede administrar caja ni usuarios', () => {
  assert.deepEqual(getAllowedViews('cocina'), ['home', 'panel', 'cocina']);
});

test('un rol desconocido no rompe la navegación y recibe permisos mínimos', () => {
  assert.deepEqual(getAllowedViews(undefined), ['home', 'panel', 'mozo', 'mesas', 'reservas']);
  assert.equal(canAccessView('encargado', 'sistema'), false);
});

test('superadmin se interpreta como administrador', () => {
  assert.equal(canAccessView('superadmin', 'sistema'), true);
});
