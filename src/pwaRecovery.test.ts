import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');
const reloadHelperSource = readFileSync(new URL('./lib/reloadHelper.ts', import.meta.url), 'utf8');

test('la recuperacion temprana de assets limita los reintentos automaticos', () => {
  assert.match(indexHtml, /el_patron_asset_recovery/);
  assert.match(indexHtml, /now - lastAttempt < 60000/);
  assert.match(indexHtml, /showRecovery\(\);\s+return;/);
  assert.doesNotMatch(indexHtml, /Asset load error, reloading for new version/);
});

test('un cambio de service worker no recarga la pagina en ciclo', () => {
  const controllerHandler = mainSource.match(
    /navigator\.serviceWorker\.addEventListener\('controllerchange',[\s\S]*?\n\s*}\);/,
  );

  assert.ok(controllerHandler, 'debe existir el observador de controllerchange');
  assert.doesNotMatch(controllerHandler[0], /location\.reload/);
});

test('la recuperacion de cache conserva la sesion del operador', () => {
  assert.doesNotMatch(reloadHelperSource, /localStorage\.removeItem\('el_patron_session'\)/);
});
