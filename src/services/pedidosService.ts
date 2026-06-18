import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Pedido, PedidoItem } from '../types';

// Translation map to translate numeric frontend ids to Supabase UUIDs
const numericToUuidMap = new Map<number, string>();

function uuidToNumber(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

const mapEstadoToDb = (estado: string): string => {
  if (estado === 'pendiente') return 'pendiente';
  if (estado === 'en_cocina') return 'en_cocina';
  if (estado === 'listo' || estado === 'entregado') return 'completado';
  if (estado === 'entregado_cobrado' || estado === 'cancelado') return 'cobrado';
  return 'pendiente';
};

const mapEstadoFromDb = (estado: string): 'pendiente' | 'en_cocina' | 'listo' | 'entregado' | 'entregado_cobrado' | 'cancelado' => {
  if (estado === 'pendiente') return 'pendiente';
  if (estado === 'en_cocina') return 'en_cocina';
  if (estado === 'completado') return 'entregado';
  if (estado === 'cobrado') return 'entregado_cobrado';
  return 'pendiente';
};

export const serializePedidoHeader = (pedido: Pedido) => ({
  id_pedido: pedido.id_pedido,
  idempotency_key: pedido.idempotency_key ?? null,
  id_mesa: pedido.id_mesa || null,
  numero_mesa: pedido.numero_mesa,
  mozo: pedido.mozo,
  estado_comanda: pedido.estado_comanda,
  observaciones: pedido.observaciones || null,
  fecha_hora: pedido.fecha_hora instanceof Date
    ? pedido.fecha_hora.toISOString()
    : new Date(pedido.fecha_hora).toISOString(),
  minutos_transcurridos: pedido.minutos_transcurridos,
  origen: pedido.origen,
  tiempo_despacho_minutos: pedido.tiempo_despacho_minutos ?? null,
  segundos_en_listo: pedido.segundos_en_listo ?? null,
  stock_descontado: Boolean(pedido.stock_descontado),
  fecha_descuento_stock: pedido.fecha_descuento_stock
    ? new Date(pedido.fecha_descuento_stock).toISOString()
    : null,
  items: JSON.stringify(pedido.items)
});

export const hydratePedido = (
  header: any,
  details: any[] = []
): Pedido => {
  let headerItems: PedidoItem[] = [];
  if (header.items) {
    try {
      const parsed = typeof header.items === 'string' ? JSON.parse(header.items) : header.items;
      if (Array.isArray(parsed)) headerItems = parsed;
    } catch (e) {
      console.warn('Failed to parse items:', e);
    }
  }

  const relatedItems = details.map(d => ({
    id_producto: d.id_producto || '',
    nombre: d.nombre,
    cantidad: d.cantidad,
    categoria: d.categoria,
    precio_unitario: d.precio_unitario ?? undefined
  }));

  return {
    id_pedido: header.id_pedido,
    idempotency_key: header.idempotency_key ?? undefined,
    id_mesa: header.id_mesa,
    numero_mesa: header.numero_mesa,
    mozo: header.mozo,
    estado_comanda: header.estado_comanda,
    items: headerItems.length > 0 ? headerItems : relatedItems,
    fecha_hora: new Date(header.fecha_hora),
    minutos_transcurridos: header.minutos_transcurridos || 0,
    origen: header.origen || 'Mozo',
    stock_descontado: Boolean(header.stock_descontado),
    fecha_descuento_stock: header.fecha_descuento_stock ? new Date(header.fecha_descuento_stock) : undefined
  };
};

export const pedidosService = {
  async list(): Promise<Pedido[]> {
    const supabase = getActiveSupabaseClient();
    
    // 1. Fetch orders (headers)
    const { data: headers, error: hError } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (hError) {
      console.error('Error fetching pedidos:', hError);
      throw hError;
    }
    
    if (!headers || headers.length === 0) return [];

    // 2. Fetch order items
    const { data: details, error: dError } = await supabase
      .from('pedidos_items')
      .select('*');
      
    if (dError) {
      console.error('Error fetching pedidos_items:', dError);
      throw dError;
    }

    return headers.map(header => {
      const numId = uuidToNumber(header.id);
      numericToUuidMap.set(numId, header.id);

      // Map details to PedidoItem
      const relatedItems: PedidoItem[] = (details || [])
        .filter(d => d.pedido_id === header.id)
        .map(d => ({
          id_producto: d.menu_item_id,
          nombre: d.id_producto || 'Producto', // fallback if name not saved
          cantidad: d.cantidad,
          categoria: 'Comida', // fallback
          precio_unitario: Number(d.precio_unitario)
        }));

      // Fallback to items_activos JSONB if details table is empty
      let headerItems: PedidoItem[] = [];
      if (header.items_activos) {
        try {
          const parsed = typeof header.items_activos === 'string' ? JSON.parse(header.items_activos) : header.items_activos;
          if (Array.isArray(parsed)) {
            headerItems = parsed;
          }
        } catch (e) {
          console.warn('Failed to parse items_activos:', e);
        }
      }

      return {
        id_pedido: numId,
        idempotency_key: header.id,
        id_mesa: header.mesa_id,
        numero_mesa: `Mesa ${header.mesa_id}`,
        mozo: 'Mozo',
        estado_comanda: mapEstadoFromDb(header.estado),
        items: headerItems.length > 0 ? headerItems : relatedItems,
        fecha_hora: new Date(header.created_at),
        minutos_transcurridos: 0,
        origen: 'Mozo'
      };
    });
  },

  async getById(id: number): Promise<Pedido | null> {
    const list = await this.list();
    return list.find(p => p.id_pedido === id) || null;
  },

  async create(pedido: Pedido): Promise<Pedido> {
    try {
      await this.upsert([pedido]);
    } catch (err) {
      console.warn('pedidosService.create failed remote push:', err);
    }
    return pedido;
  },

  async update(id: number, fields: Partial<Pedido>): Promise<void> {
    const supabase = getActiveSupabaseClient();
    
    // Find UUID
    let uuid = numericToUuidMap.get(id);
    if (!uuid && fields.id_mesa) {
      // Find active order of the table to update
      const { data } = await supabase
        .from('pedidos')
        .select('id')
        .eq('mesa_id', fields.id_mesa)
        .neq('estado', 'cobrado')
        .limit(1);
      uuid = data?.[0]?.id;
    }

    if (!uuid) return;

    const updateFields: any = {
      updated_at: new Date().toISOString()
    };
    if (fields.estado_comanda !== undefined) {
      updateFields.estado = mapEstadoToDb(fields.estado_comanda);
      if (updateFields.estado === 'cobrado') {
        updateFields.cobrado_at = new Date().toISOString();
      }
    }
    if (fields.items !== undefined) {
      updateFields.items_activos = fields.items;
      updateFields.total = fields.items.reduce((acc, it) => acc + (it.cantidad * (it.precio_unitario ?? 0)), 0);
    }

    const { error } = await supabase
      .from('pedidos')
      .update(updateFields)
      .eq('id', uuid);

    if (error) {
      console.error(`Error updating order ${uuid}:`, error);
      throw error;
    }

    if (fields.items !== undefined) {
      // Delete old items and insert updated ones
      await supabase.from('pedidos_items').delete().eq('pedido_id', uuid);
      const itemsToInsert = fields.items.map(it => ({
        pedido_id: uuid,
        menu_item_id: it.id_producto || '00000000-0000-0000-0000-000000000000',
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario ?? 0,
        subtotal: it.cantidad * (it.precio_unitario ?? 0),
        estado: 'pendiente'
      }));
      if (itemsToInsert.length > 0) {
        await supabase.from('pedidos_items').insert(itemsToInsert);
      }
    }
  },

  async upsert(pedidos: Pedido[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    
    for (const ped of pedidos) {
      // Try to find if there is already a remote UUID for this order
      let uuid = numericToUuidMap.get(ped.id_pedido);
      if (!uuid) {
        const { data } = await supabase
          .from('pedidos')
          .select('id')
          .eq('mesa_id', ped.id_mesa)
          .neq('estado', 'cobrado')
          .limit(1);
        uuid = data?.[0]?.id;
      }

      // If we don't have a restaurant_id, we fetch one from restaurants table or fallback to default uuid
      let restauranteId = '00000000-0000-0000-0000-000000000000';
      try {
        const { data: restData } = await supabase.from('restaurantes').select('id').limit(1);
        if (restData?.[0]?.id) {
          restauranteId = restData[0].id;
        }
      } catch (e) {
        console.warn('Could not fetch restaurante_id:', e);
      }

      const totalValue = ped.items.reduce((acc, it) => acc + (it.cantidad * (it.precio_unitario ?? 0)), 0);

      const dbPedido: any = {
        mesa_id: ped.id_mesa,
        restaurante_id: restauranteId,
        estado: mapEstadoToDb(ped.estado_comanda),
        items_activos: ped.items,
        total: totalValue,
        updated_at: new Date().toISOString()
      };

      if (uuid) {
        dbPedido.id = uuid;
      } else {
        dbPedido.created_at = new Date().toISOString();
      }

      const { data: upserted, error: hError } = await supabase
        .from('pedidos')
        .upsert(dbPedido)
        .select('id')
        .single();

      if (hError) {
        console.error('Error upserting order:', hError);
        throw hError;
      }

      const finalUuid = upserted?.id || uuid;
      if (finalUuid) {
        numericToUuidMap.set(ped.id_pedido, finalUuid);

        // Update items details
        await supabase.from('pedidos_items').delete().eq('pedido_id', finalUuid);
        const itemsToInsert = ped.items.map(it => ({
          pedido_id: finalUuid,
          menu_item_id: it.id_producto || '00000000-0000-0000-0000-000000000000',
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario ?? 0,
          subtotal: it.cantidad * (it.precio_unitario ?? 0),
          estado: 'pendiente'
        }));
        if (itemsToInsert.length > 0) {
          await supabase.from('pedidos_items').insert(itemsToInsert);
        }
      }
    }
  },

  async remove(id: number): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const uuid = numericToUuidMap.get(id);
    if (!uuid) return false;

    const { error } = await supabase.from('pedidos').delete().eq('id', uuid);
    if (error) {
      console.error('Error deleting order:', error);
      return false;
    }
    return true;
  },

  subscribe(callback: (payload: any) => void) {
    const supabase = getActiveSupabaseClient();
    const channel = supabase
      .channel('realtime:pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, callback)
      .subscribe();
    return channel;
  }
};
