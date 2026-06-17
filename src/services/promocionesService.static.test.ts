import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve('src/services/promocionesService.ts'), 'utf8');

test('promocionesService.remove propaga errores de Supabase', () => {
  const removeMatch = source.match(/async remove\(id: string\): Promise<boolean> \{[\s\S]*?\n  \}/);
  assert.ok(removeMatch, 'No se encontró promocionesService.remove');

  const removeSource = removeMatch[0];
  assert.match(removeSource, /throw error;/);
  assert.doesNotMatch(removeSource, /return false;/);
});
