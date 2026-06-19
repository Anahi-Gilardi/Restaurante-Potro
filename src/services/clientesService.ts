import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Cliente } from '../types';

export const clientesService = {
  async list(): Promise<Cliente[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
    if (error) {
      console.error('Error fetching clientes:', error);
      return [];
    }
    return data || [];
  },

  async getByDniCuit(dniCuit: string): Promise<Cliente | null> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('clientes').select('*').eq('dni_cuit', dniCuit).maybeSingle();
    if (error) {
      console.error(`Error fetching cliente by DNI/CUIT ${dniCuit}:`, error);
      return null;
    }
    return data;
  },

  async create(cliente: Omit<Cliente, 'fecha_registro'>): Promise<Cliente> {
    const supabase = getActiveSupabaseClient();
    const payload = {
      ...cliente,
      fecha_registro: new Date().toISOString()
    };
    const { data, error } = await supabase.from('clientes').insert([payload]).select().single();
    if (error) {
      console.error('Error creating cliente:', error);
      throw error;
    }
    return data;
  },

  async updatePuntos(idCliente: string, nuevosPuntos: number): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('clientes').update({ puntos: nuevosPuntos }).eq('id_cliente', idCliente);
    if (error) {
      console.error(`Error updating points for customer ${idCliente}:`, error);
      throw error;
    }
  }
};
