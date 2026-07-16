import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { PagoDb } from '../types';

const LOCAL_PAYMENTS_KEY = 'el_patron_pagos';

export const toDbPagoPayload = (pago: PagoDb) => ({
  id_pago: pago.id_pago,
  id_factura: pago.id_factura,
  monto: pago.monto,
  metodo: pago.metodo,
  fecha: pago.fecha,
});

export const cachePaymentsLocally = (payments: PagoDb[]): void => {
  if (typeof localStorage === 'undefined') return;
  let existing: PagoDb[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_PAYMENTS_KEY) || '[]');
    existing = Array.isArray(parsed) ? parsed : [];
  } catch {
    existing = [];
  }
  const merged = new Map(existing.map(payment => [payment.id_pago, payment]));
  payments.forEach(payment => merged.set(payment.id_pago, payment));
  localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify([...merged.values()]));
};

export const pagosService = {
  async list(idFactura?: string): Promise<PagoDb[]> {
    const supabase = getActiveSupabaseClient();
    try {
      let query = supabase.from('pagos').select('*');
      if (idFactura) {
        query = query.eq('id_factura', idFactura);
      }
      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(p => ({
        id_pago: p.id_pago,
        id_factura: p.id_factura,
        monto: parseFloat(p.monto),
        metodo: p.metodo,
        fecha: p.fecha
      }));
    } catch {
      // Local fallback for client-side storage
      const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
      const all: PagoDb[] = raw ? JSON.parse(raw) : [];
      if (idFactura) {
        return all.filter(p => p.id_factura === idFactura);
      }
      return all;
    }
  },

  async create(pago: PagoDb): Promise<PagoDb> {
    const supabase = getActiveSupabaseClient();
    try {
      const { error } = await supabase.from('pagos').insert([toDbPagoPayload(pago)]);
      if (error) throw error;
    } catch (err) {
      console.warn('DB payments persistence offline, using local storage cache:', err);
    }

    // Always cache locally as backup
    cachePaymentsLocally([pago]);

    return pago;
  },

  async bulkCreate(pagos: PagoDb[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    try {
      const { error } = await supabase.from('pagos').insert(pagos.map(toDbPagoPayload));
      if (error) throw error;
    } catch (err) {
      console.warn('DB payments persistence bulk offline:', err);
    }

    // Always cache locally
    cachePaymentsLocally(pagos);
  }
};
