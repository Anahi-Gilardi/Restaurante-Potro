import { Usuario } from '../types';

export interface AuthSessionIdentity {
  id?: string | null;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

const normalize = (value: unknown): string => (
  typeof value === 'string' ? value.trim().toLowerCase() : ''
);

/**
 * Resuelve la identidad autenticada sin degradarla al primer mozo disponible.
 * Si Supabase notifica una sesion sin datos suficientes, conserva al operador
 * ya validado por el formulario de acceso en lugar de cambiar roles solo.
 */
export function resolveSessionOperator(
  usuarios: Usuario[],
  identity: AuthSessionIdentity | undefined,
  currentOperatorName?: string,
): Usuario | null {
  const activeUsers = usuarios.filter(usuario => usuario.activo !== false);
  if (!identity) return null;

  const authId = normalize(identity.id);
  if (authId) {
    const linked = activeUsers.find(usuario => normalize(usuario.auth_user_id) === authId);
    if (linked) return linked;
  }

  const email = normalize(identity.email).replace(/[(),]/g, '');
  if (email) {
    const linkedByMail = activeUsers.find(usuario => (
      normalize(usuario.mail) === email || normalize(usuario.username) === email
    ));
    if (linkedByMail) return linkedByMail;
  }

  const requestedName = normalize(identity.user_metadata?.nombre || identity.user_metadata?.name);
  if (requestedName) {
    const linkedByName = activeUsers.find(usuario => normalize(usuario.nombre) === requestedName);
    if (linkedByName) return linkedByName;
  }

  const currentName = normalize(currentOperatorName);
  if (currentName) {
    return activeUsers.find(usuario => normalize(usuario.nombre) === currentName) ?? null;
  }

  return null;
}
