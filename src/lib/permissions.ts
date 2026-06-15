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

const ROLE_PERMISSIONS: Record<Usuario['rol'], AppView[]> = {
  mozo: ['home', 'panel', 'mozo', 'mesas', 'reservas'],
  cocina: ['home', 'panel', 'cocina'],
  administrador: ALL_APP_VIEWS
};

export const getAllowedViews = (role: Usuario['rol']): AppView[] => (
  [...ROLE_PERMISSIONS[role]]
);

export const canAccessView = (role: Usuario['rol'], view: AppView): boolean => (
  ROLE_PERMISSIONS[role].includes(view)
);
