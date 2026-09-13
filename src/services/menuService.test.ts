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

test('deduplicateMenuProducts consolida platos duplicados conservando activo: true y la imagen real', async () => {
  const { deduplicateMenuProducts } = await import('./menuService');

  const duplicates: ProductoMenu[] = [
    {
      id_producto: 'prod_pera_asada_con_queso_azul_nueces_y_miel_sobre_verdes',
      nombre: 'Pera asada con queso azul, nueces y miel sobre verdes',
      precio_venta: 12000,
      categoria: 'Entradas Criollas',
      activo: false,
      imagen: '/logo-el-patron.jpeg?v=5'
    },
    {
      id_producto: 'prod_ent_peras_quesoazul',
      nombre: 'Pera asada con queso azul, nueces y miel sobre verdes',
      precio_venta: 12000,
      categoria: 'Entradas Criollas',
      activo: true,
      imagen: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...'
    }
  ];

  const deduped = deduplicateMenuProducts(duplicates);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].id_producto, 'prod_ent_peras_quesoazul');
  assert.equal(deduped[0].activo, true);
  assert.match(deduped[0].imagen || '', /^data:image/);
});

test('menuService list asigna activo: true a filas sin estado explicito', async () => {
  const dummyMenu: any[] = [{
    id_producto: 'prod_sin_estado',
    nombre: 'Plato Nuevo Importado',
    precio_venta: 5000,
    categoria: 'Entradas Criollas'
  }];

  localStorage.setItem('el_patron_cache_menu', JSON.stringify(dummyMenu));
  const list = await menuService.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].activo, true);

  localStorage.removeItem('el_patron_cache_menu');
});
