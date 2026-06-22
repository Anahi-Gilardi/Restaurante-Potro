import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { Categoria } from '../types';

export const DEFAULT_CATEGORIAS: Categoria[] = [
  { id: 'cat_bebidas', nombre: 'Bebidas', slug: 'bebidas', orden: 1, activa: true, icono: 'Wine' },
  { id: 'cat_calzones_empanadas', nombre: 'Calzones y empanadas', slug: 'calzones-y-empanadas', orden: 2, activa: true, icono: 'UtensilsCrossed' },
  { id: 'cat_pizzas', nombre: 'Pizzas', slug: 'pizzas', orden: 3, activa: true, icono: 'Pizza' },
  { id: 'cat_postres', nombre: 'Postres', slug: 'postres', orden: 4, activa: true, icono: 'Coffee' },
  { id: 'cat_sandwiches', nombre: 'Sandwiches', slug: 'sandwiches', orden: 5, activa: true, icono: 'UtensilsCrossed' }
];

export const categoriasService = {
  async list(): Promise<Categoria[]> {
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
