import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearMozoCartDraft,
  getMozoCartDraftKey,
  MOZO_CART_DRAFT_TTL_MS,
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
    raw: (key: string) => store.get(key),
  };
}

test('sanitizeMozoCart conserva solo cantidades positivas enteras', () => {
  assert.deepEqual(
    sanitizeMozoCart({ prod_1: 2.8, prod_2: '3', prod_3: 0, prod_4: -1, prod_5: 'x' }),
    { prod_1: 2, prod_2: 3 },
  );
});

test('write/readMozoCartDraft persiste carrito por mesa con metadata', () => {
  const storage = memoryStorage();
  writeMozoCartDraft(4, { cart: { prod_1: 2 }, observaciones: ' Sin sal ', mozo: 'Sofía', now: 1000 }, storage);

  const draft = readMozoCartDraft(4, storage, 2000);
  assert.deepEqual(draft?.cart, { prod_1: 2 });
  assert.equal(draft?.observaciones, 'Sin sal');
  assert.equal(draft?.mesaId, 4);
  assert.equal(draft?.mozo, 'Sofía');
  assert.equal(draft?.createdAt, 1000);
  assert.equal(draft?.updatedAt, 1000);
  assert.equal(draft?.schemaVersion, 2);
  assert.match(draft?.idempotencyKey ?? '', /^mozo-4-1000-/);
});

test('readMozoCartDraft expira borradores viejos y los elimina', () => {
  const storage = memoryStorage();
  writeMozoCartDraft(5, { cart: { prod_1: 1 }, observaciones: '', now: 1000 }, storage);

  const draft = readMozoCartDraft(5, storage, 1000 + MOZO_CART_DRAFT_TTL_MS + 1);

  assert.equal(draft, null);
  assert.equal(storage.has(getMozoCartDraftKey(5)), false);
});

test('readMozoCartDraft migra borradores viejos sin metadata', () => {
  const storage = memoryStorage();
  storage.setItem(getMozoCartDraftKey(7), JSON.stringify({ cart: { prod_2: 2 }, observaciones: 'Mesa apurada' }));

  const draft = readMozoCartDraft(7, storage, 5000);

  assert.deepEqual(draft?.cart, { prod_2: 2 });
  assert.equal(draft?.createdAt, 5000);
  assert.equal(draft?.updatedAt, 5000);
  assert.match(draft?.idempotencyKey ?? '', /^mozo-7-5000-/);
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
