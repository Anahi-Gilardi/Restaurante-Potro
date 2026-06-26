import { test, mock } from 'node:test';
import assert from 'node:assert';
import { forceCleanReload } from './reloadHelper';

test('forceCleanReload returns false when running in Node.js environment', async () => {
  const result = await forceCleanReload();
  assert.strictEqual(result, false);
});
