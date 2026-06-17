import type { Insumo, ProductoMenu, RecetaEscandallo } from '../types';

export type MarginLevel = 'high' | 'medium' | 'low';

export function parsePositiveQuantity(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getRecipeItemsForProduct(
  recetas: RecetaEscandallo[],
  productId: string,
): RecetaEscandallo[] {
  return recetas.filter(receta => receta.id_producto === productId);
}

export function recipeContainsIngredient(
  recetas: RecetaEscandallo[],
  productId: string,
  insumoId: string,
): boolean {
  return recetas.some(receta => receta.id_producto === productId && receta.id_insumo === insumoId);
}

export function countRecipeItemsByProduct(recetas: RecetaEscandallo[]): Record<string, number> {
  return recetas.reduce<Record<string, number>>((counts, receta) => {
    counts[receta.id_producto] = (counts[receta.id_producto] ?? 0) + 1;
    return counts;
  }, {});
}

export function calculateRecipeCost(
  recetas: RecetaEscandallo[],
  insumos: Insumo[],
): number {
  return recetas.reduce((total, receta) => {
    const insumo = insumos.find(item => item.id_insumo === receta.id_insumo);
    return total + receta.cantidad_a_descontar * (insumo?.costo_unitario ?? 0);
  }, 0);
}

export function calculateMarginPct(product: ProductoMenu | undefined, recipeCost: number): number | null {
  if (!product || recipeCost <= 0 || product.precio_venta <= 0) return null;
  return ((product.precio_venta - recipeCost) / product.precio_venta) * 100;
}

export function getMarginLevel(marginPct: number | null): MarginLevel | null {
  if (marginPct === null) return null;
  if (marginPct >= 60) return 'high';
  if (marginPct >= 40) return 'medium';
  return 'low';
}

export function buildRecipeDraft(
  productId: string,
  insumo: Insumo,
  cantidad: number,
  idFactory: () => string = () => `rec_new_${Date.now()}`,
): RecetaEscandallo {
  return {
    id_receta: idFactory(),
    id_producto: productId,
    id_insumo: insumo.id_insumo,
    cantidad_a_descontar: cantidad,
    unidad_medida: insumo.unidad_medida,
  };
}
