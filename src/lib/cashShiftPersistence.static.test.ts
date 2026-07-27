import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const cajaService = readFileSync(resolve('src/services/cajaService.ts'), 'utf8');
const cajaHook = readFileSync(resolve('src/features/caja/hooks/useCaja.ts'), 'utf8');

test('Caja verifica errores de Supabase y encola turnos no sincronizados', () => {
  assert.match(cajaService, /if \(error\) throw error/);
  assert.match(cajaService, /syncQueueService\.enqueue\('upsert_cierre'/);
  assert.match(cajaService, /sync_status = await persistOrQueueCierre/);
});

test('Caja no borra todo el almacenamiento del navegador', () => {
  assert.doesNotMatch(cajaService, /localStorage\.clear\(\)/);
});

test('la interfaz distingue cierres sincronizados de cierres locales pendientes', () => {
  assert.match(cajaHook, /session\.sync_status === 'pending'/);
  assert.match(cajaHook, /finalShift\.sync_status === 'pending'/);
  assert.doesNotMatch(cajaHook, /Turno fiscal de caja iniciado/);
  assert.doesNotMatch(cajaHook, /Arqueo homologado/);
});
