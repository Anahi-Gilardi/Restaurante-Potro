import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const migration = readFileSync(
  resolve('supabase/migrations/20260715010000_lock_operational_tables.sql'),
  'utf8',
);
const systemModule = readFileSync(resolve('src/components/SistemaModule.tsx'), 'utf8');
const appModule = readFileSync(resolve('src/App.tsx'), 'utf8');

test('la migración final bloquea anon y limita las tablas operativas a authenticated', () => {
  assert.match(migration, /REVOKE ALL ON TABLE public\.%I FROM PUBLIC, anon/);
  assert.match(migration, /CREATE POLICY app_authenticated_access/);
  assert.match(migration, /FOR ALL TO authenticated/);
  assert.doesNotMatch(migration, /FOR ALL TO public/i);
});

test('la preparación productiva no exige receta a productos desactivados', () => {
  assert.match(systemModule, /p\.activo !== false && !recetas\.some/);
});

test('la sincronizacion operativa espera una sesion autenticada y la salida de la portada', () => {
  assert.match(
    appModule,
    /if \(showCover \|\| !isStreamlitLoggedIn \|\| !hasSupabaseSession\) return;/,
  );
  assert.match(appModule, /setHasSupabaseSession\(Boolean\(session\)\)/);
});
