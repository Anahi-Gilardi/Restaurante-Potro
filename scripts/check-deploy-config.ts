import { isVercelProduction, validateDeploymentConfig } from '../src/lib/deployConfig';

const env = process.env;
const failures = validateDeploymentConfig(env);

if (failures.length > 0) {
  console.error('Deployment configuration check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  isVercelProduction(env)
    ? 'Deployment configuration check passed for Vercel Production.'
    : 'Deployment configuration check skipped outside Vercel Production.',
);
