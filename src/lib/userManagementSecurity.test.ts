import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('la administración de usuarios exige sesión y roles en el backend', () => {
  const source = read('../../api/users.ts');
  assert.match(source, /requireAuthenticatedProfile\(req, \["superadmin", "administrador"\]\)/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /auth\.admin\.createUser/);
  assert.match(source, /provision_app_username_login/);
});

test('el módulo Usuarios no lee ni muestra contraseñas persistidas', () => {
  const source = read('../components/UsuariosModule.tsx');
  assert.doesNotMatch(source, /u\.password/);
  assert.doesNotMatch(source, /usuariosService\.(create|update|remove)/);
  assert.match(source, /Credencial protegida en Supabase/);
});

test('el servicio de usuarios limita las columnas descargadas', () => {
  const source = read('../services/usuariosService.ts');
  assert.match(source, /SAFE_USER_COLUMNS/);
  assert.doesNotMatch(source, /from\('usuarios'\)\.select\('\*'\)/);
});

test('el login operativo no solicita columnas antiguas de contraseña', () => {
  const source = read('../components/PythonStreamlitLogin.tsx');
  assert.doesNotMatch(source, /from\('usuarios'\)\s*\.select\('\*'\)/);
  assert.match(source, /id_usuario,nombre,apellido,username,rol,activo,auth_user_id,mail/);
});
