import type { Usuario } from '../types';
import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';

const SECURE_ORIGIN = 'https://restaurante-potro-anahi.vercel.app';

export function getUserAdminEndpoint(
  locationLike: Pick<Location, 'hostname'> | undefined = globalThis.location,
): string {
  if (locationLike?.hostname === 'restaurante-potro.vercel.app') return `${SECURE_ORIGIN}/api/users`;
  return '/api/users';
}

async function callUserAdmin(action: string, body: Record<string, unknown> = {}): Promise<any> {
  const client = tryGetActiveSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado para administrar usuarios.');
  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error('La sesión segura venció. Iniciá sesión nuevamente.');
  const response = await fetch(getUserAdminEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

export const userAdminService = {
  async create(input: Pick<Usuario, 'nombre' | 'apellido' | 'username' | 'rol'> & { password: string }): Promise<Usuario> {
    const payload = await callUserAdmin('create', input);
    return payload.user as Usuario;
  },
  async update(idUsuario: number, input: Pick<Usuario, 'nombre' | 'apellido' | 'rol'>): Promise<Usuario> {
    const payload = await callUserAdmin('update', { idUsuario, ...input });
    return payload.user as Usuario;
  },
  async changePassword(idUsuario: number, password: string): Promise<void> {
    await callUserAdmin('changePassword', { idUsuario, password });
  },
  async setActive(idUsuario: number, activo: boolean): Promise<Usuario> {
    const payload = await callUserAdmin('setActive', { idUsuario, activo });
    return payload.user as Usuario;
  },
  async remove(idUsuario: number): Promise<void> {
    await callUserAdmin('delete', { idUsuario });
  },
};
