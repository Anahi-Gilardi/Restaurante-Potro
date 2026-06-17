import { getActiveSupabaseClient } from '../lib/supabaseClient';

export interface Promocion {
  id_promo: string;
  nombre: string;
  descuento_porcentaje: number;
  tipo: 'happy_hour' | 'combo' | 'descuento_directo';
  dias_vigentes: string;
  activo: boolean;
  descripcion: string;
}

export const promocionesService = {
  async list(): Promise<Promocion[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('promociones').select('*').order('nombre', { ascending: true });
    if (error) {
      console.error('Error fetching promociones:', error);
      throw error;
    }
    return (data || []).map(p => ({
      id_promo: p.id_promo,
      nombre: p.nombre,
      descuento_porcentaje: p.descuento || p.descuento_porcentaje || 0,
      tipo: p.tipo || 'descuento_directo',
      dias_vigentes: p.dias_vigentes || p.días_vigentes || 'Todos los días',
      activo: p.activa !== undefined ? p.activa : (p.activo !== undefined ? p.activo : true),
      descripcion: p.descripcion || ''
    }));
  },

  async create(promo: Promocion): Promise<Promocion> {
    const supabase = getActiveSupabaseClient();
    const dbPayload = {
      id_promo: promo.id_promo,
      nombre: promo.nombre,
      descuento: promo.descuento_porcentaje,
      activa: promo.activo,
      descripcion: promo.descripcion
    };
    const { data, error } = await supabase.from('promociones').insert([dbPayload]).select().single();
    if (error) {
      console.error('Error creating promocion:', error);
      throw error;
    }
    return {
      id_promo: data.id_promo,
      nombre: data.nombre,
      descuento_porcentaje: data.descuento,
      tipo: 'descuento_directo',
      dias_vigentes: 'Todos los dias',
      activo: data.activa,
      descripcion: data.descripcion
    };
  },

  async update(id: string, fields: Partial<Promocion>): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const dbPayload: any = {};
    if (fields.nombre !== undefined) dbPayload.nombre = fields.nombre;
    if (fields.descuento_porcentaje !== undefined) dbPayload.descuento = fields.descuento_porcentaje;
    if (fields.activo !== undefined) dbPayload.activa = fields.activo;
    if (fields.descripcion !== undefined) dbPayload.descripcion = fields.descripcion;

    const { error } = await supabase.from('promociones').update(dbPayload).eq('id_promo', id);
    if (error) {
      console.error('Error updating promocion:', error);
      throw error;
    }
  },

  async upsert(promos: Promocion[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const dbPayloads = promos.map(p => ({
      id_promo: p.id_promo,
      nombre: p.nombre,
      descuento: p.descuento_porcentaje,
      activa: p.activo,
      descripcion: p.descripcion
    }));
    const { error } = await supabase.from('promociones').upsert(dbPayloads);
    if (error) {
      console.error('Error upserting promociones:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('promociones').delete().eq('id_promo', id);
    if (error) {
      console.error('Error deleting promocion:', error);
      throw error;
    }
    return true;
  }
};
