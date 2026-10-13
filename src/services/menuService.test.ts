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

test('menuService update preserva stock_actual, stock_minimo y controla_stock', async () => {
  const dummyItem: ProductoMenu = {
    id_producto: 'prod_vino_test',
    nombre: 'Malbec Reserva Test',
    precio_venta: 15000,
    categoria: 'Bodega y Vinos',
    subcategoria: 'Vinos tintos',
    stock_actual: 12,
    stock_minimo: 3,
    controla_stock: true,
    unidad_medida: 'Botella 750ml'
  };

  localStorage.setItem('el_patron_cache_menu', JSON.stringify([dummyItem]));

  const updated = await menuService.update('prod_vino_test', {
    stock_actual: 18,
    precio_venta: 16000
  });

  assert.equal(updated.stock_actual, 18);
  assert.equal(updated.precio_venta, 16000);
  assert.equal(updated.stock_minimo, 3);
  assert.equal(updated.controla_stock, true);

  localStorage.removeItem('el_patron_cache_menu');
});

test('menuService delete y remove eliminan el producto y no reaparece en list()', async () => {
  const items: ProductoMenu[] = [
    {
      id_producto: 'prod_a_eliminar',
      nombre: 'Bebida a borrar',
      precio_venta: 2000,
      categoria: 'Bebidas sin alcohol',
      activo: true
    },
    {
      id_producto: 'prod_que_queda',
      nombre: 'Bebida que permanece',
      precio_venta: 2500,
      categoria: 'Bebidas sin alcohol',
      activo: true
    }
  ];

  localStorage.setItem('el_patron_cache_menu', JSON.stringify(items));

  await menuService.delete('prod_a_eliminar');

  const afterList = await menuService.list();
  assert.equal(afterList.length, 1);
  assert.equal(afterList[0].id_producto, 'prod_que_queda');
  assert.equal(afterList.find(p => p.id_producto === 'prod_a_eliminar'), undefined);

  localStorage.removeItem('el_patron_cache_menu');
  localStorage.removeItem('el_patron_deleted_menu_products');
});

