import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Insumo } from '../types';

export const insumosService = {
  async list(): Promise<Insumo[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').select('*').order('id_insumo', { ascending: true });
    if (error) {
      console.error('Error fetching insumos:', error);
      throw error;
    }
    return data || [];
  },

  async getById(id: string): Promise<Insumo | null> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').select('*').eq('id_insumo', id).single();
    if (error) {
      console.error(`Error fetching insumo ${id}:`, error);
      return null;
    }
    return data;
  },

  async create(insumo: Insumo): Promise<Insumo> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').insert([insumo]).select().single();
    if (error) {
      console.error('Error creating insumo:', error);
      throw error;
    }
    return data;
  },

  async update(id: string, insumo: Partial<Insumo>): Promise<Insumo> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').update(insumo).eq('id_insumo', id).select().single();
    if (error) {
      console.error('Error updating insumo:', error);
      throw error;
    }
    if (insumo.costo_unitario !== undefined && insumo.costo_unitario !== null) {
      recalculateMarginsForInsumo(id, insumo.costo_unitario).catch(err =>
        console.error('Error running real-time margin recalculation:', err)
      );
    }
    return data;
  },

  async upsert(insumos: Insumo[]): Promise<Insumo[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('insumos').upsert(insumos).select();
    if (error) {
      console.error('Error upserting insumos:', error);
      throw error;
    }
    // Recalculate margins for each upserted insumo with updated cost
    (data || []).forEach(ins => {
      if (ins.costo_unitario !== undefined && ins.costo_unitario !== null) {
        recalculateMarginsForInsumo(ins.id_insumo, parseFloat(ins.costo_unitario)).catch(err =>
          console.error(`Error running margin recalculation for upserted insumo ${ins.id_insumo}:`, err)
        );
      }
    });
    return data || [];
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('insumos').delete().eq('id_insumo', id);
    if (error) {
      console.error('Error deleting insumo:', error);
      return false;
    }
    return true;
  },

  async recordMovement(movement: {
    id_insumo: string;
    tipo_movimiento: 'entrada' | 'salida_comanda' | 'salida_merma' | 'ajuste';
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
  }): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const id_movimiento = `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const { error } = await supabase.from('movimientos_inventario').insert([{
      id_movimiento,
      ...movement,
      fecha: new Date().toISOString()
    }]);
    if (error) {
      console.error('Error recording movement:', error);
    }
  }
};

export async function recalculateMarginsForInsumo(insumoId: string, nuevoCosto: number): Promise<void> {
  try {
    const { recetasService } = await import('./recetasService');
    const { menuService } = await import('./menuService');
    const { auditoriaService } = await import('./auditoriaService');

    // Fetch all recipes, products, and ingredients
    const [recetas, productos, insumos] = await Promise.all([
      recetasService.list(),
      menuService.list(),
      insumosService.list()
    ]);

    // Update our target ingredient's cost in the local memory array
    const updatedInsumos = insumos.map(i => i.id_insumo === insumoId ? { ...i, costo_unitario: nuevoCosto } : i);

    // Find recipes that use this insumo
    const targetRecipes = recetas.filter(r => r.id_insumo === insumoId);
    const affectedProductIds = Array.from(new Set(targetRecipes.map(r => r.id_producto)));

    for (const prodId of affectedProductIds) {
      const product = productos.find(p => p.id_producto === prodId);
      if (!product) continue;

      // Calculate total recipe cost for this product
      const productRecipes = recetas.filter(r => r.id_producto === prodId);
      const totalCost = productRecipes.reduce((sum, r) => {
        const ins = updatedInsumos.find(i => i.id_insumo === r.id_insumo);
        return sum + (r.cantidad_a_descontar * (ins?.costo_unitario ?? 0));
      }, 0);

      const marginPct = product.precio_venta > 0 ? ((product.precio_venta - totalCost) / product.precio_venta) * 100 : 0;

      // Log alert if margin is less than 60%
      if (marginPct < 60) {
        const msg = `Alerta de Margen: El plato "${product.nombre}" tiene un margen de ganancia real de ${marginPct.toFixed(1)}% (menor al 60%) debido al aumento del costo en ${insumoId}. Costo preparación: $${totalCost.toFixed(2)}.`;
        console.warn(msg);
        await auditoriaService.create({
          id: `alert_margin_${prodId}_${Date.now()}`,
          tipo: 'sistema',
          mensaje: msg,
          timestamp: new Date()
        }).catch(err => console.error('Error logging margin alert:', err));
      }
    }
  } catch (error) {
    console.error('Error in recalculateMarginsForInsumo:', error);
  }
}
