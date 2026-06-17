import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Pedido, PedidoItem } from '../types';

type PedidoHeaderRow = Record<string, any>;
type PedidoDetailRow = Record<string, any>;

const parseHeaderItems = (items: unknown): PedidoItem[] => {
  if (!items) return [];

  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse items fallback JSON:', error);
    return [];
  }
};

export const hydratePedido = (
  header: PedidoHeaderRow,
  details: PedidoDetailRow[] = []
): Pedido => {
  const headerItems = parseHeaderItems(header.items);
  const relatedItems: PedidoItem[] = details
    .filter(detail => detail.id_pedido === header.id_pedido)
    .sort((a, b) => String(a.id_detalle || '').localeCompare(String(b.id_detalle || '')))
    .map(detail => ({
      id_producto: detail.id_producto || '',
      nombre: detail.nombre,
      cantidad: detail.cantidad,
      categoria: detail.categoria,
      precio_unitario: detail.precio_unitario ?? undefined
    }));

  return {
    id_pedido: header.id_pedido,
    idempotency_key: header.idempotency_key ?? undefined,
    id_mesa: header.id_mesa,
    numero_mesa: header.numero_mesa,
    mozo: header.mozo,
    estado_comanda: header.estado_comanda,
    // The JSON snapshot keeps historical prices even in legacy schemas where
    // pedido_detalle does not yet have precio_unitario.
    items: headerItems.length > 0 ? headerItems : relatedItems,
    observaciones: header.observaciones || undefined,
    fecha_hora: new Date(header.fecha_hora),
    minutos_transcurridos: header.minutos_transcurridos || 0,
    origen: header.origen,
    tiempo_despacho_minutos: header.tiempo_despacho_minutos ?? undefined,
    segundos_en_listo: header.segundos_en_listo ?? undefined,
    stock_descontado: Boolean(header.stock_descontado),
    fecha_descuento_stock: header.fecha_descuento_stock
      ? new Date(header.fecha_descuento_stock)
      : undefined
  };
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

export const serializePedidoDetails = (pedido: Pedido) => pedido.items.map((item, index) => ({
  id_detalle: `${pedido.id_pedido}_${String(index).padStart(4, '0')}`,
  id_pedido: pedido.id_pedido,
  id_producto: item.id_producto,
  nombre: item.nombre,
  cantidad: item.cantidad,
  categoria: item.categoria,
  precio_unitario: item.precio_unitario ?? null,
}));

export const pedidosService = {
  async list(): Promise<Pedido[]> {
    const supabase = getActiveSupabaseClient();
    
    // 1. Fetch headers
    const { data: headers, error: hError } = await supabase
      .from('pedidos_cabecera')
      .select('*')
      .order('fecha_hora', { ascending: false });
      
    if (hError) {
      console.error('Error fetching pedidos headers:', hError);
      throw hError;
    }
    
    if (!headers || headers.length === 0) return [];

    // 2. Fetch details filtered by header IDs only (avoid SELECT * full scan)
    const headerIds = headers.map(h => h.id_pedido);
    const { data: details, error: dError } = await supabase
      .from('pedido_detalle')
      .select('*')
      .in('id_pedido', headerIds);
      
    if (dError) {
      console.error('Error fetching pedido details:', dError);
      throw dError;
    }

    // Assemble nested structures matching `Pedido`
    return headers.map(header => hydratePedido(header, details || []));
  },

  async getById(id: number): Promise<Pedido | null> {
    const list = await this.list();
    return list.find(p => p.id_pedido === id) || null;
  },

  async create(pedido: Pedido): Promise<Pedido> {
    await this.upsert([pedido]);
    return pedido;
  },

  async update(id: number, fields: Partial<Pedido>): Promise<void> {
    const supabase = getActiveSupabaseClient();
    
    // Map fields to header columns
    const headerFields: any = {};
    if (fields.estado_comanda !== undefined) headerFields.estado_comanda = fields.estado_comanda;
    if (fields.observaciones !== undefined) headerFields.observaciones = fields.observaciones;
    if (fields.minutos_transcurridos !== undefined) headerFields.minutos_transcurridos = fields.minutos_transcurridos;
    if (fields.tiempo_despacho_minutos !== undefined) headerFields.tiempo_despacho_minutos = fields.tiempo_despacho_minutos;
    if (fields.segundos_en_listo !== undefined) headerFields.segundos_en_listo = fields.segundos_en_listo;
    if (fields.id_mesa !== undefined) headerFields.id_mesa = fields.id_mesa;
    if (fields.numero_mesa !== undefined) headerFields.numero_mesa = fields.numero_mesa;
    if (fields.stock_descontado !== undefined) headerFields.stock_descontado = fields.stock_descontado;
    if (fields.fecha_descuento_stock !== undefined) {
      headerFields.fecha_descuento_stock = fields.fecha_descuento_stock
        ? new Date(fields.fecha_descuento_stock).toISOString()
        : null;
    }
    if (fields.items !== undefined) headerFields.items = JSON.stringify(fields.items);

    if (Object.keys(headerFields).length > 0) {
      const { error } = await supabase
        .from('pedidos_cabecera')
        .update(headerFields)
        .eq('id_pedido', id);
      if (error) {
        console.error(`Error updating header for pedido ${id}:`, error);
        throw error;
      }
    }

    if (fields.items !== undefined) {
      // Re-upsert details
      const details = serializePedidoDetails({
        ...fields,
        id_pedido: id,
        id_mesa: fields.id_mesa ?? 0,
        numero_mesa: fields.numero_mesa ?? '',
        mozo: fields.mozo ?? '',
        estado_comanda: fields.estado_comanda ?? 'pendiente',
        items: fields.items,
        fecha_hora: fields.fecha_hora ?? new Date(),
        minutos_transcurridos: fields.minutos_transcurridos ?? 0,
        origen: fields.origen ?? 'Mozo'
      });

      // Delete existing details
      const { error: deleteError } = await supabase
        .from('pedido_detalle')
        .delete()
        .eq('id_pedido', id);
      if (deleteError) {
        console.error('Error deleting previous order details:', deleteError);
        throw deleteError;
      }

      if (details.length > 0) {
        const { error: detError } = await supabase.from('pedido_detalle').insert(details);
        if (detError) {
          console.error('Error inserting details in update:', detError);
          throw detError;
        }
      }
    }
  },

  async upsert(pedidos: Pedido[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    
    // 1. Process each nested order
    for (const ped of pedidos) {
      const cabecera = serializePedidoHeader(ped);

      const { error: hError } = await supabase.from('pedidos_cabecera').upsert(cabecera);
      if (hError) {
        console.error('Error upserting order header:', hError);
        throw hError;
      }

      // 2. Handle details
      if (ped.items) {
        const details = serializePedidoDetails(ped);
        const { error: deleteError } = await supabase
          .from('pedido_detalle')
          .delete()
          .eq('id_pedido', ped.id_pedido);
        if (deleteError) {
          console.error('Error deleting previous order details:', deleteError);
          throw deleteError;
        }

        if (details.length === 0) continue;
        const { error: dError } = await supabase.from('pedido_detalle').insert(details);
        if (dError) {
          console.error('Error inserting order details:', dError.message || JSON.stringify(dError));
          throw dError;
        }
      }
    }
  },

  async remove(id: number): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('pedidos_cabecera').delete().eq('id_pedido', id);
    if (error) {
      console.error('Error deleting order:', error);
      return false;
    }
    return true;
  },

  // Realtime subscription helper
  subscribe(callback: (payload: any) => void) {
    const supabase = getActiveSupabaseClient();
    const channel = supabase
      .channel('realtime:pedidos_cabecera')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_cabecera' }, callback)
      .subscribe();
    return channel;
  }
};
