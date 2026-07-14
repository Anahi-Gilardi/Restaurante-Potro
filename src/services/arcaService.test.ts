import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  buildArcaInvoiceRequest,
  getArcaStatus,
  testArcaConnection,
} from './arcaService';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('consulta estado ARCA sin enviar credenciales fiscales', async () => {
  let request: { input: RequestInfo | URL; init?: RequestInit } | null = null;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    request = { input, init };
    return new Response(JSON.stringify({
      configured: true,
      connected: false,
      environment: 'homologacion',
      puntoVenta: 3,
      cuitMasked: '*******6789',
      message: 'Configurado',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  const status = await getArcaStatus(true);
  assert.equal(status.configured, true);
  assert.equal(status.puntoVenta, 3);
  assert.equal(request?.init?.method, 'GET');
  assert.equal(request?.init?.body, undefined);
});

test('probar conexión exige una sesión autenticada', async () => {
  const result = await testArcaConnection();
  assert.equal(result.success, false);
  assert.match(result.error || '', /Supabase|sesión/);
});

test('el request de factura no contiene certificado ni clave privada', () => {
  const body = buildArcaInvoiceRequest({
    idempotencyKey: 'fac_test_001',
    tipoComprobante: 6,
    cliente: { tipoDoc: 99, nroDoc: 0, condicionIva: 5 },
    total: 121,
    neto: 100,
    ivaTotal: 21,
  });

  assert.equal(body.action, 'createInvoice');
  assert.equal('credentials' in body, false);
  assert.equal(JSON.stringify(body).includes('PRIVATE KEY'), false);
});
