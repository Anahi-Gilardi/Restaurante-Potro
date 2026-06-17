import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { RecetaEscandallo } from '../types';

export const recetasService = {
  async list(): Promise<RecetaEscandallo[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('recetas_escandallo').select('*').order('id_receta', { ascending: true });
    if (error) {
      console.error('Error fetching recetas_escandallo:', error);
      throw error;
    }
    return data || [];
  },

  async create(receta: RecetaEscandallo): Promise<RecetaEscandallo> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('recetas_escandallo').insert([receta]).select().single();
    if (error) {
      console.error('Error creating receta:', error);
      throw error;
    }
    return data;
  },

  async update(id: string, receta: Partial<RecetaEscandallo>): Promise<RecetaEscandallo> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('recetas_escandallo').update(receta).eq('id_receta', id).select().single();
    if (error) {
      console.error('Error updating receta:', error);
      throw error;
    }
    return data;
  },

  async upsert(recetas: RecetaEscandallo[]): Promise<RecetaEscandallo[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('recetas_escandallo').upsert(recetas).select();
    if (error) {
      console.error('Error upserting recetas_escandallo:', error);
      throw error;
    }
    return data || [];
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('recetas_escandallo').delete().eq('id_receta', id);
    if (error) {
      console.error('Error deleting receta:', error);
      throw error;
    }
    return true;
  }
};
