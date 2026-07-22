import { Usuario } from '../types';

export type AppView =
  | 'home'
  | 'mozo'
  | 'cocina'
  | 'caja'
  | 'usuarios'
  | 'menu'
  | 'recetas'
  | 'mesas'
  | 'inventario'
  | 'proveedores'
  | 'promociones'
  | 'reservas'
  | 'facturacion'
  | 'sistema'
  | 'backups'
  | 'analytics'
  | 'clientes';

export const ALL_APP_VIEWS: AppView[] = [
  'home',
  'mozo',
  'cocina',
  'caja',
  'usuarios',
  'menu',
  'recetas',
  'mesas',
  'inventario',
  'proveedores',
  'promociones',
  'reservas',
  'facturacion',
  'sistema',
  'backups',
  'analytics',
  'clientes'
];

const MODULOS_SOLO_SUPERADMIN: AppView[] = ['sistema'];

const ALL_SIN_RESTRINGIDOS = ALL_APP_VIEWS.filter(
  v => !MODULOS_SOLO_SUPERADMIN.includes(v)
);

const ROLE_PERMISSIONS: Record<Usuario['rol'], AppView[]> = {
  superadmin: ALL_APP_VIEWS,
  administrador: ALL_SIN_RESTRINGIDOS,
  mozo: ['home', 'mozo', 'mesas', 'caja', 'reservas'] as AppView[],
  cocina: ['home', 'cocina']
};

export const getAllowedViews = (role: Usuario['rol']): AppView[] => (
  [...(ROLE_PERMISSIONS[role] || [])]
);

export const canAccessView = (role: Usuario['rol'], view: AppView): boolean => {
  const views = ROLE_PERMISSIONS[role];
  return views ? views.includes(view) : false;
};
