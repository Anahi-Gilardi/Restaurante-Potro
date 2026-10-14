import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow } from '../lib/googleSheetsClient';

export interface MenuDiarioDia {
  dia: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  nombre_dia: string;
  activo: boolean;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion: string;
  imagen_url?: string;
}

const normalizeMenuDiarioPrecio = (raw: unknown, fallback = 24300): number => {
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  // Reparar valores guardados como decimal por separador de miles (ej: 24.3 -> 24300)
  if (num > 0 && num < 500 && !Number.isInteger(num)) {
    return Math.round(num * 1000);
  }
  return Math.round(num);
};

export const INITIAL_MENU_DIARIO: Record<string, MenuDiarioDia> = {
  lunes: {
    dia: 'lunes',
    nombre_dia: 'LUNES',
    activo: true,
    nombre: 'Menú Ejecutivo Lunes',
    categoria: 'Menú Ejecutivo',
    precio: 24300,
    descripcion: 'Entrada, plato principal y postre del día.',
    imagen_url: ''
  },
  martes: {
    dia: 'martes',
    nombre_dia: 'MARTES',
    activo: true,
    nombre: 'Menú Ejecutivo Martes',
    categoria: 'Menú Ejecutivo',
    precio: 24300,
    descripcion: 'Entrada, plato principal y postre del día.',
    imagen_url: ''
  },
  miercoles: {
    dia: 'miercoles',
    nombre_dia: 'MIÉRCOLES',
    activo: true,
    nombre: 'Menú Ejecutivo Miércoles',
    categoria: 'Menú Ejecutivo',
    precio: 24300,
    descripcion: 'Entrada, plato principal y postre del día.',
    imagen_url: '/images/menu_ejecutivo_miercoles.png'
  },
  jueves: {
    dia: 'jueves',
    nombre_dia: 'JUEVES',
    activo: true,
    nombre: 'Menú Ejecutivo Jueves',
    categoria: 'Menú Ejecutivo',
    precio: 24300,
    descripcion: 'Entrada, plato principal y postre del día.',
    imagen_url: ''
  },
  viernes: {
    dia: 'viernes',
    nombre_dia: 'VIERNES',
    activo: true,
    nombre: 'Menú Ejecutivo Viernes',
    categoria: 'Menú Ejecutivo',
    precio: 24300,
    descripcion: 'Entrada, plato principal y postre del día.',
    imagen_url: ''
  },
  sabado: {
    dia: 'sabado',
    nombre_dia: 'SÁBADO',
    activo: true,
    nombre: 'Menú Ejecutivo Sábado',
    categoria: 'Menú Ejecutivo',
    precio: 24300,
    descripcion: 'Entrada, plato principal y postre del día.',
    imagen_url: ''
  },
  domingo: {
    dia: 'domingo',
    nombre_dia: 'DOMINGO',
    activo: true,
    nombre: 'Menú Ejecutivo Domingo',
    categoria: 'Menú Ejecutivo',
    precio: 24300,
    descripcion: 'Entrada, plato principal y postre del día.',
    imagen_url: ''
  }
};

const LOCAL_STORAGE_KEY = 'el_patron_menu_diario_cache';
export const MENU_DIARIO_ID_PREFIX = '__menu_diario_';
export const MENU_DIARIO_SYS_CATEGORY = '__SYS_MENU_DIARIO__';

const ALL_DAYS: MenuDiarioDia['dia'][] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo'
];

const toProductIdForDay = (dia: string) => `${MENU_DIARIO_ID_PREFIX}${dia.toLowerCase()}__`;

const extractDayFromProductId = (idProducto: string): MenuDiarioDia['dia'] | null => {
  const clean = String(idProducto || '').toLowerCase().trim();
  if (!clean.startsWith(MENU_DIARIO_ID_PREFIX)) return null;
  const rawDay = clean.slice(MENU_DIARIO_ID_PREFIX.length).replace(/__$/g, '') as MenuDiarioDia['dia'];
  return ALL_DAYS.includes(rawDay) ? rawDay : null;
};

const getLocalCache = (): Record<string, MenuDiarioDia> => {
  if (typeof window === 'undefined') return { ...INITIAL_MENU_DIARIO };
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { ...INITIAL_MENU_DIARIO };
    const parsed = JSON.parse(raw);
    const merged: Record<string, MenuDiarioDia> = { ...INITIAL_MENU_DIARIO };
    for (const key of Object.keys(merged)) {
      if (parsed && parsed[key]) {
        const item = parsed[key];
        const fallback = INITIAL_MENU_DIARIO[key];
        merged[key] = {
          ...fallback,
          ...item,
          nombre: item.nombre?.trim() || fallback.nombre,
          categoria: item.categoria?.trim() || fallback.categoria,
          descripcion: item.descripcion?.trim() || fallback.descripcion,
          precio: normalizeMenuDiarioPrecio(item.precio, fallback.precio),
          imagen_url: item.imagen_url?.trim() || fallback.imagen_url || ''
        };
      }
    }
    return merged;
  } catch {
    return { ...INITIAL_MENU_DIARIO };
  }
};

