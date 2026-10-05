/**
 * src/services/ventasPlatosService.ts
 *
 * Servicio para registrar cada plato vendido y calcular estadísticas
 * (Top 5 semanal, mensual, por día y por categoría) vinculado con Google Sheets (hoja 'ventas_platos').
 */

import { sheetFetchTable, sheetBatchInsert, sheetUpsertRow } from '../lib/googleSheetsClient';
import { getArgentinaDateTimeString } from '../lib/argentinaDate';

export interface VentaPlatoRow {
  id_registro: string;
  fecha: string;
  dia_semana: string;
  numero_mesa: string | number;
  nombre_plato: string;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  cajero_mozo: string;
}

export interface RankingItem {
  nombre: string;
  categoria: string;
  cantidad: number;
  totalVendido: number;
  porcentaje: number;
  precioPromedio: number;
}

export interface RankingResult {
  periodo: 'hoy' | 'semana' | 'mes' | 'historico';
  fechaInicio: string;
  fechaFin: string;
  totalPorciones: number;
  totalFacturado: number;
  top5: RankingItem[];
  todos: RankingItem[];
  porDiaSemana: Record<string, Record<string, number>>; // { 'Lunes': { 'Locro': 2, ... } }
  porCategoria: Record<string, { cantidad: number; total: number }>;
}

const LOCAL_STORAGE_KEY = 'el_patron_ventas_platos';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const getDiaSemanaArgentina = (date: Date = new Date()): string => {
  return DIAS_SEMANA[date.getDay()] || 'Lunes';
};

const getStartOfWeek = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStartOfMonth = (d: Date): Date => {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
};

const parseRowDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  // Formato argentino: DD/MM/YYYY HH:mm o ISO
  if (dateStr.includes('/')) {
    const parts = dateStr.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      let hour = 0;
      let minute = 0;
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        hour = parseInt(timeParts[0], 10) || 0;
        minute = parseInt(timeParts[1], 10) || 0;
      }
      return new Date(year, month, day, hour, minute);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const ventasPlatosService = {
  getLocalCache(): VentaPlatoRow[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setLocalCache(items: VentaPlatoRow[]): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  },

  async list(forceFresh = false): Promise<VentaPlatoRow[]> {
    const local = this.getLocalCache();
    try {
      const sheetData = await sheetFetchTable('ventas_platos', forceFresh);
      if (sheetData && Array.isArray(sheetData) && sheetData.length > 0) {
        const mapped: VentaPlatoRow[] = sheetData.map(r => ({
          id_registro: String(r.id_registro || `vp_${Date.now()}_${Math.random()}`),
          fecha: String(r.fecha || ''),
          dia_semana: String(r.dia_semana || ''),
          numero_mesa: r.numero_mesa || r.mesa || '',
          nombre_plato: String(r.nombre_plato || r.plato || r.descripcion || ''),
          categoria: String(r.categoria || 'General'),
          cantidad: Number(r.cantidad) || 1,
          precio_unitario: Number(r.precio_unitario || r.precio) || 0,
          subtotal: Number(r.subtotal) || ((Number(r.cantidad) || 1) * (Number(r.precio_unitario) || 0)),
          cajero_mozo: String(r.cajero_mozo || r.cajero || r.mozo || '')
        }));

        // Combinar datos locales y remotos por id_registro
        const map = new Map<string, VentaPlatoRow>();
        local.forEach(item => map.set(item.id_registro, item));
        mapped.forEach(item => map.set(item.id_registro, item));
        const merged = Array.from(map.values());
        this.setLocalCache(merged);
        return merged;
      }
    } catch (err) {
      console.warn('[ventasPlatosService.list] Fallback a caché local:', err);
    }
    return local;
  },

  async recordSaleItems(
    items: Array<{
      id_producto?: string;
      nombre?: string;
      descripcion?: string;
      cantidad: number;
      precio_unitario?: number;
      subtotal?: number;
      categoria?: string;
    }>,
    metadata: {
      numeroMesa: string | number;
      mozo?: string;
      cajero?: string;
      fecha?: Date | number | string;
    }
  ): Promise<VentaPlatoRow[]> {
    if (!items || items.length === 0) return [];

    const saleDate = metadata.fecha ? new Date(metadata.fecha) : new Date();
    const fechaStr = getArgentinaDateTimeString(saleDate);
    const diaSemanaStr = getDiaSemanaArgentina(saleDate);
    const timestamp = Date.now();
    const cajeroMozo = metadata.cajero || metadata.mozo || 'Cajero';

    const rows: VentaPlatoRow[] = items.map((it, idx) => {
      const qty = Number(it.cantidad) || 1;
      const unit = Number(it.precio_unitario) || 0;
      const sub = Number(it.subtotal) || (qty * unit);
      const name = it.nombre || it.descripcion || 'Plato';
      const cat = it.categoria || 'General';

      return {
        id_registro: `vp_${timestamp}_${idx}`,
        fecha: fechaStr,
        dia_semana: diaSemanaStr,
        numero_mesa: metadata.numeroMesa,
        nombre_plato: name,
        categoria: cat,
        cantidad: qty,
        precio_unitario: unit,
        subtotal: sub,
        cajero_mozo: cajeroMozo
      };
    });

    // Guardar inmediatamente en caché local
    const current = this.getLocalCache();
    const updated = [...rows, ...current];
    this.setLocalCache(updated);

    // Enviar a Google Sheets en segundo plano sin congelar la app
    (async () => {
      try {
        await sheetBatchInsert('ventas_platos', rows);
      } catch {
        for (const row of rows) {
          try {
            await sheetUpsertRow('ventas_platos', row);
          } catch {}
        }
      }
    })().catch(err => {
      console.warn('[ventasPlatosService.recordSaleItems] Error de persistencia en Sheets:', err);
    });

    return rows;
  },

  calculateRanking(
    ventas: VentaPlatoRow[],
    periodo: 'hoy' | 'semana' | 'mes' | 'historico' = 'mes'
  ): RankingResult {
    const now = new Date();
    let startFilter: Date | null = null;
    let endFilter: Date | null = new Date();

    if (periodo === 'hoy') {
      startFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (periodo === 'semana') {
      startFilter = getStartOfWeek(now);
    } else if (periodo === 'mes') {
      startFilter = getStartOfMonth(now);
    }

    const filtered = ventas.filter(row => {
      if (!startFilter) return true;
      const rowDate = parseRowDate(row.fecha);
      if (!rowDate) return true; // Si no parsea, conservamos
      return rowDate >= startFilter && rowDate <= (endFilter || now);
    });

    // Agrupar por nombre de plato
    const grouped = new Map<string, { categoria: string; cantidad: number; total: number }>();
    const porDiaSemana: Record<string, Record<string, number>> = {
      Lunes: {},
      Martes: {},
      Miércoles: {},
      Jueves: {},
      Viernes: {},
      Sábado: {},
      Domingo: {}
    };
    const porCategoria: Record<string, { cantidad: number; total: number }> = {};

    let totalPorciones = 0;
    let totalFacturado = 0;

    filtered.forEach(row => {
      const name = (row.nombre_plato || 'Sin Nombre').trim();
      const qty = Number(row.cantidad) || 0;
      const sub = Number(row.subtotal) || 0;
      const cat = (row.categoria || 'General').trim();
      const dia = (row.dia_semana || 'Lunes').trim();

      totalPorciones += qty;
      totalFacturado += sub;

      // Por plato
      const prev = grouped.get(name) || { categoria: cat, cantidad: 0, total: 0 };
      grouped.set(name, {
        categoria: cat || prev.categoria,
        cantidad: prev.cantidad + qty,
        total: prev.total + sub
      });

      // Por dia semana
      if (porDiaSemana[dia]) {
        porDiaSemana[dia][name] = (porDiaSemana[dia][name] || 0) + qty;
      }

      // Por categoria
      if (!porCategoria[cat]) {
        porCategoria[cat] = { cantidad: 0, total: 0 };
      }
      porCategoria[cat].cantidad += qty;
      porCategoria[cat].total += sub;
    });

    const items: RankingItem[] = Array.from(grouped.entries()).map(([nombre, data]) => {
      const pct = totalPorciones > 0 ? (data.cantidad / totalPorciones) * 100 : 0;
      const avgPrice = data.cantidad > 0 ? data.total / data.cantidad : 0;
      return {
        nombre,
        categoria: data.categoria,
        cantidad: data.cantidad,
        totalVendido: data.total,
        porcentaje: Math.round(pct * 10) / 10,
        precioPromedio: Math.round(avgPrice)
      };
    });

    // Ordenar de mayor a menor cantidad vendida
    items.sort((a, b) => b.cantidad - a.cantidad || b.totalVendido - a.totalVendido);

    const top5 = items.slice(0, 5);

    return {
      periodo,
      fechaInicio: startFilter ? startFilter.toLocaleDateString('es-AR') : 'Inicio',
      fechaFin: now.toLocaleDateString('es-AR'),
      totalPorciones,
      totalFacturado,
      top5,
      todos: items,
      porDiaSemana,
      porCategoria
    };
  }
};
