import { sheetDeleteRow, sheetFetchTable, sheetUpsertRow } from '../lib/googleSheetsClient';

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
  return Array.from(merged.values()).sort((a, b) => {
    const timeA = a.fecha_completa ? new Date(a.fecha_completa).getTime() : 0;
    const timeB = b.fecha_completa ? new Date(b.fecha_completa).getTime() : 0;
    if (timeA && timeB && timeA !== timeB) return timeB - timeA;
    return b.id_factura.localeCompare(a.id_factura);
  });
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
  async list(forceFresh = false): Promise<Factura[]> {
    const local = readLocalFacturas();
    try {
      const sheetData = await sheetFetchTable('facturas', forceFresh);
      if (Array.isArray(sheetData)) {
        const remote = sheetData.map((f: any) => {
          const tipoComprobante = String(f.tipo_comprobante || '');
          const tipo = tipoFromDb(tipoComprobante);
          const total = Number(f.total) || 0;
          const iva = tipo === 'C' || tipo === 'X' || tipo === 'ticket' ? 0 : total - total / 1.21;

          let items: FacturaItem[] = [];
          if (Array.isArray(f.items_json)) {
            items = f.items_json;
          } else if (typeof f.items_json === 'string') {
            try { items = JSON.parse(f.items_json); } catch { items = []; }
          }

          let observacionesList: Array<{ code: number; msg: string }> = [];
          if (Array.isArray(f.afip_observaciones)) {
            observacionesList = f.afip_observaciones;
          } else if (typeof f.afip_observaciones === 'string') {
            try { observacionesList = JSON.parse(f.afip_observaciones); } catch { observacionesList = []; }
          }

          let emisorObj: Record<string, string> | undefined = undefined;
          if (f.arca_emisor && typeof f.arca_emisor === 'object') {
            emisorObj = f.arca_emisor;
          } else if (typeof f.arca_emisor === 'string') {
            try { emisorObj = JSON.parse(f.arca_emisor); } catch { emisorObj = undefined; }
          }

          const rawFiscalStatus = String(f.fiscal_status || '').toLowerCase();
          const estado: Factura['estado'] = tipoComprobante.toLowerCase().includes('nota') || rawFiscalStatus === 'credited'
            ? 'nota_credito'
            : rawFiscalStatus === 'observed'
              ? 'observado'
            : rawFiscalStatus === 'authorized'
              ? 'autorizado'
            : rawFiscalStatus === 'uncertain'
              ? 'incierto'
            : rawFiscalStatus === 'rejected'
              ? 'rechazado'
            : (f.estado as Factura['estado']) || (f.afip_cae || f.cae ? 'autorizado' : 'borrador');

          return {
            id_factura: String(f.id_factura),
            id_pedido: f.id_pedido ? Number(f.id_pedido) : undefined,
            nro_ticket: String(f.numero_factura || f.nro_ticket || f.id_factura),
            cliente: f.cliente_nombre || f.cliente || (f.cuit_cliente ? `Cliente ${f.cuit_cliente}` : 'Consumidor Final'),
            cuit: String(f.cuit_cliente || f.cuit || ''),
            total,
            iva_veintiuno: Number(iva.toFixed(2)),
            medio_pago: mapMetodoPagoFromDb(f.metodo_pago),
            fecha: new Date(f.fecha_emision || f.fecha || Date.now()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
            estado,
            tipo,
            afip_cae: f.cae || f.afip_cae || undefined,
            afip_vto: f.vencimiento_cae || f.afip_vto || undefined,
            afip_qr: f.afip_qr || undefined,
            afip_resultado: f.afip_resultado || undefined,
            arca_emission_id: f.arca_emission_id || undefined,
            afip_cbte_tipo: f.afip_cbte_tipo ? Number(f.afip_cbte_tipo) : undefined,
            afip_pto_vta: f.afip_pto_vta ? Number(f.afip_pto_vta) : undefined,
            afip_cbte_nro: f.afip_cbte_nro ? Number(f.afip_cbte_nro) : undefined,
            afip_observaciones: observacionesList,
            arca_emisor: emisorObj,
            condicion_iva_receptor: Number(f.condicion_iva_receptor) || 5,
            fecha_completa: f.fecha_emision || f.fecha || undefined,
            cliente_domicilio: f.cliente_domicilio || undefined,
            documento_tipo_receptor: Number(f.documento_tipo_receptor) || (f.cuit_cliente ? 80 : 99),
            items,
            moneda: 'PES' as const,
            observaciones: f.observaciones || undefined,
            comprobante_asociado: f.comprobante_asociado || undefined,
            credited_by_factura_id: f.credited_by_factura_id || undefined,
          };
        });

        // Google Sheets es la única fuente de verdad autoritativa para comprobantes persistidos.
        // Si el usuario eliminó comprobantes en Google Sheets, deben desaparecer también de la app.
        // Solo conservamos comprobantes de 'local' que hayan sido creados en los últimos 2 minutos
        // y que aún no estén en 'remote' (en tránsito o pendientes inmediatos de subida).
        const remoteIds = new Set(remote.map(r => String(r.id_factura)));
        const recentThreshold = Date.now() - 2 * 60 * 1000;

        const inFlightLocal = local.filter(loc => {
          if (remoteIds.has(String(loc.id_factura))) return false;
          let timestamp = 0;
          if (loc.fecha_completa) {
            const t = new Date(loc.fecha_completa).getTime();
            if (!isNaN(t)) timestamp = t;
          }
          if (!timestamp && loc.id_factura && loc.id_factura.startsWith('fac_')) {
            const parsedTs = parseInt(loc.id_factura.replace('fac_', ''), 10);
            if (!isNaN(parsedTs)) timestamp = parsedTs;
          }
          return timestamp > recentThreshold;
        });

        const synchronized = mergeFacturas(remote, inFlightLocal);
        writeLocalFacturas(synchronized);
        return synchronized;
      }
    } catch (sheetErr) {
      console.warn('[facturacionService.list] Fallback a cache local:', sheetErr);
    }
    return local;
  },

  async create(factura: Factura): Promise<Factura> {
    cacheFacturaLocally(factura);
    const dbPayload = toDbFacturaPayload(factura);

    try {
      await sheetUpsertRow('facturas', dbPayload);
    } catch (sheetErr) {
      console.warn('[facturacionService.create] Error al guardar factura en Google Sheets:', sheetErr);
    }

    return factura;
  },

  async upsert(facturas: Factura[]): Promise<void> {
    writeLocalFacturas(mergeFacturas([], [...facturas, ...readLocalFacturas()]));
    for (const f of facturas) {
      try {
        await sheetUpsertRow('facturas', toDbFacturaPayload(f));
      } catch (sheetErr) {
        console.warn('[facturacionService.upsert] Error al sincronizar facturas en Google Sheets:', sheetErr);
      }
    }
  },

  async markNotaCredito(id: string, creditNoteId: string): Promise<void> {
    const currentLocal = readLocalFacturas();
    const updated = currentLocal.map(factura => (
      factura.id_factura === id
        ? { ...factura, estado: 'nota_credito' as const, credited_by_factura_id: creditNoteId }
        : factura
    ));
    writeLocalFacturas(updated);

    const target = updated.find(f => f.id_factura === id);
    if (target) {
      try {
        await sheetUpsertRow('facturas', toDbFacturaPayload(target));
      } catch (err) {
        console.warn('[facturacionService.markNotaCredito] Error al actualizar nota de crédito en Google Sheets:', err);
      }
    }
  },

  async remove(id: string): Promise<boolean> {
    const local = readLocalFacturas();
    const localInvoice = local.find(factura => factura.id_factura === id);
    if (localInvoice && !canDeleteFactura(localInvoice)) {
      throw new Error('Un comprobante fiscal autorizado no se elimina. Debe anularse mediante una Nota de Credito C.');
    }

    try {
      const sheetData = await sheetFetchTable('facturas');
      const remote = sheetData?.find((f: any) => String(f.id_factura) === String(id));
      if (remote) {
        const isFiscal = remote.cae || remote.afip_cae || ['authorized', 'observed', 'credited'].includes(remote.fiscal_status);
        if (isFiscal) {
          throw new Error('Un comprobante fiscal autorizado no se elimina. Debe anularse mediante una Nota de Credito C.');
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Nota de Credito')) {
        throw err;
      }
      console.warn('[facturacionService.remove] Verificación de factura en Sheets omitida:', err);
    }

    try {
      await sheetDeleteRow('facturas', id);
    } catch (sheetErr) {
      console.warn('[facturacionService.remove] Error al eliminar factura de Google Sheets:', sheetErr);
    }

    writeLocalFacturas(local.filter(factura => factura.id_factura !== id));
    return true;
  }
};

export const canDeleteFactura = (factura: Pick<Factura, 'estado' | 'afip_cae'>): boolean => (
  !factura.afip_cae && !['autorizado', 'observado', 'nota_credito'].includes(factura.estado)
);
