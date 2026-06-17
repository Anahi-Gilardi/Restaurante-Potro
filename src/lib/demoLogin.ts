export interface DemoLoginUser {
  username: string;
  password: string;
  activo?: boolean;
}

export interface DemoCredentials {
  username: string;
  password: string;
}

type RuntimeEnv = Record<string, unknown>;

const readEnvString = (env: RuntimeEnv, key: string): string => {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
};

export function normalizeLoginUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isDemoLoginEnabled(env: RuntimeEnv = (import.meta as any).env ?? {}): boolean {
  return readEnvString(env, 'VITE_ENABLE_DEMO_LOGIN').toLowerCase() !== 'false';
}

export function getConfiguredDemoCredentials(env: RuntimeEnv = (import.meta as any).env ?? {}): DemoCredentials | null {
  const username = readEnvString(env, 'VITE_DEMO_USER');
  const password = readEnvString(env, 'VITE_DEMO_PASSWORD');

  if (!username || !password) return null;
  return { username: normalizeLoginUsername(username), password };
}

export function findDemoLoginUser<T extends DemoLoginUser>(
  users: T[],
  username: string,
  password: string,
  enabled = isDemoLoginEnabled(),
): T | null {
  if (!enabled) return null;

  const normalizedUsername = normalizeLoginUsername(username);
  return users.find(user => normalizeLoginUsername(user.username) === normalizedUsername && user.password === password) ?? null;
}
