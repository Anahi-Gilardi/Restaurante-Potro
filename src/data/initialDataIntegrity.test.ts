import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_PRODUCTOS_MENU } from './initialData';

test('el catalogo inicial no contiene productos con identificadores repetidos', () => {
  const ids = INITIAL_PRODUCTOS_MENU.map(product => product.id_producto);
  assert.equal(new Set(ids).size, ids.length);
});
