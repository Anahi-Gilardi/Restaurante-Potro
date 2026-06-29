import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export type SupabaseRuntimeEnv = Record<string, unknown>;
export type SupabaseLocalConfig = Partial<Record<'el_patron_supabase_url' | 'el_patron_supabase_anon_key', string>>;

const readLocalConfig = (key: string) => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(key) || '';
};

const readEnvString = (env: SupabaseRuntimeEnv, key: string) => {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
};

export const normalizeSupabaseUrl = (url: string) => {
  return url
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
};

export const resolveSupabaseConfig = (
  env: SupabaseRuntimeEnv = {},
  localConfig: SupabaseLocalConfig = {},
): SupabaseConfig => {
  const url = readEnvString(env, 'VITE_SUPABASE_URL') || localConfig.el_patron_supabase_url || '';
  const key = readEnvString(env, 'VITE_SUPABASE_PUBLISHABLE_KEY')
    || readEnvString(env, 'VITE_SUPABASE_ANON_KEY')
    || localConfig.el_patron_supabase_anon_key
    || '';

  return { url: normalizeSupabaseUrl(url), key: key.trim() };
};

export const getSupabaseConfig = (): SupabaseConfig => {
  const env = (import.meta as any).env || {};
  let localUrl = readLocalConfig('el_patron_supabase_url');
  let localKey = readLocalConfig('el_patron_supabase_anon_key');

  // Credenciales por defecto para el proyecto Restaurante El Patrón
  const defaultUrl = 'https://sqczmyaoqplrmrgyczjy.supabase.co';
  const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxY3pteWFvcXBscm1yZ3ljemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQ5NzQsImV4cCI6MjA5Njg1MDk3NH0.R5bPwot9KCMJ9OXWcokL705ZD7_0ujH9fGY_GcqxjYY';

  // Si localUrl es un placeholder, limpiamos localStorage
  if (localUrl && (localUrl.includes('xxx') || localUrl.includes('placeholder'))) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('el_patron_supabase_url');
      window.localStorage.removeItem('el_patron_supabase_anon_key');
    }
    localUrl = '';
    localKey = '';
  }

  return resolveSupabaseConfig(env, {
    el_patron_supabase_url: localUrl || defaultUrl,
    el_patron_supabase_anon_key: localKey || defaultKey,
  });
};

export const hasSupabaseConfig = (config = getSupabaseConfig()) => {
  return Boolean(config.url && config.key && !config.key.includes('...') && !config.key.includes('tu-anon-key'));
};

let cachedClient: SupabaseClient | null = null;
let cachedFingerprint = '';

const createConfiguredClient = (): SupabaseClient | null => {
  const config = getSupabaseConfig();
  if (!hasSupabaseConfig(config)) return null;

  const fingerprint = `${config.url}:${config.key}`;
  if (cachedClient && cachedFingerprint === fingerprint) {
    return cachedClient;
  }

  cachedFingerprint = fingerprint;
  cachedClient = createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return cachedClient;
};

export const supabase = createConfiguredClient();

export const resetSupabaseClientCache = () => {
  cachedClient?.removeAllChannels();
  cachedClient?.auth.stopAutoRefresh();
  cachedClient = null;
  cachedFingerprint = '';
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-client-reset'));
  }
};

export const getActiveSupabaseClient = (): SupabaseClient => {
  const client = createConfiguredClient();
  if (!client) {
    throw new Error('Supabase no está configurado. Configure la conexión desde el módulo Sistema.');
  }
  return client;
};

/**
 * Safe version that never throws — returns null if not configured.
 * Use this in services that have local fallbacks.
 */
export const tryGetActiveSupabaseClient = (): SupabaseClient | null => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return null;
  }
  try {
    return createConfiguredClient();
  } catch {
    return null;
  }
};
