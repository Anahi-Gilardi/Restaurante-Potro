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

export const normalizeRole = (role: unknown): Usuario['rol'] => {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'administrador' || normalized === 'admin' || normalized === 'superadmin') return 'administrador';
  if (normalized === 'cocina' || normalized === 'chef' || normalized === 'cocinero') return 'cocina';
  return 'mozo';
};

export const getAllowedViews = (role: Usuario['rol'] | unknown): AppView[] => (
  [...ROLE_PERMISSIONS[normalizeRole(role)]]
);

export const canAccessView = (role: Usuario['rol'] | unknown, view: AppView): boolean => (
  ROLE_PERMISSIONS[normalizeRole(role)].includes(view)
);
