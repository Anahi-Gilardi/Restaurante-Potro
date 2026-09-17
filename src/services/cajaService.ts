import { getActiveSupabaseClient, tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';
import { CierreCaja, MovimientoCajaChica } from '../types';
import { aperturaCajaSchema } from '../lib/validations';
import { syncQueueService } from './syncQueueService';

const inferFechaApertura = (idCierre: string) => {
  const timestamp = Number(idCierre.replace('cie_', ''));
  if (Number.isFinite(timestamp)) {
    return new Date(timestamp).toISOString().replace('T', ' ').slice(0, 19);
  }
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
};

const memoryStorage: Record<string, string> = {};
const LEGACY_DEMO_CIERRE_IDS = new Set(['cie_901', 'cie_902']);

const removeLegacyDemoCierres = (cierres: CierreCaja[]) => cierres.filter(cierre => (
  !LEGACY_DEMO_CIERRE_IDS.has(cierre.id_cierre)
));

const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (err: any) {
      memoryStorage[key] = value;
      console.warn(`LocalStorage set failed for key "${key}", using memory storage fallback:`, err);
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      delete memoryStorage[key];
    }
  }
};

const toDbCierre = (cierre: CierreCaja) => ({
  id_cierre: cierre.id_cierre,
  fecha_apertura: cierre.fecha_apertura,
  fecha_cierre: cierre.fecha_cierre,
  monto_apertura: cierre.monto_apertura,
  monto_ventas: cierre.monto_ventas,
  monto_real: cierre.monto_real,
  diferencia: cierre.diferencia,
  observaciones: cierre.observaciones,
  usuario_cajero: cierre.usuario_cajero,
});

export const broadcastAppEvent = (event: string, payload: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`el_patron_${event}`, { detail: payload }));
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('el_patron_table_sync');
      bc.postMessage({ type: event, payload });
      setTimeout(() => {
        try { bc.close(); } catch {}
      }, 500);
    }
  } catch {}

  try {
    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      const ch = supabase.channel('realtime_pedidos_app');
      ch.send({
        type: 'broadcast',
        event,
        payload
      }).catch?.(() => undefined);
    }
  } catch {}
};

const persistCierre = async (cierre: CierreCaja): Promise<void> => {
  try {
    await sheetUpsertRow('cierres_caja', toDbCierre(cierre));
  } catch (sheetErr) {
    console.warn('[cajaService.persistCierre] Error en Google Sheets:', sheetErr);
  }
};

const persistOrQueueCierre = async (cierre: CierreCaja): Promise<CierreCaja['sync_status']> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    syncQueueService.enqueue('upsert_cierre', toDbCierre(cierre));
    return 'pending';
  }

  try {
    await persistCierre(cierre);
    return 'synced';
  } catch (error) {
    console.warn('El turno de caja quedó pendiente de sincronización:', error);
    syncQueueService.enqueue('upsert_cierre', toDbCierre(cierre));
    return 'pending';
  }
};

export interface CajaAuditSummary {
  facturas_a_revisar: number;
  cierres_a_revisar: number;
}

const safeSetItem = (key: string, value: string): void => {
  try {
    safeStorage.setItem(key, value);
  } catch (err: any) {
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn(`LocalStorage quota exceeded setting key "${key}". Purging non-essential caches...`);
      try {
        safeStorage.removeItem('el_patron_backups_locales');
        safeStorage.removeItem('el_patron_logs');
        
        // Truncate shifts history
        const rawHistory = safeStorage.getItem('el_patron_historial_cierres');
        if (rawHistory) {
          try {
            const parsed = JSON.parse(rawHistory);
            if (Array.isArray(parsed)) {
              safeStorage.setItem('el_patron_historial_cierres', JSON.stringify(parsed.slice(0, 3)));
            }
          } catch {
            safeStorage.removeItem('el_patron_historial_cierres');
          }
        }
        
        // Retry
        safeStorage.setItem(key, value);
      } catch (retryErr) {
        console.warn('LocalStorage still full after partial purge. Falling back to memory storage...');
        memoryStorage[key] = value;
      }
    } else {
      memoryStorage[key] = value;
    }
  }
};

