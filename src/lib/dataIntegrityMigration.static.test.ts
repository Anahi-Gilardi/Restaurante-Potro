import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('la migración preserva pagos huérfanos y endurece relaciones nuevas', () => {
  const migration = readFileSync('supabase/migrations/20260716020000_harden_data_integrity.sql', 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.pagos_integridad_revision/);
  assert.match(migration, /INSERT INTO public\.pagos_integridad_revision/);
  assert.match(migration, /FOREIGN KEY \(id_factura\)/);
  assert.match(migration, /recetas_producto_insumo_unique/);
  assert.match(migration, /UPDATE public\.productos_menu legacy\s+SET activo = false/);
});
