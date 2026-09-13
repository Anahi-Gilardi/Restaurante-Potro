import { getActiveSupabaseClient, tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';
import { ProductoMenu } from '../types';
import { RECIPES_DETAILS } from '../data/recipesData';
import { INITIAL_PRODUCTOS_MENU } from '../data/initialData';

type DbProductoMenu = Record<string, unknown>;

const normalizeCategoryName = (rawCat: string): string => {
  const norm = (rawCat || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('entrada')) return 'Entradas Criollas';
  if (norm.includes('carne') || norm.includes('parrilla') || norm.includes('corte') || norm.includes('bife') || norm.includes('lomo') || norm.includes('bondiola') || norm.includes('milanesa')) return 'Cortes a la Parrilla';
  if (norm.includes('pasta') || norm.includes('lasana') || norm.includes('fideo') || norm.includes('noqui') || norm.includes('cinta') || norm.includes('rotolo') || norm.includes('crep')) return 'Pastas Artesanales';
  if (norm.includes('pescad') || norm.includes('marisc') || norm.includes('salmon') || norm.includes('trucha') || norm.includes('pacu')) return 'Pescados y Mariscos';
  if (norm.includes('criolla') || norm.includes('locro') || norm.includes('humita') || norm.includes('guiso')) return 'Comidas Criollas';
  if (norm.includes('postre') || norm.includes('dulce') || norm.includes('tiramisu') || norm.includes('flan') || norm.includes('panna cotta') || norm.includes('tarta') || norm.includes('chocolate') || norm.includes('helado')) return 'Postres Tradicionales';
  if (norm.includes('bodega') || norm.includes('vino')) return 'Bodega y Vinos';
  if (norm.includes('bebida') || norm.includes('gaseosa') || norm.includes('agua')) return 'Bebidas sin alcohol';
  if (norm.includes('cocina')) return 'Cortes a la Parrilla';

  return rawCat || 'Entradas Criollas';
};

const inferTipo = (categoria: string): ProductoMenu['tipo'] => {
  const normalized = categoria.trim().toLowerCase();
  if (normalized.includes('bodega') || normalized.includes('vino')) return 'vino';
  if (normalized.includes('bebida')) return 'bebida';
  if (normalized.includes('postre')) return 'postre';
  return 'plato';
};

const readString = (value: unknown, fallback = '') => (
  typeof value === 'string' && value.trim().length > 0 ? value : fallback
);

const readNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const findInitialMatch = (nombre: string): ProductoMenu | undefined => {
  if (!nombre) return undefined;
  const clean = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  return INITIAL_PRODUCTOS_MENU.find(init => {
    const initClean = init.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    return clean.includes(initClean) || initClean.includes(clean) || (clean.slice(0, 10) === initClean.slice(0, 10) && clean.length > 5);
  });
};

const normalizeProductoMenu = (prod: DbProductoMenu): ProductoMenu => {
  const nombre = readString(prod.nombre);
  const match = findInitialMatch(nombre);
  const rawCat = readString(prod.categoria, match?.categoria || 'Menu');
  const categoria = normalizeCategoryName(rawCat);
  const tipo = readString(prod.tipo) || match?.tipo || inferTipo(categoria);

  const rawId = readString(prod.id_producto);
  const cleanSlug = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)+/g, '')
    .slice(0, 45);
  const id_producto = rawId || match?.id_producto || (cleanSlug ? `prod_${cleanSlug}` : `prod_${Date.now()}`);

  const rawActivo = prod.activo;
  const activo = rawActivo === undefined || rawActivo === null || rawActivo === ''
    ? true
    : (rawActivo === true || rawActivo === 'true' || (rawActivo !== false && rawActivo !== 'false'));

  const imagen = readString(prod.imagen) || readString(prod.url_imagen) || match?.imagen || '/logo-el-patron.jpeg?v=5';
  const descripcion = readString(prod.descripcion) || match?.descripcion || '';

  return {
    id_producto,
    nombre,
    descripcion,
    precio_venta: readNumber(prod.precio_venta, match?.precio_venta || 0),
    categoria,
    subcategoria: readString(prod.subcategoria) || match?.subcategoria || undefined,
    activo: activo ?? true,
    imagen,
    tipo,
    tiempo_preparacion_estimado: readNumber(prod.tiempo_preparacion_estimado, match?.tiempo_preparacion_estimado || 12),
    requiere_cocina: typeof prod.requiere_cocina === 'boolean'
      ? prod.requiere_cocina
      : (match?.requiere_cocina ?? (tipo === 'plato' || tipo === 'postre')),
    pasos_preparacion: Array.isArray(prod.pasos_preparacion)
      ? prod.pasos_preparacion
      : (RECIPES_DETAILS[id_producto]?.pasos_preparacion || match?.pasos_preparacion || undefined),
    alergenos: Array.isArray(prod.alergenos)
      ? prod.alergenos
      : (RECIPES_DETAILS[id_producto]?.alergenos || match?.alergenos || undefined),
    consejo_emplatado: readString(prod.consejo_emplatado)
      || (RECIPES_DETAILS[id_producto]?.consejo_emplatado || match?.consejo_emplatado || undefined)
  };
};

