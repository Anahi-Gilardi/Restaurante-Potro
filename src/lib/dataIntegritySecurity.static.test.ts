import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('la auditoría de integridad exige sesión administrativa y usa la clave sólo en backend', () => {
  const api = readFileSync('api/data-integrity.ts', 'utf8');
  const service = readFileSync('src/services/dataIntegrityService.ts', 'utf8');
  assert.match(api, /requireAuthenticatedProfile\(req, \["superadmin", "administrador"\]\)/);
  assert.match(api, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(service, /SERVICE_ROLE/);
});
