import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from './_types';

const TRUSTED_ORIGINS = new Set([
  'https://restaurante-potro.vercel.app',
  'https://restaurante-potro-anahi.vercel.app',
  ...(process.env.APP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
]);

export class ApiAccessError extends Error {
  constructor(public readonly status: 401 | 403 | 503, message: string) {
    super(message);
    this.name = 'ApiAccessError';
  }
}

const readHeader = (req: VercelRequest, name: string): string => {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
};

export const applyApiSecurityHeaders = (
  req: VercelRequest,
  res: VercelResponse,
  methods: readonly string[],
): boolean => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const origin = readHeader(req, 'origin');
  if (origin && !TRUSTED_ORIGINS.has(origin)) return false;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
    res.setHeader('Vary', 'Origin');
  }
  return true;
};

export const requestBodyIsTooLarge = (req: VercelRequest, maximumBytes = 65_536): boolean => {
  const contentLength = Number(readHeader(req, 'content-length') || 0);
  return Number.isFinite(contentLength) && contentLength > maximumBytes;
};

const getBearerToken = (req: VercelRequest): string => (
  readHeader(req, 'authorization').match(/^Bearer\s+(.+)$/i)?.[1] ?? ''
);

export const requireAuthenticatedDataClient = async (
  req: VercelRequest,
  allowedRoles: readonly string[],
): Promise<SupabaseClient> => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new ApiAccessError(503, 'La conexión de datos del servidor no está configurada.');
  }

  const token = getBearerToken(req);
  if (!token) throw new ApiAccessError(401, 'Se requiere una sesión válida.');

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) {
    throw new ApiAccessError(401, 'La sesión venció o no es válida.');
  }

  const { data: profile, error: profileError } = await client
    .from('usuarios')
    .select('rol, activo')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();
  if (profileError) {
    throw new ApiAccessError(503, 'No se pudo comprobar el perfil operativo.');
  }
  if (!profile || profile.activo === false || !allowedRoles.includes(String(profile.rol))) {
    throw new ApiAccessError(403, 'El usuario no tiene permiso para esta operación.');
  }

  return client;
};
