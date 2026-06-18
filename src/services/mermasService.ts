import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Merma } from '../types';
import { insumosService } from './insumosService';

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
      fecha: new Date(m.fecha),
      costo_perdida: m.costo_perdida ? parseFloat(m.costo_perdida) : 0
    }));
  },

  async create(merma: Merma): Promise<Merma> {
    const supabase = getActiveSupabaseClient();
    let costoPerdida = merma.costo_perdida;
    if (costoPerdida === undefined || costoPerdida === null) {
      const insumo = await insumosService.getById(merma.id_insumo);
      costoPerdida = (insumo?.costo_unitario ?? 0) * merma.cantidad;
    }
    const payload = {
      id_merma: merma.id_merma,
      id_insumo: merma.id_insumo,
      nombre_insumo: merma.nombre_insumo,
      cantidad: merma.cantidad,
      unidad_medida: merma.unidad_medida,
      motivo: merma.motivo,
      fecha: merma.fecha instanceof Date ? merma.fecha.toISOString() : new Date(merma.fecha).toISOString(),
      costo_perdida: costoPerdida
    };
    const { data, error } = await supabase.from('mermas').insert([payload]).select().single();
    if (error) {
      console.error('Error creating merma:', error);
      throw error;
    }
    return {
      ...data,
      fecha: new Date(data.fecha),
      costo_perdida: data.costo_perdida ? parseFloat(data.costo_perdida) : 0
    };
  },

  async upsert(mermasList: Merma[]): Promise<Merma[]> {
    const supabase = getActiveSupabaseClient();
    const insumos = await insumosService.list();
    const mapped = mermasList.map(m => {
      let costoPerdida = m.costo_perdida;
      if (costoPerdida === undefined || costoPerdida === null) {
        const ins = insumos.find(i => i.id_insumo === m.id_insumo);
        costoPerdida = (ins?.costo_unitario ?? 0) * m.cantidad;
      }
      return {
        id_merma: m.id_merma,
        id_insumo: m.id_insumo,
        nombre_insumo: m.nombre_insumo,
        cantidad: m.cantidad,
        unidad_medida: m.unidad_medida,
        motivo: m.motivo,
        fecha: m.fecha instanceof Date ? m.fecha.toISOString() : new Date(m.fecha).toISOString(),
        costo_perdida: costoPerdida
      };
    });
    const { data, error } = await supabase.from('mermas').upsert(mapped).select();
    if (error) {
      console.error('Error upserting mermas:', error);
      throw error;
    }
    return (data || []).map(m => ({
      ...m,
      fecha: new Date(m.fecha),
      costo_perdida: m.costo_perdida ? parseFloat(m.costo_perdida) : 0
    }));
  },

  async getAcumuladoPerdidas(desde: Date, hasta: Date): Promise<number> {
    const all = await this.list();
    const tDesde = desde.getTime();
    const tHasta = hasta.getTime();
    return all
      .filter(m => {
        const t = m.fecha.getTime();
        return t >= tDesde && t <= tHasta;
      })
      .reduce((sum, m) => sum + (m.costo_perdida ?? 0), 0);
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
