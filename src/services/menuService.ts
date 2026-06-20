import { getActiveSupabaseClient, tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { ProductoMenu } from '../types';
import { RECIPES_DETAILS } from '../data/recipesData';
import { INITIAL_PRODUCTOS_MENU } from '../data/initialData';

type DbProductoMenu = Record<string, unknown>;

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

const normalizeProductoMenu = (prod: DbProductoMenu): ProductoMenu => {
  const categoria = readString(prod.categoria, 'Menu');
  const tipo = readString(prod.tipo) || inferTipo(categoria);

  return {
    id_producto: readString(prod.id_producto, `prod_${Date.now()}`),
    nombre: readString(prod.nombre),
    descripcion: readString(prod.descripcion),
    precio_venta: readNumber(prod.precio_venta),
    categoria,
    subcategoria: readString(prod.subcategoria) || undefined,
    activo: prod.activo !== false,
    imagen: readString(prod.imagen, '/logo-el-patron.jpeg'),
    tipo,
    tiempo_preparacion_estimado: readNumber(prod.tiempo_preparacion_estimado) || undefined,
    requiere_cocina: typeof prod.requiere_cocina === 'boolean'
      ? prod.requiere_cocina
      : (tipo === 'plato' || tipo === 'postre'),
    pasos_preparacion: Array.isArray(prod.pasos_preparacion) ? prod.pasos_preparacion : (RECIPES_DETAILS[readString(prod.id_producto)]?.pasos_preparacion || undefined),
    alergenos: Array.isArray(prod.alergenos) ? prod.alergenos : (RECIPES_DETAILS[readString(prod.id_producto)]?.alergenos || undefined),
    consejo_emplatado: readString(prod.consejo_emplatado) || (RECIPES_DETAILS[readString(prod.id_producto)]?.consejo_emplatado || undefined)
  };
};

const toDbProductoMenu = (prod: ProductoMenu | Partial<ProductoMenu>) => ({
  ...prod,
  imagen: prod.imagen || null
});

export const menuService = {
  async list(): Promise<ProductoMenu[]> {
    const cached = localStorage.getItem('el_patron_cache_menu');
    const client = tryGetActiveSupabaseClient();

    if (cached) {
      if (client) {
        setTimeout(async () => {
          try {
            const { data, error } = await client.from('productos_menu').select('*').order('id_producto', { ascending: true });
            if (!error && data) {
              try {
                localStorage.setItem('el_patron_cache_menu', JSON.stringify(data));
              } catch (storageError) {
                console.warn('LocalStorage quota exceeded on background update:', storageError);
              }
            }
          } catch (e) {
            console.warn('Background menu cache refresh failed:', e);
          }
        }, 500);
      }

      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeProductoMenu);
        }
      } catch (e) {
        console.warn('Failed parsing menu cache:', e);
      }
    }

    if (!client) {
      // Local/Offline Mode seed cache
      try {
        localStorage.setItem('el_patron_cache_menu', JSON.stringify(INITIAL_PRODUCTOS_MENU));
      } catch (storageError) {
        console.warn('LocalStorage quota exceeded on offline seed:', storageError);
      }
      return INITIAL_PRODUCTOS_MENU;
    }

    const { data, error } = await client.from('productos_menu').select('*').order('id_producto', { ascending: true });
    if (error) {
      console.error('Error fetching productos_menu:', error);
      throw error;
    }
    const normalized = (data || []).map(normalizeProductoMenu);
    try {
      localStorage.setItem('el_patron_cache_menu', JSON.stringify(data || []));
    } catch (storageError) {
      console.warn('LocalStorage quota exceeded on sync:', storageError);
    }
    return normalized;
  },

  async getById(id: string): Promise<ProductoMenu | null> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('productos_menu').select('*').eq('id_producto', id).single();
    if (error) {
      console.error(`Error fetching producto ${id}:`, error);
      return null;
    }
    return normalizeProductoMenu(data);
  },

  async create(prod: ProductoMenu): Promise<ProductoMenu> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('productos_menu').insert([toDbProductoMenu(prod)]).select().single();
    if (error) {
      console.error('Error creating product:', error);
      throw error;
    }
    const normalized = normalizeProductoMenu(data);
    
    // Update local cache
    const cached = localStorage.getItem('el_patron_cache_menu');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.push(data);
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(parsed));
          } catch (storageError) {
            console.warn('LocalStorage quota exceeded on product create:', storageError);
          }
        }
      } catch (e) {
        localStorage.removeItem('el_patron_cache_menu');
      }
    }
    
    return normalized;
  },

  async update(id: string, prod: Partial<ProductoMenu>): Promise<ProductoMenu> {
    let updatedData: any = null;
    let fallback = false;

    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('productos_menu').update(toDbProductoMenu(prod)).eq('id_producto', id).select().single();
      if (error) {
        console.warn('Supabase update failed, falling back to local update:', error);
        fallback = true;
      } else {
        updatedData = data;
      }
    } catch (e) {
      console.warn('Supabase not available, falling back to local update:', e);
      fallback = true;
    }

    // In case of fallback or direct local edit, reconstruct the updated object
    if (fallback || !updatedData) {
      const cached = localStorage.getItem('el_patron_cache_menu');
      let currentItem: any = null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            currentItem = parsed.find((item: any) => item.id_producto === id);
          }
        } catch {}
      }
      if (!currentItem) {
        currentItem = INITIAL_PRODUCTOS_MENU.find(p => p.id_producto === id) || { id_producto: id };
      }
      // Reconstruct the DB payload format to preserve consistency in cache
      updatedData = { ...currentItem, ...prod };
    }

    const normalized = normalizeProductoMenu(updatedData);

    // Update local cache in-place
    const cached = localStorage.getItem('el_patron_cache_menu');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const updatedCache = parsed.map((item: any) => 
            item.id_producto === id ? { ...item, ...toDbProductoMenu(prod) } : item
          );
          try {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(updatedCache));
          } catch (storageError) {
            console.warn('LocalStorage quota exceeded, skipping local cache write:', storageError);
          }
        }
      } catch (e) {
        localStorage.removeItem('el_patron_cache_menu');
      }
    } else {
      // Create new cache with seeded menu plus updated item if cache was empty
      const initialCache = INITIAL_PRODUCTOS_MENU.map(item =>
        item.id_producto === id ? { ...item, ...toDbProductoMenu(prod) } : item
      );
      try {
        localStorage.setItem('el_patron_cache_menu', JSON.stringify(initialCache));
      } catch (storageError) {
        console.warn('LocalStorage quota exceeded, skipping local cache write:', storageError);
      }
    }

    return normalized;
  },

  async upsert(prods: ProductoMenu[]): Promise<ProductoMenu[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('productos_menu').upsert(prods.map(toDbProductoMenu)).select();
    if (error) {
      console.error('Error upserting productos_menu:', error);
      throw error;
    }
    const normalized = (data || []).map(normalizeProductoMenu);
    
    // Update local cache
    if (data) {
      try {
        localStorage.setItem('el_patron_cache_menu', JSON.stringify(data));
      } catch (storageError) {
        console.warn('LocalStorage quota exceeded on upsert:', storageError);
      }
    } else {
      localStorage.removeItem('el_patron_cache_menu');
    }
    
    return normalized;
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('productos_menu').delete().eq('id_producto', id);
    if (error) {
      console.error('Error deleting product:', error);
      return false;
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
          } catch (storageError) {
            console.warn('LocalStorage quota exceeded on product remove:', storageError);
          }
        }
      } catch (e) {
        localStorage.removeItem('el_patron_cache_menu');
      }
    }
    
    return true;
  },

  async bulkUpdatePrices(updates: { id: string; precio_venta: number }[]): Promise<boolean> {
    localStorage.removeItem('el_patron_cache_menu');
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('productos_menu').upsert(
      updates.map(u => ({ id_producto: u.id, precio_venta: u.precio_venta })),
      { onConflict: 'id_producto' }
    );
    if (error) {
      console.error('Error in bulk price update:', error);
      throw error;
    }
    return true;
  }
};
