import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260716050000_merge_duplicate_ingredients.sql', 'utf8');
const api = readFileSync('api/data-integrity.ts', 'utf8');
const panel = readFileSync('src/components/DataIntegrityPanel.tsx', 'utf8');
const service = readFileSync('src/services/dataIntegrityService.ts', 'utf8');

test('la fusion de insumos conserva relaciones y exige stock fisico explicito', () => {
  assert.match(migration, /p_final_stock NUMERIC/);
  assert.match(migration, /UPDATE public\.recetas_escandallo/);
  assert.match(migration, /UPDATE public\.movimientos_inventario/);
  assert.match(migration, /UPDATE public\.mermas/);
  assert.match(migration, /UPDATE public\.historial_costos_insumos/);
  assert.match(migration, /DELETE FROM public\.insumos/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.merge_duplicate_ingredients\(TEXT, TEXT\[\], NUMERIC\) TO service_role/);
  assert.doesNotMatch(migration, /sum\(stock_actual\)/i);
});

test('el asistente requiere confirmacion y envia la fusion al backend autenticado', () => {
  assert.match(panel, /Stock físico definitivo/);
  assert.match(panel, /window\.confirm/);
  assert.match(panel, /onMerge\(canonicalId, duplicateIds, finalStock\)/);
  assert.match(service, /action: 'merge_duplicate_ingredients'/);
  assert.match(api, /client\.rpc\("merge_duplicate_ingredients"/);
});
