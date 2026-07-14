import type { SupabaseClient, User } from '@supabase/supabase-js';

interface UsernameLoginResponse {
  success?: boolean;
  tokenHash?: string;
  verificationType?: 'magiclink';
  error?: string;
}

const SECURE_LOGIN_ORIGIN = 'https://restaurante-potro-anahi.vercel.app';

export function getUsernameLoginEndpoint(locationLike: Pick<Location, 'hostname'> | undefined = globalThis.location): string {
  const configured = String((import.meta as { env?: Record<string, unknown> }).env?.VITE_USERNAME_LOGIN_API_URL ?? '').trim();
  if (configured) return configured;
  if (locationLike?.hostname === 'restaurante-potro.vercel.app') return `${SECURE_LOGIN_ORIGIN}/api/login`;
  return '/api/login';
}

export async function signInWithUsername(
  supabase: SupabaseClient,
  username: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<User> {
  const response = await fetchImpl(getUsernameLoginEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
  });
  const payload = await response.json().catch(() => ({})) as UsernameLoginResponse;
  if (!response.ok || !payload.success || !payload.tokenHash) {
    throw new Error(payload.error || 'Usuario o contraseña incorrectos.');
  }

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: payload.tokenHash,
    type: payload.verificationType ?? 'magiclink',
  });
  if (error) throw error;
  if (!data.user) throw new Error('No pudimos validar la sesión. Intentá nuevamente.');
  return data.user;
}
