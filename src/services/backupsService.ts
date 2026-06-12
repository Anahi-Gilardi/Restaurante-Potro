import { getActiveSupabaseClient } from '../lib/supabaseClient';

export interface Checkpoint {
  id_cp: string;
  nombre: string;
  fecha: string;
  peso: string;
  tablas_afectadas: string;
  tipo: 'automatica' | 'manual';
  contenido?: string;
}

export const backupsService = {
  async list(): Promise<Checkpoint[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('backups').select('*').order('fecha', { ascending: false });
    if (error) {
      console.error('Error fetching backups:', error);
      return [];
    }
    return (data || []).map(b => ({
      id_cp: b.id_backup,
      nombre: b.nombre_archivo,
      fecha: new Date(b.fecha).toLocaleString('es-AR'),
      peso: b.tamano,
      tablas_afectadas: b.tablas,
      tipo: 'manual',
      contenido: b.contenido
    }));
  },

  async create(backup: { nombre: string; dataToDump: any }): Promise<Checkpoint> {
    const supabase = getActiveSupabaseClient();
    const serialized = JSON.stringify(backup.dataToDump);
    const sizeInKb = parseFloat((serialized.length / 1024).toFixed(1));
    const checkpointId = `cp_${Date.now()}`;
    
    const dbPayload = {
      id_backup: checkpointId,
      nombre_archivo: backup.nombre,
      fecha: new Date().toISOString(),
      tamano: `${sizeInKb} KB`,
      tablas: 'usuarios, mesas, insumos, productos_menu, recetas_escandallo, mermas, auditoria',
      contenido: serialized
    };

    const { error } = await supabase.from('backups').insert([dbPayload]);
    if (error) {
      console.error('Error creating backup in Supabase:', error);
      throw error;
    }

    return {
      id_cp: checkpointId,
      nombre: backup.nombre,
      fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR'),
      peso: `${sizeInKb} KB`,
      tablas_afectadas: dbPayload.tablas,
      tipo: 'manual',
      contenido: serialized
    };
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('backups').delete().eq('id_backup', id);
    if (error) {
      console.error('Error deleting backup:', error);
      return false;
    }
    return true;
  }
};
