import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve('src/components/RecetasModule.tsx'), 'utf8');

test('mantiene el encabezado JSX de recetarios en formato valido', () => {
  assert.match(
    source,
    /<h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">Recetarios Habilitados<\/h3>/,
  );
});

test('no conserva fragmentos corruptos del despliegue fallido', () => {
  assert.doesNotMatch(source, /<\s+h\s+3/i);
  assert.doesNotMatch(source, /class\s+Name/);
  assert.doesNotMatch(source, /<\s*\/\s+h\s+3/i);
  assert.doesNotMatch(source, /Recatrices\s+Habilitados/);
});