const setLocalCache = (semana: Record<string, MenuDiarioDia>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(semana));
  } catch (err) {
    console.warn('Could not save menu_diario to localStorage:', err);
  }
};

const toSupabaseProductoRow = (diaItem: MenuDiarioDia) => ({
  id_producto: toProductIdForDay(diaItem.dia),
  nombre: diaItem.nombre?.trim() || INITIAL_MENU_DIARIO[diaItem.dia]?.nombre || `Menú Ejecutivo ${diaItem.nombre_dia}`,
  descripcion: diaItem.descripcion?.trim() || 'Entrada, plato principal y postre del día.',
  precio_venta: normalizeMenuDiarioPrecio(diaItem.precio, 24300),
  categoria: MENU_DIARIO_SYS_CATEGORY,
  subcategoria: diaItem.categoria || 'Menú Ejecutivo',
  tipo: 'plato',
  tiempo_preparacion_estimado: 15,
  requiere_cocina: true,
  activo: diaItem.activo !== false,
  imagen: diaItem.imagen_url || null,
  url_imagen: diaItem.imagen_url || null,
  updated_at: new Date().toISOString()
});

export const menuDiarioService = {
  async list(): Promise<Record<string, MenuDiarioDia>> {
    const local = getLocalCache();
    const semana: Record<string, MenuDiarioDia> = { ...local };
    const remoteFoundDays = new Set<string>();

    // 1. Fuente primaria multi-dispositivo (PC + Celular): Tabla productos_menu en Supabase
    const client = tryGetActiveSupabaseClient();
    if (client) {
      try {
        const ids = ALL_DAYS.map(toProductIdForDay);
        const { data, error } = await client
          .from('productos_menu')
          .select('*')
          .in('id_producto', ids);

        if (!error && Array.isArray(data) && data.length > 0) {
          for (const row of data) {
            const diaKey = extractDayFromProductId(String(row.id_producto || ''));
            if (!diaKey || !semana[diaKey]) continue;
            remoteFoundDays.add(diaKey);
            const fallback = INITIAL_MENU_DIARIO[diaKey];
            const remoteImg = String(row.imagen || row.url_imagen || '').trim();
            semana[diaKey] = {
              dia: diaKey,
              nombre_dia: fallback.nombre_dia,
              activo: row.activo !== undefined && row.activo !== null ? Boolean(row.activo) : true,
              nombre: String(row.nombre || '').trim() || fallback.nombre,
              categoria: String(row.subcategoria || '').trim() || fallback.categoria,
              precio: normalizeMenuDiarioPrecio(row.precio_venta, fallback.precio),
              descripcion: String(row.descripcion || '').trim() || fallback.descripcion,
              imagen_url: remoteImg
            };
          }
        }
      } catch (err) {
        console.warn('[menuDiarioService.list] Error consultando Supabase:', err);
      }
    }

    // 2. Respaldo en Google Sheets (tabla configuracion) para días no encontrados aún en Supabase
    if (remoteFoundDays.size === 0) {
      try {
        const configRows = await sheetFetchTable('configuracion');
        if (Array.isArray(configRows) && configRows.length > 0) {
          for (const row of configRows) {
            const clave = String(row.clave || '').trim().toLowerCase();
            if (!clave.startsWith('menu_diario_')) continue;
            const diaKey = clave.replace('menu_diario_', '') as MenuDiarioDia['dia'];
            if (!ALL_DAYS.includes(diaKey) || remoteFoundDays.has(diaKey)) continue;
            try {
              const parsed = typeof row.valor === 'string' ? JSON.parse(row.valor) : row.valor;
              if (parsed && typeof parsed === 'object') {
                const fallback = INITIAL_MENU_DIARIO[diaKey];
                semana[diaKey] = {
                  ...fallback,
                  ...parsed,
                  dia: diaKey,
                  nombre_dia: fallback.nombre_dia,
                  precio: normalizeMenuDiarioPrecio(parsed.precio, fallback.precio),
                  imagen_url: parsed.imagen_url || ''
                };
                remoteFoundDays.add(diaKey);
              }
            } catch {}
          }
        }
      } catch {}
    }

    // 3. Auto-migración: Si en este dispositivo (ej. la PC) ya se había cargado una imagen en caché local
    // antes de la sincronización en la nube y aún no está en Supabase, subirla automáticamente.
    if (client) {
      for (const diaKey of ALL_DAYS) {
        if (!remoteFoundDays.has(diaKey) && local[diaKey]?.imagen_url) {
          const payload = toSupabaseProductoRow(local[diaKey]);
          client.from('productos_menu').upsert([payload], { onConflict: 'id_producto' }).then(() => {});
        }
      }
    }

    setLocalCache(semana);
    return semana;
  },

  async saveDay(diaItem: MenuDiarioDia): Promise<void> {
    const normalizedItem: MenuDiarioDia = {
      ...diaItem,
      precio: normalizeMenuDiarioPrecio(diaItem.precio, 24300),
      nombre: diaItem.nombre?.trim() || INITIAL_MENU_DIARIO[diaItem.dia]?.nombre || `Menú Ejecutivo ${diaItem.nombre_dia}`,
      categoria: diaItem.categoria?.trim() || 'Menú Ejecutivo',
      descripcion: diaItem.descripcion?.trim() || 'Entrada, plato principal y postre del día.',
      imagen_url: diaItem.imagen_url?.trim() || ''
    };

    const semana = getLocalCache();
    semana[normalizedItem.dia] = normalizedItem;
    setLocalCache(semana);

    const supabasePayload = toSupabaseProductoRow(normalizedItem);

    await Promise.allSettled([
      // 1. Guardar en Supabase (productos_menu) para sincronización inmediata con celulares y tablets
      (async () => {
        const client = tryGetActiveSupabaseClient();
        if (!client) return;
        const { error } = await client
          .from('productos_menu')
          .upsert([supabasePayload], { onConflict: 'id_producto' });
        if (error) {
          console.error('[menuDiarioService.saveDay] Error guardando en Supabase:', error);
        }
      })(),
      // 2. Guardar metadatos/respaldo en Google Sheets (configuracion)
      (async () => {
        try {
          // Si la imagen base64 supera 45.000 caracteres (límite de celda de Google Sheets),
          // guardamos los metadatos en Sheets y la imagen completa vive en Supabase.
          const sheetCopy =
            normalizedItem.imagen_url && normalizedItem.imagen_url.length > 45000
              ? { ...normalizedItem, imagen_url: '' }
              : normalizedItem;
          await sheetUpsertRow('configuracion', {
            clave: `menu_diario_${normalizedItem.dia}`,
            valor: JSON.stringify(sheetCopy)
          });
        } catch {}
      })()
    ]);
  },

  async saveAll(semana: Record<string, MenuDiarioDia>): Promise<void> {
    const normalizedSemana: Record<string, MenuDiarioDia> = { ...INITIAL_MENU_DIARIO };
    for (const diaKey of ALL_DAYS) {
      const item = semana[diaKey] || INITIAL_MENU_DIARIO[diaKey];
      normalizedSemana[diaKey] = {
        ...item,
        dia: diaKey,
        nombre_dia: INITIAL_MENU_DIARIO[diaKey].nombre_dia,
        precio: normalizeMenuDiarioPrecio(item.precio, 24300),
        nombre: item.nombre?.trim() || INITIAL_MENU_DIARIO[diaKey].nombre,
        categoria: item.categoria?.trim() || 'Menú Ejecutivo',
        descripcion: item.descripcion?.trim() || 'Entrada, plato principal y postre del día.',
        imagen_url: item.imagen_url?.trim() || ''
      };
    }

    setLocalCache(normalizedSemana);

    const dbPayloads = ALL_DAYS.map(d => toSupabaseProductoRow(normalizedSemana[d]));

    await Promise.allSettled([
      (async () => {
        const client = tryGetActiveSupabaseClient();
        if (!client) return;
        const { error } = await client
          .from('productos_menu')
          .upsert(dbPayloads, { onConflict: 'id_producto' });
        if (error) {
          console.error('[menuDiarioService.saveAll] Error guardando en Supabase:', error);
        }
      })(),
      (async () => {
        for (const d of ['miercoles', 'jueves', 'viernes'] as MenuDiarioDia['dia'][]) {
          const item = normalizedSemana[d];
          const sheetCopy =
            item.imagen_url && item.imagen_url.length > 45000
              ? { ...item, imagen_url: '' }
              : item;
          await sheetUpsertRow('configuracion', {
            clave: `menu_diario_${d}`,
            valor: JSON.stringify(sheetCopy)
          }).catch(() => {});
        }
      })()
    ]);
  }
};