export const cajaService = {
  safeStorage,
  async getAuditSummary(): Promise<CajaAuditSummary | null> {
    try {
      const supabase = getActiveSupabaseClient();
      const [facturasResult, cierresResult] = await Promise.all([
        supabase
          .from('v_conciliacion_facturas')
          .select('*', { count: 'exact', head: true })
          .eq('estado_conciliacion', 'requiere_revision'),
        supabase
          .from('v_cierres_caja_diagnostico')
          .select('*', { count: 'exact', head: true })
          .neq('diagnostico', 'ok'),
      ]);
      if (facturasResult.error || cierresResult.error) {
        console.warn('No se pudo cargar el diagnóstico contable.', facturasResult.error || cierresResult.error);
        return null;
      }
      return {
        facturas_a_revisar: facturasResult.count ?? 0,
        cierres_a_revisar: cierresResult.count ?? 0,
      };
    } catch (error) {
      console.warn('Diagnóstico contable no disponible:', error);
      return null;
    }
  },

  getOpenSession(): CierreCaja | null {
    const raw = safeStorage.getItem('el_patron_caja_activa');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed) {
          return {
            ...parsed,
            monto_apertura: Number(parsed.monto_apertura) || 0,
            monto_ventas: Number(parsed.monto_ventas) || 0,
            monto_real: parsed.monto_real !== null && parsed.monto_real !== undefined ? Number(parsed.monto_real) : null,
            diferencia: parsed.diferencia !== null && parsed.diferencia !== undefined ? Number(parsed.diferencia) : null,
            usuario_cajero: parsed.usuario_cajero || 'Cajero',
            fecha_apertura: parsed.fecha_apertura || new Date().toISOString().replace('T', ' ').slice(0, 19),
            observaciones: parsed.observaciones || 'Sesión Activa - En Turno',
            sync_status: parsed.sync_status === 'synced' ? 'synced' : 'pending',
            registros_totales: parsed.registros_totales ? {
              efectivo: Number(parsed.registros_totales.efectivo) || 0,
              debito: Number(parsed.registros_totales.debito) || 0,
              credito: Number(parsed.registros_totales.credito) || 0,
              transferencia: Number(parsed.registros_totales.transferencia) || 0,
              mercadopago: Number(parsed.registros_totales.mercadopago) || 0
            } : {
              efectivo: 0,
              debito: 0,
              credito: 0,
              transferencia: 0,
              mercadopago: 0
            }
          };
        }
      } catch {
        return null;
      }
    }
    return null;
  },

  async list(): Promise<CierreCaja[]> {
    try {
      const sheetData = await sheetFetchTable('cierres_caja');
      if (sheetData && sheetData.length > 0) {
        return sheetData.map(cc => ({
          id_cierre: String(cc.id_cierre),
          fecha_apertura: cc.fecha_apertura || inferFechaApertura(String(cc.id_cierre)),
          fecha_cierre: cc.fecha_cierre || null,
          monto_apertura: parseFloat(cc.monto_apertura || 0),
          monto_ventas: parseFloat(cc.monto_ventas || 0),
          monto_real: cc.monto_real ? parseFloat(cc.monto_real) : null,
          diferencia: cc.diferencia ? parseFloat(cc.diferencia) : null,
          observaciones: cc.observaciones || '',
          usuario_cajero: cc.usuario_cajero || 'Cajero Pro',
          sync_status: 'synced'
        }));
      }
    } catch (sheetErr) {
      console.warn('[cajaService.listHistory] Google Sheets:', sheetErr);
    }

    // Offline fallback lists historical records
    const raw = safeStorage.getItem('el_patron_historial_cierres');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const sanitized = removeLegacyDemoCierres(parsed);
        if (sanitized.length !== parsed.length) {
          safeStorage.setItem('el_patron_historial_cierres', JSON.stringify(sanitized));
        }
        return sanitized;
      } catch {
        return [];
      }
    }
    return [];
  },

  async findActiveSessionRemote(): Promise<CierreCaja | null> {
    try {
      const lastClosedId = safeStorage.getItem('el_patron_ultimo_cierre_cerrado_id');
      const rawHistory = safeStorage.getItem('el_patron_historial_cierres');
      const closedIds = new Set<string>();
      if (lastClosedId) closedIds.add(lastClosedId);
      if (rawHistory) {
        try {
          const parsedHistory = JSON.parse(rawHistory);
          if (Array.isArray(parsedHistory)) {
            parsedHistory.forEach((h: any) => {
              if (h.id_cierre && h.fecha_cierre) closedIds.add(String(h.id_cierre));
            });
          }
        } catch {}
      }

      const sheetData = await sheetFetchTable('cierres_caja');
      if (sheetData && Array.isArray(sheetData) && sheetData.length > 0) {
        // Ordenar del más reciente al más antiguo
        const sorted = [...sheetData].sort((a, b) => {
          const tA = Number(String(a.id_cierre || '').replace(/\D/g, '')) || new Date(a.fecha_apertura || 0).getTime();
          const tB = Number(String(b.id_cierre || '').replace(/\D/g, '')) || new Date(b.fecha_apertura || 0).getTime();
          return tB - tA;
        });

        // REGLA FUNDAMENTAL: Solo el turno MÁS RECIENTE del restaurante puede estar activo.
        // Si el más reciente ya fue cerrado (o fue cerrado en este terminal), NO HAY caja abierta.
        const latest = sorted[0];
        if (!latest) return null;

        const hasFechaCierre = Boolean(
          latest.fecha_cierre && 
          String(latest.fecha_cierre).trim() !== '' && 
          String(latest.fecha_cierre) !== 'null'
        );

        if (hasFechaCierre) {
          return null;
        }

        if (closedIds.has(String(latest.id_cierre))) {
          return null;
        }

        // Si la apertura tiene más de 24 horas y quedó huérfana, ignorar
        if (latest.fecha_apertura) {
          const openedAt = new Date(latest.fecha_apertura).getTime();
          if (!isNaN(openedAt) && (Date.now() - openedAt > 24 * 3600 * 1000)) {
            return null;
          }
        }

        let regTotales = { efectivo: 0, debito: 0, credito: 0, transferencia: 0, mercadopago: 0 };
        if (latest.registros_totales) {
          try {
            regTotales = typeof latest.registros_totales === 'string'
              ? JSON.parse(latest.registros_totales)
              : latest.registros_totales;
          } catch {}
        }

        const session: CierreCaja = {
          id_cierre: String(latest.id_cierre),
          fecha_apertura: latest.fecha_apertura || inferFechaApertura(String(latest.id_cierre)),
          fecha_cierre: null,
          monto_apertura: parseFloat(latest.monto_apertura || 0),
          monto_ventas: parseFloat(latest.monto_ventas || 0),
          monto_real: null,
          diferencia: null,
          observaciones: latest.observaciones || 'Sesión Activa - En Turno',
          usuario_cajero: latest.usuario_cajero || 'Cajero Pro',
          sync_status: 'synced',
          registros_totales: regTotales
        };
        return session;
      }
    } catch (err) {
      console.warn('[cajaService.findActiveSessionRemote] Error:', err);
    }
    return null;
  },

  async getOpenSessionRemote(idCierre: string): Promise<Partial<CierreCaja> | null> {
    try {
      const sheetData = await sheetFetchTable('cierres_caja');
      if (sheetData && Array.isArray(sheetData)) {
        const found = sheetData.find(cc => String(cc.id_cierre) === String(idCierre));
        if (found) {
          return {
            id_cierre: String(found.id_cierre),
            monto_ventas: parseFloat(found.monto_ventas || 0),
            monto_apertura: parseFloat(found.monto_apertura || 0),
            observaciones: found.observaciones,
            usuario_cajero: found.usuario_cajero,
            fecha_cierre: found.fecha_cierre || null,
            fecha_apertura: found.fecha_apertura
          };
        }
      }
    } catch (err) {
      console.warn('[cajaService.getOpenSessionRemote] Error:', err);
    }
    return null;
  },

  async open(montoApertura: number, cajero: string): Promise<CierreCaja> {
    aperturaCajaSchema.parse({ monto_apertura: montoApertura, cajero });
    const session: CierreCaja = {
      id_cierre: `cie_${Date.now()}`,
      fecha_apertura: new Date().toISOString().replace('T', ' ').slice(0, 19),
      fecha_cierre: null,
      monto_apertura: montoApertura,
      monto_ventas: 0,
      monto_real: null,
      diferencia: null,
      observaciones: 'Sesión Activa - En Turno',
      usuario_cajero: cajero,
      sync_status: 'synced',
      registros_totales: {
        efectivo: 0,
        debito: 0,
        credito: 0,
        transferencia: 0,
        mercadopago: 0
      }
    };

    // Limpiar cualquier bandera de cierre anterior en este terminal
    safeStorage.removeItem('el_patron_ultimo_cierre_cerrado_id');

    // Guardar inmediatamente en almacenamiento local (0ms de latencia)
    safeSetItem('el_patron_caja_activa', JSON.stringify(session));

    // Notificar a otras pestañas y a otras computadoras en tiempo real
    broadcastAppEvent('caja_abierta', session);

    // Persistir en Google Sheets en segundo plano sin congelar la interfaz
    persistCierre(session).catch(err => {
      console.warn('Persistencia de apertura en segundo plano:', err);
    });

    return session;
  },

  async updateSales(salesIncrement: number, paymentMethodSales: { [method: string]: number }): Promise<void> {
    const active = this.getOpenSession();
    if (!active) return;

    active.monto_ventas += salesIncrement;
    if (active.registros_totales) {
      active.registros_totales.efectivo += paymentMethodSales.efectivo || 0;
      active.registros_totales.debito += paymentMethodSales.debito || 0;
      active.registros_totales.credito += paymentMethodSales.credito || 0;
      active.registros_totales.transferencia += paymentMethodSales.transferencia || 0;
      active.registros_totales.mercadopago += paymentMethodSales.mercadopago || 0;
    } else {
      active.registros_totales = {
        efectivo: paymentMethodSales.efectivo || 0,
        debito: paymentMethodSales.debito || 0,
        credito: paymentMethodSales.credito || 0,
        transferencia: paymentMethodSales.transferencia || 0,
        mercadopago: paymentMethodSales.mercadopago || 0
      };
    }

    // Actualizar inmediatamente en memoria / disco local (0ms)
    active.sync_status = 'synced';
    safeSetItem('el_patron_caja_activa', JSON.stringify(active));

    // Persistir cierre actualizado en Google Sheets en segundo plano sin congelar la interfaz
    persistCierre(active).catch(err => {
      console.warn('[cajaService.updateSales] Sincronización diferida en segundo plano:', err);
    });
  },

  // Helper de sincronización para compatibilidad y encolado
  async syncShiftRemote(cierre: CierreCaja): Promise<void> {
    try {
      cierre.sync_status = await persistOrQueueCierre(cierre);
    } catch (error) {
      if (error) throw error;
    }
  },

  async addMovimientoCajaChica(mov: MovimientoCajaChica): Promise<void> {
    const active = this.getOpenSession();
    if (!active || active.id_cierre !== mov.id_cierre) return;

    if (!active.movimientos_manuales) {
      active.movimientos_manuales = [];
    }
    active.movimientos_manuales.push(mov);
    safeSetItem('el_patron_caja_activa', JSON.stringify(active));

    try {
      await sheetUpsertRow('caja_ledger', {
        id_ledger: mov.id_movimiento,
        id_cierre: mov.id_cierre,
        tipo: mov.tipo,
        monto: mov.monto,
        concepto: mov.concepto,
        fecha: mov.fecha
      });
    } catch (sheetErr) {
      console.warn('[cajaService.addMovimientoCajaChica] Google Sheets:', sheetErr);
    }
  },

  async listMovimientosCajaChica(idCierre: string): Promise<MovimientoCajaChica[]> {
    try {
      const sheetData = await sheetFetchTable('caja_ledger');
      if (sheetData && sheetData.length > 0) {
        const filtered = sheetData.filter((m: any) => String(m.id_cierre) === String(idCierre));
        if (filtered.length > 0) {
          return filtered.map((m: any) => ({
            id_movimiento: String(m.id_ledger || m.id_movimiento),
            id_cierre: String(m.id_cierre),
            tipo: m.tipo as 'ingreso' | 'egreso',
            monto: Number(m.monto || 0),
            concepto: String(m.concepto || ''),
            fecha: String(m.fecha || '')
          }));
        }
      }
    } catch (sheetErr) {
      console.warn('[cajaService.listMovimientosCajaChica] Google Sheets:', sheetErr);
    }

    const active = this.getOpenSession();
    if (active && active.id_cierre === idCierre) {
      return active.movimientos_manuales || [];
    }
    return [];
  },

  async close(montoReal: number, observaciones: string, movimientos?: MovimientoCajaChica[]): Promise<CierreCaja> {
    const active = this.getOpenSession();
    if (!active) {
      throw new Error('No hay una sesión de caja abierta activa.');
    }

    const totalVentas = active.monto_ventas;
    const movsList = movimientos || active.movimientos_manuales || [];
    const sumIngresos = movsList.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const sumEgresos = movsList.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
    const esperado = active.monto_apertura + totalVentas + sumIngresos - sumEgresos;
    const diferencia = montoReal - esperado;
    
    const closed: CierreCaja = {
      ...active,
      fecha_cierre: new Date().toISOString().replace('T', ' ').slice(0, 19),
      monto_real: montoReal,
      diferencia: diferencia,
      observaciones: observaciones || 'Cierre de Caja Normal',
      movimientos_manuales: movsList,
      sync_status: 'synced'
    };

    const raw = safeStorage.getItem('el_patron_historial_cierres');
    let history: CierreCaja[] = [];
    if (raw) {
      try {
        history = JSON.parse(raw);
      } catch {
        // safe fallback
      }
    }
    const updatedHistory = [closed, ...history.filter(h => h.id_cierre !== closed.id_cierre)];
    safeSetItem('el_patron_historial_cierres', JSON.stringify(updatedHistory));

    // Marcar como cerrado explícitamente para impedir que findActiveSessionRemote lo reviva
    safeStorage.setItem('el_patron_ultimo_cierre_cerrado_id', closed.id_cierre);
    safeStorage.removeItem('el_patron_caja_activa');

    // Notificar a otras pestañas y computadoras en tiempo real
    broadcastAppEvent('caja_cerrada', { id_cierre: closed.id_cierre });

    // Persistir en Google Sheets en segundo plano sin congelar la pantalla ni demorar el arqueo
    persistCierre(closed).catch(sheetErr => {
      console.warn('[cajaService.close] Persistencia remota diferida:', sheetErr);
    });

    return closed;
  }
};
