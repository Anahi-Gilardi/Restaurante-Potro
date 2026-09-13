import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { PagoDb } from '../types';
import { sheetFetchTable, sheetUpsertRow } from '../lib/googleSheetsClient';

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
    try {
      const sheetData = await sheetFetchTable('pagos');
      if (sheetData && sheetData.length > 0) {
        const parsed = sheetData.map(p => ({
          id_pago: String(p.id_pago),
          id_factura: String(p.id_factura),
          monto: parseFloat(p.monto) || 0,
          metodo: p.metodo,
          fecha: p.fecha
        }));
        if (idFactura) {
          return parsed.filter(p => p.id_factura === idFactura);
        }
        return parsed;
      }
    } catch (sheetErr) {
      console.warn('[pagosService.list] Google Sheets fallback:', sheetErr);
    }

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
    const payload = toDbPagoPayload(pago);
    try {
      await sheetUpsertRow('pagos', payload);
    } catch (sheetErr) {
      console.warn('[pagosService.create] Google Sheets:', sheetErr);
    }

    const supabase = getActiveSupabaseClient();
    try {
      const { error } = await supabase.from('pagos').insert([payload]);
      if (error) throw error;
    } catch (err) {
      console.warn('DB payments persistence offline, using local storage cache:', err);
    }

    // Always cache locally as backup
    cachePaymentsLocally([pago]);

    return pago;
  },

  async bulkCreate(pagos: PagoDb[]): Promise<void> {
    const payloads = pagos.map(toDbPagoPayload);
    for (const p of payloads) {
      try {
        await sheetUpsertRow('pagos', p);
      } catch (sheetErr) {
        console.warn('[pagosService.bulkCreate] Google Sheets:', sheetErr);
      }
    }

    const supabase = getActiveSupabaseClient();
    try {
      const { error } = await supabase.from('pagos').insert(payloads);
      if (error) throw error;
    } catch (err) {
      console.warn('DB payments persistence bulk offline:', err);
    }

    // Always cache locally
    cachePaymentsLocally(pagos);
  }
};

