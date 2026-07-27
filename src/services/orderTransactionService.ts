import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Pedido } from '../types';

const toRpcOrder = (pedido: Pedido) => ({
  ...pedido,
  fecha_hora: new Date(pedido.fecha_hora).toISOString(),
  fecha_descuento_stock: pedido.fecha_descuento_stock
    ? new Date(pedido.fecha_descuento_stock).toISOString()
    : null,
  fecha_inicio_cocina: pedido.fecha_inicio_cocina
    ? new Date(pedido.fecha_inicio_cocina).toISOString()
    : null,
  fecha_listo: pedido.fecha_listo
    ? new Date(pedido.fecha_listo).toISOString()
    : null
});

const throwRpcError = (operation: string, error: unknown): never => {
  const detail = error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Error desconocido';
  throw new Error(`${operation}: ${detail}`);
};

export const orderTransactionService = {
  async saveOrder(
    pedido: Pedido,
    comensales: number,
    allowNegativeStock: boolean
  ): Promise<number> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.rpc('save_order_transaction', {
      p_order: toRpcOrder(pedido),
      p_comensales: comensales,
      p_allow_negative: allowNegativeStock
    });
    if (error) throwRpcError('No se pudo confirmar la comanda', error);
    return Number(data);
  },

  async transitionOrder(
    idPedido: number,
    newState: Pedido['estado_comanda'],
    allowNegativeStock: boolean
  ): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.rpc('transition_order_transaction', {
      p_order_id: idPedido,
      p_new_state: newState,
      p_allow_negative: allowNegativeStock
    });
    if (error) throwRpcError('No se pudo cambiar el estado de la comanda', error);
  },

  async closeOrders(orderIds: number[], allowNegativeStock: boolean): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.rpc('close_table_orders_transaction', {
      p_order_ids: orderIds,
      p_allow_negative: allowNegativeStock
    });
    if (error) throwRpcError('No se pudo cerrar la mesa', error);
  }
};
