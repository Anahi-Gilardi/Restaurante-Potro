import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';
import { Reserva } from '../types';
import { argentinaDateIso } from '../lib/argentinaDate';

// ---------------------------------------------------------------------------
// Normalización de fechas
// Supabase y Google Sheets pueden devolver fechas en ISO (YYYY-MM-DD),
// ISO completa (YYYY-MM-DDTHH:mm:ss.sssZ) o DD/MM/YYYY.
// ---------------------------------------------------------------------------
function normalizarFecha(valor: string | null | undefined): string {
    if (!valor) return argentinaDateIso();
    const str = String(valor).trim();
    if (str.includes('T')) {
        const datePart = str.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parts = str.split(/[-\/]/);
    if (parts.length === 3) {
        const [d, m, y] = parts;
        const dia  = d.padStart(2, '0');
        const mes  = m.padStart(2, '0');
        const anio = y.length === 2 ? `20${y}` : y;
        if (Number(d) > 31) return `${d}-${m.padStart(2,'0')}-${y.padStart(2,'0')}`;
        return `${anio}-${mes}-${dia}`;
    }
    return str;
}

// ---------------------------------------------------------------------------
// Mapeo DB → Reserva
// ---------------------------------------------------------------------------
function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
}

function asNumber(value: unknown, fallback: number): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizarHora(value: unknown): string {
    const raw = asString(value, '21:00 hs').trim();
    if (/^\d{1,2}:\d{2}$/.test(raw)) return `${raw.padStart(5, '0')} hs`;
    if (/^\d{1,2}:\d{2}\s*hs$/i.test(raw)) return raw.replace(/\s*hs$/i, ' hs').padStart(8, '0');
    return '21:00 hs';
}

function normalizarEstado(value: unknown): Reserva['estado'] {
    const estados: Reserva['estado'][] = ['confirmada','sentada','cancelada','pendiente','completada'];
    return typeof value === 'string' && estados.includes(value as Reserva['estado'])
      ? value as Reserva['estado']
      : 'confirmada';
}

function mapRowToReserva(r: Record<string, unknown>): Reserva {
    const idMesa = asOptionalNumber(r.id_mesa);
    const listaEspera = Boolean(r.lista_espera === true || String(r.lista_espera).toLowerCase() === 'true');
    return {
          id_reserva:     asString(r.id_reserva, `r_${Date.now()}`),
          nombre_cliente: asString(r.cliente ?? r.nombre_cliente),
          telefono:       asString(r.telefono),
          pax:            asNumber(r.personas ?? r.pax, 1),
          id_mesa:        idMesa,
          nombre_mesa:    asString(r.nombre_mesa, idMesa ? `Mesa ${idMesa}` : 'Sin mesa'),
          hora:           normalizarHora(r.hora),
          estado:         normalizarEstado(r.estado),
          fecha:          normalizarFecha(asOptionalString(r.fecha)),
          email:          asOptionalString(r.email),
          observaciones:  asOptionalString(r.observaciones ?? r.notas),
          lista_espera:   listaEspera,
          prioridad_espera: listaEspera ? asOptionalNumber(r.prioridad_espera) ?? 0 : undefined,
          entrada_lista_espera: asOptionalString(r.entrada_lista_espera),
    };
}

// ---------------------------------------------------------------------------
// Payload DB ← Reserva
// ---------------------------------------------------------------------------
function toDbPayload(res: Partial<Reserva> & { id_reserva?: string }) {
    const payload: Record<string, unknown> = {};
    if (res.id_reserva     !== undefined) payload.id_reserva   = res.id_reserva;
    if (res.nombre_cliente !== undefined) {
      payload.cliente = res.nombre_cliente;
      payload.nombre_cliente = res.nombre_cliente;
    }
    if (res.telefono       !== undefined) payload.telefono      = res.telefono;
    if (res.pax            !== undefined) {
      payload.personas = res.pax;
      payload.pax = res.pax;
    }
    if (res.lista_espera === true && res.id_mesa === undefined) payload.id_mesa = null;
    else if (res.id_mesa   !== undefined) payload.id_mesa       = res.id_mesa ?? null;
    if (res.nombre_mesa    !== undefined) payload.nombre_mesa   = res.nombre_mesa;
    if (res.hora           !== undefined) payload.hora          = res.hora;
    if (res.estado         !== undefined) payload.estado        = res.estado;
    if (res.fecha          !== undefined) payload.fecha         = normalizarFecha(res.fecha);
    if (res.email          !== undefined) payload.email         = res.email ?? null;
    if (res.observaciones  !== undefined) payload.observaciones = res.observaciones ?? null;
    if (res.lista_espera   !== undefined) payload.lista_espera  = res.lista_espera;
    if (res.prioridad_espera !== undefined) payload.prioridad_espera = res.prioridad_espera;
    if (res.entrada_lista_espera !== undefined) payload.entrada_lista_espera = res.entrada_lista_espera ?? null;
    return payload;
}

function normalizeReservationError(error: any): Error {
    if (error?.code === '23P01' || String(error?.message ?? '').includes('RESERVA_SOLAPADA')) {
      return new Error('La mesa acaba de ser reservada para ese horario. Elegí otra mesa o usá la lista de espera.');
    }
    return error instanceof Error ? error : new Error('No se pudo guardar la reserva.');
}

export const __reservasServiceTestables = {
    normalizarFecha,
    mapRowToReserva,
    toDbPayload,
    normalizeReservationError,
};

