import { Insumo, Pedido, PedidoItem, RecetaEscandallo } from '../../types';

export interface StockDeductionResult {
  updatedInsumos: Insumo[];
  stockMovements: Array<{
    id_insumo: string;
    tipo_movimiento: 'salida_comanda';
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
  }>;
  itemsDescontados: string[];
  alarmasBajoStock: string[];
}

export interface StockReversalResult {
  updatedInsumos: Insumo[];
  stockMovements: Array<{
    id_insumo: string;
    tipo_movimiento: 'entrada';
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
  }>;
  itemsReversados: string[];
}

export const stockEngine = {
  /**
   * Valida un ítem de pedido para evitar cantidades o precios negativos.
   */
  validatePedidoItem(item: PedidoItem): void {
    if (item.cantidad <= 0) {
      throw new Error(`Cantidad inválida para '${item.nombre}': debe ser mayor a 0 (recibido ${item.cantidad}).`);
    }
    if (item.precio_unitario !== undefined && item.precio_unitario < 0) {
      throw new Error(`Precio unitario inválido para '${item.nombre}': no puede ser negativo (recibido ${item.precio_unitario}).`);
    }
  },

  /**
   * Calcula de forma pura la deducción de insumos basándose en los productos de un pedido y sus recetas.
   */
  deductStockForPedido(
    pedido: Pedido,
    insumos: Insumo[],
    recetas: RecetaEscandallo[],
    permitirVentaSinStock: boolean
  ): StockDeductionResult {
    const updatedInsumosMap = new Map<string, Insumo>(
      insumos.map(ins => [ins.id_insumo, { ...ins }])
    );
    const stockMovements: StockDeductionResult['stockMovements'] = [];
    const itemsDescontados: string[] = [];
    const alarmasBajoStock: string[] = [];

    // Validar ítems primero
    pedido.items.forEach(item => this.validatePedidoItem(item));

    for (const item of pedido.items) {
      const qtyPlates = item.cantidad;
      const matchingRecetas = recetas.filter(r => r.id_producto === item.id_producto);

      for (const rec of matchingRecetas) {
        const currentIns = updatedInsumosMap.get(rec.id_insumo);
        if (!currentIns) continue;

        const discountAmt = parseFloat((rec.cantidad_a_descontar * qtyPlates).toFixed(2));
        const stockAnterior = currentIns.stock_actual;

        if (!permitirVentaSinStock && stockAnterior < discountAmt) {
          throw new Error(
            `Insumo crítico agotado para '${currentIns.nombre}' (Disponible: ${stockAnterior} ${currentIns.unidad_medida}, Requerido: ${discountAmt} ${currentIns.unidad_medida}).`
          );
        }

        const updatedStock = parseFloat((Math.max(permitirVentaSinStock ? -999999 : 0, stockAnterior - discountAmt)).toFixed(2));

        currentIns.stock_actual = updatedStock;
        updatedInsumosMap.set(rec.id_insumo, currentIns);

        itemsDescontados.push(`${currentIns.nombre} (-${discountAmt} ${currentIns.unidad_medida})`);

        stockMovements.push({
          id_insumo: currentIns.id_insumo,
          tipo_movimiento: 'salida_comanda',
          cantidad: discountAmt,
          stock_anterior: stockAnterior,
          stock_nuevo: updatedStock
        });

        if (updatedStock <= currentIns.stock_minimo) {
          alarmasBajoStock.push(`${currentIns.nombre} (Stock actual: ${updatedStock} ${currentIns.unidad_medida})`);
        }
      }
    }

    return {
      updatedInsumos: Array.from(updatedInsumosMap.values()),
      stockMovements,
      itemsDescontados,
      alarmasBajoStock
    };
  },

  /**
   * Calcula de forma pura la restitución (reverso) de insumos tras la cancelación de un pedido.
   */
  reverseStockForPedido(
    pedido: Pedido,
    insumos: Insumo[],
    recetas: RecetaEscandallo[]
  ): StockReversalResult {
    const updatedInsumosMap = new Map<string, Insumo>(
      insumos.map(ins => [ins.id_insumo, { ...ins }])
    );
    const stockMovements: StockReversalResult['stockMovements'] = [];
    const itemsReversados: string[] = [];

    // Validar ítems primero
    pedido.items.forEach(item => this.validatePedidoItem(item));

    for (const item of pedido.items) {
      const qtyPlates = item.cantidad;
      const matchingRecetas = recetas.filter(r => r.id_producto === item.id_producto);

      for (const rec of matchingRecetas) {
        const currentIns = updatedInsumosMap.get(rec.id_insumo);
        if (!currentIns) continue;

        const restoreAmt = parseFloat((rec.cantidad_a_descontar * qtyPlates).toFixed(2));
        const stockAnterior = currentIns.stock_actual;
        const updatedStock = parseFloat((stockAnterior + restoreAmt).toFixed(2));

        currentIns.stock_actual = updatedStock;
        updatedInsumosMap.set(rec.id_insumo, currentIns);

        itemsReversados.push(`${currentIns.nombre} (+${restoreAmt} ${currentIns.unidad_medida})`);

        stockMovements.push({
          id_insumo: currentIns.id_insumo,
          tipo_movimiento: 'entrada',
          cantidad: restoreAmt,
          stock_anterior: stockAnterior,
          stock_nuevo: updatedStock
        });
      }
    }

    return {
      updatedInsumos: Array.from(updatedInsumosMap.values()),
      stockMovements,
      itemsReversados
    };
  }
};
