import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Proveedor } from '../types';

const toDbProveedor = (prov: Partial<Proveedor>) => ({
  ...(prov.id_proveedor !== undefined ? { id_proveedor: prov.id_proveedor } : {}),
  ...(prov.nombre !== undefined ? { nombre: prov.nombre } : {}),
  ...(prov.contacto !== undefined ? { contacto: prov.contacto } : {}),
  ...(prov.telefono !== undefined ? { telefono: prov.telefono } : {}),
  ...(prov.categoria !== undefined ? { categoria: prov.categoria } : {})
});

export const proveedoresService = {
  async list(): Promise<Proveedor[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('proveedores').select('*').order('nombre', { ascending: true });
    if (error) {
      console.error('Error fetching proveedores:', error);
      throw error;
    }
    return (data || []).map(p => ({
      id_proveedor: p.id_proveedor,
      nombre: p.nombre,
      contacto: p.contacto,
      telefono: p.telefono || '',
      categoria: p.categoria || 'viveres',
      correo: p.correo || '',
      tiempo_entrega_dias: p.tiempo_entrega_dias !== undefined && p.tiempo_entrega_dias !== null ? p.tiempo_entrega_dias : 2
    }));
  },

  async create(prov: Proveedor): Promise<Proveedor> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('proveedores').insert([toDbProveedor(prov)]).select().single();
    if (error) {
      console.error('Error creating proveedor:', error);
      throw error;
    }
    return {
      ...prov,
      ...data
    };
  },

  async update(id: string, prov: Partial<Proveedor>): Promise<Proveedor> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('proveedores').update(toDbProveedor(prov)).eq('id_proveedor', id).select().single();
    if (error) {
      console.error('Error updating proveedor:', error);
      throw error;
    }
    return {
      ...prov,
      ...data
    } as Proveedor;
  },

  async upsert(provs: Proveedor[]): Promise<Proveedor[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('proveedores').upsert(provs.map(toDbProveedor)).select();
    if (error) {
      console.error('Error upserting proveedores:', error);
      throw error;
    }
    return (data || []).map((dbProv, idx) => ({
      ...provs[idx],
      ...dbProv
    }));
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('proveedores').delete().eq('id_proveedor', id);
    if (error) {
      console.error('Error deleting proveedor:', error);
      return false;
    }
    return true;
  }
};
