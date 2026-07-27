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
  assert.doesNotMatch(source, /Rappi & PedidosYa integrados|>En Línea</);
  assert.match(source, /Sin comandas cobradas con tiempos de despacho/);
  assert.match(source, /Sin health check de Rappi o PedidosYa/);
  assert.match(source, /Cobertura \{bcgCoverage\.reliable\}\/\{bcgCoverage\.total\}/);
  assert.match(source, /if \(cost === null\) return \[\]/);
});

test('Reservas no presume mesa ni consentimiento de WhatsApp', () => {
  const source = readSource('src/components/ReservasModule.tsx');
  assert.match(source, /useState\(''\);[\s\S]*?const \[hora/);
  assert.match(source, /const \[enviarWhatsApp, setEnviarWhatsApp\] = useState\(false\)/);
  assert.match(source, /min=\{todayStr\}/);
  assert.match(source, /Seleccionar una mesa/);
  assert.doesNotMatch(source, /idMesaAsignada = disponibles\[0\]\.id_mesa/);
  assert.match(source, /La mesa dejó de estar disponible/);
  assert.doesNotMatch(source, /La mesa elegida ya está reservada u ocupada\. Se enviará a lista de espera/);
});

test('Promociones no presenta combos ni puntos como reglas operativas', () => {
  const source = readSource('src/components/PromocionesModule.tsx');
  assert.match(source, /p\.activo && p\.tipo === 'descuento_directo'/);
  assert.match(source, /Un 2x1 o combo no se convierte en un porcentaje/);
  assert.doesNotMatch(source, /puntosAcumulados|Puntos acumulados/);
  const service = readSource('src/services/promocionesService.ts');
  const migration = readSource('supabase/migrations/20260727020000_persist_promotion_metadata.sql');
  assert.match(service, /tipo: promo\.tipo/);
  assert.match(service, /dias_vigentes: promo\.dias_vigentes/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS tipo/);
  assert.match(migration, /Vigencia informativa; no implica aplicación automática en Caja/);
});

test('el reporte de errores existe, exige sesión y no envía stacks', () => {
  const boundary = readSource('src/components/ErrorBoundary.tsx');
  const endpoint = readSource('api/log-error.ts');
  assert.match(boundary, /Authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(boundary, /stack: error\.stack/);
  assert.match(endpoint, /requireAuthenticatedProfile/);
  assert.match(endpoint, /auditoria_eventos/);
  assert.match(endpoint, /requestBodyIsTooLarge\(req, 4_096\)/);
});

test('el logo reutilizable no genera identificadores HTML duplicados', () => {
  const source = readSource('src/components/ElPatronLogo.tsx');
  assert.doesNotMatch(source, /\sid="el-patron-image-logo"/);
  assert.match(source, /data-testid="el-patron-image-logo"/);
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
