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
  'home', 'panel', 'mozo', 'cocina', 'caja', 'reportes',
  'usuarios', 'menu', 'recetas', 'mesas', 'inventario',
  'proveedores', 'promociones', 'reservas', 'facturacion',
  'sistema', 'backups'
];

const RESTRICTED_FOR_ADMIN: AppView[] = ['backups', 'sistema'];

const ROLE_PERMISSIONS: Record<string, AppView[]> = {
  super_admi: ALL_APP_VIEWS,
  administrador: ALL_APP_VIEWS.filter(v => !RESTRICTED_FOR_ADMIN.includes(v))
};

export const getAllowedViews = (role: string): AppView[] => {
  const normalizedRole = role.toLowerCase();
  return [...(ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.administrador)];
};

export const canAccessView = (role: string, view: AppView): boolean => {
  const normalizedRole = role.toLowerCase();
  const views = ROLE_PERMISSIONS[normalizedRole];
  if (!views) return false;
  return views.includes(view);
};
