import {
  formatDeploymentFailureReport,
  formatDeploymentWarningReport,
  getLocalDeploymentWarnings,
  isVercelProduction,
  validateDeploymentConfig,
} from '../src/lib/deployConfig';

const env = process.env;
const failures = validateDeploymentConfig(env);
const warnings = getLocalDeploymentWarnings(env);

if (failures.length > 0) {
  console.error(formatDeploymentFailureReport(failures));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(formatDeploymentWarningReport(warnings));
}

console.log(
  isVercelProduction(env)
    ? 'Deployment configuration check passed for Vercel Production.'
    : 'Deployment configuration check skipped outside Vercel Production.',
);
