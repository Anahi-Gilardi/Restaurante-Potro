import type { DataIntegrityReport } from '../lib/dataIntegrity';
import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';

const SECURE_ORIGIN = 'https://restaurante-potro-anahi.vercel.app';

export function getDataIntegrityEndpoint(
  locationLike: Pick<Location, 'hostname'> | undefined = globalThis.location,
): string {
  if (locationLike?.hostname === 'restaurante-potro.vercel.app') return `${SECURE_ORIGIN}/api/data-integrity`;
  return '/api/data-integrity';
}

async function authenticatedRequest(method: 'GET' | 'POST'): Promise<any> {
  const client = tryGetActiveSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado para auditar datos.');
  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error('La sesión segura venció. Iniciá sesión nuevamente.');
  const response = await fetch(getDataIntegrityEndpoint(), {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: method === 'POST' ? JSON.stringify({ action: 'cleanup_safe' }) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

export const dataIntegrityService = {
  async audit(): Promise<DataIntegrityReport> {
    return (await authenticatedRequest('GET')).report as DataIntegrityReport;
  },
  async cleanupSafe(): Promise<{ report: DataIntegrityReport; actions: Array<{ action: string; count: number; ids: string[] }> }> {
    return authenticatedRequest('POST');
  },
};
