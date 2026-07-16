import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeDataIntegrity } from './dataIntegrity';

test('incluye el detalle necesario para revisar duplicados y usuarios antiguos', () => {
  const report = analyzeDataIntegrity({
    insumos: [
      { id_insumo: 'i1', nombre: 'Malbec', stock_actual: 5, stock_minimo: 1, unidad_medida: 'unidades', costo_unitario: 2 },
      { id_insumo: 'i2', nombre: 'malbec', stock_actual: 8, stock_minimo: 2, unidad_medida: 'unidades', costo_unitario: 2 },
    ],
    recetas_escandallo: [{ id_receta: 'r1', id_producto: 'p1', id_insumo: 'i1', cantidad_a_descontar: 1 }],
    movimientos_inventario: [{ id_movimiento: 'm1', id_insumo: 'i2' }],
    usuarios: [{ id_usuario: 8, nombre: 'Nuevo', apellido: 'Usuario', username: 'nuevo', rol: 'mozo', activo: true }],
  });

  assert.equal(report.review.duplicateIngredientGroups[0].name, 'Malbec');
  assert.equal(report.review.duplicateIngredientGroups[0].items.find(item => item.id === 'i1')?.recipeCount, 1);
  assert.equal(report.review.duplicateIngredientGroups[0].items.find(item => item.id === 'i2')?.movementCount, 1);
  assert.deepEqual(report.review.usersWithoutAuth[0], {
    id: '8',
    name: 'Nuevo Usuario',
    username: 'nuevo',
    role: 'mozo',
  });
});
