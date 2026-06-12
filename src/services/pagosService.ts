import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { PagoDb } from '../types';

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
      const raw = localStorage.getItem('el_patron_pagos');
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
      await supabase.from('pagos').insert([{
        id_pago: pago.id_pago,
        id_factura: pago.id_factura,
        monto: pago.monto,
        metodo: pago.metodo,
        fecha: pago.fecha
      }]);
    } catch (err) {
      console.warn('DB payments persistence offline, using local storage cache:', err);
    }

    // Always cache locally as backup
    const raw = localStorage.getItem('el_patron_pagos');
    const all: PagoDb[] = raw ? JSON.parse(raw) : [];
    all.push(pago);
    localStorage.setItem('el_patron_pagos', JSON.stringify(all));

    return pago;
  },

  async bulkCreate(pagos: PagoDb[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    try {
      const dbPayloads = pagos.map(p => ({
        id_pago: p.id_pago,
        id_factura: p.id_factura,
        monto: p.monto,
        metodo: p.metodo,
        fecha: p.fecha
      }));
      await supabase.from('pagos').insert(dbPayloads);
    } catch (err) {
      console.warn('DB payments persistence bulk offline:', err);
    }

    // Always cache locally
    const raw = localStorage.getItem('el_patron_pagos');
    const all: PagoDb[] = raw ? JSON.parse(raw) : [];
    all.push(...pagos);
    localStorage.setItem('el_patron_pagos', JSON.stringify(all));
  }
};
