import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Pedido, Merma } from '../types';
import { Factura } from './facturacionService';

export interface SyncQueueItem {
  id: string;
  action: 'upsert_pedido' | 'upsert_factura' | 'record_sale_bundle' | 'create_merma' | 'update_pedido_estado' | 'upsert_cierre';
  payload: any;
  timestamp: string;
  attempts: number;
  nextAttemptAt?: string;
  lastError?: string;
  failedAt?: string;
}

const QUEUE_KEY = 'el_patron_offline_sync_queue';
const FAILED_QUEUE_KEY = 'el_patron_offline_sync_failed';
const MAX_ATTEMPTS = 50;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
let backgroundSyncStarted = false;
let backgroundSyncInterval: ReturnType<typeof setInterval> | null = null;
let queueProcessing = false;

const readStoredQueue = (key: string): SyncQueueItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveStoredQueue = (key: string, queue: SyncQueueItem[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(queue));
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Error de sincronizacion desconocido';
  }
};

const getNextAttemptAt = (attempts: number): string => {
  const delay = Math.min(MAX_BACKOFF_MS, 2 ** Math.min(attempts, 12) * 1000);
  return new Date(Date.now() + delay).toISOString();
};

const markCashShiftSynced = (idCierre: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const activeRaw = localStorage.getItem('el_patron_caja_activa');
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active?.id_cierre === idCierre) {
        localStorage.setItem('el_patron_caja_activa', JSON.stringify({ ...active, sync_status: 'synced' }));
      }
    }

    const historyRaw = localStorage.getItem('el_patron_historial_cierres');
    if (historyRaw) {
      const history = JSON.parse(historyRaw);
      if (Array.isArray(history)) {
        localStorage.setItem('el_patron_historial_cierres', JSON.stringify(
          history.map(item => item?.id_cierre === idCierre ? { ...item, sync_status: 'synced' } : item),
        ));
      }
    }

    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('el-patron-cash-shift-synced', { detail: { idCierre } }));
    }
  } catch (error) {
    console.warn('No se pudo actualizar el indicador local de Caja:', error);
  }
};

export const syncQueueService = {
  getQueue(): SyncQueueItem[] {
    return readStoredQueue(QUEUE_KEY);
  },

  saveQueue(queue: SyncQueueItem[]): void {
    saveStoredQueue(QUEUE_KEY, queue);
  },

  getFailedQueue(): SyncQueueItem[] {
    return readStoredQueue(FAILED_QUEUE_KEY);
  },

  retryFailed(): number {
    const failed = this.getFailedQueue();
    if (failed.length === 0) return 0;
    const pending = this.getQueue();
    const restored = failed.map(item => ({
      ...item,
      attempts: 0,
      nextAttemptAt: undefined,
      failedAt: undefined
    }));
    this.saveQueue([...pending, ...restored]);
    saveStoredQueue(FAILED_QUEUE_KEY, []);
    this.processQueue().catch(error => console.warn('No se pudo reintentar la cola:', error));
    return restored.length;
  },

  clearFailed(): void {
    saveStoredQueue(FAILED_QUEUE_KEY, []);
  },

  enqueue(action: SyncQueueItem['action'], payload: any): void {
    const queue = action === 'upsert_cierre'
      ? this.getQueue().filter(item => !(
          item.action === 'upsert_cierre'
          && item.payload?.id_cierre === payload?.id_cierre
        ))
      : this.getQueue();
    const item: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0,
      nextAttemptAt: new Date().toISOString()
    };
    queue.push(item);
    this.saveQueue(queue);

    // Trigger immediate background sync check
    this.processQueue().catch(err => console.warn('Immediate sync try failed:', err));
  },

  async isOnline(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    // Deep network check: test connection to Supabase
    try {
      const supabase = getActiveSupabaseClient();
      const { error } = await supabase.from('mesas').select('id_mesa').limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  async processQueue(): Promise<void> {
    if (queueProcessing) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;
    queueProcessing = true;

    try {
      // Check if network is online
      const online = await this.isOnline();
      if (!online) {
        console.log('SyncQueue: Device is offline. post-poning sync.');
        return;
      }

      console.log(`SyncQueue: Found ${queue.length} pending items to synchronize.`);
      const remaining: SyncQueueItem[] = [];
      const failedQueue = this.getFailedQueue();

      // Dynamically import services to avoid circular dependency
      const { pedidosService } = await import('./pedidosService');
      const { facturacionService } = await import('./facturacionService');
      const { salesPersistenceService } = await import('./salesPersistenceService');
      const { mermasService } = await import('./mermasService');

      for (const item of queue) {
        if (item.nextAttemptAt && Date.parse(item.nextAttemptAt) > Date.now()) {
          remaining.push(item);
          continue;
        }

        item.attempts += 1;
        let success = false;

        try {
          if (item.action === 'upsert_pedido') {
            if (item.payload.is_accumulation) {
              await pedidosService.agregarItemsAComandaExistente(item.payload.id_pedido, item.payload.items);
            } else {
              await pedidosService.upsert([item.payload]);
            }
            success = true;
          } else if (item.action === 'upsert_factura') {
            await facturacionService.upsert([item.payload]);
            success = true;
          } else if (item.action === 'record_sale_bundle') {
            const result = await salesPersistenceService.persist(item.payload, false);
            success = result.synced;
          } else if (item.action === 'create_merma') {
            await mermasService.create(item.payload);
            success = true;
          } else if (item.action === 'update_pedido_estado') {
            await pedidosService.update(item.payload.id, item.payload.fields);
            success = true;
          } else if (item.action === 'upsert_cierre') {
            const supabase = getActiveSupabaseClient();
            const { error } = await supabase.from('cierres_caja').upsert([item.payload]);
            if (error) throw error;
            markCashShiftSynced(item.payload.id_cierre);
            success = true;
          }
        } catch (error) {
          item.lastError = getErrorMessage(error);
          console.error(`SyncQueue: Failed synchronization attempt #${item.attempts} for task ${item.id}:`, error);
        }

        if (success) {
          console.log(`SyncQueue: Task ${item.id} (${item.action}) successfully synchronized.`);
        } else {
          if (item.attempts < MAX_ATTEMPTS) {
            item.nextAttemptAt = getNextAttemptAt(item.attempts);
            remaining.push(item);
          } else {
            failedQueue.push({ ...item, failedAt: new Date().toISOString() });
            console.error(`SyncQueue: Task ${item.id} moved to the failed queue.`);
          }
        }
      }

      this.saveQueue(remaining);
      saveStoredQueue(FAILED_QUEUE_KEY, failedQueue);
    } finally {
      queueProcessing = false;
    }
  },

  initBackgroundSync(): void {
    if (typeof window === 'undefined' || backgroundSyncStarted) return;
    backgroundSyncStarted = true;

    window.addEventListener('online', handleOnline);
    backgroundSyncInterval = setInterval(() => {
      this.processQueue().catch(err => console.error('Error in periodic sync:', err));
    }, 20000);
  },

  stopBackgroundSync(): void {
    if (typeof window === 'undefined' || !backgroundSyncStarted) return;
    window.removeEventListener('online', handleOnline);
    if (backgroundSyncInterval) clearInterval(backgroundSyncInterval);
    backgroundSyncInterval = null;
    backgroundSyncStarted = false;
  }
};

function handleOnline(): void {
  console.log('SyncQueue: Network restored! Retrying sync...');
  syncQueueService.processQueue().catch(err => {
    console.error('Error in online event sync:', err);
  });
}
