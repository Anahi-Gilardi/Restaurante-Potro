import { getActiveSupabaseClient } from '../lib/supabaseClient';
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

export const salesPersistenceService = {
  async persist(bundle: SaleBundle, enqueueOnFailure = true): Promise<SalePersistenceResult> {
    validateSaleBundle(bundle);
    cacheFacturaLocally(bundle.factura);
    cachePaymentsLocally(bundle.pagos);

    try {
      const supabase = getActiveSupabaseClient();
      const { error } = await supabase.rpc('record_internal_sale', {
        p_factura: toDbFacturaPayload(bundle.factura),
        p_pagos: bundle.pagos.map(toDbPagoPayload),
      });
      if (error) throw error;
      return { synced: true, pendingSync: false };
    } catch (error) {
      console.warn('Cobro guardado localmente y pendiente de sincronización:', error);
      if (enqueueOnFailure) {
        const { syncQueueService } = await import('./syncQueueService');
        syncQueueService.enqueue('record_sale_bundle', bundle);
      }
      return { synced: false, pendingSync: true };
    }
  },
};
