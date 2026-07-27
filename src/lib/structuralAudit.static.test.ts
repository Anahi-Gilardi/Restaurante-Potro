import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(
  'supabase/migrations/20260727030000_structural_audit_safety.sql',
  'utf8',
);
const rlsMigration = fs.readFileSync(
  'supabase/migrations/20260727040000_role_based_rls.sql',
  'utf8',
);
const app = fs.readFileSync('src/App.tsx', 'utf8');
const auditService = fs.readFileSync('src/services/auditoriaService.ts', 'utf8');
const reservationsService = fs.readFileSync('src/services/reservasService.ts', 'utf8');
const cashService = fs.readFileSync('src/services/cajaService.ts', 'utf8');
const cashModule = fs.readFileSync('src/components/CajaModule.tsx', 'utf8');
const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');

test('reservas bloquea solapamientos dentro de una transaccion de base de datos', () => {
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /RESERVA_SOLAPADA/);
  assert.match(migration, /BEFORE INSERT OR UPDATE OF id_mesa, fecha, hora, estado, lista_espera/);
  assert.match(reservationsService, /error\?\.code === '23P01'/);
});

test('caja conserva un ledger inmutable y vistas de conciliacion', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.caja_ledger/);
  assert.match(migration, /reject_caja_ledger_mutation/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.v_conciliacion_facturas/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.v_cierres_caja_diagnostico/);
  assert.match(cashService, /getAuditSummary/);
  assert.match(cashModule, /El sistema no modifica\s+estos registros automáticamente/);
});

test('KDS persiste actor y metadatos de cada transicion', () => {
  assert.match(migration, /created_by UUID DEFAULT auth\.uid\(\)/);
  assert.match(app, /terminal: 'KDS'/);
  assert.match(app, /void dbInsertLog\(newLogItem\)/);
  assert.match(auditService, /duracion_segundos/);
});

test('PWA evita precargar PDF, canvas e imagenes pesadas del sitio', () => {
  assert.match(viteConfig, /globIgnores/);
  assert.match(viteConfig, /pdf-\*\.js/);
  assert.match(viteConfig, /html2canvas/);
  assert.doesNotMatch(viteConfig, /\*\*\/\*\.\{js,css,html,ico,png,svg,woff2\}/);
});

test('RLS separa lectura y escritura por rol operativo', () => {
  assert.match(rlsMigration, /app_has_any_role/);
  assert.match(rlsMigration, /CREATE POLICY app_read_authenticated/);
  assert.match(rlsMigration, /CREATE POLICY app_insert_roles/);
  assert.match(rlsMigration, /CREATE POLICY app_update_roles/);
  assert.match(rlsMigration, /CREATE POLICY app_delete_roles/);
  assert.match(rlsMigration, /app_management_only/);
  assert.match(rlsMigration, /app_integrity_review_update/);
  assert.match(
    rlsMigration,
    /pagos_integridad_revision[\s\S]+ARRAY\['superadmin', 'administrador'\]/,
  );
  assert.doesNotMatch(rlsMigration, /FOR ALL TO authenticated USING \(auth\.uid\(\) IS NOT NULL\)/);
  assert.doesNotMatch(app, /Auto-seed new Coca-Cola/);
});
