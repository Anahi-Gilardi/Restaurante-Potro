import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_APP_VIEWS, canAccessView, getAllowedViews, COCINA_MODULE_ENABLED } from './permissions';

test('superadmin tiene acceso total', () => {
  const expectedViews = COCINA_MODULE_ENABLED ? ALL_APP_VIEWS : ALL_APP_VIEWS.filter(v => v !== 'cocina');
  assert.deepEqual(getAllowedViews('superadmin'), expectedViews);
  assert.equal(canAccessView('superadmin', 'sistema'), true);
  assert.equal(canAccessView('superadmin', 'backups'), true);
  assert.equal(canAccessView('superadmin', 'caja'), true);
  assert.equal(canAccessView('superadmin', 'usuarios'), true);
  assert.equal(canAccessView('superadmin', 'reservas'), true);
});

test('administrador no puede acceder a sistema pero si a backups', () => {
  assert.equal(canAccessView('administrador', 'caja'), true);
  assert.equal(canAccessView('administrador', 'usuarios'), true);
  assert.equal(canAccessView('administrador', 'backups'), true);
  assert.equal(canAccessView('administrador', 'sistema'), false);
});

test('mozo puede gestionar y manejar todo el programa sin limitaciones', () => {
  const expectedViews = COCINA_MODULE_ENABLED ? ALL_APP_VIEWS : ALL_APP_VIEWS.filter(v => v !== 'cocina');
  assert.deepEqual(getAllowedViews('mozo'), expectedViews);
  assert.equal(canAccessView('mozo', 'home'), true);
  assert.equal(canAccessView('mozo', 'mozo'), true);
  assert.equal(canAccessView('mozo', 'mesas'), true);
  assert.equal(canAccessView('mozo', 'reservas'), true);
  assert.equal(canAccessView('mozo', 'caja'), true);
  assert.equal(canAccessView('mozo', 'menu'), true);
  assert.equal(canAccessView('mozo', 'inventario'), true);
  assert.equal(canAccessView('mozo', 'proveedores'), true);
  assert.equal(canAccessView('mozo', 'promociones'), true);
  assert.equal(canAccessView('mozo', 'facturacion'), true);
  assert.equal(canAccessView('mozo', 'usuarios'), true);
  assert.equal(canAccessView('mozo', 'sistema'), true);
  assert.equal(canAccessView('mozo', 'backups'), true);
});

test('cajero puede cobrar y facturar sin administrar inventario', () => {
  assert.deepEqual(getAllowedViews('cajero'), ['home', 'caja', 'facturacion']);
  assert.equal(canAccessView('cajero', 'caja'), true);
  assert.equal(canAccessView('cajero', 'facturacion'), true);
  assert.equal(canAccessView('cajero', 'mozo'), false);
  assert.equal(canAccessView('cajero', 'inventario'), false);
  assert.equal(canAccessView('cajero', 'usuarios'), false);
});

test('cocina no puede administrar caja ni usuarios', () => {
  const expectedViews = COCINA_MODULE_ENABLED ? ['home', 'cocina'] : ['home'];
  assert.deepEqual(getAllowedViews('cocina'), expectedViews);
  assert.equal(canAccessView('cocina', 'caja'), false);
  assert.equal(canAccessView('cocina', 'usuarios'), false);
});
