import { getActiveSupabaseClient, tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';
import { ProductoMenu } from '../types';
import { RECIPES_DETAILS } from '../data/recipesData';
import { INITIAL_PRODUCTOS_MENU } from '../data/initialData';
import { isValidImageData, saveMenuImage, getMenuImageSync, getAllMenuImages, deleteMenuImage } from '../lib/imageStorage';

type DbProductoMenu = Record<string, unknown>;

const normalizeCategoryName = (rawCat: string): string => {
  const norm = (rawCat || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('tinto')) return 'Vinos Tintos';
  if (norm.includes('blanco') || norm.includes('rosado') || norm.includes('rose')) return 'Vinos Blancos y Rosados';
  if (norm.includes('espumante') || norm.includes('champagne')) return 'Espumantes';
  if (norm.includes('cerveza')) return 'Cervezas';
  if (norm.includes('destilado')) return 'Destilados';
  if (norm.includes('trago') || norm.includes('coctel') || norm.includes('cocteleria')) return 'Tragos y Coctelería';

  if (norm.includes('entrada')) return 'Entradas Criollas';
  if (norm.includes('carne') || norm.includes('parrilla') || norm.includes('corte') || norm.includes('bife') || norm.includes('lomo') || norm.includes('bondiola') || norm.includes('milanesa')) return 'Cortes a la Parrilla';
  if (norm.includes('pasta') || norm.includes('lasana') || norm.includes('fideo') || norm.includes('noqui') || norm.includes('cinta') || norm.includes('rotolo') || norm.includes('crep')) return 'Pastas Artesanales';
  if (norm.includes('pescad') || norm.includes('marisc') || norm.includes('salmon') || norm.includes('trucha') || norm.includes('pacu')) return 'Pescados y Mariscos';
  if (norm.includes('criolla') || norm.includes('locro') || norm.includes('humita') || norm.includes('guiso')) return 'Comidas Criollas';
  if (norm.includes('postre') || norm.includes('dulce') || norm.includes('tiramisu') || norm.includes('flan') || norm.includes('panna cotta') || norm.includes('tarta') || norm.includes('chocolate') || norm.includes('helado')) return 'Postres Tradicionales';
  if (norm.includes('bodega') || norm.includes('vino')) return 'Bodega y Vinos';
  if (norm.includes('con alcohol') || (norm.includes('alcohol') && !norm.includes('sin'))) return 'Bebidas con Alcohol';
  if (norm.includes('bebida') || norm.includes('gaseosa') || norm.includes('agua')) return 'Bebidas sin alcohol';
  if (norm.includes('cocina')) return 'Cortes a la Parrilla';

  return rawCat || 'Entradas Criollas';
};

const inferTipo = (categoria: string): ProductoMenu['tipo'] => {
  const normalized = categoria.trim().toLowerCase();
  if (normalized.includes('bodega') || normalized.includes('vino') || normalized.includes('espumante')) return 'vino';
  if (normalized.includes('bebida') || normalized.includes('cerveza') || normalized.includes('destilado') || normalized.includes('trago') || normalized.includes('coctel')) return 'bebida';
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

const normalizeAlphanumeric = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const INITIAL_MATCH_INDEX: Array<{ cleanName: string; cleanPrefix10: string; item: ProductoMenu }> = [];
const INITIAL_EXACT_MATCH_MAP = new Map<string, ProductoMenu>();

for (const init of INITIAL_PRODUCTOS_MENU) {
  if (!init || typeof init.nombre !== 'string') continue;
  const cleanName = normalizeAlphanumeric(init.nombre);
  if (!cleanName) continue;
  if (!INITIAL_EXACT_MATCH_MAP.has(cleanName)) {
    INITIAL_EXACT_MATCH_MAP.set(cleanName, init);
  }
  INITIAL_MATCH_INDEX.push({
    cleanName,
    cleanPrefix10: cleanName.slice(0, 10),
    item: init
  });
}

const findInitialMatch = (nombre: string): ProductoMenu | undefined => {
  if (!nombre) return undefined;
  const clean = normalizeAlphanumeric(nombre);
  if (!clean) return undefined;
  const exact = INITIAL_EXACT_MATCH_MAP.get(clean);
  if (exact) return exact;
  const prefix10 = clean.slice(0, 10);
  const canMatchPrefix = clean.length > 5;
  for (let i = 0; i < INITIAL_MATCH_INDEX.length; i++) {
    const entry = INITIAL_MATCH_INDEX[i];
    if (
      clean.includes(entry.cleanName) ||
      entry.cleanName.includes(clean) ||
      (canMatchPrefix && prefix10 === entry.cleanPrefix10)
    ) {
      return entry.item;
    }
  }
  return undefined;
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
  const activo = rawActivo === undefined || rawActivo === null || rawActivo === '' || !rawId
    ? true
    : (rawActivo === true || rawActivo === 'true' || (rawActivo !== false && rawActivo !== 'false'));

  const rawImg = readString(prod.imagen) || readString(prod.url_imagen);
  const validImg = isValidImageData(rawImg) ? rawImg : null;
  const localImg = getMenuImageSync(id_producto);
  const imagen = localImg || validImg || match?.imagen || '/logo-el-patron.jpeg?v=5';
  if (validImg && !localImg) {
    saveMenuImage(id_producto, validImg).catch(() => {});
  }
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
      || (RECIPES_DETAILS[id_producto]?.consejo_emplatado || match?.consejo_emplatado || undefined),
    unidad_medida: readString(prod.unidad_medida) || match?.unidad_medida || undefined,
    stock_actual: prod.stock_actual !== undefined && prod.stock_actual !== null ? readNumber(prod.stock_actual, 0) : (match?.stock_actual ?? 0),
    stock_minimo: prod.stock_minimo !== undefined && prod.stock_minimo !== null ? readNumber(prod.stock_minimo, 5) : (match?.stock_minimo ?? 5),
    controla_stock: typeof prod.controla_stock === 'boolean'
      ? prod.controla_stock
      : (prod.controla_stock === 'true' || prod.controla_stock === true || (match?.controla_stock ?? false))
  };
};

const OBSOLETE_BEVERAGES = new Set([
  'prod_agua',
  'prod_gaseosa',
  'prod_agua_saborizada',
  'aguaconsingas',
  'gaseosaslineacocacola'
]);

export const deduplicateMenuProducts = (items: ProductoMenu[]): ProductoMenu[] => {
  const byKey = new Map<string, ProductoMenu>();
  const idToKey = new Map<string, string>();

  for (const item of items) {
    const lowerId = (item.id_producto || '').toLowerCase();
    const normName = (item.nombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    // Descartar bebidas genéricas obsoletas reemplazadas por el stock oficial
    if (OBSOLETE_BEVERAGES.has(lowerId) || OBSOLETE_BEVERAGES.has(normName)) {
      continue;
    }
    const existingKey = (normName && byKey.has(normName) ? normName : null) || idToKey.get(lowerId);

    if (!existingKey) {
      const canonicalKey = normName || lowerId;
      byKey.set(canonicalKey, item);
      if (lowerId) idToKey.set(lowerId, canonicalKey);
    } else {
      const existing = byKey.get(existingKey)!;
      const preferThisId = item.id_producto && !item.id_producto.startsWith('prod_1') && (existing.id_producto.startsWith('prod_1') || existing.id_producto.length > 35);
      const chosenId = preferThisId ? item.id_producto : existing.id_producto;
      const chosenActivo = item.activo || existing.activo;
      const hasRealImgThis = isValidImageData(item.imagen) && !item.imagen.includes('logo-el-patron');
      const hasRealImgExisting = isValidImageData(existing.imagen) && !existing.imagen.includes('logo-el-patron');
      const chosenImg = hasRealImgThis ? item.imagen : (hasRealImgExisting ? existing.imagen : (item.imagen || existing.imagen));

      const merged: ProductoMenu = {
        ...existing,
        ...item,
        id_producto: chosenId,
        activo: chosenActivo,
        imagen: chosenImg,
        descripcion: (item.descripcion?.length || 0) >= (existing.descripcion?.length || 0) ? item.descripcion : existing.descripcion,
        precio_venta: item.precio_venta > 0 ? item.precio_venta : existing.precio_venta,
        categoria: item.categoria || existing.categoria
      };

      byKey.set(existingKey, merged);
      if (lowerId) idToKey.set(lowerId, existingKey);
      if (chosenId) idToKey.set(chosenId.toLowerCase(), existingKey);
    }
  }

  return Array.from(byKey.values());
};

const toDbProductoMenu = (prod: ProductoMenu | Partial<ProductoMenu>) => {
  const img = prod.imagen || (prod as any).url_imagen || null;
  return {
    ...prod,
    imagen: img,
    url_imagen: img
  };
};

const getCachedProductById = (id: string): ProductoMenu | undefined => {
  if (!id) return undefined;
  const lowerId = id.toLowerCase();
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem('el_patron_cache_menu');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const found = parsed.find(
            (p: any) => p && (p.id_producto === id || String(p.id_producto || '').toLowerCase() === lowerId)
          );
          if (found) return normalizeProductoMenu(found);
        }
      } catch {}
    }
  }
  const initialFound = INITIAL_PRODUCTOS_MENU.find(
    (p) => p && (p.id_producto === id || String(p.id_producto || '').toLowerCase() === lowerId)
  );
  return initialFound ? normalizeProductoMenu(initialFound as unknown as DbProductoMenu) : undefined;
};

