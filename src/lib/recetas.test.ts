import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRecipeDraft,
  calculateMarginPct,
  calculateRecipeCost,
  getRecipeItemsForProduct,
  parsePositiveQuantity,
  recipeContainsIngredient,
} from './recetas';
import type { Insumo, ProductoMenu, RecetaEscandallo } from '../types';

const insumos: Insumo[] = [
  {
    id_insumo: 'ins-carne',
    nombre: 'Carne',
    stock_actual: 1000,
    stock_minimo: 100,
    unidad_medida: 'g',
    categoria: 'frescos',
    costo_unitario: 12,
  },
  {
    id_insumo: 'ins-pan',
    nombre: 'Pan',
    stock_actual: 20,
    stock_minimo: 5,
    unidad_medida: 'unidades',
    categoria: 'secos',
    costo_unitario: 250,
  },
];

const recetas: RecetaEscandallo[] = [
  { id_receta: 'r1', id_producto: 'prod-burger', id_insumo: 'ins-carne', cantidad_a_descontar: 180 },
  { id_receta: 'r2', id_producto: 'prod-burger', id_insumo: 'ins-pan', cantidad_a_descontar: 1 },
  { id_receta: 'r3', id_producto: 'prod-pasta', id_insumo: 'ins-carne', cantidad_a_descontar: 50 },
];

const producto: ProductoMenu = {
  id_producto: 'prod-burger',
  nombre: 'Burger',
  precio_venta: 6000,
  categoria: 'Carnes',
  activo: true,
  imagen: '',
};

test('parsea solo cantidades positivas', () => {
  assert.equal(parsePositiveQuantity('2.5'), 2.5);
  assert.equal(parsePositiveQuantity('0'), null);
  assert.equal(parsePositiveQuantity('-1'), null);
  assert.equal(parsePositiveQuantity('abc'), null);
});

test('filtra recetas y detecta ingredientes duplicados por producto', () => {
  assert.deepEqual(getRecipeItemsForProduct(recetas, 'prod-burger').map(r => r.id_receta), ['r1', 'r2']);
  assert.equal(recipeContainsIngredient(recetas, 'prod-burger', 'ins-carne'), true);
  assert.equal(recipeContainsIngredient(recetas, 'prod-pasta', 'ins-pan'), false);
});

test('calcula costo y margen estimado de receta', () => {
  const burgerItems = getRecipeItemsForProduct(recetas, 'prod-burger');
  const cost = calculateRecipeCost(burgerItems, insumos);

  assert.equal(cost, 2410);
  assert.equal(calculateMarginPct(producto, cost)?.toFixed(1), '59.8');
  assert.equal(calculateMarginPct(undefined, cost), null);
  assert.equal(calculateMarginPct({ ...producto, precio_venta: 0 }, cost), null);
});

test('crea un borrador de escandallo consistente', () => {
  const draft = buildRecipeDraft('prod-burger', insumos[0], 120, () => 'rec-test');

  assert.deepEqual(draft, {
    id_receta: 'rec-test',
    id_producto: 'prod-burger',
    id_insumo: 'ins-carne',
    cantidad_a_descontar: 120,
    unidad_medida: 'g',
  });
});
