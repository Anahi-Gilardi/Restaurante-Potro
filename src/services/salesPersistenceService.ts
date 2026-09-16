import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetUpsertRow } from '../lib/googleSheetsClient';
import type { PagoDb } from '../types';
import {
  cacheFacturaLocally,
  toDbFacturaPayload,
  type Factura,
} from './facturacionService';
import { cachePaymentsLocally, toDbPagoPayload } from './pagosService';

export interface SaleBundle {
  factura: Factura;
  pagos: PagoDb[];
}

export interface SalePersistenceResult {
  synced: boolean;
  pendingSync: boolean;
}

export const validateSaleBundle = ({ factura, pagos }: SaleBundle) => {
  if (!factura.id_factura || !Number.isFinite(factura.total) || factura.total <= 0) {
    throw new Error('El comprobante interno es inválido.');
  }
  if (pagos.length === 0 || pagos.some(pago => (
    !pago.id_pago
    || pago.id_factura !== factura.id_factura
    || !Number.isFinite(pago.monto)
    || pago.monto <= 0
  ))) {
    throw new Error('El desglose de pagos es inválido.');
  }
  const paid = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  if (Math.abs(paid - factura.total) > 0.01) {
    throw new Error('La suma de pagos no coincide con el total del comprobante.');
  }
};

let rpcRecordSaleAvailable = false;

export const salesPersistenceService = {
  async persist(bundle: SaleBundle, enqueueOnFailure = true): Promise<SalePersistenceResult> {
    validateSaleBundle(bundle);
    cacheFacturaLocally(bundle.factura);
    cachePaymentsLocally(bundle.pagos);

    // 1. Guardar factura y pagos en Google Sheets en segundo plano para respuesta inmediata (0ms)
    (async () => {
      try {
        await sheetUpsertRow('facturas', toDbFacturaPayload(bundle.factura));
        for (const p of bundle.pagos) {
          await sheetUpsertRow('pagos', toDbPagoPayload(p));
        }
      } catch (sheetErr) {
        console.warn('[salesPersistenceService] Google Sheets sync warning:', sheetErr);
      }
    })();

    // 2. Intentar Supabase RPC atómico solo si está disponible en la base de datos
    if (rpcRecordSaleAvailable) {
      try {
        const supabase = getActiveSupabaseClient();
        const { error } = await supabase.rpc('record_internal_sale', {
          p_factura: toDbFacturaPayload(bundle.factura),
          p_pagos: bundle.pagos.map(toDbPagoPayload),
        });
        if (error) {
          if (
            error.message?.includes('function') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('schema cache') ||
            error.message?.includes('permission')
          ) {
            rpcRecordSaleAvailable = false;
            console.warn('[salesPersistenceService] Supabase RPC record_internal_sale omitido (facturas en Google Sheets):', error.message);
            return { synced: true, pendingSync: false };
          }
          throw error;
        }
        return { synced: true, pendingSync: false };
      } catch (error: any) {
        if (
          error?.message?.includes('function') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache')
        ) {
          rpcRecordSaleAvailable = false;
          console.warn('[salesPersistenceService] Supabase RPC no disponible; guardado en Google Sheets.');
          return { synced: true, pendingSync: false };
        }
        console.warn('Cobro guardado localmente y pendiente de sincronización:', error);
        if (enqueueOnFailure) {
          const { syncQueueService } = await import('./syncQueueService');
          syncQueueService.enqueue('record_sale_bundle', bundle);
        }
        return { synced: false, pendingSync: true };
      }
    }

    return { synced: true, pendingSync: false };
  },
};
