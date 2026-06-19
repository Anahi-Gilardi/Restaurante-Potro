import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { ProductoMenu } from '../types';
import { RECIPES_DETAILS } from '../data/recipesData';

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
    if (cached) {
      setTimeout(async () => {
        try {
          const supabase = getActiveSupabaseClient();
          const { data, error } = await supabase.from('productos_menu').select('*').order('id_producto', { ascending: true });
          if (!error && data) {
            localStorage.setItem('el_patron_cache_menu', JSON.stringify(data));
          }
        } catch (e) {
          console.warn('Background menu cache refresh failed:', e);
        }
      }, 500);

      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeProductoMenu);
        }
      } catch (e) {
        console.warn('Failed parsing menu cache:', e);
      }
    }

    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('productos_menu').select('*').order('id_producto', { ascending: true });
    if (error) {
      console.error('Error fetching productos_menu:', error);
      throw error;
    }
    const normalized = (data || []).map(normalizeProductoMenu);
    localStorage.setItem('el_patron_cache_menu', JSON.stringify(data || []));
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
          localStorage.setItem('el_patron_cache_menu', JSON.stringify(parsed));
        }
      } catch (e) {
        localStorage.removeItem('el_patron_cache_menu');
      }
    }
    
    return normalized;
  },

  async update(id: string, prod: Partial<ProductoMenu>): Promise<ProductoMenu> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('productos_menu').update(toDbProductoMenu(prod)).eq('id_producto', id).select().single();
    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }
    const normalized = normalizeProductoMenu(data);
    
    // Update local cache in-place
    const cached = localStorage.getItem('el_patron_cache_menu');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const updatedCache = parsed.map((item: any) => 
            item.id_producto === id ? { ...item, ...data } : item
          );
          localStorage.setItem('el_patron_cache_menu', JSON.stringify(updatedCache));
        }
      } catch (e) {
        localStorage.removeItem('el_patron_cache_menu');
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
      localStorage.setItem('el_patron_cache_menu', JSON.stringify(data));
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
          localStorage.setItem('el_patron_cache_menu', JSON.stringify(updatedCache));
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
