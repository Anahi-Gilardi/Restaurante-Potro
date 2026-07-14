import assert from 'node:assert/strict';
import test from 'node:test';
import { signInWithUsername } from './usernameAuthService';

test('inicia sesión por usuario mediante un token de un solo uso', async () => {
  let requestedBody = '';
  const fetchMock = async (_input: string | URL | Request, init?: RequestInit) => {
    requestedBody = String(init?.body ?? '');
    return new Response(JSON.stringify({ success: true, tokenHash: 'hash-temporal', verificationType: 'magiclink' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const supabase = {
    auth: {
      verifyOtp: async () => ({
        data: { user: { id: 'auth-admin', email: 'internal@example.invalid' } },
        error: null,
      }),
    },
  };

  const user = await signInWithUsername(supabase as any, ' Admin ', 'pin-secreto', fetchMock as typeof fetch);
  assert.equal(user.id, 'auth-admin');
  assert.deepEqual(JSON.parse(requestedBody), { username: 'admin', password: 'pin-secreto' });
});

test('no intenta verificar OTP cuando el backend rechaza la credencial', async () => {
  let verificationAttempted = false;
  const supabase = {
    auth: {
      verifyOtp: async () => {
        verificationAttempted = true;
        return { data: { user: null }, error: null };
      },
    },
  };
  const fetchMock = async () => new Response(JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(
    () => signInWithUsername(supabase as any, 'admin', 'incorrecto', fetchMock as typeof fetch),
    /incorrectos/,
  );
  assert.equal(verificationAttempted, false);
});
