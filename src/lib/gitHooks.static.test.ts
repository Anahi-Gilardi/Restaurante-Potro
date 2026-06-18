import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const prePushHook = readFileSync(resolve('.githooks/pre-push'), 'utf8');

test('prepush ejecuta chequeos locales antes de subir a GitHub', () => {
  assert.equal(packageJson.scripts.prepush, 'npm run lint && npm run check:recetas && npm run build');
  assert.equal(packageJson.scripts['hooks:install'], 'git config core.hooksPath .githooks');
  assert.match(prePushHook, /npm run prepush/);
});
