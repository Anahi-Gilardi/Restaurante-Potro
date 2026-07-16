import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('Caja persiste comprobante y pagos mediante una transacción atómica', () => {
  const hook = readFileSync('src/features/caja/hooks/useCaja.ts', 'utf8');
  const migration = readFileSync('supabase/migrations/20260716030000_atomic_internal_sales.sql', 'utf8');
  const service = readFileSync('src/services/salesPersistenceService.ts', 'utf8');

  assert.match(hook, /salesPersistenceService\.persist\(\{ factura: internalFactura, pagos: paymentRows \}\)/);
  assert.doesNotMatch(hook, /pagosService\.bulkCreate\(paymentRows\)/);
  assert.match(service, /rpc\('record_internal_sale'/);
  assert.match(migration, /ALTER COLUMN id_pedido TYPE BIGINT/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS afip_cae TEXT/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.record_internal_sale/);
  assert.match(migration, /La suma de pagos no coincide con el total/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.record_internal_sale\(JSONB, JSONB\) TO authenticated/);
});

test('los cobros pendientes se reintentan como una unidad', () => {
  const queue = readFileSync('src/services/syncQueueService.ts', 'utf8');
  assert.match(queue, /record_sale_bundle/);
  assert.match(queue, /salesPersistenceService\.persist\(item\.payload, false\)/);
});