const toDbProductoMenu = (prod: ProductoMenu | Partial<ProductoMenu>) => ({
  ...prod,
  imagen: prod.imagen || null
});

export const menuService = {
  async list(): Promise<ProductoMenu[]> {
    const cached = localStorage.getItem('el_patron_cache_menu');
    if (process.env.NODE_ENV === 'test' && cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeProductoMenu);
        }
      } catch {}
    }

    // 1. Intentar leer directo desde Google Sheets
    try {
      const sheetData = await sheetFetchTable('productos_menu');
      if (sheetData && sheetData.length > 0) {
        try {
          localStorage.setItem('el_patron_cache_menu', JSON.stringify(sheetData));
        } catch {}
        return sheetData.map(normalizeProductoMenu);
      }
    } catch (sheetErr) {
      console.warn('[menuService.list] Fallback desde Google Sheets:', sheetErr);
    }

    const client = tryGetActiveSupabaseClient();

    if (client) {
      try {
        const { data, error } = await client.from('productos_menu').select('*').order('id_producto', { ascending: true });
        if (!error && data) {
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(data));
          } catch (storageError) {
            console.warn('LocalStorage quota exceeded on background update:', storageError);
          }
          return data.map(normalizeProductoMenu);
        }
      } catch (e) {
        console.warn('Failed fetching fresh menu, falling back to cache:', e);
      }
    }

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeProductoMenu);
        }
      } catch (e) {
        console.warn('Failed parsing menu cache:', e);
      }
    }

    // Si Supabase estaba configurado pero no respondió, no sustituir la carta
    // real por productos de demostración. Una carta vacía es más segura que
    // permitir ventas sobre precios o existencias ficticias.
    if (client) return [];

    // Local/Offline Mode seed cache if no cache is present
    try {
      localStorage.setItem('el_patron_cache_menu', JSON.stringify(INITIAL_PRODUCTOS_MENU));
    } catch (storageError) {
      console.warn('LocalStorage quota exceeded on offline seed:', storageError);
    }
    return INITIAL_PRODUCTOS_MENU;
  },

  async getById(id: string): Promise<ProductoMenu | null> {
    const all = await this.list();
    return all.find(p => p.id_producto === id) || null;
  },

  async create(prod: ProductoMenu): Promise<ProductoMenu> {
    const payload = toDbProductoMenu(prod);
    try {
      await sheetUpsertRow('productos_menu', payload);
    } catch (sheetErr) {
      console.error('[menuService.create] Error en Google Sheets:', sheetErr);
    }

    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('productos_menu').insert([payload]);
      }
    } catch (e) {
      console.warn('[menuService.create] Supabase omitido:', e);
    }

    const normalized = normalizeProductoMenu(payload);

    // Update local cache
    const cached = localStorage.getItem('el_patron_cache_menu');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.push(payload);
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(parsed));
          } catch {}
        }
      } catch {
        localStorage.removeItem('el_patron_cache_menu');
      }
    }

    return normalized;
  },

  async update(id: string, prod: Partial<ProductoMenu>): Promise<ProductoMenu> {
    const payload = { ...toDbProductoMenu(prod), id_producto: id };
    try {
      await sheetUpsertRow('productos_menu', payload);
    } catch (sheetErr) {
      console.error('[menuService.update] Error en Google Sheets:', sheetErr);
    }

    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('productos_menu').update(payload).eq('id_producto', id);
      }
    } catch (e) {
      console.warn('[menuService.update] Supabase omitido:', e);
    }

    const normalized = normalizeProductoMenu(payload);

    // Update local cache in-place
    const cached = localStorage.getItem('el_patron_cache_menu');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const updatedCache = parsed.map((item: any) =>
            item.id_producto === id ? { ...item, ...payload } : item
          );
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(updatedCache));
          } catch {}
        }
      } catch {
        localStorage.removeItem('el_patron_cache_menu');
      }
    }

    return normalized;
  },

  async upsert(prods: ProductoMenu[]): Promise<ProductoMenu[]> {
    for (const p of prods) {
      await this.update(p.id_producto, p);
    }
    return prods;
  },

  async remove(id: string): Promise<boolean> {
    try {
      await sheetDeleteRow('productos_menu', id);
    } catch (sheetErr) {
      console.error('[menuService.remove] Error en Google Sheets:', sheetErr);
    }

    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('productos_menu').delete().eq('id_producto', id);
      }
    } catch (e) {
      console.warn('[menuService.remove] Supabase omitido:', e);
    }

    // Update local cache
    const cached = localStorage.getItem('el_patron_cache_menu');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const updatedCache = parsed.filter((item: any) => item.id_producto !== id);
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(updatedCache));
          } catch {}
        }
      } catch {
        localStorage.removeItem('el_patron_cache_menu');
      }
    }

    return true;
  },

  async bulkUpdatePrices(updates: { id: string; precio_venta: number }[]): Promise<boolean> {
    localStorage.removeItem('el_patron_cache_menu');
    for (const u of updates) {
      await this.update(u.id, { precio_venta: u.precio_venta });
    }
    return true;
  }
};
