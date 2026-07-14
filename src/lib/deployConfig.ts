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
  const serviceRoleKey = readEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const encryptionKey = readEnv(env, 'ARCA_CONFIG_ENCRYPTION_KEY');

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

  if (!serviceRoleKey) {
    failures.push('SUPABASE_SERVICE_ROLE_KEY is required by the secure fiscal backend.');
  }
  if (!encryptionKey) {
    failures.push('ARCA_CONFIG_ENCRYPTION_KEY is required to encrypt uploaded certificates.');
  }

  const exposedFiscalSecrets = [
    'VITE_ARCA_KEY',
    'VITE_ARCA_CERT',
    'VITE_AFIP_KEY',
    'VITE_AFIP_CERT',
    'VITE_SUPABASE_SERVICE_ROLE_KEY',
    'VITE_ARCA_CONFIG_ENCRYPTION_KEY',
  ].filter(key => Boolean(readEnv(env, key)));
  if (exposedFiscalSecrets.length > 0) {
    failures.push('Fiscal certificate/private-key variables must never use the public VITE_ prefix.');
  }

  const arcaCuit = readEnv(env, 'ARCA_CUIT');
  const arcaCert = readEnv(env, 'ARCA_CERT') || readEnv(env, 'ARCA_CERT_BASE64');
  const arcaKey = readEnv(env, 'ARCA_KEY') || readEnv(env, 'ARCA_KEY_BASE64');
  const arcaPointOfSale = readEnv(env, 'ARCA_PUNTO_VENTA');
  const arcaLegalName = readEnv(env, 'ARCA_LEGAL_NAME');
  const arcaTradeName = readEnv(env, 'ARCA_TRADE_NAME');
  const arcaCommercialAddress = readEnv(env, 'ARCA_COMMERCIAL_ADDRESS');
  const arcaGrossIncome = readEnv(env, 'ARCA_GROSS_INCOME_NUMBER');
  const arcaActivityStart = readEnv(env, 'ARCA_ACTIVITY_START_DATE');
  const hasAnyArcaConfig = Boolean(arcaCuit || arcaCert || arcaKey || arcaPointOfSale);
  if (hasAnyArcaConfig && (!/^\d{11}$/.test(arcaCuit.replace(/\D/g, '')) || !arcaCert || !arcaKey || !/^\d+$/.test(arcaPointOfSale))) {
    failures.push('ARCA configuration is incomplete: set CUIT, point of sale, certificate and private key as server-only variables.');
  }
  if (hasAnyArcaConfig && (!arcaLegalName || !arcaTradeName || !arcaCommercialAddress || !arcaGrossIncome || !/^\d{4}-\d{2}-\d{2}$/.test(arcaActivityStart))) {
    failures.push('ARCA legal issuer data is incomplete: legal name, trade name, commercial address, gross income and activity start date are required.');
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
    '6. Set SUPABASE_SERVICE_ROLE_KEY and ARCA_CONFIG_ENCRYPTION_KEY only as private server variables.',
    '7. Redeploy the latest commit.',
    '8. If ARCA is enabled through variables, use only server variables ARCA_CUIT, ARCA_PUNTO_VENTA, ARCA_CERT_BASE64 and ARCA_KEY_BASE64.',
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
