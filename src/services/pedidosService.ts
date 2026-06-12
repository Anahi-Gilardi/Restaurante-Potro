import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Pedido, PedidoItem } from '../types';

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

    // 2. Fetch all details for these headers
    const { data: details, error: dError } = await supabase
      .from('pedido_detalle')
      .select('*');
      
    if (dError) {
      console.error('Error fetching pedido details:', dError);
      throw dError;
    }

    // Assemble nested structures matching `Pedido`
    const assembled: Pedido[] = headers.map(h => {
      const relatedItems: PedidoItem[] = (details || [])
        .filter(d => d.id_pedido === h.id_pedido)
        .map(d => ({
          id_producto: d.id_producto || '',
          nombre: d.nombre,
          cantidad: d.cantidad,
          categoria: d.categoria
        }));

      // Fallback to JSON items if no details are present but json string exists
      let finalItems = relatedItems;
      if (finalItems.length === 0 && h.items) {
        try {
          finalItems = typeof h.items === 'string' ? JSON.parse(h.items) : h.items;
        } catch (e) {
          console.warn('Failed to parse items fallback JSON:', e);
        }
      }

      return {
        id_pedido: h.id_pedido,
        id_mesa: h.id_mesa,
        numero_mesa: h.numero_mesa,
        mozo: h.mozo,
        estado_comanda: h.estado_comanda,
        items: finalItems,
        observaciones: h.observaciones || undefined,
        fecha_hora: new Date(h.fecha_hora),
        minutos_transcurridos: h.minutos_transcurridos || 0,
        origen: h.origen,
        tiempo_despacho_minutos: h.tiempo_despacho_minutos || undefined,
        segundos_en_listo: h.segundos_en_listo || undefined
      };
    });

    return assembled;
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
      const details = fields.items.map((it, idx) => ({
        id_detalle: `${id}_${idx}_${Date.now()}`,
        id_pedido: id,
        id_producto: it.id_producto,
        nombre: it.nombre,
        cantidad: it.cantidad,
        categoria: it.categoria
      }));

      // Delete existing details
      await supabase.from('pedido_detalle').delete().eq('id_pedido', id);
      
      const { error: detError } = await supabase.from('pedido_detalle').insert(details);
      if (detError) {
        console.error('Error inserting details in update:', detError);
        throw detError;
      }
    }
  },

  async upsert(pedidos: Pedido[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    
    // 1. Process each nested order
    for (const ped of pedidos) {
      const cabecera = {
        id_pedido: ped.id_pedido,
        id_mesa: ped.id_mesa || null,
        numero_mesa: ped.numero_mesa,
        mozo: ped.mozo,
        estado_comanda: ped.estado_comanda,
        observaciones: ped.observaciones || null,
        fecha_hora: ped.fecha_hora instanceof Date ? ped.fecha_hora.toISOString() : new Date(ped.fecha_hora).toISOString(),
        minutos_transcurridos: ped.minutos_transcurridos,
        origen: ped.origen,
        tiempo_despacho_minutos: ped.tiempo_despacho_minutos || null,
        segundos_en_listo: ped.segundos_en_listo || null,
        items: JSON.stringify(ped.items) // JSON fallback compatibility
      };

      const { error: hError } = await supabase.from('pedidos_cabecera').upsert(cabecera);
      if (hError) {
        console.error('Error upserting order header:', hError);
        throw hError;
      }

      // 2. Handle details
      if (ped.items && ped.items.length > 0) {
        const details = ped.items.map((it, idx) => ({
          id_detalle: `${ped.id_pedido}_${idx}`,
          id_pedido: ped.id_pedido,
          id_producto: it.id_producto,
          nombre: it.nombre,
          cantidad: it.cantidad,
          categoria: it.categoria
        }));

        await supabase.from('pedido_detalle').delete().eq('id_pedido', ped.id_pedido);
        const { error: dError } = await supabase.from('pedido_detalle').insert(details);
        if (dError) {
          console.warn('Error inserting order details:', dError);
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
