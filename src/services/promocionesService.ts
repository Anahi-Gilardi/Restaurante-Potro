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

const toDbPromocion = (promo: Partial<Promocion>) => ({
  ...(promo.id_promo !== undefined ? { id_promo: promo.id_promo } : {}),
  ...(promo.nombre !== undefined ? { nombre: promo.nombre } : {}),
  ...(promo.descuento_porcentaje !== undefined ? { descuento: promo.descuento_porcentaje } : {}),
  ...(promo.tipo !== undefined ? { tipo: promo.tipo } : {}),
  ...(promo.dias_vigentes !== undefined ? { dias_vigentes: promo.dias_vigentes } : {}),
  ...(promo.activo !== undefined ? { activa: promo.activo } : {}),
  ...(promo.descripcion !== undefined ? { descripcion: promo.descripcion } : {})
});

type DbPromocion = Record<string, unknown>;

const readString = (value: unknown, fallback = ''): string => (
  typeof value === 'string' && value.trim().length > 0 ? value : fallback
);

const readNumber = (value: unknown, fallback = 0): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const readTipo = (value: unknown): Promocion['tipo'] => (
  value === 'happy_hour' || value === 'combo' || value === 'descuento_directo'
    ? value
    : 'descuento_directo'
);

const fromDbPromocion = (promo: DbPromocion): Promocion => ({
  id_promo: readString(promo.id_promo, `p_${Date.now()}`),
  nombre: readString(promo.nombre, 'Promocion sin nombre'),
  descuento_porcentaje: readNumber(promo.descuento, readNumber(promo.descuento_porcentaje)),
  tipo: readTipo(promo.tipo),
  dias_vigentes: readString(promo.dias_vigentes, readString(promo.vigencia, 'Todos los dias')),
  activo: typeof promo.activa === 'boolean' ? promo.activa : (typeof promo.activo === 'boolean' ? promo.activo : true),
  descripcion: readString(promo.descripcion)
});

export const promocionesService = {
  async list(): Promise<Promocion[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('promociones').select('*').order('nombre', { ascending: true });
    if (error) {
      console.error('Error fetching promociones:', error);
      throw error;
    }
    return (data || []).map(fromDbPromocion);
  },

  async create(promo: Promocion): Promise<Promocion> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('promociones').insert([toDbPromocion(promo)]).select().single();
    if (error) {
      console.error('Error creating promocion:', error);
      throw error;
    }
    return fromDbPromocion(data);
  },

  async update(id: string, fields: Partial<Promocion>): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('promociones').update(toDbPromocion(fields)).eq('id_promo', id);
    if (error) {
      console.error('Error updating promocion:', error);
      throw error;
    }
  },

  async upsert(promos: Promocion[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('promociones').upsert(promos.map(toDbPromocion));
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
      return false;
    }
    return true;
  }
};
