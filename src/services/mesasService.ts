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
    return data || [];
  },

  async getById(id: number): Promise<Mesa | null> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('mesas').select('*').eq('id_mesa', id).single();
    if (error) {
      console.error(`Error fetching mesa ${id}:`, error);
      return null;
    }
    return data;
  },

  async create(mesa: Mesa): Promise<Mesa> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('mesas').insert([mesa]).select().single();
    if (error) {
      console.error('Error creating mesa:', error);
      throw error;
    }
    return data;
  },

  async update(id: number, mesa: Partial<Mesa>): Promise<Mesa> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('mesas').update(mesa).eq('id_mesa', id).select().single();
    if (error) {
      console.error('Error updating mesa:', error);
      throw error;
    }
    return data;
  },

  async upsert(mesas: Mesa[]): Promise<Mesa[]> {
    const supabase = getActiveSupabaseClient();
    const mapped = mesas.map(m => ({
      id_mesa: m.id_mesa,
      numero_mesa: m.numero_mesa,
      estado: m.estado,
      comensales: m.comensales || null
    }));
    const { data, error } = await supabase.from('mesas').upsert(mapped).select();
    if (error) {
      console.error('Error upserting mesas:', error);
      throw error;
    }
    return data || [];
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
