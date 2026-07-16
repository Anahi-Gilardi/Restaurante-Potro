import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260716040000_prevent_integrity_regressions.sql', 'utf8');

test('impide crear nuevos insumos con el mismo nombre sin bloquear ajustes historicos', () => {
  assert.match(migration, /BEFORE INSERT OR UPDATE OF nombre ON public\.insumos/);
  assert.match(migration, /lower\(btrim\(existing\.nombre\)\) = lower\(btrim\(NEW\.nombre\)\)/);
  assert.match(migration, /lower\(btrim\(NEW\.nombre\)\) IS DISTINCT FROM lower\(btrim\(OLD\.nombre\)\)/);
});

test('todo usuario activo nuevo necesita una identidad de autenticacion', () => {
  assert.match(migration, /NEW\.auth_user_id IS NULL/);
  assert.match(migration, /BEFORE INSERT OR UPDATE OF activo, auth_user_id ON public\.usuarios/);
});
