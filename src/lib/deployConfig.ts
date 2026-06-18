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

export function getLocalDeploymentWarnings(env: DeployRuntimeEnv): string[] {
  if (isVercelProduction(env)) return [];

  const demoLogin = readEnv(env, 'VITE_ENABLE_DEMO_LOGIN');
  if (demoLogin === 'false') return [];

  return [
    'VITE_ENABLE_DEMO_LOGIN is enabled outside Production. This is OK for local demo testing, but Production must set it to false.',
  ];
}

export function formatDeploymentFailureReport(failures: string[]): string {
  return [
    '',
    '===============================================',
    ' Vercel Production configuration check failed',
    '===============================================',
    '',
    'The code compiled, but this deployment was stopped before publishing because Production configuration is unsafe or incomplete.',
    '',
    'What failed:',
    ...failures.map(failure => `- ${failure}`),
    '',
    'How to fix it in Vercel:',
    '1. Open Project Settings > Environment Variables.',
    '2. Select the Production environment.',
    '3. Set VITE_ENABLE_DEMO_LOGIN=false.',
    '4. Set VITE_SUPABASE_URL=https://<your-project>.supabase.co.',
    '5. Set VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY to the public Supabase key.',
    '6. Redeploy the latest commit.',
    '',
    'Local development note:',
    '- You can keep demo login enabled locally in .env.local while testing.',
    '- This check only exits with code 1 for Vercel Production.',
    '',
  ].join('\n');
}

export function formatDeploymentWarningReport(warnings: string[]): string {
  return [
    '',
    '===============================================',
    ' WARNING: local deployment config notice',
    '===============================================',
    '',
    ...warnings.map(warning => `- ${warning}`),
    '',
    'No build was blocked. To test Production behavior locally, run with:',
    'VERCEL_ENV=production VITE_ENABLE_DEMO_LOGIN=false npm run check:deploy-config',
    '',
  ].join('\n');
}
