import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow } from '../lib/googleSheetsClient';
import { Categoria } from '../types';

export const DEFAULT_CATEGORIAS: Categoria[] = [
  { id: 'cat_entradas', nombre: 'Entradas Criollas', slug: 'entradas-criollas', orden: 1, activa: true, icono: 'UtensilsCrossed' },
  { id: 'cat_cortes', nombre: 'Cortes a la Parrilla', slug: 'cortes-a-la-parrilla', orden: 2, activa: true, icono: 'Beef' },
  { id: 'cat_pastas', nombre: 'Pastas Artesanales', slug: 'pastas-artesanales', orden: 3, activa: true, icono: 'UtensilsCrossed' },
  { id: 'cat_pescados', nombre: 'Pescados y Mariscos', slug: 'pescados-y-mariscos', orden: 4, activa: true, icono: 'Fish' },
  { id: 'cat_criollas', nombre: 'Comidas Criollas', slug: 'comidas-criollas', orden: 5, activa: true, icono: 'Utensils' },
  { id: 'cat_bodega', nombre: 'Bodega y Vinos', slug: 'bodega-y-vinos', orden: 6, activa: true, icono: 'Wine' },
  { id: 'cat_vinos_tintos', nombre: 'Vinos Tintos', slug: 'vinos-tintos', orden: 6.1, activa: true, icono: 'Wine' },
  { id: 'cat_vinos_blancos_rosados', nombre: 'Vinos Blancos y Rosados', slug: 'vinos-blancos-y-rosados', orden: 6.2, activa: true, icono: 'Wine' },
  { id: 'cat_espumantes', nombre: 'Espumantes', slug: 'espumantes', orden: 6.3, activa: true, icono: 'Wine' },
  { id: 'cat_cervezas', nombre: 'Cervezas', slug: 'cervezas', orden: 6.4, activa: true, icono: 'Beer' },
  { id: 'cat_destilados', nombre: 'Destilados', slug: 'destilados', orden: 6.5, activa: true, icono: 'Wine' },
  { id: 'cat_tragos_cocteleria', nombre: 'Tragos y Coctelería', slug: 'tragos-y-cocteleria', orden: 6.6, activa: true, icono: 'Wine' },
  { id: 'cat_postres', nombre: 'Postres Tradicionales', slug: 'postres-tradicionales', orden: 7, activa: true, icono: 'Coffee' },
  { id: 'cat_bebidas_con_alcohol', nombre: 'Bebidas con alcohol', slug: 'bebidas-con-alcohol', orden: 8, activa: true, icono: 'Wine' },
  { id: 'cat_bebidas_sin_alcohol', nombre: 'Bebidas sin alcohol', slug: 'bebidas-sin-alcohol', orden: 9, activa: true, icono: 'Wine' }
];

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
          }))
          .sort((a: Categoria, b: Categoria) => Number(a.orden || 99) - Number(b.orden || 99));

        try {
          localStorage.setItem('el_patron_cache_categorias', JSON.stringify(mapped));
        } catch (e) {
          console.warn('Failed to cache categories to localStorage:', e);
        }
        return mapped;
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
              localStorage.setItem('el_patron_cache_categorias', JSON.stringify(data));
            }
          } catch (e) {
            console.warn('Background categories cache refresh failed:', e);
          }
        }, 500);
      }

      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasAlcohol = parsed.some((c: Categoria) =>
            c.slug === 'bebidas-con-alcohol' || (c.nombre && c.nombre.toLowerCase().includes('con alcohol'))
          );
          if (!hasAlcohol) {
            const alcoholCat = DEFAULT_CATEGORIAS.find(c => c.slug === 'bebidas-con-alcohol');
            if (alcoholCat) {
              parsed.push(alcoholCat);
              parsed.sort((a: Categoria, b: Categoria) => Number(a.orden || 99) - Number(b.orden || 99));
              try {
                localStorage.setItem('el_patron_cache_categorias', JSON.stringify(parsed));
              } catch {}
            }
          }
          return parsed;
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

      const result = data && data.length > 0 ? data : DEFAULT_CATEGORIAS;
      localStorage.setItem('el_patron_cache_categorias', JSON.stringify(result));
      return result;
    } catch (err) {
      console.warn('categoriasService list failed, returning default fallbacks:', err);
      return DEFAULT_CATEGORIAS;
    }
  }
};
