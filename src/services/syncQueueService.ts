import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Pedido, Merma } from '../types';
import { Factura } from './facturacionService';

export interface SyncQueueItem {
  id: string;
  action: 'upsert_pedido' | 'upsert_factura' | 'create_merma' | 'update_pedido_estado';
  payload: any;
  timestamp: string;
  attempts: number;
}

const QUEUE_KEY = 'el_patron_offline_sync_queue';

export const syncQueueService = {
  getQueue(): SyncQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  saveQueue(queue: SyncQueueItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  enqueue(action: SyncQueueItem['action'], payload: any): void {
    const queue = this.getQueue();
    const item: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0
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
    const queue = this.getQueue();
    if (queue.length === 0) return;

    // Check if network is online
    const online = await this.isOnline();
    if (!online) {
      console.log('SyncQueue: Device is offline. post-poning sync.');
      return;
    }

    console.log(`SyncQueue: Found ${queue.length} pending items to synchronize.`);
    const remaining: SyncQueueItem[] = [];

    // Dynamically import services to avoid circular dependency
    const { pedidosService } = await import('./pedidosService');
    const { facturacionService } = await import('./facturacionService');
    const { mermasService } = await import('./mermasService');

    for (const item of queue) {
      item.attempts += 1;
      let success = false;

      try {
        if (item.action === 'upsert_pedido') {
          if (item.payload.is_accumulation) {
            await pedidosService.agregarItemsAComandaExistente(item.payload.id_pedido, item.payload.items);
          } else {
            // Serialize and push header & details
            await pedidosService.upsert([item.payload]);
          }
          success = true;
        } else if (item.action === 'upsert_factura') {
          await facturacionService.upsert([item.payload]);
          success = true;
        } else if (item.action === 'create_merma') {
          await mermasService.create(item.payload);
          success = true;
        } else if (item.action === 'update_pedido_estado') {
          await pedidosService.update(item.payload.id, item.payload.fields);
          success = true;
        }
      } catch (err) {
        console.error(`SyncQueue: Failed synchronization attempt #${item.attempts} for task ${item.id}:`, err);
      }

      if (success) {
        console.log(`SyncQueue: Task ${item.id} (${item.action}) successfully synchronized.`);
      } else {
        // Keep in queue if it hasn't exceeded too many retries (e.g. 50 attempts)
        if (item.attempts < 50) {
          remaining.push(item);
        } else {
          console.error(`SyncQueue: Task ${item.id} exceeded maximum retry threshold. Discarding.`);
        }
      }
    }

    this.saveQueue(remaining);
  },

  initBackgroundSync(): void {
    if (typeof window === 'undefined') return;

    // Listen to network change events reactively
    window.addEventListener('online', () => {
      console.log('SyncQueue: Network restored! Retrying sync...');
      this.processQueue().catch(err => console.error('Error in online event sync:', err));
    });

    // Run interval check every 20 seconds
    setInterval(() => {
      this.processQueue().catch(err => console.error('Error in periodic sync:', err));
    }, 20000);
  }
};
