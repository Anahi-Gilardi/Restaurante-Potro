import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetUpsertRow } from '../lib/googleSheetsClient';
import { Pedido } from '../types';
import { getArgentinaDateTimeString } from '../lib/argentinaDate';

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

const isRpcPermissionOrMissingError = (error: unknown): boolean => {
  if (!error) return false;
  const msg = (typeof error === 'object' && 'message' in error ? String((error as any).message) : String(error)).toLowerCase();
  return (
    msg.includes('permission denied') ||
    msg.includes('function') ||
    msg.includes('does not exist') ||
    msg.includes('jwt') ||
    msg.includes('auth') ||
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('failed to fetch')
  );
};

const throwRpcError = (operation: string, error: unknown): never => {
  const detail = error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Error desconocido';
  throw new Error(`${operation}: ${detail}`);
};

let rpcAvailable = false;

export const orderTransactionService = {
  async saveOrder(
    pedido: Pedido,
    comensales: number,
    allowNegativeStock: boolean
  ): Promise<number> {
    try {
      const total = (pedido.items || []).reduce((sum, item) => sum + ((item.precio_unitario || 0) * (item.cantidad || 0)), 0);
      await sheetUpsertRow('pedidos_cabecera', {
        id_pedido: pedido.id_pedido,
        id_mesa: pedido.id_mesa,
        numero_mesa: pedido.numero_mesa,
        mozo: pedido.mozo,
        estado_comanda: pedido.estado_comanda || 'pendiente',
        observaciones: pedido.observaciones || '',
        fecha_hora: getArgentinaDateTimeString(pedido.fecha_hora),
        total,
        items: JSON.stringify(pedido.items || [])
      });

      for (let i = 0; i < (pedido.items || []).length; i++) {
        const item = pedido.items[i];
        await sheetUpsertRow('pedido_detalle', {
          id_detalle: `${pedido.id_pedido}_${String(i).padStart(4, '0')}`,
          id_pedido: pedido.id_pedido,
          id_producto: item.id_producto,
          nombre: item.nombre,
          cantidad: item.cantidad,
          categoria: item.categoria,
          precio_unitario: item.precio_unitario ?? null,
          estado: item.estado ?? 'pendiente'
        });
      }
    } catch (sheetErr) {
      console.warn('[orderTransactionService.saveOrder] Google Sheets sync warning:', sheetErr);
    }

    if (pedido.id_mesa) {
      try {
        const supabase = getActiveSupabaseClient();
        await supabase
          .from('mesas')
          .update({
            estado: 'ocupada',
            comensales_actuales: comensales || 2,
            updated_at: new Date().toISOString()
          })
          .eq('id_mesa', pedido.id_mesa);
      } catch (mesaErr) {
        console.warn('[orderTransactionService.saveOrder] Supabase mesas update warning:', mesaErr);
      }
    }

    if (rpcAvailable !== false) {
      try {
        const supabase = getActiveSupabaseClient();
        const { data, error } = await supabase.rpc('save_order_transaction', {
          p_order: toRpcOrder(pedido),
          p_comensales: comensales,
          p_allow_negative: allowNegativeStock
        });
        if (error) {
          if (isRpcPermissionOrMissingError(error)) {
            rpcAvailable = false;
            console.warn('[orderTransactionService.saveOrder] Supabase RPC omitido por permisos / modo Google Sheets:', error.message);
            return pedido.id_pedido;
          }
          throwRpcError('No se pudo confirmar la comanda', error);
        }
        rpcAvailable = true;
        return Number(data);
      } catch (err: any) {
        if (isRpcPermissionOrMissingError(err)) {
          rpcAvailable = false;
          console.warn('[orderTransactionService.saveOrder] Supabase RPC omitido:', err?.message);
          return pedido.id_pedido;
        }
        throw err;
      }
    }

    return pedido.id_pedido;
  },

  async transitionOrder(
    idPedido: number,
    newState: Pedido['estado_comanda'],
    allowNegativeStock: boolean
  ): Promise<void> {
    try {
      await sheetUpsertRow('pedidos_cabecera', {
        id_pedido: idPedido,
        estado_comanda: newState
      });
    } catch (sheetErr) {
      console.warn('[orderTransactionService.transitionOrder] Google Sheets sync warning:', sheetErr);
    }

    if (rpcAvailable !== false) {
      try {
        const supabase = getActiveSupabaseClient();
        const { error } = await supabase.rpc('transition_order_transaction', {
          p_order_id: idPedido,
          p_new_state: newState,
          p_allow_negative: allowNegativeStock
        });
        if (error) {
          if (isRpcPermissionOrMissingError(error)) {
            rpcAvailable = false;
            console.warn('[orderTransactionService.transitionOrder] Supabase RPC omitido por permisos / modo Google Sheets:', error.message);
            return;
          }
          throwRpcError('No se pudo cambiar el estado de la comanda', error);
        }
        rpcAvailable = true;
      } catch (err: any) {
        if (isRpcPermissionOrMissingError(err)) {
          rpcAvailable = false;
          console.warn('[orderTransactionService.transitionOrder] Supabase RPC omitido:', err?.message);
          return;
        }
        throw err;
      }
    }
  },

  async closeOrders(orderIds: number[], allowNegativeStock: boolean): Promise<void> {
    for (const orderId of orderIds) {
      try {
        await sheetUpsertRow('pedidos_cabecera', {
          id_pedido: orderId,
          estado_comanda: 'entregado_cobrado'
        });
      } catch (sheetErr) {
        console.warn(`[orderTransactionService.closeOrders] Google Sheets order ${orderId} sync warning:`, sheetErr);
      }
    }

    if (rpcAvailable !== false) {
      try {
        const supabase = getActiveSupabaseClient();
        const { error } = await supabase.rpc('close_table_orders_transaction', {
          p_order_ids: orderIds,
          p_allow_negative: allowNegativeStock
        });
        if (error) {
          if (isRpcPermissionOrMissingError(error)) {
            rpcAvailable = false;
            console.warn('[orderTransactionService.closeOrders] Supabase RPC omitido por permisos / modo Google Sheets:', error.message);
            return;
          }
          throwRpcError('No se pudo cerrar la mesa', error);
        }
        rpcAvailable = true;
      } catch (err: any) {
        if (isRpcPermissionOrMissingError(err)) {
          rpcAvailable = false;
          console.warn('[orderTransactionService.closeOrders] Supabase RPC omitido:', err?.message);
          return;
        }
        throw err;
      }
    }
  }
};
