/**
 * Utilidades para manejo estricto de fecha y hora en huso horario de Argentina (Córdoba / Río Cuarto - UTC-3)
 */

export const ARGENTINA_TIMEZONE = 'America/Argentina/Cordoba';

/**
 * Devuelve la fecha y hora en Argentina con formato estándar legible para Sheets y base de datos:
 * Ej: "2026-09-18 11:34:10"
 */
export const getArgentinaDateTimeString = (date: Date | string | number = new Date()): string => {
  if (typeof date === 'string') {
    const s = date.trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const [, y, m, d, h, min, sec] = match;
      return `${y}-${m}-${d} ${h}:${min}:${sec || '00'}`;
    }
  }

  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return new Date().toISOString().replace('T', ' ').slice(0, 19);

  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const y = get('year');
  const m = get('month');
  const day = get('day');
  const h = get('hour');
  const min = get('minute');
  const s = get('second');

  return `${y}-${m}-${day} ${h}:${min}:${s}`;
};

/**
 * Devuelve la fecha y hora en Argentina con formato ISO completo con offset local (-03:00):
 * Ej: "2026-09-18T11:34:10-03:00"
 */
export const getArgentinaIsoString = (date: Date | string | number = new Date()): string => {
  if (typeof date === 'string') {
    const s = date.trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const [, y, m, d, h, min, sec] = match;
      return `${y}-${m}-${d}T${h}:${min}:${sec || '00'}-03:00`;
    }
  }

  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return new Date().toISOString();

  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const y = get('year');
  const m = get('month');
  const day = get('day');
  const h = get('hour');
  const min = get('minute');
  const s = get('second');

  return `${y}-${m}-${day}T${h}:${min}:${s}-03:00`;
};

/**
 * Formato fecha y hora para la interfaz de usuario en Argentina:
 * Ej: "18/09/2026 11:34 hs"
 */
export const formatArgentinaDateTime = (date?: Date | string | number | null): string => {
  if (!date) return '';

  if (typeof date === 'string') {
    const s = date.trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const [, y, m, d, h, min] = match;
      return `${d}/${m}/${y} ${h}:${min} hs`;
    }
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}(?::\d{2})?( hs)?$/.test(s)) {
      return s.endsWith(' hs') ? s : `${s} hs`;
    }
  }

  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);

  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')} hs`;
};

/**
 * Formato solo hora para la interfaz de usuario:
 * Ej: "11:34 hs"
 */
export const formatArgentinaTime = (date?: Date | string | number | null): string => {
  if (!date) return '';

  if (typeof date === 'string') {
    const s = date.trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      return `${match[4]}:${match[5]} hs`;
    }
    if (/^\d{2}:\d{2}( hs)?$/.test(s)) {
      return s.endsWith(' hs') ? s : `${s} hs`;
    }
  }

  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);

  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${get('hour')}:${get('minute')} hs`;
};

export const argentinaDateIso = (date: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};

