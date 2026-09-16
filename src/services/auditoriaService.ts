import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { EventoLog } from '../types';

const LOCAL_LOGS_KEY = 'el_patron_logs_cache';

const readLocalLogs = (): EventoLog[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(l => ({ ...l, timestamp: new Date(l.timestamp) }));
      }
    }
  } catch {}
  return [];
};

const writeLocalLogs = (logs: EventoLog[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch {}
};

let auditoriaTableAvailable = false;

export const auditoriaService = {
  async list(): Promise<EventoLog[]> {
    const local = readLocalLogs();
    if (!auditoriaTableAvailable) return local;
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('auditoria_eventos').select('*').order('timestamp', { ascending: false });
      if (error) {
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
          auditoriaTableAvailable = false;
        }
        console.warn('auditoria_eventos no disponible en Supabase, usando respaldo local:', error.message);
        return local;
      }
      auditoriaTableAvailable = true;
      const remote = (data || []).map(l => ({
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
      writeLocalLogs(remote);
      return remote;
    } catch (err) {
      console.warn('Could not retrieve audit logs from remote database:', err);
      return local;
    }
  },

  async create(log: EventoLog): Promise<void> {
    const local = readLocalLogs();
    writeLocalLogs([log, ...local.filter(l => l.id !== log.id)]);
    if (auditoriaTableAvailable) {
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
          if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
            auditoriaTableAvailable = false;
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('schema cache') || err?.message?.includes('does not exist')) {
          auditoriaTableAvailable = false;
        }
      }
    }
  },

  async upsert(logs: EventoLog[]): Promise<void> {
    const local = readLocalLogs();
    const map = new Map<string, EventoLog>();
    logs.forEach(l => map.set(l.id, l));
    local.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });
    writeLocalLogs(Array.from(map.values()));
    if (!auditoriaTableAvailable) return;
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
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
          auditoriaTableAvailable = false;
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('schema cache') || err?.message?.includes('does not exist')) {
        auditoriaTableAvailable = false;
      }
    }
  }
};
