import { tryGetActiveSupabaseClient, getActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';

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

const normalizePromocion = (p: Record<string, unknown>): Promocion => ({
  id_promo: String(p.id_promo || `promo_${Date.now()}`),
  nombre: String(p.nombre || ''),
  descuento_porcentaje: Number(p.descuento || p.descuento_porcentaje || 0),
  tipo: ((p.tipo as any) || 'descuento_directo'),
  dias_vigentes: String(p.dias_vigentes || (p as any)['días_vigentes'] || 'Todos los días'),
  activo: p.activa !== undefined ? Boolean(p.activa) : (p.activo !== undefined ? Boolean(p.activo) : true),
  descripcion: String(p.descripcion || ''),
  imagen_url: p.imagen_url ? String(p.imagen_url) : undefined,
  precio: p.precio !== undefined && p.precio !== null ? Number(p.precio) : ((p as any).precio_promocional !== undefined ? Number((p as any).precio_promocional) : undefined)
});

export const promocionesService = {
  async list(): Promise<Promocion[]> {
    // 1. Intentar Google Sheets primero
    try {
      const sheetData = await sheetFetchTable('promociones');
      if (sheetData && sheetData.length > 0) {
        const mapped = sheetData.map(normalizePromocion);
        setLocalCache(mapped);
        return mapped;
      }
    } catch (sheetErr) {
      console.warn('[promocionesService] Error leyendo Google Sheets:', sheetErr);
    }

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
      const mapped = (data || []).map(normalizePromocion);

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

    sheetUpsertRow('promociones', {
      id_promo: promo.id_promo,
      nombre: promo.nombre,
      descuento: promo.descuento_porcentaje,
      tipo: promo.tipo,
      dias_vigentes: promo.dias_vigentes,
      activa: promo.activo,
      descripcion: promo.descripcion,
      imagen_url: promo.imagen_url || null,
      precio: promo.precio || null
    }).catch(err => console.warn('[promocionesService] Error guardando en Google Sheets:', err));

    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
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
      try {
        const { data, error } = await supabase.from('promociones').insert([dbPayload]).select().single();
        if (!error && data) {
          const created = normalizePromocion(data);
          const currentCache = getLocalCache();
          setLocalCache([created, ...currentCache.filter(p => p.id_promo !== created.id_promo)]);
          return created;
        }
      } catch (sbErr) {
        console.warn('[promocionesService] Supabase create error:', sbErr);
      }
    }

    return promo;
  },

  async update(id: string, fields: Partial<Promocion>): Promise<void> {
    const currentCache = getLocalCache();
    const updatedCache = currentCache.map(p => p.id_promo === id ? { ...p, ...fields } : p);
    setLocalCache(updatedCache);

    const sheetPayload: Record<string, unknown> = { id_promo: id };
    if (fields.nombre !== undefined) sheetPayload.nombre = fields.nombre;
    if (fields.descuento_porcentaje !== undefined) sheetPayload.descuento = fields.descuento_porcentaje;
    if (fields.tipo !== undefined) sheetPayload.tipo = fields.tipo;
    if (fields.dias_vigentes !== undefined) sheetPayload.dias_vigentes = fields.dias_vigentes;
    if (fields.activo !== undefined) sheetPayload.activa = fields.activo;
    if (fields.descripcion !== undefined) sheetPayload.descripcion = fields.descripcion;
    if (fields.imagen_url !== undefined) sheetPayload.imagen_url = fields.imagen_url || null;
    if (fields.precio !== undefined) sheetPayload.precio = fields.precio || null;

    sheetUpsertRow('promociones', sheetPayload).catch(err =>
      console.warn('[promocionesService] Error actualizando en Google Sheets:', err)
    );

    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      const dbPayload: any = {};
      if (fields.nombre !== undefined) dbPayload.nombre = fields.nombre;
      if (fields.descuento_porcentaje !== undefined) dbPayload.descuento = fields.descuento_porcentaje;
      if (fields.tipo !== undefined) dbPayload.tipo = fields.tipo;
      if (fields.dias_vigentes !== undefined) dbPayload.dias_vigentes = fields.dias_vigentes;
      if (fields.activo !== undefined) dbPayload.activa = fields.activo;
      if (fields.descripcion !== undefined) dbPayload.descripcion = fields.descripcion;
      if (fields.imagen_url !== undefined) dbPayload.imagen_url = fields.imagen_url || null;
      if (fields.precio !== undefined) dbPayload.precio = fields.precio || null;

      try {
        await supabase.from('promociones').update(dbPayload).eq('id_promo', id);
      } catch (sbErr) {
        console.warn('[promocionesService] Supabase update error:', sbErr);
      }
    }
  },

  async upsert(promos: Promocion[]): Promise<void> {
    setLocalCache(promos);

    for (const p of promos) {
      sheetUpsertRow('promociones', {
        id_promo: p.id_promo,
        nombre: p.nombre,
        descuento: p.descuento_porcentaje,
        tipo: p.tipo,
        dias_vigentes: p.dias_vigentes,
        activa: p.activo,
        descripcion: p.descripcion,
        imagen_url: p.imagen_url || null,
        precio: p.precio || null
      }).catch(err => console.warn('[promocionesService] Error upserting en Google Sheets:', err));
    }

    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
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
      try {
        await supabase.from('promociones').upsert(dbPayloads);
      } catch (sbErr) {
        console.warn('[promocionesService] Supabase upsert error:', sbErr);
      }
    }
  },

  async remove(id: string): Promise<boolean> {
    const currentCache = getLocalCache();
    setLocalCache(currentCache.filter(p => p.id_promo !== id));

    sheetDeleteRow('promociones', id).catch(err =>
      console.warn('[promocionesService] Error eliminando de Google Sheets:', err)
    );

    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('promociones').delete().eq('id_promo', id);
      if (error) {
        console.error('Error deleting promocion:', error);
        throw error;
      }
    }
    return true;
  }
};
