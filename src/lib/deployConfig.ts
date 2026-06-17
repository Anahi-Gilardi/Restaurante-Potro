export type DeployRuntimeEnv = Record<string, string | undefined>;

const readEnv = (env: DeployRuntimeEnv, key: string): string => env[key]?.trim() ?? '';

export function isVercelProduction(env: DeployRuntimeEnv): boolean {
  return readEnv(env, 'VERCEL_ENV') === 'production';
}

export function isPlaceholderValue(value: string): boolean {
  return /tu-|your-|example|placeholder|\.\.\./i.test(value);
}

export function isValidProductionUrl(value: string): boolean {
  if (!value || isPlaceholderValue(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function isValidPublicSupabaseKey(value: string): boolean {
  if (!value || isPlaceholderValue(value)) return false;
  return value.length >= 20;
}

export function validateDeploymentConfig(env: DeployRuntimeEnv): string[] {
  if (!isVercelProduction(env)) return [];

  const supabaseUrl = readEnv(env, 'VITE_SUPABASE_URL');
  const supabaseKey = readEnv(env, 'VITE_SUPABASE_PUBLISHABLE_KEY') || readEnv(env, 'VITE_SUPABASE_ANON_KEY');
  const demoLogin = readEnv(env, 'VITE_ENABLE_DEMO_LOGIN');

  const failures: string[] = [];

  if (!supabaseUrl) {
    failures.push('VITE_SUPABASE_URL is required for Vercel Production deployments.');
  } else if (!isValidProductionUrl(supabaseUrl)) {
    failures.push('VITE_SUPABASE_URL must be a real HTTPS URL for Vercel Production deployments.');
  }

  if (!supabaseKey) {
    failures.push('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY is required for Vercel Production deployments.');
  } else if (!isValidPublicSupabaseKey(supabaseKey)) {
    failures.push('Supabase public key looks like a placeholder or is too short for Vercel Production deployments.');
  }

  if (demoLogin !== 'false') {
    failures.push('Set VITE_ENABLE_DEMO_LOGIN=false for Vercel Production deployments.');
  }

  return failures;
}
