import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Reserva } from '../types';

// ---------------------------------------------------------------------------
// Normalización de fechas
// Supabase puede devolver fechas en ISO (YYYY-MM-DD) o DD/MM/YYYY.
// Esta función las unifica siempre a ISO.
// ---------------------------------------------------------------------------
function normalizarFecha(valor: string | null | undefined): string {
    if (!valor) return new Date().toISOString().split('T')[0];
    // Ya viene en ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
    // Formato DD/MM/YYYY o DD-MM-YYYY
  const parts = valor.split(/[-\/]/);
    if (parts.length === 3) {
          const [d, m, y] = parts;
          const dia  = d.padStart(2, '0');
          const mes  = m.padStart(2, '0');
          const anio = y.length === 2 ? `20${y}` : y;
          // Si el primer segmento parece año (>31) ya viene YYYY-MM-DD con separador /
      if (Number(d) > 31) return `${d}-${m.padStart(2,'0')}-${y.padStart(2,'0')}`;
          return `${anio}-${mes}-${dia}`;
    }
    return valor;
}

// ---------------------------------------------------------------------------
// Mapeo DB → Reserva
// Centralizado para no duplicar la lógica en list() y listByFecha().
// ---------------------------------------------------------------------------
function mapRowToReserva(r: Record<string, any>): Reserva {
    return {
          id_reserva:     r.id_reserva,
          nombre_cliente: r.cliente ?? r.nombre_cliente ?? '',
          telefono:       r.telefono ?? '',
          pax:            r.personas  ?? r.pax ?? 1,
          id_mesa:        r.id_mesa   ?? undefined,
          nombre_mesa:    r.nombre_mesa ?? (r.id_mesa ? `Mesa ${r.id_mesa}` : 'Sin mesa'),
          hora:           r.hora,
          estado:         (['confirmada','sentada','cancelada','pendiente','completada'] as const)
                            .includes(r.estado) ? r.estado : 'confirmada',
          fecha:          normalizarFecha(r.fecha),
          email:          r.email     ?? undefined,
          observaciones:  r.observaciones ?? r.notas ?? undefined,
          lista_espera:   r.lista_espera   ?? false,
          prioridad_espera: r.prioridad_espera ?? 0,
    };
}

// ---------------------------------------------------------------------------
// Payload DB ← Reserva
// Centralizado para no duplicar en create() y update().
// Solo incluye los campos que la tabla acepta.
// ---------------------------------------------------------------------------
function toDbPayload(res: Partial<Reserva> & { id_reserva?: string }) {
    const payload: Record<string, unknown> = {};
    if (res.id_reserva     !== undefined) payload.id_reserva   = res.id_reserva;
    if (res.nombre_cliente !== undefined) payload.cliente       = res.nombre_cliente;
    if (res.telefono       !== undefined) payload.telefono      = res.telefono;
    if (res.pax            !== undefined) payload.personas      = res.pax;
    if (res.id_mesa        !== undefined) payload.id_mesa       = res.id_mesa ?? null;
    if (res.nombre_mesa    !== undefined) payload.nombre_mesa   = res.nombre_mesa;
    if (res.hora           !== undefined) payload.hora          = res.hora;
    if (res.estado         !== undefined) payload.estado        = res.estado;
    if (res.fecha          !== undefined) payload.fecha         = res.fecha;
    if (res.email          !== undefined) payload.email         = res.email ?? null;
    if (res.observaciones  !== undefined) payload.observaciones = res.observaciones ?? null;
    if (res.lista_espera   !== undefined) payload.lista_espera  = res.lista_espera;
    if (res.prioridad_espera !== undefined) payload.prioridad_espera = res.prioridad_espera;
    return payload;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
export const reservasService = {

    /** Devuelve todas las reservas ordenadas por fecha y hora. */
    async list(): Promise<Reserva[]> {
          const supabase = getActiveSupabaseClient();
          const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .order('fecha', { ascending: true })
            .order('hora',  { ascending: true });
          if (error) {
                  console.error('reservasService.list:', error);
                  throw error;
          }
          return (data ?? []).map(mapRowToReserva);
    },

    /**
         * Devuelve solo las reservas de una fecha específica (YYYY-MM-DD).
     * Filtra en cliente para compatibilidad con esquemas sin índice de fecha.
     */
    async listByFecha(fecha: string): Promise<Reserva[]> {
          const supabase = getActiveSupabaseClient();
          const { data, error } = await supabase
            .from('reservas')
            .select('*');
          if (error) {
                  console.error('reservasService.listByFecha:', error);
                  throw error;
          }
          return (data ?? [])
            .map(mapRowToReserva)
            .filter(r => r.fecha === fecha)
            .sort((a, b) => a.hora.localeCompare(b.hora));
    },

    /**
         * Crea una reserva nueva.
     * Persiste TODOS los campos relevantes: fecha, teléfono, nombre_mesa,
     * observaciones, email, lista_espera y prioridad_espera.
     */
    async create(res: Reserva): Promise<Reserva> {
          const supabase = getActiveSupabaseClient();
          const { data, error } = await supabase
            .from('reservas')
            .insert([toDbPayload(res)])
            .select()
            .single();
          if (error) {
                  console.error('reservasService.create:', error);
                  throw error;
          }
          return mapRowToReserva(data);
    },

    /**
         * Actualiza campos específicos de una reserva existente.
     */
    async update(id: string, fields: Partial<Reserva>): Promise<void> {
          const supabase = getActiveSupabaseClient();
          const payload = toDbPayload(fields);
          // Nunca actualizar el id_reserva vía update
      delete payload.id_reserva;
          const { error } = await supabase
            .from('reservas')
            .update(payload)
            .eq('id_reserva', id);
          if (error) {
                  console.error('reservasService.update:', error);
                  throw error;
          }
    },

    /**
         * Upsert masivo (usado en sync con Supabase).
     */
    async upsert(reservas: Reserva[]): Promise<void> {
          const supabase = getActiveSupabaseClient();
          const { error } = await supabase
            .from('reservas')
            .upsert(reservas.map(r => toDbPayload(r)));
          if (error) {
                  console.error('reservasService.upsert:', error);
                  throw error;
          }
    },

    /**
         * Elimina una reserva por ID.
     * Registra en consola para facilitar debugging.
     */
    async remove(id: string): Promise<boolean> {
          const supabase = getActiveSupabaseClient();
          console.log(`[reservasService] Eliminando reserva id=${id}`);
          const { error } = await supabase
            .from('reservas')
            .delete()
            .eq('id_reserva', id);
          if (error) {
                  console.error('reservasService.remove:', error);
                  return false;
          }
          console.log(`[reservasService] Reserva ${id} eliminada OK`);
          return true;
    },
};
