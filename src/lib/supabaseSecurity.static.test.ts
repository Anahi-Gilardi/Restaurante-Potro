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

test('el diagnóstico de conexión consulta una columna real y permitida de usuarios', () => {
  const manager = readFileSync('src/components/SupabaseManager.tsx', 'utf8');
  assert.match(manager, /select\('id_usuario', \{ count: 'exact', head: true \}\)/);
  assert.doesNotMatch(manager, /select\('count', \{ count: 'exact', head: true \}\)/);
});

test('la preparación productiva no exige receta a productos desactivados', () => {
  assert.match(systemModule, /if \(p\.activo === false\) return false/);
  assert.match(systemModule, /const hasUsableRecipe = recetas\.some/);
  assert.match(systemModule, /Number\(r\.cantidad_a_descontar\) > 0/);
});

test('la sincronizacion operativa espera una sesion autenticada y la salida de la portada', () => {
  assert.match(
    appModule,
    /if \(showCover \|\| !isStreamlitLoggedIn \|\| !hasSupabaseSession\) return;/,
  );
  assert.match(appModule, /setHasSupabaseSession\(Boolean\(session\)\)/);
});

test('el panel ARCA conserva el resultado de la prueba de conexion', () => {
  assert.match(systemModule, /Conectado a ARCA/);
  assert.match(systemModule, /Conexion WSAA\/WSFE confirmada con ARCA/);
  assert.match(systemModule, /setArcaPanelError\(message\)/);
});
