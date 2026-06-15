import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  key: string;
}

const DEFAULT_SUPABASE_URL = 'https://sqczmyaoqplrmrgyczjy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxY3pteWFvcXBscm1yZ3ljemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQ5NzQsImV4cCI6MjA5Njg1MDk3NH0.R5bPwot9KCMJ9OXWcokL705ZD7_0ujH9fGY_GcqxjYY';

const readLocalConfig = (key: string) => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(key) || '';
};

export const normalizeSupabaseUrl = (url: string) => {
  return url
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
};

export const getSupabaseConfig = (): SupabaseConfig => {
  const env = (import.meta as any).env || {};
  const url = env.VITE_SUPABASE_URL || readLocalConfig('SUPABASE_URL') || DEFAULT_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || readLocalConfig('SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;
  return { url: normalizeSupabaseUrl(url), key: key.trim() };
};

export const hasSupabaseConfig = (config = getSupabaseConfig()) => {
  return Boolean(config.url && config.key && !config.key.includes('...'));
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

export const tryGetActiveSupabaseClient = (): SupabaseClient | null => {
  return createConfiguredClient();
};

export const resetSupabaseClientCache = () => {
  cachedClient = null;
  cachedFingerprint = '';
};

export const getActiveSupabaseClient = (): SupabaseClient => {
  const client = createConfiguredClient();
  if (!client) {
    throw new Error('Supabase no está configurado. Ingrese VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY o configure la conexión desde el módulo Sistema.');
  }
  return client;
};
