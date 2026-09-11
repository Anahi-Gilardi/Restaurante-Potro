import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  buildArcaInvoiceRequest,
  getArcaApiEndpoint,
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
      pointOfSaleValid: true,
      authorizedPointsOfSale: [3, 8],
      cuitMasked: '*******6789',
      message: 'Configurado',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  const status = await getArcaStatus(true);
  assert.equal(status.configured, true);
  assert.equal(status.puntoVenta, 3);
  assert.equal(status.pointOfSaleValid, true);
  assert.deepEqual(status.authorizedPointsOfSale, [3, 8]);
  assert.equal(request?.init?.method, 'GET');
  assert.equal(request?.init?.body, undefined);
});

test('el dominio publico usa el backend fiscal privado', () => {
  assert.equal(
    getArcaApiEndpoint({ hostname: 'restaurante-potro.vercel.app' } as Location),
    'https://restaurante-potro-anahi.vercel.app/api/arca',
  );
  assert.equal(
    getArcaApiEndpoint({ hostname: 'localhost' } as Location),
    'https://restaurante-potro-anahi.vercel.app/api/arca',
  );
  assert.equal(
    getArcaApiEndpoint({ hostname: 'restaurante-potro-anahi.vercel.app' } as Location),
    '/api/arca',
  );
});

test('probar conexión envía acción test al backend', async () => {
  let calledBody = '';
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    calledBody = String(init?.body ?? '');
    return new Response(JSON.stringify({
      configured: true,
      connected: true,
      success: true,
      environment: 'produccion',
      puntoVenta: 2,
      pointOfSaleValid: true,
      authorizedPointsOfSale: [2],
      cuitMasked: '*******6136',
      message: 'Conectado',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  const result = await testArcaConnection();
  assert.equal(result.success, true);
  assert.equal(result.status.connected, true);
  assert.equal(result.status.puntoVenta, 2);
  assert.deepEqual(JSON.parse(calledBody), { action: 'test' });
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