// ---------------------------------------------------------------------------
// Service conectado a Google Sheets
// ---------------------------------------------------------------------------
export const reservasService = {

    /** Devuelve todas las reservas directamente desde Google Sheets (con fallback). */
    async list(): Promise<Reserva[]> {
      try {
        const sheetData = await sheetFetchTable('reservas');
        if (sheetData && sheetData.length > 0) {
          return sheetData.map(mapRowToReserva);
        }
      } catch (err) {
        console.warn('[reservasService.list] Leyendo desde Google Sheets falló:', err);
      }
      try {
        const supabase = tryGetActiveSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .order('fecha', { ascending: true })
            .order('hora',  { ascending: true });
          if (!error && data) return data.map(mapRowToReserva);
        }
      } catch (e) {
        console.warn('[reservasService.list] Supabase error:', e);
      }
      return [];
    },

    /** Devuelve solo las reservas de una fecha específica (YYYY-MM-DD). */
    async listByFecha(fecha: string): Promise<Reserva[]> {
      const all = await this.list();
      const normFecha = normalizarFecha(fecha);
      return all
        .filter(r => r.fecha === normFecha)
        .sort((a, b) => a.hora.localeCompare(b.hora));
    },

    /**
     * Crea una reserva nueva en Google Sheets en tiempo real.
     */
    async create(res: Reserva): Promise<Reserva> {
      const row = {
        id_reserva: res.id_reserva || `r_${Date.now()}`,
        cliente: res.nombre_cliente || '',
        nombre_cliente: res.nombre_cliente || '',
        telefono: res.telefono || '',
        personas: res.pax || 1,
        pax: res.pax || 1,
        fecha: normalizarFecha(res.fecha),
        hora: res.hora || '',
        id_mesa: res.id_mesa ?? null,
        nombre_mesa: res.nombre_mesa || '',
        estado: res.estado || 'confirmada',
        email: res.email || '',
        observaciones: res.observaciones || '',
        lista_espera: res.lista_espera ? 'true' : 'false',
        prioridad_espera: res.prioridad_espera ?? '',
        entrada_lista_espera: res.entrada_lista_espera || ''
      };

      try {
        await sheetUpsertRow('reservas', row);
      } catch (sheetErr) {
        console.error('[reservasService.create] Error guardando en Google Sheets:', sheetErr);
      }

      try {
        const supabase = tryGetActiveSupabaseClient();
        if (supabase) {
          await supabase.from('reservas').insert([toDbPayload(res)]);
        }
      } catch (sbErr) {
        console.warn('[reservasService.create] Supabase insert omitido:', sbErr);
      }

      return mapRowToReserva(row);
    },

    /**
     * Actualiza campos específicos de una reserva en Google Sheets.
     */
    async update(id: string, fields: Partial<Reserva>): Promise<void> {
      const row: Record<string, any> = { id_reserva: id };
      if (fields.nombre_cliente !== undefined) {
        row.cliente = fields.nombre_cliente;
        row.nombre_cliente = fields.nombre_cliente;
      }
      if (fields.telefono !== undefined) row.telefono = fields.telefono;
      if (fields.pax !== undefined) {
        row.personas = fields.pax;
        row.pax = fields.pax;
      }
      if (fields.fecha !== undefined) row.fecha = normalizarFecha(fields.fecha);
      if (fields.hora !== undefined) row.hora = fields.hora;
      if (fields.id_mesa !== undefined) row.id_mesa = fields.id_mesa;
      if (fields.nombre_mesa !== undefined) row.nombre_mesa = fields.nombre_mesa;
      if (fields.estado !== undefined) row.estado = fields.estado;
      if (fields.email !== undefined) row.email = fields.email;
      if (fields.observaciones !== undefined) row.observaciones = fields.observaciones;
      if (fields.lista_espera !== undefined) row.lista_espera = fields.lista_espera ? 'true' : 'false';
      if (fields.prioridad_espera !== undefined) row.prioridad_espera = fields.prioridad_espera;
      if (fields.entrada_lista_espera !== undefined) row.entrada_lista_espera = fields.entrada_lista_espera;

      try {
        await sheetUpsertRow('reservas', row);
      } catch (sheetErr) {
        console.error('[reservasService.update] Error actualizando en Google Sheets:', sheetErr);
      }

      try {
        const supabase = tryGetActiveSupabaseClient();
        if (supabase) {
          const payload = toDbPayload(fields);
          delete payload.id_reserva;
          await supabase.from('reservas').update(payload).eq('id_reserva', id);
        }
      } catch (sbErr) {
        console.warn('[reservasService.update] Supabase update omitido:', sbErr);
      }
    },

    /** Upsert de varias reservas a Google Sheets */
    async upsert(reservas: Reserva[]): Promise<void> {
      for (const r of reservas) {
        await this.create(r);
      }
    },

    /** Elimina una reserva de Google Sheets */
    async remove(id: string): Promise<boolean> {
      try {
        await sheetDeleteRow('reservas', id);
      } catch (sheetErr) {
        console.error('[reservasService.remove] Error eliminando en Google Sheets:', sheetErr);
      }
      try {
        const supabase = tryGetActiveSupabaseClient();
        if (supabase) {
          await supabase.from('reservas').delete().eq('id_reserva', id);
        }
      } catch (sbErr) {
        console.warn('[reservasService.remove] Supabase delete omitido:', sbErr);
      }
      return true;
    },
};
