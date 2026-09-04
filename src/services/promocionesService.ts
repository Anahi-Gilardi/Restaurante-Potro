import { tryGetActiveSupabaseClient, getActiveSupabaseClient } from '../lib/supabaseClient';

export interface Promocion {
  id_promo: string;
  nombre: string;
  descuento_porcentaje: number;
  tipo: 'happy_hour' | 'combo' | 'descuento_directo';
  dias_vigentes: string;
  activo: boolean;
  descripcion: string;
  imagen_url?: string;
  precio?: number;
}

const LOCAL_STORAGE_KEY = 'el_patron_promociones_cache';

const getLocalCache = (): Promocion[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setLocalCache = (promos: Promocion[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(promos));
  } catch (err) {
    console.warn('Could not save promociones to localStorage:', err);
  }
};

export const promocionesService = {
  async list(): Promise<Promocion[]> {
    const client = tryGetActiveSupabaseClient();
    if (!client) {
      return getLocalCache();
    }

    try {
      const { data, error } = await client.from('promociones').select('*').order('nombre', { ascending: true });
      if (error) {
        console.warn('Error fetching promociones from Supabase, returning local cache:', error);
        return getLocalCache();
      }
      const mapped: Promocion[] = (data || []).map(p => ({
        id_promo: p.id_promo,
        nombre: p.nombre,
        descuento_porcentaje: p.descuento || p.descuento_porcentaje || 0,
        tipo: p.tipo || 'descuento_directo',
        dias_vigentes: p.dias_vigentes || p.días_vigentes || 'Todos los días',
        activo: p.activa !== undefined ? p.activa : (p.activo !== undefined ? p.activo : true),
        descripcion: p.descripcion || '',
        imagen_url: p.imagen_url || undefined,
        precio: p.precio !== undefined && p.precio !== null ? Number(p.precio) : (p.precio_promocional !== undefined ? Number(p.precio_promocional) : undefined)
      }));

      if (mapped.length > 0) {
        setLocalCache(mapped);
      }
      return mapped.length > 0 ? mapped : getLocalCache();
    } catch (err) {
      console.warn('Network or client error in promocionesService.list, returning local cache:', err);
      return getLocalCache();
    }
  },

  async create(promo: Promocion): Promise<Promocion> {
    const local = getLocalCache();
    setLocalCache([promo, ...local.filter(p => p.id_promo !== promo.id_promo)]);

    const supabase = getActiveSupabaseClient();
    const dbPayload = {
      id_promo: promo.id_promo,
      nombre: promo.nombre,
      descuento: promo.descuento_porcentaje,
      tipo: promo.tipo,
      dias_vigentes: promo.dias_vigentes,
      activa: promo.activo,
      descripcion: promo.descripcion,
      imagen_url: promo.imagen_url || null,
      precio: promo.precio || null
    };
    const { data, error } = await supabase.from('promociones').insert([dbPayload]).select().single();
    if (error) {
      console.error('Error creating promocion:', error);
      throw error;
    }
    const created: Promocion = {
      id_promo: data.id_promo,
      nombre: data.nombre,
      descuento_porcentaje: data.descuento,
      tipo: data.tipo || 'descuento_directo',
      dias_vigentes: data.dias_vigentes || 'Todos los días',
      activo: data.activa,
      descripcion: data.descripcion,
      imagen_url: data.imagen_url || undefined,
      precio: data.precio !== undefined && data.precio !== null ? Number(data.precio) : undefined
    };
    const currentCache = getLocalCache();
    setLocalCache([created, ...currentCache.filter(p => p.id_promo !== created.id_promo)]);
    return created;
  },

  async update(id: string, fields: Partial<Promocion>): Promise<void> {
    const currentCache = getLocalCache();
    const updatedCache = currentCache.map(p => p.id_promo === id ? { ...p, ...fields } : p);
    setLocalCache(updatedCache);

    const supabase = getActiveSupabaseClient();
    const dbPayload: any = {};
    if (fields.nombre !== undefined) dbPayload.nombre = fields.nombre;
    if (fields.descuento_porcentaje !== undefined) dbPayload.descuento = fields.descuento_porcentaje;
    if (fields.tipo !== undefined) dbPayload.tipo = fields.tipo;
    if (fields.dias_vigentes !== undefined) dbPayload.dias_vigentes = fields.dias_vigentes;
    if (fields.activo !== undefined) dbPayload.activa = fields.activo;
    if (fields.descripcion !== undefined) dbPayload.descripcion = fields.descripcion;
    if (fields.imagen_url !== undefined) dbPayload.imagen_url = fields.imagen_url || null;
    if (fields.precio !== undefined) dbPayload.precio = fields.precio || null;

    const { error } = await supabase.from('promociones').update(dbPayload).eq('id_promo', id);
    if (error) {
      console.error('Error updating promocion:', error);
      throw error;
    }
  },

  async upsert(promos: Promocion[]): Promise<void> {
    setLocalCache(promos);
    const supabase = getActiveSupabaseClient();
    const dbPayloads = promos.map(p => ({
      id_promo: p.id_promo,
      nombre: p.nombre,
      descuento: p.descuento_porcentaje,
      tipo: p.tipo,
      dias_vigentes: p.dias_vigentes,
      activa: p.activo,
      descripcion: p.descripcion,
      imagen_url: p.imagen_url || null,
      precio: p.precio || null
    }));
    const { error } = await supabase.from('promociones').upsert(dbPayloads);
    if (error) {
      console.error('Error upserting promociones:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<boolean> {
    const currentCache = getLocalCache();
    setLocalCache(currentCache.filter(p => p.id_promo !== id));

    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('promociones').delete().eq('id_promo', id);
    if (error) {
      console.error('Error deleting promocion:', error);
      throw error;
    }
    return true;
  }
};
