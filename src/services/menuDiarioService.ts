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

export const INITIAL_MENU_DIARIO: Record<string, MenuDiarioDia> = {
  lunes: {
    dia: 'lunes',
    nombre_dia: 'LUNES',
    activo: true,
    nombre: 'canelones con salsa mixta',
    categoria: 'Pastas',
    precio: 8500,
    descripcion: 'Los rellenos más tradicionales incluyen espinaca o acelga con ricota y nuez moscada, pollo desmenuzado',
    imagen_url: ''
  },
  martes: {
    dia: 'martes',
    nombre_dia: 'MARTES',
    activo: true,
    nombre: 'Costeleta de Cerdo a la Riojana',
    categoria: 'Carnes',
    precio: 8500,
    descripcion: 'Jugosa costeleta a la plancha acompañada de huevos fritos, arvejas, pimientos y papas españolas',
    imagen_url: ''
  },
  miercoles: {
    dia: 'miercoles',
    nombre_dia: 'MIÉRCOLES',
    activo: true,
    nombre: 'Hamburguesa Napolitana al Plato',
    categoria: 'Comidas Criollas',
    precio: 8500,
    descripcion: 'Hamburguesa casera cubierta con salsa fileto, jamón cocido, queso muzzarella y orégano',
    imagen_url: ''
  },
  jueves: {
    dia: 'jueves',
    nombre_dia: 'JUEVES',
    activo: true,
    nombre: 'Tartas Individuales de Estación',
    categoria: 'Comidas Criollas',
    precio: 8500,
    descripcion: 'Tarta artesanal de verduras seleccionadas, queso cremoso y ensalada fresca mixta de estación',
    imagen_url: ''
  },
  viernes: {
    dia: 'viernes',
    nombre_dia: 'VIERNES',
    activo: true,
    nombre: 'Milanesa de Ternera Napolitana',
    categoria: 'Carnes',
    precio: 12000,
    descripcion: 'Clásica milanesa de ternera gratinada con muzzarella premium, fileto artesanal y papas fritas',
    imagen_url: ''
  },
  sabado: {
    dia: 'sabado',
    nombre_dia: 'SÁBADO',
    activo: true,
    nombre: 'Pollo al Horno con Papas Rústicas',
    categoria: 'Carnes',
    precio: 8500,
    descripcion: 'Cuarto de pollo adobado a las hierbas con papas doradas al horno de barro y limón',
    imagen_url: ''
  },
  domingo: {
    dia: 'domingo',
    nombre_dia: 'DOMINGO',
    activo: true,
    nombre: 'Canelones de Verdura y Ricota',
    categoria: 'Pastas',
    precio: 8500,
    descripcion: 'Masa casera rellena de verdura de huerta y ricota magra con salsa rosa y parmesano',
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
    return { ...INITIAL_MENU_DIARIO, ...parsed };
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

export const menuDiarioService = {
  async list(): Promise<Record<string, MenuDiarioDia>> {
    const client = tryGetActiveSupabaseClient();
    if (!client) {
      return getLocalCache();
    }

    try {
      const { data, error } = await client.from('menu_diario').select('*');
      if (error || !data || data.length === 0) {
        return getLocalCache();
      }

      const semana = { ...getLocalCache() };
      data.forEach(row => {
        const diaKey = row.dia.toLowerCase();
        if (semana[diaKey]) {
          semana[diaKey] = {
            dia: diaKey as MenuDiarioDia['dia'],
            nombre_dia: row.nombre_dia || semana[diaKey].nombre_dia,
            activo: row.activo !== undefined ? row.activo : true,
            nombre: row.nombre || '',
            categoria: row.categoria || 'Comidas Criollas',
            precio: Number(row.precio) || 0,
            descripcion: row.descripcion || '',
            imagen_url: row.imagen_url || ''
          };
        }
      });

      setLocalCache(semana);
      return semana;
    } catch {
      return getLocalCache();
    }
  },

  async saveDay(diaItem: MenuDiarioDia): Promise<void> {
    const semana = getLocalCache();
    semana[diaItem.dia] = diaItem;
    setLocalCache(semana);

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

    const { error } = await client.from('menu_diario').upsert([dbPayload]);
    if (error) {
      console.error('Error saving menu_diario day to Supabase:', error);
    }
  },

  async saveAll(semana: Record<string, MenuDiarioDia>): Promise<void> {
    setLocalCache(semana);

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
