import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Mesa } from '../types';

export const mesasService = {
  async list(): Promise<Mesa[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('mesas').select('*').order('id_mesa', { ascending: true });
    if (error) {
      console.error('Error fetching mesas:', error);
      throw error;
    }
    return (data || []).map(m => ({
      ...m,
      comensales: m.comensales_actuales || undefined,
    }));
  },

  async getById(id: number): Promise<Mesa | null> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('mesas').select('*').eq('id_mesa', id).single();
    if (error) {
      console.error(`Error fetching mesa ${id}:`, error);
      return null;
    }
    return data ? { ...data, comensales: data.comensales_actuales || undefined } : null;
  },

  async create(mesa: Mesa): Promise<Mesa> {
    const supabase = getActiveSupabaseClient();
    const dbMesa = {
      id_mesa: mesa.id_mesa,
      numero_mesa: mesa.numero_mesa,
      estado: mesa.estado,
      comensales_actuales: mesa.comensales || null,
      capacidad: mesa.capacidad || 4,
      zona: mesa.zona || 'salon',
      x: mesa.x ?? null,
      y: mesa.y ?? null,
      width: mesa.width ?? null,
      height: mesa.height ?? null,
      rx: mesa.rx ?? 6,
      mesas_unidas: mesa.mesas_unidas || [],
    };
    const { data, error } = await supabase.from('mesas').insert([dbMesa]).select().single();
    if (error) {
      console.error('Error creating mesa:', error);
      throw error;
    }
    return { ...data, comensales: data.comensales_actuales || undefined };
  },

  async update(id: number, mesa: Partial<Mesa>): Promise<Mesa> {
    const supabase = getActiveSupabaseClient();
    const dbMesa: any = {};
    if (mesa.numero_mesa !== undefined) dbMesa.numero_mesa = mesa.numero_mesa;
    if (mesa.estado !== undefined) dbMesa.estado = mesa.estado;
    if (mesa.comensales !== undefined) dbMesa.comensales_actuales = mesa.comensales;
    if (mesa.capacidad !== undefined) dbMesa.capacidad = mesa.capacidad;
    if (mesa.zona !== undefined) dbMesa.zona = mesa.zona;
    if (mesa.x !== undefined) dbMesa.x = mesa.x;
    if (mesa.y !== undefined) dbMesa.y = mesa.y;
    if (mesa.width !== undefined) dbMesa.width = mesa.width;
    if (mesa.height !== undefined) dbMesa.height = mesa.height;
    if (mesa.rx !== undefined) dbMesa.rx = mesa.rx;
    if (mesa.mesas_unidas !== undefined) dbMesa.mesas_unidas = mesa.mesas_unidas;

    const { data, error } = await supabase.from('mesas').update(dbMesa).eq('id_mesa', id).select().single();
    if (error) {
      console.error('Error updating mesa:', error);
      throw error;
    }
    return { ...data, comensales: data.comensales_actuales || undefined };
  },

  async upsert(mesas: Mesa[]): Promise<Mesa[]> {
    const supabase = getActiveSupabaseClient();
    const mapped = mesas.map(m => ({
      id_mesa: m.id_mesa,
      numero_mesa: m.numero_mesa,
      estado: m.estado,
      comensales_actuales: m.comensales || null,
      capacidad: m.capacidad || 4,
      zona: m.zona || 'salon',
      x: m.x ?? null,
      y: m.y ?? null,
      width: m.width ?? null,
      height: m.height ?? null,
      rx: m.rx ?? 6,
      mesas_unidas: m.mesas_unidas || [],
    }));
    const { data, error } = await supabase.from('mesas').upsert(mapped).select();
    if (error) {
      console.error('Error upserting mesas:', error);
      throw error;
    }
    return (data || []).map(m => ({
      ...m,
      comensales: m.comensales_actuales || undefined
    }));
  },

  async remove(id: number): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('mesas').delete().eq('id_mesa', id);
    if (error) {
      console.error('Error deleting mesa:', error);
      return false;
    }
    return true;
  },

  // Realtime subscription helper
  subscribe(callback: (payload: any) => void) {
    const supabase = getActiveSupabaseClient();
    const channel = supabase
      .channel('realtime:mesas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, callback)
      .subscribe();
    return channel;
  }
};
