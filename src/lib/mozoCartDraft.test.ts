import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearMozoCartDraft,
  getMozoCartDraftKey,
  readMozoCartDraft,
  sanitizeMozoCart,
  writeMozoCartDraft,
} from './mozoCartDraft';

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    has: (key: string) => store.has(key),
  };
}

test('sanitizeMozoCart conserva solo cantidades positivas enteras', () => {
  assert.deepEqual(
    sanitizeMozoCart({ prod_1: 2.8, prod_2: '3', prod_3: 0, prod_4: -1, prod_5: 'x' }),
    { prod_1: 2, prod_2: 3 },
  );
});

test('write/readMozoCartDraft persiste carrito por mesa', () => {
  const storage = memoryStorage();
  writeMozoCartDraft(4, { cart: { prod_1: 2 }, observaciones: ' Sin sal ' }, storage);

  assert.deepEqual(readMozoCartDraft(4, storage), {
    cart: { prod_1: 2 },
    observaciones: 'Sin sal',
  });
});

test('clearMozoCartDraft elimina solo la mesa indicada', () => {
  const storage = memoryStorage();
  writeMozoCartDraft(1, { cart: { prod_1: 1 }, observaciones: '' }, storage);
  writeMozoCartDraft(2, { cart: { prod_2: 1 }, observaciones: '' }, storage);

  clearMozoCartDraft(1, storage);

  assert.equal(storage.has(getMozoCartDraftKey(1)), false);
  assert.equal(storage.has(getMozoCartDraftKey(2)), true);
});

test('writeMozoCartDraft no rompe si el almacenamiento local falla', () => {
  const failingStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('quota exceeded'); },
    removeItem: () => { throw new Error('private mode'); },
  };

  assert.doesNotThrow(() => {
    writeMozoCartDraft(9, { cart: { prod_1: 1 }, observaciones: 'Urgente' }, failingStorage);
    clearMozoCartDraft(9, failingStorage);
  });
});
