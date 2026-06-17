const env = process.env;

const isVercelProduction = env.VERCEL_ENV === 'production';
const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();

const failures: string[] = [];

if (isVercelProduction) {
  if (!supabaseUrl) {
    failures.push('VITE_SUPABASE_URL is required for Vercel Production deployments.');
  }

  if (!supabaseKey) {
    failures.push('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY is required for Vercel Production deployments.');
  }

  if (env.VITE_ENABLE_DEMO_LOGIN !== 'false') {
    failures.push('Set VITE_ENABLE_DEMO_LOGIN=false for Vercel Production deployments.');
  }
}

if (failures.length > 0) {
  console.error('Deployment configuration check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  isVercelProduction
    ? 'Deployment configuration check passed for Vercel Production.'
    : 'Deployment configuration check skipped outside Vercel Production.',
);
