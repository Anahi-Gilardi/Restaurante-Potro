import { Usuario } from '../types';

export type AppView =
  | 'home'
  | 'mozo'
  | 'cocina'
  | 'caja'
  | 'usuarios'
  | 'menu'
  | 'mesas'
  | 'inventario'
  | 'proveedores'
  | 'promociones'
  | 'reservas'
  | 'facturacion'
  | 'sistema'
  | 'backups';

export const ALL_APP_VIEWS: AppView[] = [
  'home',
  'mozo',
  'cocina',
  'caja',
  'usuarios',
  'menu',
  'mesas',
  'inventario',
  'proveedores',
  'promociones',
  'reservas',
  'facturacion',
  'sistema',
  'backups'
];

const MODULOS_SOLO_SUPERADMIN: AppView[] = ['sistema'];

const ALL_SIN_RESTRINGIDOS = ALL_APP_VIEWS.filter(
  v => !MODULOS_SOLO_SUPERADMIN.includes(v)
);

const ROLE_PERMISSIONS: Record<Usuario['rol'], AppView[]> = {
  superadmin: ALL_APP_VIEWS,
  administrador: ALL_SIN_RESTRINGIDOS,
  cajero: ['home', 'caja', 'facturacion'] as AppView[],
  mozo: ['home', 'mozo', 'mesas', 'reservas'] as AppView[],
  cocina: ['home', 'cocina']
};

// Flag para ocultar temporalmente el módulo de cocina (el chef no lo va a utilizar por el momento)
export const COCINA_MODULE_ENABLED = false;

export const getAllowedViews = (role: Usuario['rol']): AppView[] => {
  const views = [...(ROLE_PERMISSIONS[role] || [])];
  if (!COCINA_MODULE_ENABLED) {
    return views.filter(v => v !== 'cocina');
  }
  return views;
};

export const canAccessView = (role: Usuario['rol'], view: AppView): boolean => {
  if (!COCINA_MODULE_ENABLED && view === 'cocina') {
    return false;
  }
  const views = getAllowedViews(role);
  return views.includes(view);
};
