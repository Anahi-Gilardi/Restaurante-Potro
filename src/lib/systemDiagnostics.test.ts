import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnosticTargetLabel, latencyNeedleAngle, latencyRating } from './systemDiagnostics';

test('el diagnostico identifica las capas reales de persistencia web', () => {
  assert.equal(diagnosticTargetLabel('local-cache'), 'Cache local del navegador');
  assert.equal(diagnosticTargetLabel('supabase-cloud'), 'Supabase PostgreSQL (Cloud)');
});

test('la aguja de latencia queda limitada al rango visual', () => {
  assert.equal(latencyNeedleAngle(-20), -90);
  assert.equal(latencyNeedleAngle(150), 0);
  assert.equal(latencyNeedleAngle(500), 90);
  assert.equal(latencyRating(20), 'Muy rapido');
  assert.equal(latencyRating(100), 'Normal');
  assert.equal(latencyRating(250), 'Lento');
});
