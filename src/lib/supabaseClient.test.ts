import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasSupabaseConfig,
  hasSameSupabaseConfig,
  normalizeSupabaseUrl,
  resolveSupabaseConfig,
} from './supabaseClient';

test('normaliza URLs de Supabase usadas por la app', () => {
  assert.equal(normalizeSupabaseUrl(' https://demo.supabase.co/rest/v1/ '), 'https://demo.supabase.co');
  assert.equal(normalizeSupabaseUrl('https://demo.supabase.co///'), 'https://demo.supabase.co');
});

test('resuelve credenciales Supabase desde variables de entorno primero', () => {
  assert.deepEqual(
    resolveSupabaseConfig(
      {
        VITE_SUPABASE_URL: 'https://env.supabase.co/rest/v1',
        VITE_SUPABASE_ANON_KEY: 'env-key',
      },
      {
        el_patron_supabase_url: 'https://local.supabase.co',
        el_patron_supabase_anon_key: 'local-key',
      },
    ),
    { url: 'https://env.supabase.co', key: 'env-key' },
  );
});

test('acepta publishable key y usa configuracion local como fallback', () => {
  assert.deepEqual(
    resolveSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key' }, {
      el_patron_supabase_url: 'https://local.supabase.co',
      el_patron_supabase_anon_key: 'local-key',
    }),
    { url: 'https://local.supabase.co', key: 'publishable-key' },
  );

  assert.deepEqual(
    resolveSupabaseConfig({}, {
      el_patron_supabase_url: 'https://local.supabase.co',
      el_patron_supabase_anon_key: 'local-key',
    }),
    { url: 'https://local.supabase.co', key: 'local-key' },
  );
});

test('detecta configuracion Supabase incompleta o placeholder', () => {
  assert.equal(hasSupabaseConfig({ url: '', key: '' }), false);
  assert.equal(hasSupabaseConfig({ url: 'https://demo.supabase.co', key: 'tu-anon-key' }), false);
  assert.equal(hasSupabaseConfig({ url: 'https://demo.supabase.co', key: 'abc...' }), false);
  assert.equal(hasSupabaseConfig({ url: 'https://demo.supabase.co', key: 'real-key' }), true);
});

test('no reinicia la autenticacion cuando la configuracion efectiva no cambio', () => {
  assert.equal(hasSameSupabaseConfig(
    { url: 'https://demo.supabase.co/', key: 'public-key' },
    { url: 'https://demo.supabase.co', key: 'public-key' },
  ), true);
  assert.equal(hasSameSupabaseConfig(
    { url: 'https://demo.supabase.co', key: 'public-key' },
    { url: 'https://otro.supabase.co', key: 'public-key' },
  ), false);
});
