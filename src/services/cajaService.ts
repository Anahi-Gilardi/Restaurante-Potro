import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { CierreCaja, MovimientoCajaChica } from '../types';

const inferFechaApertura = (idCierre: string) => {
  const timestamp = Number(idCierre.replace('cie_', ''));
  if (Number.isFinite(timestamp)) {
    return new Date(timestamp).toISOString().replace('T', ' ').slice(0, 19);
  }
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
};

export const cajaService = {
  getOpenSession(): CierreCaja | null {
    const raw = localStorage.getItem('el_patron_caja_activa');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  },

  async list(): Promise<CierreCaja[]> {
    const supabase = getActiveSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('cierres_caja')
        .select('*')
        .order('id_cierre', { ascending: false });
        
      if (error) {
        console.warn('Database fetching error, reading localStorage backup:', error);
        throw error;
      }
      
      return (data || []).map(cc => ({
        id_cierre: cc.id_cierre,
        fecha_apertura: cc.fecha_apertura || inferFechaApertura(cc.id_cierre),
        fecha_cierre: cc.fecha_cierre,
        monto_apertura: parseFloat(cc.monto_apertura),
        monto_ventas: parseFloat(cc.monto_ventas),
        monto_real: cc.monto_real ? parseFloat(cc.monto_real) : null,
        diferencia: cc.diferencia ? parseFloat(cc.diferencia) : null,
        observaciones: cc.observaciones || '',
        usuario_cajero: cc.usuario_cajero || 'Cajero Pro'
      }));
    } catch {
      // Offline fallback lists historical records
      const raw = localStorage.getItem('el_patron_historial_cierres');
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      }
      // Populate clean default historical cierres
      const defaults: CierreCaja[] = [
        {
          id_cierre: 'cie_901',
          fecha_apertura: '2026-06-11 08:00',
          fecha_cierre: '2026-06-11 16:00',
          monto_apertura: 40000,
          monto_ventas: 185000,
          monto_real: 225000,
          diferencia: 0,
          observaciones: 'Arqueo vespertino cuadrado sin novedades',
          usuario_cajero: 'Clara Scaglia'
        },
        {
          id_cierre: 'cie_902',
          fecha_apertura: '2026-06-11 16:30',
          fecha_cierre: '2026-06-11 23:55',
          monto_apertura: 50000,
          monto_ventas: 342000,
          monto_real: 341500,
          diferencia: -500,
          observaciones: 'Faltante minimo de caja chica por cambio',
          usuario_cajero: 'Mariano Closs'
        }
      ];
      localStorage.setItem('el_patron_historial_cierres', JSON.stringify(defaults));
      return defaults;
    }
  },

  async getOpenSessionRemote(idCierre: string): Promise<Partial<CierreCaja> | null> {
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase
        .from('cierres_caja')
        .select('*')
        .eq('id_cierre', idCierre)
        .single();
      if (error) throw error;
      if (data) {
        return {
          monto_ventas: parseFloat(data.monto_ventas),
          monto_apertura: parseFloat(data.monto_apertura),
          observaciones: data.observaciones,
          usuario_cajero: data.usuario_cajero,
          fecha_cierre: data.fecha_cierre
        };
      }
    } catch (err) {
      console.warn('Could not fetch active session from Supabase:', err);
    }
    return null;
  },

  async open(montoApertura: number, cajero: string): Promise<CierreCaja> {
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
      registros_totales: {
        efectivo: 0,
        debito: 0,
        credito: 0,
        transferencia: 0,
        mercadopago: 0
      }
    };

    localStorage.setItem('el_patron_caja_activa', JSON.stringify(session));

    // Run remote persistence and predictions asynchronously in the background to prevent UI blockages/freezes
    (async () => {
      // Try Supabase push
      try {
        const supabase = getActiveSupabaseClient();
        await supabase.from('cierres_caja').insert([{
          id_cierre: session.id_cierre,
          monto_apertura: session.monto_apertura,
          observaciones: session.observaciones,
          monto_ventas: 0,
          usuario_cajero: session.usuario_cajero
        }]);
      } catch (err) {
        console.warn('Could not persist closure open on remote DB (offline mode active):', err);
      }

      // Run prediction algorithm on open and log results to audit system
      try {
        const { prediccionService } = await import('./prediccionService');
        const { auditoriaService } = await import('./auditoriaService');
        const alertas = await prediccionService.generarAlertasDemanda();
        const logsToInsert = alertas.map(al => ({
          id: al.id,
          tipo: 'alerta_stock' as const,
          mensaje: al.mensaje,
          timestamp: new Date()
        }));
        if (logsToInsert.length > 0) {
          await auditoriaService.upsert(logsToInsert);
        }
      } catch (err) {
        console.error('Background prediction service / logger failed on shift open:', err);
      }
    })();

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

    localStorage.setItem('el_patron_caja_activa', JSON.stringify(active));

    // Try live update if possible
    try {
      const supabase = getActiveSupabaseClient();
      await supabase
        .from('cierres_caja')
        .update({ monto_ventas: active.monto_ventas })
        .eq('id_cierre', active.id_cierre);
    } catch {
      // safe offline pass
    }
  },

  async addMovimientoCajaChica(mov: MovimientoCajaChica): Promise<void> {
    const active = this.getOpenSession();
    if (!active || active.id_cierre !== mov.id_cierre) return;

    if (!active.movimientos_manuales) {
      active.movimientos_manuales = [];
    }
    active.movimientos_manuales.push(mov);
    localStorage.setItem('el_patron_caja_activa', JSON.stringify(active));

    try {
      const supabase = getActiveSupabaseClient();
      await supabase.from('movimientos_caja_chica').insert([{
        id_movimiento: mov.id_movimiento,
        id_cierre: mov.id_cierre,
        tipo: mov.tipo,
        monto: mov.monto,
        concepto: mov.concepto,
        fecha: mov.fecha
      }]);
    } catch (err) {
      console.warn('Could not persist petty cash movement on remote DB:', err);
    }
  },

  async listMovimientosCajaChica(idCierre: string): Promise<MovimientoCajaChica[]> {
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase
        .from('movimientos_caja_chica')
        .select('*')
        .eq('id_cierre', idCierre)
        .order('fecha', { ascending: true });
      if (error) throw error;
      return (data || []).map(m => ({
        id_movimiento: m.id_movimiento,
        id_cierre: m.id_cierre,
        tipo: m.tipo as 'ingreso' | 'egreso',
        monto: parseFloat(m.monto),
        concepto: m.concepto,
        fecha: m.fecha
      }));
    } catch {
      // Offline fallback
      const active = this.getOpenSession();
      if (active && active.id_cierre === idCierre) {
        return active.movimientos_manuales || [];
      }
      return [];
    }
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
      movimientos_manuales: movsList
    };

    // Remove active and add to history
    localStorage.removeItem('el_patron_caja_activa');

    const raw = localStorage.getItem('el_patron_historial_cierres');
    let history: CierreCaja[] = [];
    if (raw) {
      try {
        history = JSON.parse(raw);
      } catch {
        // safe fallback
      }
    }
    const updatedHistory = [closed, ...history.filter(h => h.id_cierre !== closed.id_cierre)];
    localStorage.setItem('el_patron_historial_cierres', JSON.stringify(updatedHistory));

    // Persist closed session in database
    try {
      const supabase = getActiveSupabaseClient();
      await supabase
        .from('cierres_caja')
        .upsert([{
          id_cierre: closed.id_cierre,
          fecha_cierre: closed.fecha_cierre,
          monto_apertura: closed.monto_apertura,
          monto_ventas: closed.monto_ventas,
          monto_real: closed.monto_real,
          diferencia: closed.diferencia,
          observaciones: closed.observaciones,
          usuario_cajero: closed.usuario_cajero
        }]);
    } catch (err) {
      console.warn('Could not fully persist shift save on remote DB:', err);
    }

    return closed;
  }
};
