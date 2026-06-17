import { Usuario } from '../types';

export type LoginUser = Pick<Usuario, 'id_usuario' | 'nombre' | 'apellido' | 'username' | 'password' | 'rol' | 'activo'>;

export function normalizeLoginIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export function findLocalLoginUser(users: LoginUser[], identifier: string, password: string): LoginUser | null {
  const normalized = normalizeLoginIdentifier(identifier);
  return users.find(user => (
    normalizeLoginIdentifier(user.username) === normalized && user.password === password
  )) ?? null;
}

export function canLogin(user: Pick<Usuario, 'activo'> | null | undefined): boolean {
  return Boolean(user && user.activo !== false);
}

export function getLoginErrorMessage(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';

  if (/invalid login credentials/i.test(message)) return 'Usuario o contraseña incorrectos.';
  if (/fetch|network|timeout|failed/i.test(message)) return 'No pudimos conectar con el servidor. Revisá la conexión e intentá nuevamente.';
  return 'No pudimos iniciar sesión. Verificá tus datos e intentá nuevamente.';
}
