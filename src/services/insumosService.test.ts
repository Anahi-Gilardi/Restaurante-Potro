import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularDescuentosInventario } from './insumosService';
import type { PedidoItem, RecetaEscandallo } from '../types';

test('calcula correctamente el descuento de stock por receta', () => {
  const items: PedidoItem[] = [
    { id_producto: 'prod_1', nombre: 'Plato A', cantidad: 2, categoria: 'Platos' },
    { id_producto: 'prod_2', nombre: 'Plato B', cantidad: 1, categoria: 'Platos' }
  ];

  const recetas: RecetaEscandallo[] = [
    { id_receta: 'rec_1', id_producto: 'prod_1', id_insumo: 'ins_x', cantidad_a_descontar: 150 },
    { id_receta: 'rec_2', id_producto: 'prod_1', id_insumo: 'ins_y', cantidad_a_descontar: 10 },
    { id_receta: 'rec_3', id_producto: 'prod_2', id_insumo: 'ins_x', cantidad_a_descontar: 50 }
  ];

  const descuentos = calcularDescuentosInventario(items, recetas);

  // prod_1: cantidad 2 * ins_x 150 = 300
  // prod_2: cantidad 1 * ins_x 50 = 50
  // Total ins_x = 350
  assert.equal(descuentos['ins_x'], 350);

  // prod_1: cantidad 2 * ins_y 10 = 20
  // Total ins_y = 20
  assert.equal(descuentos['ins_y'], 20);
});
