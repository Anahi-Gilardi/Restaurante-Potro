import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const readSource = (path: string) => readFileSync(resolve(path), 'utf8');

test('BI no presenta métricas operativas inventadas', () => {
  const source = readSource('src/components/BusinessIntelligence.tsx');
  assert.doesNotMatch(source, /Math\.random\(\)/);
  assert.doesNotMatch(source, /return '12\.4'/);
  assert.doesNotMatch(source, /return '97\.8%'/);
  assert.doesNotMatch(source, /1\.2 min vs semana anterior/);
  assert.match(source, /Sin comandas cobradas con tiempos de despacho/);
});

test('Proveedores no fabrica registros ni calificaciones', () => {
  const source = readSource('src/components/ProveedoresModule.tsx');
  assert.doesNotMatch(source, /id_proveedor: 'prov_[1-5]'/);
  assert.doesNotMatch(source, /charCodeAt|onTimeRate|VIP Oro|Preferido Plata/);
  assert.doesNotMatch(source, /contacto@proveedor\.com|sin-correo@elpatron\.com/);
  assert.match(source, /Sin medición/);
  assert.match(source, /Puntualidad:[\s\S]*Sin datos/);
});

test('la recuperación de errores conserva sesión y datos operativos', () => {
  const source = readSource('src/components/ErrorBoundary.tsx');
  assert.doesNotMatch(source, /localStorage\.clear\(\)|sessionStorage\.clear\(\)/);
  assert.match(source, /TECHNICAL_CACHE_PREFIXES/);
  assert.match(source, /el_patron_cache_/);
});

test('el service worker no cachea respuestas operativas de Supabase', () => {
  const source = readSource('vite.config.ts');
  assert.doesNotMatch(source, /supabase-api|\\.supabase\\.co/);
});

test('las nuevas credenciales exigen al menos doce caracteres', () => {
  const api = readSource('api/users.ts');
  const usersModule = readSource('src/components/UsuariosModule.tsx');
  const migration = readSource('supabase/migrations/20260727010000_strengthen_app_password_policy.sql');
  assert.match(api, /password\.length < 12/);
  assert.match(usersModule, /password\.length < 12/);
  assert.match(usersModule, /editPassword\.length < 12/);
  assert.match(migration, /length\(p_password\) < 12/);
  assert.match(migration, /TO service_role/);
});
