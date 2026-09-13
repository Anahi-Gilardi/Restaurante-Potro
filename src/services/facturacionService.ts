import { getActiveSupabaseClient, tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow } from '../lib/googleSheetsClient';

export interface FacturaItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

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
  estado: 'borrador' | 'autorizado' | 'observado' | 'rechazado' | 'incierto' | 'nota_credito';
  tipo?: 'ticket' | 'A' | 'B' | 'C' | 'NC' | 'X';
  afip_cae?: string;
  afip_vto?: string;
  afip_qr?: string;
  afip_resultado?: 'A' | 'O' | 'R';
  arca_emission_id?: string;
  afip_cbte_tipo?: number;
  afip_pto_vta?: number;
  afip_cbte_nro?: number;
  afip_observaciones?: Array<{ code: number; msg: string }>;
  arca_emisor?: Record<string, string>;
  condicion_iva_receptor?: number;
  fecha_completa?: string;
  cliente_domicilio?: string;
  documento_tipo_receptor?: number;
  items?: FacturaItem[];
  moneda?: 'PES';
  observaciones?: string;
  comprobante_asociado?: string;
  credited_by_factura_id?: string;
}

const tipoToDb = (factura: Factura): string => {
  if (factura.tipo === 'NC') return 'Nota Credito C';
  if (factura.tipo === 'A') return 'Factura A';
  if (factura.tipo === 'B') return 'Factura B';
  if (factura.tipo === 'C') return 'Factura C';
  if (factura.tipo === 'X') return 'Comprobante X';
  return 'Ticket Consumo';
};

const tipoFromDb = (value: string): Factura['tipo'] => {
  const normalized = value.toLowerCase();
  if (normalized.includes('factura a')) return 'A';
  if (normalized.includes('nota credito c')) return 'NC';
  if (normalized.includes('factura c')) return 'C';
  if (normalized.includes('factura b')) return 'B';
  if (normalized.includes('comprobante x')) return 'X';
  return 'ticket';
};

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

export const cacheFacturaLocally = (factura: Factura) => {
  writeLocalFacturas(mergeFacturas([], [factura, ...readLocalFacturas()]));
};

export const toDbFacturaPayload = (factura: Factura) => ({
  id_factura: factura.id_factura,
  id_pedido: factura.id_pedido || null,
  numero_factura: factura.nro_ticket,
  total: factura.total,
  tipo_comprobante: tipoToDb(factura),
  metodo_pago: mapMetodoPagoToDb(factura.medio_pago),
  cuit_cliente: factura.cuit,
  fecha_emision: factura.fecha_completa || new Date().toISOString(),
  afip_cae: factura.afip_cae,
  afip_vto: factura.afip_vto,
  afip_qr: factura.afip_qr,
  afip_resultado: factura.afip_resultado,
  fiscal_status: factura.tipo === 'NC'
    ? (factura.afip_resultado === 'O' ? 'observed' : 'authorized')
    : factura.estado === 'autorizado' ? 'authorized' : factura.estado === 'observado' ? 'observed' : factura.estado === 'incierto' ? 'uncertain' : factura.estado === 'rechazado' ? 'rejected' : factura.estado === 'nota_credito' ? 'credited' : 'draft',
  arca_emission_id: factura.arca_emission_id,
  afip_cbte_tipo: factura.afip_cbte_tipo,
  afip_pto_vta: factura.afip_pto_vta,
  afip_cbte_nro: factura.afip_cbte_nro,
  afip_observaciones: factura.afip_observaciones || [],
  arca_emisor: factura.arca_emisor,
  condicion_iva_receptor: factura.condicion_iva_receptor,
  cliente_nombre: factura.cliente,
  cliente_domicilio: factura.cliente_domicilio || null,
  documento_tipo_receptor: factura.documento_tipo_receptor || (factura.cuit ? undefined : 99),
  items_json: factura.items || [],
  moneda: factura.moneda || 'PES',
  observaciones: factura.observaciones || null,
  comprobante_asociado: factura.comprobante_asociado || null,
  credited_by_factura_id: factura.credited_by_factura_id || null,
});

