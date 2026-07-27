import assert from 'node:assert';
import test, { beforeEach } from 'node:test';
import { syncQueueService } from './syncQueueService';

// Mock localStorage
class LocalStorageMock {
  store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const localStorageMock = new LocalStorageMock();
global.window = {
  navigator: { onLine: true }
} as any;
Object.defineProperty(global, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true
});
global.localStorage = localStorageMock as any;

beforeEach(() => {
  localStorageMock.clear();
});

test('SyncQueueService - Enqueue adds item to local storage', () => {
  syncQueueService.enqueue('create_merma', { id_merma: 'merma_1', id_insumo: 'ins_1', cantidad: 5 });
  const queue = syncQueueService.getQueue();
  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].action, 'create_merma');
  assert.strictEqual(queue[0].payload.id_merma, 'merma_1');
});

test('SyncQueueService - processQueue postpones sync when device is offline', async () => {
  global.navigator = { onLine: false } as any;
  syncQueueService.enqueue('create_merma', { id_merma: 'merma_2' });
  
  await syncQueueService.processQueue();
  
  const queue = syncQueueService.getQueue();
  // Item should remain in queue since it was offline
  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].payload.id_merma, 'merma_2');
  assert.strictEqual(queue[0].attempts, 0);
});

test('SyncQueueService - conserva solo el estado más reciente de un mismo cierre', () => {
  syncQueueService.enqueue('upsert_cierre', { id_cierre: 'cie_10', monto_ventas: 100 });
  syncQueueService.enqueue('upsert_cierre', { id_cierre: 'cie_10', monto_ventas: 250 });

  const queue = syncQueueService.getQueue();
  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].action, 'upsert_cierre');
  assert.strictEqual(queue[0].payload.monto_ventas, 250);
});

test('SyncQueueService - permite recuperar manualmente operaciones fallidas', () => {
  localStorage.setItem('el_patron_offline_sync_failed', JSON.stringify([{
    id: 'sync_failed_1',
    action: 'create_merma',
    payload: { id_merma: 'merma_3' },
    timestamp: new Date().toISOString(),
    attempts: 50,
    lastError: 'timeout',
    failedAt: new Date().toISOString()
  }]));

  const restored = syncQueueService.retryFailed();
  const queue = syncQueueService.getQueue();

  assert.strictEqual(restored, 1);
  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].attempts, 0);
  assert.strictEqual(queue[0].payload.id_merma, 'merma_3');
  assert.strictEqual(syncQueueService.getFailedQueue().length, 0);
});
