import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Usuario } from '../types';

export const usuariosService = {
  async list(): Promise<Usuario[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('usuarios').select('*').order('id_usuario', { ascending: true });
    if (error) {
      console.error('Error fetching usuarios:', error);
      throw error;
    }
    return data || [];
  },

  async getById(id: number): Promise<Usuario | null> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('usuarios').select('*').eq('id_usuario', id).single();
    if (error) {
      console.error(`Error fetching usuario ${id}:`, error);
      return null;
    }
    return data;
  },

  async create(user: Usuario): Promise<Usuario> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('usuarios').insert([user]).select().single();
    if (error) {
      console.error('Error creating usuario:', error);
      throw error;
    }
    return data;
  },

  async update(id: number, user: Partial<Usuario>): Promise<Usuario> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('usuarios').update(user).eq('id_usuario', id).select().single();
    if (error) {
      console.error('Error updating usuario:', error);
      throw error;
    }
    return data;
  },

  async upsert(users: Usuario[]): Promise<Usuario[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('usuarios').upsert(users).select();
    if (error) {
      console.error('Error upserting usuarios:', error);
      throw error;
    }
    return data || [];
  },

  async remove(id: number): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('usuarios').delete().eq('id_usuario', id);
    if (error) {
      console.error('Error deleting usuario:', error);
      return false;
    }
    return true;
  }
};
