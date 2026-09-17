import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow } from '../lib/googleSheetsClient';
import { Categoria } from '../types';

export const DEFAULT_CATEGORIAS: Categoria[] = [
  { id: 'cat_entradas', nombre: 'Entradas', slug: 'entradas', orden: 1, activa: true, icono: 'UtensilsCrossed' },
  { id: 'cat_carnes', nombre: 'Carnes', slug: 'carnes', orden: 2, activa: true, icono: 'Beef' },
  { id: 'cat_pastas', nombre: 'Pastas Artesanales', slug: 'pastas-artesanales', orden: 3, activa: true, icono: 'UtensilsCrossed' },
  { id: 'cat_pescados', nombre: 'Pescados', slug: 'pescados', orden: 4, activa: true, icono: 'Fish' },
  { id: 'cat_criollas', nombre: 'Comidas Criollas', slug: 'comidas-criollas', orden: 5, activa: true, icono: 'Utensils' },
  { id: 'cat_bodega', nombre: 'Bodega y Vinos', slug: 'bodega-y-vinos', orden: 6, activa: true, icono: 'Wine' },
  { id: 'cat_vinos_tintos', nombre: 'Vinos Tintos', slug: 'vinos-tintos', orden: 6.1, activa: true, icono: 'Wine' },
  { id: 'cat_vinos_blancos_rosados', nombre: 'Vinos Blancos y Rosados', slug: 'vinos-blancos-y-rosados', orden: 6.2, activa: true, icono: 'Wine' },
  { id: 'cat_espumantes', nombre: 'Espumantes', slug: 'espumantes', orden: 6.3, activa: true, icono: 'Wine' },
  { id: 'cat_cervezas', nombre: 'Cervezas', slug: 'cervezas', orden: 6.4, activa: true, icono: 'Beer' },
  { id: 'cat_destilados', nombre: 'Destilados', slug: 'destilados', orden: 6.5, activa: true, icono: 'Wine' },
  { id: 'cat_tragos_cocteleria', nombre: 'Tragos y Coctelería', slug: 'tragos-y-cocteleria', orden: 6.6, activa: true, icono: 'Wine' },
  { id: 'cat_postres', nombre: 'Postres Tradicionales', slug: 'postres-tradicionales', orden: 7, activa: true, icono: 'Coffee' },
  { id: 'cat_bebidas_sin_alcohol', nombre: 'Bebidas sin alcohol', slug: 'bebidas-sin-alcohol', orden: 8, activa: true, icono: 'Wine' },
  { id: 'cat_bebidas_con_alcohol', nombre: 'Bebidas con alcohol', slug: 'bebidas-con-alcohol', orden: 9, activa: true, icono: 'Wine' }
];

export function mergeWithDefaultCategories(existing: Categoria[]): Categoria[] {
  if (!Array.isArray(existing) || existing.length === 0) {
    return [...DEFAULT_CATEGORIAS];
  }

  // Sanitize: filter out legacy phantom slugs that cause duplicate buttons in UI
  const sanitized = existing.filter(c => {
    const s = (c.slug || '').toLowerCase().trim();
    const n = (c.nombre || '').toLowerCase().trim();
    if (s === 'entradas-criollas' || n === 'entradas criollas') return false;
    if (s === 'cortes-a-la-parrilla' || n === 'cortes a la parrilla' || s === 'cortes') return false;
    if (s === 'pescados-y-mariscos' || n === 'pescados y mariscos') return false;
    return true;
  });

  const existingSlugs = new Set(
    sanitized.map(c => (c.slug || '').toLowerCase().trim())
  );
  const existingNames = new Set(
    sanitized.map(c => (c.nombre || '').toLowerCase().trim())
  );

  const missingDefaults = DEFAULT_CATEGORIAS.filter(def => {
    const s = def.slug.toLowerCase().trim();
    const n = def.nombre.toLowerCase().trim();
    return !existingSlugs.has(s) && !existingNames.has(n);
  });

  const merged = [...sanitized, ...missingDefaults];
  return merged.sort((a, b) => Number(a.orden || 99) - Number(b.orden || 99));
}

export const categoriasService = {
  async list(): Promise<Categoria[]> {
    try {
      const sheetData = await sheetFetchTable('categorias');
      if (sheetData && sheetData.length > 0) {
        const mapped: Categoria[] = sheetData
          .map((c: any) => ({
            id: c.id_categoria || c.id || c.nombre,
            nombre: c.nombre,
            slug: c.nombre
              ? c.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
              : 'categoria',
            orden: Number(c.orden || 1),
            activa: c.activa !== false && String(c.activa).toLowerCase() !== 'false',
            icono: c.icono || 'UtensilsCrossed'
          }));

        const merged = mergeWithDefaultCategories(mapped);
        try {
          localStorage.setItem('el_patron_cache_categorias', JSON.stringify(merged));
        } catch (e) {
          console.warn('Failed to cache categories to localStorage:', e);
        }
        return merged;
      }
    } catch (sheetErr) {
      console.warn('[categoriasService.list] Fallback a caché/Supabase:', sheetErr);
    }
    const cached = localStorage.getItem('el_patron_cache_categorias');
    const client = tryGetActiveSupabaseClient();

    if (cached) {
      if (client) {
        // Refresh cache in the background
        setTimeout(async () => {
          try {
            const { data, error } = await client
              .from('categorias')
              .select('*')
              .eq('activa', true)
              .order('orden', { ascending: true });
            if (!error && data) {
              const merged = mergeWithDefaultCategories(data);
              localStorage.setItem('el_patron_cache_categorias', JSON.stringify(merged));
            }
          } catch (e) {
            console.warn('Background categories cache refresh failed:', e);
          }
        }, 500);
      }

      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = mergeWithDefaultCategories(parsed);
          try {
            localStorage.setItem('el_patron_cache_categorias', JSON.stringify(merged));
          } catch {}
          return merged;
        }
      } catch (e) {
        console.warn('Failed parsing categories cache:', e);
      }
    }

    if (!client) {
      // Offline/Local Mode
      try {
        localStorage.setItem('el_patron_cache_categorias', JSON.stringify(DEFAULT_CATEGORIAS));
      } catch (storageError) {
        console.warn('LocalStorage quota exceeded on offline categories seed:', storageError);
      }
      return DEFAULT_CATEGORIAS;
    }

    try {
      const { data, error } = await client
        .from('categorias')
        .select('*')
        .eq('activa', true)
        .order('orden', { ascending: true });

      if (error) {
        console.error('Error fetching categories from Supabase:', error);
        throw error;
      }

      const result = mergeWithDefaultCategories(data && data.length > 0 ? data : DEFAULT_CATEGORIAS);
      localStorage.setItem('el_patron_cache_categorias', JSON.stringify(result));
      return result;
    } catch (err) {
      console.warn('categoriasService list failed, returning default fallbacks:', err);
      return DEFAULT_CATEGORIAS;
    }
  }
};
