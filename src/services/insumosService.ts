import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Insumo } from '../types';

export const insumosService = {
  async list(): Promise<Insumo[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').select('*').order('id_insumo', { ascending: true });
    if (error) {
      console.error('Error fetching insumos:', error);
      throw error;
    }
    return data || [];
  },

  async getById(id: string): Promise<Insumo | null> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').select('*').eq('id_insumo', id).single();
    if (error) {
      console.error(`Error fetching insumo ${id}:`, error);
      return null;
    }
    return data;
  },

  async create(insumo: Insumo): Promise<Insumo> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').insert([insumo]).select().single();
    if (error) {
      console.error('Error creating insumo:', error);
      throw error;
    }
    return data;
  },

  async update(id: string, insumo: Partial<Insumo>): Promise<Insumo> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').update(insumo).eq('id_insumo', id).select().single();
    if (error) {
      console.error('Error updating insumo:', error);
      throw error;
    }
    return data;
  },

  async upsert(insumos: Insumo[]): Promise<Insumo[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').upsert(insumos).select();
    if (error) {
      console.error('Error upserting insumos:', error);
      throw error;
    }
    return data || [];
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('insumos').delete().eq('id_insumo', id);
    if (error) {
      console.error('Error deleting insumo:', error);
      return false;
    }
    return true;
  },

  async recordMovement(movement: {
    id_insumo: string;
    tipo_movimiento: 'entrada' | 'salida_comanda' | 'salida_merma' | 'ajuste';
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
  }): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const id_movimiento = `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const { error } = await supabase.from('movimientos_inventario').insert([{
      id_movimiento,
      ...movement,
      fecha: new Date().toISOString()
    }]);
    if (error) {
      console.error('Error recording movement:', error);
    }
  }
};
