import { tryGetActiveSupabaseClient, getActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';
import { Proveedor } from '../types';

const toDbProveedor = (prov: Partial<Proveedor>) => ({
  ...(prov.id_proveedor !== undefined ? { id_proveedor: prov.id_proveedor } : {}),
  ...(prov.nombre !== undefined ? { nombre: prov.nombre } : {}),
  ...(prov.contacto !== undefined ? { contacto: prov.contacto } : {}),
  ...(prov.telefono !== undefined ? { telefono: prov.telefono } : {}),
  ...(prov.categoria !== undefined ? { categoria: prov.categoria } : {})
});

const normalizeProveedor = (p: Record<string, unknown>): Proveedor => ({
  id_proveedor: String(p.id_proveedor || `prov_${Date.now()}`),
  nombre: String(p.nombre || ''),
  contacto: String(p.contacto || ''),
  telefono: String(p.telefono || ''),
  categoria: (p.categoria as any) || 'viveres',
  correo: String(p.correo || ''),
  tiempo_entrega_dias: p.tiempo_entrega_dias !== undefined && p.tiempo_entrega_dias !== null ? Number(p.tiempo_entrega_dias) : 2
});

export const proveedoresService = {
  async list(): Promise<Proveedor[]> {
    // 1. Intentar Google Sheets primero
    try {
      const sheetData = await sheetFetchTable('proveedores');
      if (sheetData && sheetData.length > 0) {
        const mapped = sheetData.map(normalizeProveedor);
        localStorage.setItem('el_patron_cache_proveedores', JSON.stringify(mapped));
        return mapped;
      }
    } catch (sheetErr) {
      console.warn('[proveedoresService] Error leyendo Google Sheets:', sheetErr);
    }

    const cached = localStorage.getItem('el_patron_cache_proveedores');
    if (cached) {
      setTimeout(async () => {
        try {
          const supabase = tryGetActiveSupabaseClient();
          if (!supabase) return;
          const { data, error } = await supabase.from('proveedores').select('*').order('nombre', { ascending: true });
          if (!error && data) {
            localStorage.setItem('el_patron_cache_proveedores', JSON.stringify(data));
          }
        } catch (e) {
          console.warn('Background suppliers cache refresh failed:', e);
        }
      }, 500);

      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeProveedor);
        }
      } catch (e) {
        console.warn('Failed parsing suppliers cache:', e);
      }
    }

    const supabase = tryGetActiveSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase.from('proveedores').select('*').order('nombre', { ascending: true });
    if (error) {
      console.error('Error fetching proveedores:', error);
      throw error;
    }
    const mapped = (data || []).map(normalizeProveedor);
    localStorage.setItem('el_patron_cache_proveedores', JSON.stringify(data || []));
    return mapped;
  },

  async create(prov: Proveedor): Promise<Proveedor> {
    localStorage.removeItem('el_patron_cache_proveedores');

    // Persistir a Google Sheets de inmediato
    sheetUpsertRow('proveedores', {
      id_proveedor: prov.id_proveedor,
      nombre: prov.nombre,
      contacto: prov.contacto,
      telefono: prov.telefono || '',
      categoria: prov.categoria || 'viveres'
    }).catch(err => console.warn('[proveedoresService] Error guardando en Google Sheets:', err));

    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('proveedores').insert([toDbProveedor(prov)]).select().single();
        if (!error && data) {
          return {
            ...prov,
            ...data
          };
        }
      } catch (sbErr) {
        console.warn('[proveedoresService] Supabase create error (fallback activo):', sbErr);
      }
    }

    return prov;
  },

  async update(id: string, prov: Partial<Proveedor>): Promise<Proveedor> {
    localStorage.removeItem('el_patron_cache_proveedores');

    sheetUpsertRow('proveedores', {
      id_proveedor: id,
      ...toDbProveedor(prov)
    }).catch(err => console.warn('[proveedoresService] Error actualizando en Google Sheets:', err));

    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('proveedores').update(toDbProveedor(prov)).eq('id_proveedor', id).select().single();
        if (!error && data) {
          return {
            ...prov,
            ...data
          } as Proveedor;
        }
      } catch (sbErr) {
        console.warn('[proveedoresService] Supabase update error:', sbErr);
      }
    }

    return { id_proveedor: id, ...prov } as Proveedor;
  },

  async upsert(provs: Proveedor[]): Promise<Proveedor[]> {
    localStorage.removeItem('el_patron_cache_proveedores');

    for (const p of provs) {
      sheetUpsertRow('proveedores', {
        id_proveedor: p.id_proveedor,
        nombre: p.nombre,
        contacto: p.contacto,
        telefono: p.telefono || '',
        categoria: p.categoria || 'viveres'
      }).catch(err => console.warn('[proveedoresService] Error upserting en Google Sheets:', err));
    }

    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('proveedores').upsert(provs.map(toDbProveedor)).select();
        if (!error && data) {
          return (data || []).map((dbProv, idx) => ({
            ...provs[idx],
            ...dbProv
          }));
        }
      } catch (sbErr) {
        console.warn('[proveedoresService] Supabase upsert error:', sbErr);
      }
    }

    return provs;
  },

  async remove(id: string): Promise<boolean> {
    localStorage.removeItem('el_patron_cache_proveedores');

    sheetDeleteRow('proveedores', id).catch(err =>
      console.warn('[proveedoresService] Error eliminando de Google Sheets:', err)
    );

    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('proveedores').delete().eq('id_proveedor', id);
        if (error) {
          console.warn('[proveedoresService] Supabase delete warning:', error);
        }
      } catch (sbErr) {
        console.warn('[proveedoresService] Supabase delete error:', sbErr);
      }
    }

    return true;
  }
};
