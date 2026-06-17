import assert from 'node:assert/strict';
import test from 'node:test';
import { canLogin, findLocalLoginUser, getLoginErrorMessage, normalizeLoginIdentifier } from './loginAuth';

const users = [
  { id_usuario: 1, nombre: 'Admin', apellido: '', username: 'ADMIN', password: '1234', rol: 'superadmin' as const },
  { id_usuario: 2, nombre: 'Mozo', apellido: '', username: 'mozo', password: 'abcd', rol: 'mozo' as const, activo: false },
];

test('normalizeLoginIdentifier limpia espacios y mayusculas', () => {
  assert.equal(normalizeLoginIdentifier('  ADMIN  '), 'admin');
});

test('findLocalLoginUser valida usuario local sin depender de mayusculas', () => {
  assert.equal(findLocalLoginUser(users, 'admin', '1234')?.id_usuario, 1);
  assert.equal(findLocalLoginUser(users, 'admin', 'bad'), null);
});

test('canLogin bloquea usuarios desactivados', () => {
  assert.equal(canLogin(users[0]), true);
  assert.equal(canLogin(users[1]), false);
  assert.equal(canLogin(null), false);
});

test('getLoginErrorMessage traduce errores tecnicos a mensajes accionables', () => {
  assert.equal(getLoginErrorMessage(new Error('Invalid login credentials')), 'Usuario o contraseña incorrectos.');
  assert.equal(
    getLoginErrorMessage(new Error('Failed to fetch')),
    'No pudimos conectar con el servidor. Revisá la conexión e intentá nuevamente.'
  );
});
