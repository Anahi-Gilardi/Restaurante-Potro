import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Merma } from '../types';

export const mermasService = {
  async list(): Promise<Merma[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('mermas').select('*').order('fecha', { ascending: false });
    if (error) {
      console.error('Error fetching mermas:', error);
      throw error;
    }
    return (data || []).map(m => ({
      id_merma: m.id_merma,
      id_insumo: m.id_insumo,
      nombre_insumo: m.nombre_insumo,
      cantidad: parseFloat(m.cantidad),
      unidad_medida: m.unidad_medida,
      motivo: m.motivo,
      fecha: new Date(m.fecha)
    }));
  },

  async create(merma: Merma): Promise<Merma> {
    const supabase = getActiveSupabaseClient();
    const payload = {
      id_merma: merma.id_merma,
      id_insumo: merma.id_insumo,
      nombre_insumo: merma.nombre_insumo,
      cantidad: merma.cantidad,
      unidad_medida: merma.unidad_medida,
      motivo: merma.motivo,
      fecha: merma.fecha instanceof Date ? merma.fecha.toISOString() : new Date(merma.fecha).toISOString()
    };
    const { data, error } = await supabase.from('mermas').insert([payload]).select().single();
    if (error) {
      console.error('Error creating merma:', error);
      throw error;
    }
    return {
      ...data,
      fecha: new Date(data.fecha)
    };
  },

  async upsert(mermasList: Merma[]): Promise<Merma[]> {
    const supabase = getActiveSupabaseClient();
    const mapped = mermasList.map(m => ({
      id_merma: m.id_merma,
      id_insumo: m.id_insumo,
      nombre_insumo: m.nombre_insumo,
      cantidad: m.cantidad,
      unidad_medida: m.unidad_medida,
      motivo: m.motivo,
      fecha: m.fecha instanceof Date ? m.fecha.toISOString() : new Date(m.fecha).toISOString()
    }));
    const { data, error } = await supabase.from('mermas').upsert(mapped).select();
    if (error) {
      console.error('Error upserting mermas:', error);
      throw error;
    }
    return (data || []).map(m => ({
      ...m,
      fecha: new Date(m.fecha)
    }));
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('mermas').delete().eq('id_merma', id);
    if (error) {
      console.error('Error deleting merma:', error);
      return false;
    }
    return true;
  }
};
