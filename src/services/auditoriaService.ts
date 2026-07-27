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
        timestamp: new Date(l.timestamp),
        usuario_id: l.created_by ?? undefined,
        terminal: l.terminal ?? undefined,
        entidad_id: l.entidad_id ?? undefined,
        estado_anterior: l.estado_anterior ?? undefined,
        estado_nuevo: l.estado_nuevo ?? undefined,
        duracion_segundos: l.duracion_segundos ?? undefined,
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
        timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString(),
        terminal: log.terminal ?? null,
        entidad_id: log.entidad_id ?? null,
        estado_anterior: log.estado_anterior ?? null,
        estado_nuevo: log.estado_nuevo ?? null,
        duracion_segundos: log.duracion_segundos ?? null,
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
        timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : new Date(l.timestamp).toISOString(),
        terminal: l.terminal ?? null,
        entidad_id: l.entidad_id ?? null,
        estado_anterior: l.estado_anterior ?? null,
        estado_nuevo: l.estado_nuevo ?? null,
        duracion_segundos: l.duracion_segundos ?? null,
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
