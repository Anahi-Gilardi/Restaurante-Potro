process.env.NODE_ENV = 'test';
import assert from 'node:assert/strict';
import test from 'node:test';
import { menuService } from './menuService';
import type { ProductoMenu } from '../types';

// Mock localStorage for node.js test environment
if (typeof global.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
    length: 0,
    key: (index: number) => Object.keys(store)[index] || null
  };
}

test('menuService list recupera los datos desde localStorage si el cache existe', async () => {
  const dummyMenu: ProductoMenu[] = [{
    id_producto: 'prod_test_cache',
    nombre: 'Plato Caché',
    precio_venta: 1200,
    categoria: 'Platos',
    activo: true,
    imagen: '/test.jpg'
  }];

  localStorage.setItem('el_patron_cache_menu', JSON.stringify(dummyMenu));

  const list = await menuService.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].id_producto, 'prod_test_cache');
  assert.equal(list[0].nombre, 'Plato Caché');

  localStorage.removeItem('el_patron_cache_menu');
});
