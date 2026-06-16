import { getActiveSupabaseClient } from '../lib/supabaseClient';

export interface Factura {
  id_factura: string;
  id_pedido?: number;
  nro_ticket: string;
  cliente: string;
  cuit: string;
  total: number;
  iva_veintiuno: number;
  medio_pago: 'efectivo' | 'debito' | 'tarjeta' | 'transferencia' | 'mp_qr' | 'mixto';
  fecha: string;
  estado: 'emitido' | 'nota_credito';
  afip_cae?: string;
  afip_vto?: string;
  afip_qr?: string;
  afip_resultado?: 'A' | 'O' | 'R';
}

const mapMetodoPagoToDb = (medioPago: Factura['medio_pago']) => {
  if (medioPago === 'debito') return 'Tarjeta Debito';
  if (medioPago === 'tarjeta') return 'Tarjeta Credito';
  if (medioPago === 'transferencia') return 'Transferencia';
  if (medioPago === 'mp_qr') return 'MercadoPago';
  if (medioPago === 'mixto') return 'Mixto';
  return 'Efectivo';
};

const mapMetodoPagoFromDb = (medioPago?: string): Factura['medio_pago'] => {
  if (medioPago === 'Tarjeta Debito') return 'debito';
  if (medioPago === 'Tarjeta Credito') return 'tarjeta';
  if (medioPago === 'Transferencia') return 'transferencia';
  if (medioPago === 'MercadoPago') return 'mp_qr';
  if (medioPago === 'Mixto') return 'mixto';
  return 'efectivo';
};

const LOCAL_FACTURAS_KEY = 'el_patron_facturas_pendientes';

const readLocalFacturas = (): Factura[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_FACTURAS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalFacturas = (facturas: Factura[]) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_FACTURAS_KEY, JSON.stringify(facturas));
};

export const mergeFacturas = (remote: Factura[], local: Factura[]): Factura[] => {
  const merged = new Map<string, Factura>();
  local.forEach(factura => merged.set(factura.id_factura, factura));
  remote.forEach(factura => merged.set(factura.id_factura, factura));
  return Array.from(merged.values()).sort((a, b) => b.id_factura.localeCompare(a.id_factura));
};

const cacheFactura = (factura: Factura) => {
  writeLocalFacturas(mergeFacturas([], [factura, ...readLocalFacturas()]));
};

export const facturacionService = {
  async list(): Promise<Factura[]> {
    const local = readLocalFacturas();
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('facturas').select('*').order('fecha_emision', { ascending: false });
      if (error) throw error;

      const remote = (data || []).map(f => {
        const tipoComprobante = String(f.tipo_comprobante || '');

        return {
          id_factura: f.id_factura,
          id_pedido: f.id_pedido || undefined,
          nro_ticket: f.numero_factura,
          cliente: f.cuit_cliente ? `Clien_CUIT_${f.cuit_cliente}` : 'Consumidor Final',
          cuit: f.cuit_cliente || '99-99999999-9',
          total: parseFloat(f.total),
          iva_veintiuno: parseFloat((f.total * 0.21).toFixed(2)),
          medio_pago: mapMetodoPagoFromDb(f.metodo_pago),
          fecha: new Date(f.fecha_emision).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
          estado: tipoComprobante.toLowerCase().includes('nota') ? 'nota_credito' as const : 'emitido' as const
        };
      });

      return mergeFacturas(remote, local);
    } catch (error) {
      console.warn('No se pudo leer facturas remotas; usando respaldo local.', error);
      return local;
    }
  },

  async create(factura: Factura): Promise<Factura> {
    cacheFactura(factura);
    const supabase = getActiveSupabaseClient();
    const dbPayload = {
      id_factura: factura.id_factura,
      id_pedido: factura.id_pedido || null,
      numero_factura: factura.nro_ticket,
      total: factura.total,
      tipo_comprobante: factura.estado === 'nota_credito' ? 'Nota Credito' : 'Factura B',
      metodo_pago: mapMetodoPagoToDb(factura.medio_pago),
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
    writeLocalFacturas(mergeFacturas([], [...facturas, ...readLocalFacturas()]));
    const supabase = getActiveSupabaseClient();
    const dbPayloads = facturas.map(f => {
      return {
        id_factura: f.id_factura,
        id_pedido: f.id_pedido || null,
        numero_factura: f.nro_ticket,
        total: f.total,
        tipo_comprobante: f.estado === 'nota_credito' ? 'Nota Credito' : 'Factura B',
        metodo_pago: mapMetodoPagoToDb(f.medio_pago),
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

  async markNotaCredito(id: string): Promise<void> {
    writeLocalFacturas(readLocalFacturas().map(factura => (
      factura.id_factura === id ? { ...factura, estado: 'nota_credito' } : factura
    )));
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase
      .from('facturas')
      .update({ tipo_comprobante: 'Nota Credito' })
      .eq('id_factura', id);
    if (error) {
      console.error('Error marking invoice as credit note:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<boolean> {
    writeLocalFacturas(readLocalFacturas().filter(factura => factura.id_factura !== id));
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase.from('facturas').delete().eq('id_factura', id);
    if (error) {
      console.error('Error deleting invoice:', error);
      return false;
    }
    return true;
  }
};
