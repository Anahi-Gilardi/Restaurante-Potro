import { getActiveSupabaseClient } from '../lib/supabaseClient';

export interface Factura {
  id_factura: string;
  nro_ticket: string;
  cliente: string;
  cuit: string;
  total: number;
  iva_veintiuno: number;
  medio_pago: 'efectivo' | 'debito' | 'tarjeta' | 'mp_qr';
  fecha: string;
  estado: 'emitido' | 'nota_credito';
}

export const facturacionService = {
  async list(): Promise<Factura[]> {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('facturas').select('*').order('fecha_emision', { ascending: false });
    if (error) {
      console.error('Error fetching facturas:', error);
      throw error;
    }
    return (data || []).map(f => {
      let mappedMedio: any = 'efectivo';
      if (f.metodo_pago === 'Tarjeta Debito') mappedMedio = 'debito';
      else if (f.metodo_pago === 'Tarjeta Credito') mappedMedio = 'tarjeta';
      else if (f.metodo_pago === 'MercadoPago') mappedMedio = 'mp_qr';
      else mappedMedio = 'efectivo';

      return {
        id_factura: f.id_factura,
        nro_ticket: f.numero_factura,
        cliente: f.cuit_cliente ? `Clien_CUIT_${f.cuit_cliente}` : 'Consumidor Final',
        cuit: f.cuit_cliente || '99-99999999-9',
        total: parseFloat(f.total),
        iva_veintiuno: parseFloat((f.total * 0.21).toFixed(2)),
        medio_pago: mappedMedio,
        fecha: new Date(f.fecha_emision).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
        estado: f.tipo_comprobante === 'Ticket Consumo' ? 'nota_credito' : 'emitido' // Match mock state logic securely
      };
    });
  },

  async create(factura: Factura): Promise<Factura> {
    const supabase = getActiveSupabaseClient();
    
    let dbMetodo = 'Efectivo';
    if (factura.medio_pago === 'debito') dbMetodo = 'Tarjeta Debito';
    else if (factura.medio_pago === 'tarjeta') dbMetodo = 'Tarjeta Credito';
    else if (factura.medio_pago === 'mp_qr') dbMetodo = 'MercadoPago';

    const dbPayload = {
      id_factura: factura.id_factura,
      numero_factura: factura.nro_ticket,
      total: factura.total,
      tipo_comprobante: factura.estado === 'nota_credito' ? 'Ticket Consumo' : 'Factura B',
      metodo_pago: dbMetodo,
      cuit_cliente: factura.cuit,
      fecha_emision: new Date().toISOString()
    };
    
    const { data, error } = await supabase.from('facturas').insert([dbPayload]).select().single();
    if (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }

    return {
      ...factura,
      id_factura: data.id_factura
    };
  },

  async upsert(facturas: Factura[]): Promise<void> {
    const supabase = getActiveSupabaseClient();
    const dbPayloads = facturas.map(f => {
      let dbMetodo = 'Efectivo';
      if (f.medio_pago === 'debito') dbMetodo = 'Tarjeta Debito';
      else if (f.medio_pago === 'tarjeta') dbMetodo = 'Tarjeta Credito';
      else if (f.medio_pago === 'mp_qr') dbMetodo = 'MercadoPago';

      return {
        id_factura: f.id_factura,
        numero_factura: f.nro_ticket,
        total: f.total,
        tipo_comprobante: f.estado === 'nota_credito' ? 'Ticket Consumo' : 'Factura B',
        metodo_pago: dbMetodo,
        cuit_cliente: f.cuit,
        fecha_emision: new Date().toISOString()
      };
    });

    const { error } = await supabase.from('facturas').upsert(dbPayloads);
    if (error) {
      console.error('Error upserting invoices:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('facturas').delete().eq('id_factura', id);
    if (error) {
      console.error('Error deleting invoice:', error);
      return false;
    }
    return true;
  }
};