export const facturacionService = {
  async list(): Promise<Factura[]> {
    const local = readLocalFacturas();
    try {
      const sheetData = await sheetFetchTable('facturas');
      if (sheetData && sheetData.length > 0) {
        const remote = sheetData.map(f => {
          const tipoComprobante = String(f.tipo_comprobante || '');
          const tipo = tipoFromDb(tipoComprobante);
          const total = Number(f.total) || 0;
          const iva = tipo === 'C' || tipo === 'X' || tipo === 'ticket' ? 0 : total - total / 1.21;

          return {
            id_factura: String(f.id_factura),
            id_pedido: f.id_pedido ? Number(f.id_pedido) : undefined,
            nro_ticket: String(f.numero_factura || f.id_factura),
            cliente: f.cliente_nombre || (f.cuit_cliente ? `Cliente ${f.cuit_cliente}` : 'Consumidor Final'),
            cuit: String(f.cuit_cliente || ''),
            total,
            iva_veintiuno: Number(iva.toFixed(2)),
            medio_pago: mapMetodoPagoFromDb(f.metodo_pago),
            fecha: new Date(f.fecha_emision || Date.now()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
            estado: 'autorizado' as const,
            tipo,
            afip_cae: f.cae || f.afip_cae,
            afip_vto: f.vencimiento_cae || f.afip_vto,
          };
        });
        return mergeFacturas(remote, local);
      }
    } catch (sheetErr) {
      console.warn('[facturacionService.list] Fallback desde Google Sheets:', sheetErr);
    }

    try {
      const supabase = tryGetActiveSupabaseClient();
      if (!supabase) return local;
      const { data, error } = await supabase.from('facturas').select('*').order('fecha_emision', { ascending: false });
      if (error) throw error;

      const remote = (data || []).map(f => {
        const tipoComprobante = String(f.tipo_comprobante || '');
        const tipo = tipoFromDb(tipoComprobante);
        const total = Number(f.total) || 0;
        const iva = tipo === 'C' || tipo === 'X' || tipo === 'ticket' ? 0 : total - total / 1.21;

        return {
          id_factura: f.id_factura,
          id_pedido: f.id_pedido || undefined,
          nro_ticket: f.numero_factura,
          cliente: f.cliente_nombre || (f.cuit_cliente ? `Cliente ${f.cuit_cliente}` : 'Consumidor Final'),
          cuit: f.cuit_cliente || '',
          total,
          iva_veintiuno: Number(iva.toFixed(2)),
          medio_pago: mapMetodoPagoFromDb(f.metodo_pago),
          fecha: new Date(f.fecha_emision).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
          estado: tipoComprobante.toLowerCase().includes('nota')
            ? 'nota_credito' as const
            : f.fiscal_status === 'credited'
              ? 'nota_credito' as const
            : f.fiscal_status === 'observed'
              ? 'observado' as const
              : f.fiscal_status === 'authorized'
                ? 'autorizado' as const
                : f.fiscal_status === 'uncertain'
                  ? 'incierto' as const
                  : f.fiscal_status === 'rejected'
                    ? 'rechazado' as const
                    : 'borrador' as const,
          tipo,
          afip_cae: f.afip_cae,
          afip_vto: f.afip_vto,
          afip_qr: f.afip_qr,
          afip_resultado: f.afip_resultado,
          arca_emission_id: f.arca_emission_id,
          afip_cbte_tipo: f.afip_cbte_tipo,
          afip_pto_vta: f.afip_pto_vta,
          afip_cbte_nro: f.afip_cbte_nro,
          afip_observaciones: Array.isArray(f.afip_observaciones) ? f.afip_observaciones : [],
          arca_emisor: f.arca_emisor && typeof f.arca_emisor === 'object' ? f.arca_emisor : undefined,
          condicion_iva_receptor: Number(f.condicion_iva_receptor) || 5,
          fecha_completa: f.fecha_emision,
          cliente_domicilio: f.cliente_domicilio || undefined,
          documento_tipo_receptor: Number(f.documento_tipo_receptor) || (f.cuit_cliente ? 80 : 99),
          items: Array.isArray(f.items_json) ? f.items_json : [],
          moneda: 'PES' as const,
          observaciones: f.observaciones || undefined,
          comprobante_asociado: f.comprobante_asociado || undefined,
          credited_by_factura_id: f.credited_by_factura_id || undefined,
        };
      });

      return mergeFacturas(remote, local);
    } catch (error) {
      console.warn('No se pudo leer facturas remotas; usando respaldo local.', error);
      return local;
    }
  },

  async create(factura: Factura): Promise<Factura> {
    cacheFacturaLocally(factura);
    const dbPayload = toDbFacturaPayload(factura);

    try {
      await sheetUpsertRow('facturas', dbPayload);
    } catch (sheetErr) {
      console.warn('[facturacionService.create] Google Sheets:', sheetErr);
    }
    
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('facturas').insert([dbPayload]).select().single();
        if (data) {
          return { ...factura, id_factura: data.id_factura };
        }
      }
    } catch (err) {
      console.warn('facturacionService.create Supabase omitido:', err);
    }
    return factura;
  },

  async upsert(facturas: Factura[]): Promise<void> {
    writeLocalFacturas(mergeFacturas([], [...facturas, ...readLocalFacturas()]));
    for (const f of facturas) {
      try {
        await sheetUpsertRow('facturas', toDbFacturaPayload(f));
      } catch (sheetErr) {
        console.warn('[facturacionService.upsert] Google Sheets:', sheetErr);
      }
    }

    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        const dbPayloads = facturas.map(toDbFacturaPayload);
        await supabase.from('facturas').upsert(dbPayloads);
      }
    } catch (err) {
      console.warn('facturacionService.upsert Supabase omitido:', err);
    }
  },

  async markNotaCredito(id: string, creditNoteId: string): Promise<void> {
    writeLocalFacturas(readLocalFacturas().map(factura => (
      factura.id_factura === id
        ? { ...factura, estado: 'nota_credito', credited_by_factura_id: creditNoteId }
        : factura
    )));
    const supabase = getActiveSupabaseClient();
    const { error } = await supabase
      .from('facturas')
      .update({ fiscal_status: 'credited', credited_by_factura_id: creditNoteId })
      .eq('id_factura', id);
    if (error) {
      console.error('Error marking invoice as credit note:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<boolean> {
    const local = readLocalFacturas();
    const localInvoice = local.find(factura => factura.id_factura === id);
    if (localInvoice && !canDeleteFactura(localInvoice)) {
      throw new Error('Un comprobante fiscal autorizado no se elimina. Debe anularse mediante una Nota de Credito C.');
    }
    const supabase = getActiveSupabaseClient();
    const { data: remoteInvoice, error: readError } = await supabase
      .from('facturas')
      .select('fiscal_status, afip_cae')
      .eq('id_factura', id)
      .maybeSingle();
    if (readError) throw readError;
    if (remoteInvoice && (remoteInvoice.afip_cae || ['authorized', 'observed', 'credited'].includes(remoteInvoice.fiscal_status))) {
      throw new Error('Un comprobante fiscal autorizado no se elimina. Debe anularse mediante una Nota de Credito C.');
    }
    const { error } = await supabase.from('facturas').delete().eq('id_factura', id);
    if (error) {
      console.error('Error deleting invoice:', error);
      return false;
    }
    writeLocalFacturas(local.filter(factura => factura.id_factura !== id));
    return true;
  }
};

export const canDeleteFactura = (factura: Pick<Factura, 'estado' | 'afip_cae'>): boolean => (
  !factura.afip_cae && !['autorizado', 'observado', 'nota_credito'].includes(factura.estado)
);