export const menuService = {
  async list(): Promise<ProductoMenu[]> {
    try {
      await getAllMenuImages();
    } catch {}

    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('el_patron_cache_menu') : null;
    if (process.env.NODE_ENV === 'test' && cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return deduplicateMenuProducts(parsed.map(normalizeProductoMenu));
        }
      } catch {}
    }

    // 1. Supabase como fuente primaria (la tabla productos_menu ya existe en Supabase)
    const client = tryGetActiveSupabaseClient();

    if (client) {
      try {
        const { data, error } = await client.from('productos_menu').select('*').order('id_producto', { ascending: true });
        if (!error && data && data.length > 0) {
          const deletedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('el_patron_deleted_menu_products') : null;
          const deletedSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
          const filteredData = data.filter((s: any) => {
            const pid = String(s.id_producto || '');
            return !deletedSet.has(pid) && !deletedSet.has(pid.toLowerCase());
          });
          const normalized = filteredData.map(normalizeProductoMenu);
          const deduped = deduplicateMenuProducts(normalized);
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(deduped));
          } catch (storageError) {
            console.warn('LocalStorage quota exceeded on background update:', storageError);
          }
          return deduped;
        }
      } catch (e) {
        console.warn('Failed fetching fresh menu from Supabase:', e);
      }
    }

    // 2. Fallback a Google Sheets
    try {
      const sheetData = await sheetFetchTable('productos_menu');
      if (sheetData && sheetData.length > 0) {
        const deletedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('el_patron_deleted_menu_products') : null;
        const deletedSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
        const filteredSheet = sheetData.filter((s: any) => {
          const pid = String(s.id_producto || '');
          return !deletedSet.has(pid) && !deletedSet.has(pid.toLowerCase());
        });
        const normalized = filteredSheet.map(normalizeProductoMenu);
        const deduped = deduplicateMenuProducts(normalized);
        try {
          localStorage.setItem('el_patron_cache_menu', JSON.stringify(deduped));
        } catch {}
        return deduped;
      }
    } catch (sheetErr) {
      console.warn('[menuService.list] Fallback desde Google Sheets:', sheetErr);
    }

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deletedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('el_patron_deleted_menu_products') : null;
          const deletedSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
          const filteredCache = parsed.filter((s: any) => {
            const pid = String(s.id_producto || '');
            return !deletedSet.has(pid) && !deletedSet.has(pid.toLowerCase());
          });
          return deduplicateMenuProducts(filteredCache.map(normalizeProductoMenu));
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
    return (INITIAL_PRODUCTOS_MENU as any[]).map(normalizeProductoMenu);
  },

  async getById(id: string): Promise<ProductoMenu | null> {
    const cachedItem = getCachedProductById(id);
    if (cachedItem) return cachedItem;
    const all = await this.list();
    return all.find(p => p.id_producto === id) || null;
  },

  async create(prod: ProductoMenu): Promise<ProductoMenu> {
    if (prod.imagen && isValidImageData(prod.imagen)) {
      await saveMenuImage(prod.id_producto, prod.imagen).catch(() => {});
    }

    const payload = toDbProductoMenu(prod);

    await Promise.allSettled([
      (async () => {
        try {
          const supabase = tryGetActiveSupabaseClient();
          if (supabase) {
            await supabase.from('productos_menu').upsert([payload], { onConflict: 'id_producto' });
          }
        } catch (e) {
          console.warn('[menuService.create] Supabase omitido:', e);
        }
      })(),
      (async () => {
        try {
          await sheetUpsertRow('productos_menu', payload);
        } catch (sheetErr) {
          console.error('[menuService.create] Error en Google Sheets:', sheetErr);
        }
      })()
    ]);

    // Si estaba en la lista de eliminados, removerlo al crearlo nuevamente
    try {
      if (typeof localStorage !== 'undefined') {
        const deletedRaw = localStorage.getItem('el_patron_deleted_menu_products');
        if (deletedRaw) {
          const deletedSet = new Set<string>(JSON.parse(deletedRaw));
          deletedSet.delete(prod.id_producto);
          deletedSet.delete(prod.id_producto.toLowerCase());
          localStorage.setItem('el_patron_deleted_menu_products', JSON.stringify(Array.from(deletedSet)));
        }
      }
    } catch {}

    const normalized = normalizeProductoMenu(payload);

    // Update local cache defensively
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('el_patron_cache_menu') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const idx = parsed.findIndex((item: any) => item.id_producto === prod.id_producto || item.id_producto?.toLowerCase() === prod.id_producto.toLowerCase());
          if (idx >= 0) {
            parsed[idx] = { ...parsed[idx], ...payload };
          } else {
            parsed.push(payload);
          }
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(parsed));
          } catch (e) {
            console.warn('LocalStorage quota exceeded on create, skipping cache update:', e);
          }
        }
      } catch (e) {
        console.warn('Failed parsing menu cache on create:', e);
      }
    }

    return normalized;
  },

  async update(id: string, prod: Partial<ProductoMenu>): Promise<ProductoMenu> {
    const lowerId = id.toLowerCase();
    const existing = getCachedProductById(id);
    const merged: ProductoMenu = {
      ...(existing || {}),
      id_producto: id,
      nombre: prod.nombre ?? existing?.nombre ?? '',
      descripcion: prod.descripcion ?? existing?.descripcion,
      precio_venta: prod.precio_venta ?? existing?.precio_venta ?? 0,
      categoria: prod.categoria ?? existing?.categoria ?? 'Menu',
      subcategoria: prod.subcategoria ?? existing?.subcategoria,
      activo: prod.activo !== undefined ? prod.activo : (existing?.activo ?? true),
      imagen: prod.imagen !== undefined ? prod.imagen : existing?.imagen,
      tipo: prod.tipo ?? existing?.tipo,
      tiempo_preparacion_estimado: prod.tiempo_preparacion_estimado ?? existing?.tiempo_preparacion_estimado,
      requiere_cocina: prod.requiere_cocina !== undefined ? prod.requiere_cocina : existing?.requiere_cocina,
      pasos_preparacion: prod.pasos_preparacion ?? existing?.pasos_preparacion,
      alergenos: prod.alergenos ?? existing?.alergenos,
      consejo_emplatado: prod.consejo_emplatado ?? existing?.consejo_emplatado,
      unidad_medida: prod.unidad_medida ?? existing?.unidad_medida,
      stock_actual: prod.stock_actual !== undefined ? prod.stock_actual : (existing?.stock_actual ?? 0),
      stock_minimo: prod.stock_minimo !== undefined ? prod.stock_minimo : (existing?.stock_minimo ?? 2),
      controla_stock: prod.controla_stock !== undefined ? prod.controla_stock : (existing?.controla_stock ?? false),
    };

    if (merged.imagen && isValidImageData(merged.imagen)) {
      await saveMenuImage(id, merged.imagen).catch(() => {});
    }

    const payload = { ...toDbProductoMenu(merged), id_producto: id };

    await Promise.allSettled([
      (async () => {
        try {
          const supabase = tryGetActiveSupabaseClient();
          if (supabase) {
            const { error: updErr } = await supabase.from('productos_menu').update(payload).eq('id_producto', id);
            if (updErr) {
              console.warn('[menuService.update] Update falló, ejecutando upsert:', updErr);
              await supabase.from('productos_menu').upsert([payload], { onConflict: 'id_producto' });
            }
          }
        } catch (e) {
          console.warn('[menuService.update] Supabase error:', e);
        }
      })(),
      (async () => {
        try {
          await sheetUpsertRow('productos_menu', payload);
        } catch (sheetErr) {
          console.error('[menuService.update] Error en Google Sheets:', sheetErr);
        }
      })()
    ]);

    // Si estaba en la lista de eliminados, removerlo
    try {
      if (typeof localStorage !== 'undefined') {
        const deletedRaw = localStorage.getItem('el_patron_deleted_menu_products');
        if (deletedRaw) {
          const deletedSet = new Set<string>(JSON.parse(deletedRaw));
          deletedSet.delete(id);
          deletedSet.delete(lowerId);
          localStorage.setItem('el_patron_deleted_menu_products', JSON.stringify(Array.from(deletedSet)));
        }
      }
    } catch {}

    const normalized = normalizeProductoMenu(payload);

    // Update local cache in-place defensively
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('el_patron_cache_menu') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const updatedCache = parsed.map((item: any) =>
            item.id_producto === id || item.id_producto?.toLowerCase() === lowerId ? { ...item, ...payload } : item
          );
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(updatedCache));
          } catch (e) {
            console.warn('LocalStorage quota exceeded on update, skipping cache update:', e);
          }
        }
      } catch (e) {
        console.warn('Failed parsing menu cache on update:', e);
      }
    }

    return normalized;
  },

  async save(prod: ProductoMenu): Promise<ProductoMenu> {
    const existing = getCachedProductById(prod.id_producto);
    if (existing) {
      return this.update(prod.id_producto, prod);
    }
    return this.create(prod);
  },

  async delete(id: string): Promise<boolean> {
    return this.remove(id);
  },

  async upsert(prods: ProductoMenu[]): Promise<ProductoMenu[]> {
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('productos_menu').upsert(prods.map(p => ({ ...toDbProductoMenu(p), id_producto: p.id_producto })));
      }
    } catch (e) {
      console.warn('[menuService.upsert] Supabase error:', e);
    }
    await Promise.allSettled(prods.map(p => this.update(p.id_producto, p)));
    return prods;
  },

  async remove(id: string): Promise<boolean> {
    const lowerId = id.toLowerCase();
    await deleteMenuImage(id).catch(() => {});

    await Promise.allSettled([
      (async () => {
        try {
          const supabase = tryGetActiveSupabaseClient();
          if (supabase) {
            await supabase.from('productos_menu').delete().eq('id_producto', id);
          }
        } catch (e) {
          console.warn('[menuService.remove] Supabase error:', e);
        }
      })(),
      (async () => {
        try {
          await sheetDeleteRow('productos_menu', id);
        } catch (sheetErr) {
          console.error('[menuService.remove] Error en Google Sheets:', sheetErr);
        }
      })()
    ]);

    // Registrar en lista negra de eliminados para que ninguna fuente offline lo resucite
    try {
      if (typeof localStorage !== 'undefined') {
        const deletedRaw = localStorage.getItem('el_patron_deleted_menu_products');
        const deletedSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
        deletedSet.add(id);
        deletedSet.add(lowerId);
        localStorage.setItem('el_patron_deleted_menu_products', JSON.stringify(Array.from(deletedSet)));
      }
    } catch {}

    // Update local cache defensively
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('el_patron_cache_menu') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const updatedCache = parsed.filter((item: any) => item.id_producto !== id && item.id_producto?.toLowerCase() !== lowerId);
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(updatedCache));
          } catch (e) {
            console.warn('LocalStorage quota exceeded on remove, skipping cache update:', e);
          }
        }
      } catch (e) {
        console.warn('Failed parsing menu cache on remove:', e);
      }
    }

    return true;
  },

  async bulkUpdatePrices(updates: { id: string; precio_venta: number }[]): Promise<boolean> {
    await Promise.allSettled(
      updates.map(u => this.update(u.id, { precio_venta: u.precio_venta }))
    );
    return true;
  }
};
