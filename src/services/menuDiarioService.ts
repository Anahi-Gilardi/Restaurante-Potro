import { tryGetActiveSupabaseClient, getActiveSupabaseClient } from '../lib/supabaseClient';

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
    imagen_url: ''
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

const getLocalCache = (): Record<string, MenuDiarioDia> => {
  if (typeof window === 'undefined') return INITIAL_MENU_DIARIO;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return INITIAL_MENU_DIARIO;
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
          precio: normalizeMenuDiarioPrecio(item.precio, fallback.precio)
        };
      }
    }
    return merged;
  } catch {
    return INITIAL_MENU_DIARIO;
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

let isSupabaseMenuDiarioAvailable = false;

export const menuDiarioService = {
  async list(): Promise<Record<string, MenuDiarioDia>> {
    const local = getLocalCache();
    if (!isSupabaseMenuDiarioAvailable) {
      return local;
    }
    const client = tryGetActiveSupabaseClient();
    if (!client) {
      return local;
    }

    try {
      const { data, error } = await client.from('menu_diario').select('*');
      if (error) {
        isSupabaseMenuDiarioAvailable = false;
        return local;
      }
      if (!data || data.length === 0) {
        return local;
      }

      const semana = { ...local };
      data.forEach(row => {
        const diaKey = row.dia.toLowerCase();
        if (semana[diaKey]) {
          semana[diaKey] = {
            dia: diaKey as MenuDiarioDia['dia'],
            nombre_dia: row.nombre_dia || semana[diaKey].nombre_dia,
            activo: row.activo !== undefined ? row.activo : true,
            nombre: row.nombre || semana[diaKey].nombre,
            categoria: row.categoria || 'Menú Ejecutivo',
            precio: normalizeMenuDiarioPrecio(row.precio, semana[diaKey].precio),
            descripcion: row.descripcion || semana[diaKey].descripcion,
            imagen_url: row.imagen_url || ''
          };
        }
      });

      setLocalCache(semana);
      return semana;
    } catch {
      isSupabaseMenuDiarioAvailable = false;
      return local;
    }
  },

  async saveDay(diaItem: MenuDiarioDia): Promise<void> {
    const semana = getLocalCache();
    semana[diaItem.dia] = diaItem;
    setLocalCache(semana);

    if (!isSupabaseMenuDiarioAvailable) return;
    const client = tryGetActiveSupabaseClient();
    if (!client) return;

    const dbPayload = {
      dia: diaItem.dia,
      nombre_dia: diaItem.nombre_dia,
      activo: diaItem.activo,
      nombre: diaItem.nombre,
      categoria: diaItem.categoria,
      precio: diaItem.precio,
      descripcion: diaItem.descripcion,
      imagen_url: diaItem.imagen_url || null,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await client.from('menu_diario').upsert([dbPayload]);
      if (error) {
        isSupabaseMenuDiarioAvailable = false;
      }
    } catch {
      isSupabaseMenuDiarioAvailable = false;
    }
  },

  async saveAll(semana: Record<string, MenuDiarioDia>): Promise<void> {
    setLocalCache(semana);

    if (!isSupabaseMenuDiarioAvailable) return;
    const client = tryGetActiveSupabaseClient();
    if (!client) return;

    const dbPayloads = Object.values(semana).map(item => ({
      dia: item.dia,
      nombre_dia: item.nombre_dia,
      activo: item.activo,
      nombre: item.nombre,
      categoria: item.categoria,
      precio: item.precio,
      descripcion: item.descripcion,
      imagen_url: item.imagen_url || null,
      updated_at: new Date().toISOString()
    }));

    const { error } = await client.from('menu_diario').upsert(dbPayloads);
    if (error) {
      console.error('Error saving menu_diario semana to Supabase:', error);
    }
  }
};
