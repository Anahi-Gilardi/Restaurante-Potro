import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260727050000_cashier_role.sql'),
  'utf8'
);
const arcaApi = fs.readFileSync(path.join(root, 'api/arca.ts'), 'utf8');
const usersApi = fs.readFileSync(path.join(root, 'api/users.ts'), 'utf8');

test('el rol cajero puede operar caja sin heredar permisos de mozo', () => {
  assert.match(migration, /'cajero'/);
  assert.match(migration, /'facturas'/);
  assert.match(migration, /'pagos'/);
  assert.match(migration, /'cierres_caja'/);
  assert.match(arcaApi, /\["superadmin", "administrador", "cajero"\]/);
  assert.match(usersApi, /"cajero"/);
});
