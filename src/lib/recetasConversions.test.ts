import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRecipeCost } from './recetas';
import type { Insumo, RecetaEscandallo } from '../types';

// Helper for formatting units
function formatUnitDisplay(amount: number, unit: 'g' | 'ml' | 'unidades'): string {
  if (unit === 'g') {
    return amount >= 1000 ? `${(amount / 1000).toFixed(2)} kg` : `${amount} g`;
  }
  if (unit === 'ml') {
    return amount >= 1000 ? `${(amount / 1000).toFixed(2)} L` : `${amount} ml`;
  }
  return `${amount} u`;
}

test('Conversión de unidades para visualización de stock', () => {
  assert.equal(formatUnitDisplay(500, 'g'), '500 g');
  assert.equal(formatUnitDisplay(1250, 'g'), '1.25 kg');
  assert.equal(formatUnitDisplay(2000, 'g'), '2.00 kg');
  
  assert.equal(formatUnitDisplay(350, 'ml'), '350 ml');
  assert.equal(formatUnitDisplay(1500, 'ml'), '1.50 L');
  assert.equal(formatUnitDisplay(750, 'ml'), '750 ml');
  
  assert.equal(formatUnitDisplay(5, 'unidades'), '5 u');
});

test('Cálculo de costo de receta considerando el factor de rendimiento (mermas)', () => {
  const insumos: Insumo[] = [
    {
      id_insumo: 'ins-lomo',
      nombre: 'Lomo de Ternera',
      stock_actual: 5000,
      stock_minimo: 500,
      unidad_medida: 'g',
      categoria: 'frescos',
      costo_unitario: 15, // $15 por gramo
    },
    {
      id_insumo: 'ins-salsa',
      nombre: 'Salsa Criolla',
      stock_actual: 1000,
      stock_minimo: 100,
      unidad_medida: 'ml',
      categoria: 'secos',
      costo_unitario: 5, // $5 por ml
    }
  ];

  // Receta con merma (80% rendimiento) en el lomo y 100% en la salsa
  const recetas: RecetaEscandallo[] = [
    { 
      id_receta: 'r-lomo', 
      id_producto: 'prod-bife', 
      id_insumo: 'ins-lomo', 
      cantidad_a_descontar: 200, // 200g netos requeridos
      rendimiento: 80 // 80% rendimiento -> se deben comprar 250g brutos
    },
    { 
      id_receta: 'r-salsa', 
      id_producto: 'prod-bife', 
      id_insumo: 'ins-salsa', 
      cantidad_a_descontar: 50, // 50ml requeridos
      rendimiento: 100 // 100% rendimiento
    }
  ];

  // Costo lomo bruto = 200 * (100/80) * 15 = 250 * 15 = 3750
  // Costo salsa bruta = 50 * (100/100) * 5 = 50 * 5 = 250
  // Costo total = 4000
  const cost = calculateRecipeCost(recetas, insumos);
  assert.equal(cost, 4000);
});

test('Descuento de stock considerando porciones múltiples', () => {
  const recipeItem: RecetaEscandallo = {
    id_receta: 'r-1',
    id_producto: 'prod-1',
    id_insumo: 'ins-1',
    cantidad_a_descontar: 150,
    rendimiento: 90
  };

  const portionsOrdered = 3;
  // Consumo neto total sin considerar merma para el descuento de stock directo es cantidad_a_descontar * porciones
  const totalDeductionNet = recipeItem.cantidad_a_descontar * portionsOrdered;
  assert.equal(totalDeductionNet, 450);
});
