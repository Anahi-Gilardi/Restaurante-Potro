import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { EventoLog } from '../types';

export const auditoriaService = {
  async list(): Promise<EventoLog[]> {
    try {
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
    } catch (err) {
      console.warn('Could not retrieve audit logs from remote database:', err);
      return [];
    }
  },

  async create(log: EventoLog): Promise<void> {
    try {
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
    } catch (err) {
      console.warn('Could not persist audit log to remote database:', err);
    }
  },

  async upsert(logs: EventoLog[]): Promise<void> {
    try {
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
    } catch (err) {
      console.warn('Could not upsert audit logs to remote database:', err);
    }
  }
};
