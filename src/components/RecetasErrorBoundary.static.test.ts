import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const boundarySource = readFileSync(resolve('src/components/RecetasErrorBoundary.tsx'), 'utf8');
const appSource = readFileSync(resolve('src/App.tsx'), 'utf8');

test('RecetasErrorBoundary muestra fallback controlado para recetarios', () => {
  assert.match(boundarySource, /No se pudo cargar este recetario/);
  assert.match(boundarySource, /Reintentar recetario/);
  assert.match(boundarySource, /componentDidCatch/);
});

test('App envuelve RecetasModule con RecetasErrorBoundary', () => {
  assert.match(appSource, /import RecetasErrorBoundary from '\.\/components\/RecetasErrorBoundary';/);
  assert.match(appSource, /<RecetasErrorBoundary>\s*<RecetasModule[\s\S]*?<\/RecetasErrorBoundary>/);
});
