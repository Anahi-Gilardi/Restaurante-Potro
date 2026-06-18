import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDeploymentFailureReport,
  formatDeploymentWarningReport,
  getLocalDeploymentWarnings,
  isPlaceholderValue,
  isValidProductionUrl,
  isValidPublicSupabaseKey,
  validateDeploymentConfig,
} from './deployConfig';

const validProductionEnv = {
  VERCEL_ENV: 'production',
  VITE_SUPABASE_URL: 'https://demo.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  VITE_ENABLE_DEMO_LOGIN: 'false',
};

test('detecta placeholders comunes de configuracion', () => {
  assert.equal(isPlaceholderValue('https://tu-proyecto.supabase.co'), true);
  assert.equal(isPlaceholderValue('your-key-here'), true);
  assert.equal(isPlaceholderValue('abc...'), true);
  assert.equal(isPlaceholderValue('realistic-value'), false);
});

test('valida URLs productivas como HTTPS reales', () => {
  assert.equal(isValidProductionUrl('https://demo.supabase.co'), true);
  assert.equal(isValidProductionUrl('http://demo.supabase.co'), false);
  assert.equal(isValidProductionUrl('https://localhost:54321'), false);
  assert.equal(isValidProductionUrl('https://tu-proyecto.supabase.co'), false);
  assert.equal(isValidProductionUrl('not-a-url'), false);
});

test('valida que la key publica no sea placeholder ni demasiado corta', () => {
  assert.equal(isValidPublicSupabaseKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), true);
  assert.equal(isValidPublicSupabaseKey('short-key'), false);
  assert.equal(isValidPublicSupabaseKey('tu-anon-key'), false);
});

test('omite validacion estricta fuera de Vercel Production', () => {
  assert.deepEqual(validateDeploymentConfig({ VERCEL_ENV: 'preview' }), []);
  assert.deepEqual(validateDeploymentConfig({}), []);
});

test('advierte en local si el login demo esta activo sin bloquear', () => {
  assert.deepEqual(getLocalDeploymentWarnings({}), [
    'VITE_ENABLE_DEMO_LOGIN is enabled outside Production. This is OK for local demo testing, but Production must set it to false.',
  ]);
  assert.deepEqual(getLocalDeploymentWarnings({ VITE_ENABLE_DEMO_LOGIN: 'false' }), []);
  assert.deepEqual(getLocalDeploymentWarnings(validProductionEnv), []);
});

test('rechaza Production sin variables reales o con demo login activo', () => {
  assert.deepEqual(validateDeploymentConfig({ VERCEL_ENV: 'production' }), [
    'VITE_SUPABASE_URL is required for Vercel Production deployments.',
    'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY is required for Vercel Production deployments.',
    'Set VITE_ENABLE_DEMO_LOGIN=false for Vercel Production deployments.',
  ]);

  assert.deepEqual(validateDeploymentConfig({
    ...validProductionEnv,
    VITE_SUPABASE_URL: 'https://tu-proyecto.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'short',
    VITE_ENABLE_DEMO_LOGIN: 'true',
  }), [
    'VITE_SUPABASE_URL must be a real HTTPS URL for Vercel Production deployments.',
    'Supabase public key looks like a placeholder or is too short for Vercel Production deployments.',
    'Set VITE_ENABLE_DEMO_LOGIN=false for Vercel Production deployments.',
  ]);
});

test('acepta Production cuando Supabase y login demo estan configurados', () => {
  assert.deepEqual(validateDeploymentConfig(validProductionEnv), []);
  assert.deepEqual(validateDeploymentConfig({
    VERCEL_ENV: 'production',
    VITE_SUPABASE_URL: 'https://demo.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_1234567890abcdef',
    VITE_ENABLE_DEMO_LOGIN: 'false',
  }), []);
});

test('formatea reportes accionables para Vercel y para desarrollo local', () => {
  const failureReport = formatDeploymentFailureReport([
    'Set VITE_ENABLE_DEMO_LOGIN=false for Vercel Production deployments.',
  ]);

  assert.match(failureReport, /Vercel Production configuration check failed/);
  assert.match(failureReport, /Project Settings > Environment Variables/);
  assert.match(failureReport, /Redeploy the latest commit/);

  const warningReport = formatDeploymentWarningReport(['Demo login is enabled.']);
  assert.match(warningReport, /WARNING: local deployment config notice/);
  assert.match(warningReport, /No build was blocked/);
});
