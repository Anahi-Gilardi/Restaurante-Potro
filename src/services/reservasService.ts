import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Reserva } from '../types';

export const reservasService = {
  async list(): Promise<Reserva[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('reservas').select('*').order('fecha', { ascending: true });
    if (error) {
      console.error('Error fetching reservas:', error);
      throw error;
    }
    return (data || []).map(r => ({
      id_reserva: r.id_reserva,
      nombre_cliente: r.cliente,
      telefono: r.telefono || '',
      pax: r.personas || 1,
      id_mesa: r.id_mesa || undefined,
      nombre_mesa: r.nombre_mesa || `Mesa ${r.id_mesa || ''}`,
      hora: r.hora,
      estado: r.estado === 'sentada' ? 'sentada' : r.estado === 'cancelada' ? 'cancelada' : 'confirmada'
    }));
  },

  async create(res: Reserva): Promise<Reserva> {
    const supabase = getActiveSupabaseClient();
    const dbPayload = {
      id_reserva: res.id_reserva,
      cliente: res.nombre_cliente,
      telefono: res.telefono,
      personas: res.pax,
      id_mesa: res.id_mesa || null,
      nombre_mesa: res.nombre_mesa,
      hora: res.hora,
      estado: res.estado,
      fecha: new Date().toISOString().split('T')[0] // default to today
    };
    const { data, error } = await supabase.from('reservas').insert([dbPayload]).select().single();
    if (error) {
      console.error('Error creating reserva:', error);
      throw error;
    }
    return {
      id_reserva: data.id_reserva,
      nombre_cliente: data.cliente,
      telefono: data.telefono,
      pax: data.personas,
      id_mesa: data.id_mesa,
      nombre_mesa: data.nombre_mesa,
      hora: data.hora,
      estado: data.estado
    };
  },

  async update(id: string, fields: Partial<Reserva>): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const dbPayload: any = {};
    if (fields.nombre_cliente !== undefined) dbPayload.cliente = fields.nombre_cliente;
    if (fields.telefono !== undefined) dbPayload.telefono = fields.telefono;
    if (fields.pax !== undefined) dbPayload.personas = fields.pax;
    if (fields.id_mesa !== undefined) dbPayload.id_mesa = fields.id_mesa;
    if (fields.nombre_mesa !== undefined) dbPayload.nombre_mesa = fields.nombre_mesa;
    if (fields.hora !== undefined) dbPayload.hora = fields.hora;
    if (fields.estado !== undefined) dbPayload.estado = fields.estado;

    const { error } = await supabase.from('reservas').update(dbPayload).eq('id_reserva', id);
    if (error) {
      console.error('Error updating reserva:', error);
      throw error;
    }
  },

  async upsert(reservas: Reserva[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const dbPayloads = reservas.map(r => ({
      id_reserva: r.id_reserva,
      cliente: r.nombre_cliente,
      telefono: r.telefono,
      personas: r.pax,
      id_mesa: r.id_mesa || null,
      nombre_mesa: r.nombre_mesa,
      hora: r.hora,
      estado: r.estado,
      fecha: new Date().toISOString().split('T')[0]
    }));
    const { error } = await supabase.from('reservas').upsert(dbPayloads);
    if (error) {
      console.error('Error upserting reservas:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('reservas').delete().eq('id_reserva', id);
    if (error) {
      console.error('Error deleting reserva:', error);
      return false;
    }
    return true;
  }
};
