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

const OLD_DELETED_PROJECT = 'sqczmyaoqplrmrgyczjy';
export const DEFAULT_SUPABASE_URL = 'https://extglaaqlsleibsbtwup.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4dGdsYWFxbHNsZWlic2J0d3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNDE5MDMsImV4cCI6MjEwNDkxNzkwM30.EDwlqgMIpniRG9bHCNiSoP5PF9w_-zJmjRc0FvPUeeg';

export const resolveSupabaseConfig = (
  env: SupabaseRuntimeEnv = {},
  localConfig: SupabaseLocalConfig = {},
): SupabaseConfig => {
  let envUrl = readEnvString(env, 'VITE_SUPABASE_URL');
  if (envUrl.includes(OLD_DELETED_PROJECT)) envUrl = '';

  let envKey = readEnvString(env, 'VITE_SUPABASE_PUBLISHABLE_KEY') || readEnvString(env, 'VITE_SUPABASE_ANON_KEY');
  if (envKey.includes(OLD_DELETED_PROJECT)) envKey = '';

  let localUrl = localConfig.el_patron_supabase_url || '';
  if (localUrl.includes(OLD_DELETED_PROJECT)) localUrl = '';

  let localKey = localConfig.el_patron_supabase_anon_key || '';
  if (localKey.includes(OLD_DELETED_PROJECT)) localKey = '';

  const url = envUrl || localUrl || '';
  const key = envKey || localKey || '';

  return { url: normalizeSupabaseUrl(url), key: key.trim() };
};

export const getSupabaseConfig = (): SupabaseConfig => {
  const env = (import.meta as any).env || {};
  let localUrl = readLocalConfig('el_patron_supabase_url');
  let localKey = readLocalConfig('el_patron_supabase_anon_key');

  // Si localUrl es un placeholder o apunta al proyecto anterior de Supabase, limpiamos localStorage
  if (localUrl && (localUrl.includes('xxx') || localUrl.includes('placeholder') || localUrl.includes(OLD_DELETED_PROJECT))) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('el_patron_supabase_url');
      window.localStorage.removeItem('el_patron_supabase_anon_key');
    }
    localUrl = '';
    localKey = '';
  }

  return resolveSupabaseConfig(env, {
    el_patron_supabase_url: localUrl || DEFAULT_SUPABASE_URL,
    el_patron_supabase_anon_key: localKey || DEFAULT_SUPABASE_ANON_KEY,
  });
};

export const hasSupabaseConfig = (config = getSupabaseConfig()) => {
  return Boolean(config.url && config.key && !config.key.includes('...') && !config.key.includes('tu-anon-key'));
};

export const hasSameSupabaseConfig = (current: SupabaseConfig, next: SupabaseConfig): boolean => (
  normalizeSupabaseUrl(current.url) === normalizeSupabaseUrl(next.url)
  && current.key.trim() === next.key.trim()
);

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
