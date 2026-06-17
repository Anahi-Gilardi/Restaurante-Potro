import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findDemoLoginUser,
  getConfiguredDemoCredentials,
  isDemoLoginEnabled,
  normalizeLoginUsername,
} from './demoLogin';

const users = [
  { username: 'admin@example.com', password: 'secret', activo: true },
  { username: 'mozo', password: '1234', activo: false },
];

test('normaliza usuarios de login', () => {
  assert.equal(normalizeLoginUsername('  Admin@Example.COM  '), 'admin@example.com');
});

test('permite desactivar el acceso demo por variable de entorno', () => {
  assert.equal(isDemoLoginEnabled({}), true);
  assert.equal(isDemoLoginEnabled({ VITE_ENABLE_DEMO_LOGIN: 'true' }), true);
  assert.equal(isDemoLoginEnabled({ VITE_ENABLE_DEMO_LOGIN: 'false' }), false);
  assert.equal(isDemoLoginEnabled({ VITE_ENABLE_DEMO_LOGIN: ' FALSE ' }), false);
});

test('lee credenciales demo configuradas solo cuando estan completas', () => {
  assert.equal(getConfiguredDemoCredentials({ VITE_DEMO_USER: 'admin' }), null);
  assert.equal(getConfiguredDemoCredentials({ VITE_DEMO_PASSWORD: 'secret' }), null);
  assert.deepEqual(
    getConfiguredDemoCredentials({ VITE_DEMO_USER: ' Admin ', VITE_DEMO_PASSWORD: ' secret ' }),
    { username: 'admin', password: 'secret' },
  );
});

test('busca usuarios demo solo cuando el acceso esta habilitado', () => {
  assert.deepEqual(findDemoLoginUser(users, ' ADMIN@example.com ', 'secret', true), users[0]);
  assert.equal(findDemoLoginUser(users, 'admin@example.com', 'bad', true), null);
  assert.equal(findDemoLoginUser(users, 'admin@example.com', 'secret', false), null);
});
