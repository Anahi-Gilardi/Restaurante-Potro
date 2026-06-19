import { Usuario } from '../types';

export type AppView =
  | 'home'
  | 'panel'
  | 'mozo'
  | 'cocina'
  | 'caja'
  | 'reportes'
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
  | 'backups';

export const ALL_APP_VIEWS: AppView[] = [
  'home',
  'panel',
  'mozo',
  'cocina',
  'caja',
  'reportes',
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
  'backups'
];

const MODULOS_SOLO_SUPERADMIN: AppView[] = [];

const ALL_SIN_RESTRINGIDOS = ALL_APP_VIEWS;

const ROLE_PERMISSIONS: Record<Usuario['rol'], AppView[]> = {
  superadmin: [
    'home',
    'panel',
    'mozo',
    'cocina',
    'caja',
    'reportes',
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
    'backups'
  ],
  administrador: [
    'home',
    'panel',
    'mozo',
    'cocina',
    'caja',
    'reportes',
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
    'backups'
  ],
  mozo: ['home', 'panel', 'mozo', 'caja', 'reservas'] as AppView[],
  cocina: ['home', 'panel', 'cocina']
};

export const getAllowedViews = (role: Usuario['rol']): AppView[] => (
  [...(ROLE_PERMISSIONS[role] || [])]
);

export const canAccessView = (role: Usuario['rol'], view: AppView): boolean => {
  const views = ROLE_PERMISSIONS[role];
  return views ? views.includes(view) : false;
};
