import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { EventoLog } from '../types';

export const auditoriaService = {
  async list(): Promise<EventoLog[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('auditoria_eventos').select('*').order('timestamp', { ascending: false });
    if (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }
    return (data || []).map(l => ({
      id: l.id,
      tipo: l.tipo,
      mensaje: l.mensaje,
      timestamp: new Date(l.timestamp)
    }));
  },

  async create(log: EventoLog): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const payload = {
      id: log.id,
      tipo: log.tipo,
      mensaje: log.mensaje,
      timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString()
    };
    const { error } = await supabase.from('auditoria_eventos').insert([payload]);
    if (error) {
      console.error('Error inserting log:', error);
    }
  },

  async upsert(logs: EventoLog[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const dbPayloads = logs.map(l => ({
      id: l.id,
      tipo: l.tipo,
      mensaje: l.mensaje,
      timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : new Date(l.timestamp).toISOString()
    }));
    const { error } = await supabase.from('auditoria_eventos').upsert(dbPayloads);
    if (error) {
      console.error('Error upserting logs:', error);
    }
  }
};
