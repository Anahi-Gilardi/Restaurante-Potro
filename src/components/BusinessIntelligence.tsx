import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Activity, 
  Clock, 
  Compass, 
  HelpCircle, 
  Tag, 
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  DollarSign,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { ProductoMenu, EventoLog, Pedido, Insumo, RecetaEscandallo, Merma } from '../types';
import { insumosService } from '../services/insumosService';

interface BusinessIntelligenceProps {
  productosMenu: ProductoMenu[];
  logs: EventoLog[];
  pedidos: Pedido[];
  precioMap: Map<string, number>;
  insumos: Insumo[];
  recetas: RecetaEscandallo[];
  mermas: Merma[];
}

export default function BusinessIntelligence({ 
  productosMenu, 
  logs, 
  pedidos, 
  precioMap, 
  insumos,
  recetas,
  mermas
}: BusinessIntelligenceProps) {
  const [logFilter, setLogFilter] = useState<'todo' | 'pedidos' | 'stock' | 'alertas'>('todo');
  const [logSearch, setLogSearch] = useState('');
  const [historialCostos, setHistorialCostos] = useState<any[]>([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>('todos');
  
  // Filtro Temporal Global
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');

  useEffect(() => {
    insumosService.getHistory().then(data => {
      setHistorialCostos(data || []);
    }).catch(err => console.error('Error loading cost history in BI:', err));
  }, []);

  // 1. Filtrado Temporal Global
  const filteredPedidos = useMemo(() => {
    return pedidos.filter(p => {
      const date = new Date(p.fecha_hora);
      if (fechaInicio) {
        const start = new Date(fechaInicio + 'T00:00:00');
        if (date < start) return false;
      }
      if (fechaFin) {
        const end = new Date(fechaFin + 'T23:59:59');
        if (date > end) return false;
      }
      return true;
    });
  }, [pedidos, fechaInicio, fechaFin]);

  const filteredMermas = useMemo(() => {
    return mermas.filter(m => {
      const date = new Date(m.fecha);
      if (fechaInicio) {
        const start = new Date(fechaInicio + 'T00:00:00');
        if (date < start) return false;
      }
      if (fechaFin) {
        const end = new Date(fechaFin + 'T23:59:59');
        if (date > end) return false;
      }
      return true;
    });
  }, [mermas, fechaInicio, fechaFin]);

  // Filter cost history by date range and selected insumo
  const filteredHistorialCostos = useMemo(() => {
    return historialCostos.filter(h => {
      const date = new Date(h.fecha);
      if (fechaInicio) {
        const start = new Date(fechaInicio + 'T00:00:00');
        if (date < start) return false;
      }
      if (fechaFin) {
        const end = new Date(fechaFin + 'T23:59:59');
        if (date > end) return false;
      }
      if (selectedInsumoId !== 'todos' && h.id_insumo !== selectedInsumoId) {
        return false;
      }
      return true;
    });
  }, [historialCostos, selectedInsumoId, fechaInicio, fechaFin]);

  // Aggregate inflation / cost updates by supplier
  const proveedoresAudit = useMemo(() => {
    const auditMap = new Map<string, { proveedor: string; updates: number; maxPct: number; insumos: Set<string> }>();

    filteredHistorialCostos.forEach(h => {
      const insumo = insumos.find(i => i.id_insumo === h.id_insumo);
      const prov = insumo?.proveedor || 'Sin Proveedor';
      const pct = h.costo_anterior > 0 ? ((h.costo_nuevo - h.costo_anterior) / h.costo_anterior) * 100 : 100;

      const prev = auditMap.get(prov) ?? { proveedor: prov, updates: 0, maxPct: 0, insumos: new Set<string>() };
      const nextInsumos = new Set(prev.insumos);
      nextInsumos.add(h.nombre_insumo);

      auditMap.set(prov, {
        proveedor: prov,
        updates: prev.updates + 1,
        maxPct: Math.max(prev.maxPct, pct),
        insumos: nextInsumos
      });
    });

    return [...auditMap.values()].sort((a, b) => b.maxPct - a.maxPct);
  }, [filteredHistorialCostos, insumos]);

  // Get data points for the trend chart of the selected insumo
  const trendPoints = useMemo(() => {
    if (selectedInsumoId === 'todos') {
      return [];
    }
    const insumoHistory = filteredHistorialCostos
      .filter(h => h.id_insumo === selectedInsumoId)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    return insumoHistory.map(h => ({
      fecha: new Date(h.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      costo: h.costo_nuevo
    }));
  }, [filteredHistorialCostos, selectedInsumoId]);

  // ── Métricas calculadas desde datos reales ────────────────────────────────

  const pedidosCobrados = useMemo(
    () => filteredPedidos.filter(p => p.estado_comanda === 'entregado_cobrado'),
    [filteredPedidos]
  );

  /** Tiempo promedio de despacho real (en minutos) */
  const tiempoPromedioReal = useMemo(() => {
    const conTiempo = pedidosCobrados.filter(
      p => typeof p.tiempo_despacho_minutos === 'number' && p.tiempo_despacho_minutos > 0
    );
    if (conTiempo.length === 0) return null;
    const avg = conTiempo.reduce((s, p) => s + (p.tiempo_despacho_minutos ?? 0), 0) / conTiempo.length;
    return avg.toFixed(1);
  }, [pedidosCobrados]);

  /** % de pedidos despachados dentro del semáforo verde (≤10 min) */
  const efectividadReal = useMemo(() => {
    const conTiempo = pedidosCobrados.filter(
      p => typeof p.tiempo_despacho_minutos === 'number' && p.tiempo_despacho_minutos > 0
    );
    if (conTiempo.length === 0) return null;
    const enTiempo = conTiempo.filter(p => p.tiempo_despacho_minutos! <= 10).length;
    return ((enTiempo / conTiempo.length) * 100).toFixed(1);
  }, [pedidosCobrados]);

  /** Ranking de platos más vendidos (top 5) con sus ingresos reales */
  const rankingPlatos = useMemo(() => {
    const totales = new Map<string, { nombre: string; cantidad: number; ingresos: number }>();
    pedidosCobrados.forEach(p => {
      p.items.forEach(item => {
        const precio = item.precio_unitario ?? precioMap.get(item.id_producto) ?? 0;
        const prev = totales.get(item.id_producto) ?? { nombre: item.nombre, cantidad: 0, ingresos: 0 };
        totales.set(item.id_producto, {
          nombre: item.nombre,
          cantidad: prev.cantidad + item.cantidad,
          ingresos: prev.ingresos + precio * item.cantidad,
        });
      });
    });
    return [...totales.values()]
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 5);
  }, [pedidosCobrados, precioMap]);

  /** Tiempos de espera reales por nombre de producto */
  const waitTimesReal = useMemo(() => {
    const byProduct = new Map<string, { nombre: string; totalMin: number; count: number; idealMin: number }>();
    pedidosCobrados
      .filter(p => typeof p.tiempo_despacho_minutos === 'number' && p.tiempo_despacho_minutos > 0)
      .forEach(p => {
        p.items.forEach(item => {
          const cat = (item.categoria || '').toLowerCase();
          const nom = (item.nombre || '').toLowerCase();
          const isBar = cat.includes('bebida') || cat.includes('bodega') || cat.includes('vino') || nom.includes('vino') || nom.includes('gaseosa') || nom.includes('agua') || nom.includes('cerveza');
          if (isBar) return;
          const prev = byProduct.get(item.nombre) ?? {
            nombre: item.nombre, totalMin: 0, count: 0, idealMin: 12
          };
          byProduct.set(item.nombre, {
            ...prev,
            totalMin: prev.totalMin + (p.tiempo_despacho_minutos ?? 0),
            count: prev.count + 1,
          });
        });
      });
    return [...byProduct.values()]
      .map(d => ({ plato: d.nombre, minutos: parseFloat((d.totalMin / d.count).toFixed(1)), ideal: d.idealMin }))
      .sort((a, b) => b.minutos - a.minutos)
      .slice(0, 5);
  }, [pedidosCobrados]);

  const tiempoPromedio = tiempoPromedioReal ?? '—';
  const efectividad = efectividadReal ?? '—';
  const waitTimesData = waitTimesReal.length > 0 ? waitTimesReal : [
    { plato: 'Bife de Chorizo', minutos: 15.4, ideal: 14.0 },
    { plato: 'Pastas Caseras', minutos: 9.8, ideal: 11.0 },
    { plato: 'Entraña Arriera', minutos: 17.1, ideal: 15.0 },
    { plato: 'Hamburguesa Gourmet', minutos: 11.2, ideal: 10.0 },
    { plato: 'Tarta Rústica', minutos: 8.5, ideal: 9.0 },
  ];

  // 2. Costo de Recetas e Integración con Rentabilidad
  const recetaCostMap = useMemo(() => {
    const costMap = new Map<string, number>();
    
    productosMenu.forEach(p => {
      const ingredients = recetas.filter(r => r.id_producto === p.id_producto);
      if (ingredients.length === 0) {
        costMap.set(p.id_producto, p.precio_venta * 0.35); // Estimación del 35% de costo si no hay receta
        return;
      }
      
      let totalCost = 0;
      ingredients.forEach(ing => {
        const insumo = insumos.find(i => i.id_insumo === ing.id_insumo);
        if (insumo) {
          totalCost += ing.cantidad_a_descontar * (insumo.costo_unitario ?? 0);
        }
      });
      costMap.set(p.id_producto, totalCost);
    });
    
    return costMap;
  }, [productosMenu, recetas, insumos]);

  const metricasFinancieras = useMemo(() => {
    let ingresosTotales = 0;
    let costoTotal = 0;
    
    pedidosCobrados.forEach(p => {
      p.items.forEach(item => {
        const precio = item.precio_unitario ?? precioMap.get(item.id_producto) ?? 0;
        const costoUnitario = recetaCostMap.get(item.id_producto) ?? 0;
        ingresosTotales += precio * item.cantidad;
        costoTotal += costoUnitario * item.cantidad;
      });
    });
    
    const gananciaNeta = ingresosTotales - costoTotal;
    const margenPromedio = ingresosTotales > 0 ? (gananciaNeta / ingresosTotales) * 100 : 0;
    
    return {
      ingresosTotales,
      costoTotal,
      gananciaNeta,
      margenPromedio
    };
  }, [pedidosCobrados, precioMap, recetaCostMap]);

  // 3. Pérdida Financiera por Mermas
  const perdidaMermas = useMemo(() => {
    let total = 0;
    filteredMermas.forEach(m => {
      const insumo = insumos.find(i => i.id_insumo === m.id_insumo);
      const costo = insumo?.costo_unitario ?? 0;
      total += m.cantidad * costo;
    });
    return total;
  }, [filteredMermas, insumos]);

  // 4. Desglose de Ventas por Categoría (Gráfico Donut SVG)
  const categoriaVentasData = useMemo(() => {
    const categories: { [cat: string]: number } = {};
    let totalSales = 0;
    
    pedidosCobrados.forEach(p => {
      p.items.forEach(item => {
        const precio = item.precio_unitario ?? precioMap.get(item.id_producto) ?? 0;
        const cat = item.categoria || 'Otros';
        const subtotal = precio * item.cantidad;
        categories[cat] = (categories[cat] || 0) + subtotal;
        totalSales += subtotal;
      });
    });
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      percentage: totalSales > 0 ? (value / totalSales) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [pedidosCobrados, precioMap]);

  // 5. Matriz BCG Dinámica
  const dynamicBcgData = useMemo(() => {
    const list: { id: string; nombre: string; cantidad: number; ingresos: number; margenPct: number }[] = [];
    const totals = new Map<string, { cantidad: number; ingresos: number }>();
    
    pedidosCobrados.forEach(p => {
      p.items.forEach(item => {
        const precio = item.precio_unitario ?? precioMap.get(item.id_producto) ?? 0;
        const prev = totals.get(item.id_producto) ?? { cantidad: 0, ingresos: 0 };
        totals.set(item.id_producto, {
          cantidad: prev.cantidad + item.cantidad,
          ingresos: prev.ingresos + (precio * item.cantidad)
        });
      });
    });

    if (totals.size === 0) {
      return [
        { nombre: 'Bife de Chorizo', x: 80, y: 85, tipo: 'Estrella 🌟', desc: 'Plato insignia. Alta demanda y excelente rentabilidad.', color: 'bg-yellow-500' },
        { nombre: 'Entraña Arriera', x: 45, y: 90, tipo: 'Incógnita ❓', desc: 'Alto margen de receta pero volumen de ventas moderado.', color: 'bg-purple-500' },
        { nombre: 'Vino Rutini Cabernet', x: 25, y: 80, tipo: 'Incógnita ❓', desc: 'Margen excelente, venta ocasional premium.', color: 'bg-purple-500' },
        { nombre: 'Hamburguesa Completa', x: 85, y: 45, tipo: 'Vaca Sagrada 🐄', desc: 'Volumen alto, genera flujo constante con margen ajustado.', color: 'bg-emerald-500' },
        { nombre: 'Pastas Caseras', x: 75, y: 55, tipo: 'Vaca Sagrada 🐄', desc: 'Muy popular. Costo moderado, rotación saludable.', color: 'bg-emerald-500' },
        { nombre: 'Ensalada César', x: 60, y: 40, tipo: 'Vaca Sagrada 🐄', desc: 'Entrada recurrente de costo operativo bajo.', color: 'bg-emerald-500' },
        { nombre: 'Tarta Rústica', x: 30, y: 25, tipo: 'Perro 🐕', desc: 'Baja demanda y rentabilidad baja. Evaluar recambio de carta.', color: 'bg-slate-400' },
      ];
    }

    totals.forEach((meta, id) => {
      const pm = productosMenu.find(p => p.id_producto === id);
      if (!pm) return;
      const costo = recetaCostMap.get(id) || 0;
      const precio = pm.precio_venta;
      const ganancia = precio - costo;
      const margenPct = precio > 0 ? (ganancia / precio) * 100 : 0;
      list.push({
        id,
        nombre: pm.nombre,
        cantidad: meta.cantidad,
        ingresos: meta.ingresos,
        margenPct
      });
    });

    const cantidades = list.map(d => d.cantidad);
    const margenes = list.map(d => d.margenPct);
    
    const maxCant = Math.max(...cantidades, 1);
    const minCant = Math.min(...cantidades, 0);
    const maxMarg = Math.max(...margenes, 100);
    const minMarg = Math.min(...margenes, 0);

    const midCant = (maxCant + minCant) / 2;
    const midMarg = (maxMarg + minMarg) / 2;

    return list.map(item => {
      const x = 10 + ((item.cantidad - minCant) / (maxCant - minCant || 1)) * 80;
      const y = 10 + ((item.margenPct - minMarg) / (maxMarg - minMarg || 1)) * 80;
      
      let tipo = '';
      let desc = '';
      let color = '';

      if (item.cantidad >= midCant && item.margenPct >= midMarg) {
        tipo = 'Estrella 🌟';
        desc = `Alta demanda (${item.cantidad} u) and excelente margen (${Math.round(item.margenPct)}%).`;
        color = 'bg-yellow-500';
      } else if (item.cantidad >= midCant && item.margenPct < midMarg) {
        tipo = 'Vaca Sagrada 🐄';
        desc = `Alto volumen (${item.cantidad} u) pero margen ajustado (${Math.round(item.margenPct)}%).`;
        color = 'bg-emerald-500';
      } else if (item.cantidad < midCant && item.margenPct >= midMarg) {
        tipo = 'Incógnita ❓';
        desc = `Margen excelente (${Math.round(item.margenPct)}%) pero baja rotación (${item.cantidad} u).`;
        color = 'bg-purple-500';
      } else {
        tipo = 'Perro 🐕';
        desc = `Baja rotación (${item.cantidad} u) y rentabilidad baja (${Math.round(item.margenPct)}%).`;
        color = 'bg-slate-400';
      }

      return {
        nombre: item.nombre,
        x,
        y,
        tipo,
        desc,
        color
      };
    });
  }, [pedidosCobrados, productosMenu, recetaCostMap]);

  // Filter logs safely
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchSearch = l.mensaje.toLowerCase().includes(logSearch.toLowerCase());
      if (logFilter === 'todo') return matchSearch;
      if (logFilter === 'pedidos') return matchSearch && (l.tipo === 'pedido_creado' || l.tipo === 'comanda_estado');
      if (logFilter === 'stock') return matchSearch && (l.tipo === 'descuento_stock' || l.tipo === 'alerta_stock');
      if (logFilter === 'alertas') return matchSearch && l.tipo === 'alerta_stock';
      return matchSearch;
    });
  }, [logs, logFilter, logSearch]);

  // Colores para Gráfico de Donut de Categorías
  const donutColors = ['#624A3E', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#6B7280'];

  return (
    <div className="space-y-4 md:space-y-6" id="bi-analytics-container">

      {/* FILTROS GLOBALES AL TOPE */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#624A3E]" />
          <div>
            <h3 className="font-extrabold text-sm text-[#624A3E] font-sans uppercase">Filtro Temporal de Analíticas</h3>
            <p className="text-[10px] text-stone-500">Afecta a todas las métricas, ventas, demoras y mermas en pantalla.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto font-mono">
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="text-xs p-2 border border-stone-200 rounded-lg bg-stone-50 text-stone-700 font-bold w-full sm:w-auto cursor-pointer"
            placeholder="Desde"
          />
          <span className="text-xs text-stone-400 font-bold hidden sm:inline">a</span>
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="text-xs p-2 border border-stone-200 rounded-lg bg-stone-50 text-stone-700 font-bold w-full sm:w-auto cursor-pointer"
            placeholder="Hasta"
          />
          {(fechaInicio || fechaFin) && (
            <button
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
              }}
              className="text-[9px] uppercase font-black px-2.5 py-2 bg-stone-200 hover:bg-stone-300 rounded-lg text-stone-700 cursor-pointer transition-colors w-full sm:w-auto text-center"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">

        <div className="bg-white border border-stone-200/80 border-l-4 border-l-[#624A3E]/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wider block">Ventas Facturadas</span>
            <h4 className="text-lg md:text-xl font-black text-stone-900 font-mono mt-1">
              ${metricasFinancieras.ingresosTotales.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </h4>
            <p className="text-[9px] text-[#22C55E] mt-1.5 flex items-center gap-0.5 font-sans font-bold">
              <span>Neta: ${metricasFinancieras.gananciaNeta.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
            </p>
          </div>
          <div className="w-10 h-10 bg-[#624A3E] text-white rounded-xl flex items-center justify-center shadow-md shadow-[#624A3E]/10 shrink-0">
            <DollarSign className="w-5 h-5 text-amber-300" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 border-l-4 border-l-[#10B981] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wider block">Margen Neto Real</span>
            <h4 className="text-lg md:text-xl font-black text-stone-900 font-mono mt-1">
              {metricasFinancieras.margenPromedio.toFixed(1)}%
            </h4>
            <p className="text-[9px] text-stone-500 mt-1.5 font-sans leading-tight font-bold">
              Promedio de platos con receta
            </p>
          </div>
          <div className="w-10 h-10 bg-[#10B981] text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/10 shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 border-l-4 border-l-[#EF4444] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wider block">Pérdida por Mermas</span>
            <h4 className="text-lg md:text-xl font-black text-stone-900 font-mono mt-1">
              -${perdidaMermas.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </h4>
            <p className="text-[9px] text-[#EF4444] mt-1.5 font-sans font-bold flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" />
              <span>{filteredMermas.length} incidentes</span>
            </p>
          </div>
          <div className="w-10 h-10 bg-[#EF4444] text-white rounded-xl flex items-center justify-center shadow-md shadow-red-500/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 border-l-4 border-l-[#F97316] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wider block">Tiempo Despacho</span>
            <h4 className="text-lg md:text-xl font-black text-stone-900 font-mono mt-1">
              {tiempoPromedio} min
            </h4>
            <p className="text-[9px] text-stone-500 mt-1.5 font-sans font-bold">
              Efectividad: {efectividad}% (Verde)
            </p>
          </div>
          <div className="w-10 h-10 bg-[#F97316] text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
        </div>

      </div>

      {/* CORE BI GRAPHS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

        {/* TOP PLATOS POR INGRESOS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
              <div className="p-1.5 bg-stone-900 text-white rounded-lg shrink-0">
                <TrendingUp className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-stone-850 tracking-tight">
                  Top Platos por Ingresos
                </h3>
                <p className="text-[10px] sm:text-[11px] text-stone-400">Calculado desde pedidos cobrados en tiempo real</p>
              </div>
            </div>
            
            <div className="space-y-3.5">
              {rankingPlatos.length === 0 ? (
                <div className="text-center py-10 text-stone-400 text-xs italic">
                  No hay ventas registradas en el período seleccionado.
                </div>
              ) : (
                rankingPlatos.map((item, idx) => {
                  const maxIngreso = rankingPlatos[0]?.ingresos ?? 1;
                  const pct = Math.round((item.ingresos / maxIngreso) * 100);
                  const barColor = idx === 0 ? '#624A3E' : idx === 1 ? '#F59E0B' : '#10B981';
                  return (
                    <div key={item.nombre} className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-stone-450 w-4">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-bold text-stone-800 truncate">{item.nombre}</span>
                          <span className="text-[10px] font-mono text-stone-500 ml-2 flex-shrink-0">
                            {item.cantidad} uds · ${item.ingresos.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: pct + '%', backgroundColor: barColor }} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* DESGLOSE DE VENTAS POR CATEGORÍA (DONUT CHART SVG) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
              <div className="p-1.5 bg-stone-900 text-white rounded-lg shrink-0">
                <PieChart className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-stone-850 tracking-tight">
                  Desglose de Ventas por Categoría
                </h3>
                <p className="text-[10px] sm:text-[11px] text-stone-400">Participación porcentual en los ingresos totales</p>
              </div>
            </div>

            {categoriaVentasData.length === 0 ? (
              <div className="text-center py-10 text-stone-400 text-xs italic">
                Sin datos de ventas en este período.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* SVG DONUT */}
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E5E7EB" strokeWidth="4" />
                    {(() => {
                      let accumulatedPercentage = 0;
                      return categoriaVentasData.map((cat, idx) => {
                        const strokeDasharray = `${cat.percentage} ${100 - cat.percentage}`;
                        const strokeDashoffset = 100 - accumulatedPercentage;
                        accumulatedPercentage += cat.percentage;
                        
                        return (
                          <circle
                            key={idx}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke={donutColors[idx % donutColors.length]}
                            strokeWidth="4.2"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-full m-4.5 shadow-inner">
                    <span className="text-[9px] uppercase font-bold text-stone-400 font-sans tracking-wide">Total</span>
                    <span className="text-xs font-black text-stone-850 font-mono">
                      ${metricasFinancieras.ingresosTotales.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* LEGEND TABLE */}
                <div className="flex-1 w-full space-y-1.5">
                  {categoriaVentasData.map((cat, idx) => (
                    <div key={cat.name} className="flex justify-between items-center text-[10.5px]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: donutColors[idx % donutColors.length] }} />
                        <span className="font-semibold text-stone-700 capitalize">{cat.name}</span>
                      </div>
                      <div className="text-right font-mono text-stone-500">
                        <span className="font-bold text-stone-800 mr-2">${cat.value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                        <span>({Math.round(cat.percentage)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DYNAMIC BCG MATRIX */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-2 border-b border-stone-100">
            <div className="min-w-0">
              <h4 className="font-extrabold text-sm text-stone-850 font-sans tracking-tight flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-[#624A3E] shrink-0" />
                Matriz BCG Comercial Dinámica (Menú)
              </h4>
              <p className="text-[10px] sm:text-[11px] text-stone-400">
                Segmentación en tiempo real cruzando cantidad vendida y márgenes de receta.
              </p>
            </div>
            <span className="text-[9px] font-mono bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded shrink-0">
              Margen vs Cantidad
            </span>
          </div>

          <div className="relative bg-stone-50 border border-stone-200 rounded-xl aspect-[1.6/1] sm:aspect-[1.8/1] overflow-hidden p-3 mt-4">
            {/* Axis titles */}
            <div className="absolute top-1.5 left-1.5 bg-white/80 backdrop-blur-[2px] px-2 py-0.5 rounded text-[8px] font-bold text-stone-455 uppercase">
              Alta rentabilidad ↑
            </div>
            <div className="absolute bottom-1.5 right-1.5 bg-white/80 backdrop-blur-[2px] px-2 py-0.5 rounded text-[8px] font-bold text-stone-455 uppercase">
              Alto volumen →
            </div>

            {/* Quadrant Borders */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div className="border-r border-b border-dashed border-stone-200 flex items-start p-1.5">
                <span className="text-[8px] sm:text-[9px] font-black text-purple-700 bg-purple-50 px-1 py-0.5 rounded font-sans uppercase">INCÓGNITA</span>
              </div>
              <div className="border-b border-dashed border-stone-200 flex items-start justify-end p-1.5">
                <span className="text-[8px] sm:text-[9px] font-black text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-sans uppercase">ESTRELLA</span>
              </div>
              <div className="border-r border-dashed border-stone-200 flex items-end p-1.5">
                <span className="text-[8px] sm:text-[9px] font-black text-stone-500 bg-stone-200 px-1 py-0.5 rounded font-sans uppercase">PERRO</span>
              </div>
              <div className="flex items-end justify-end p-1.5">
                <span className="text-[8px] sm:text-[9px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-sans uppercase">VACA SAGRADA</span>
              </div>
            </div>

            {/* Plotting points */}
            {dynamicBcgData.map((item, idx) => (
              <div
                key={idx}
                className="absolute group"
                style={{ left: `${item.x}%`, top: `${100 - item.y}%` }}
              >
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${item.color} cursor-pointer border border-white ring-2 ring-stone-900/10 hover:scale-130 transition-transform`} />
                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-900 text-white rounded-lg p-2.5 w-36 sm:w-44 shadow-lg z-20 text-[9px] sm:text-[10px] space-y-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-pre-wrap font-sans">
                  <p className="font-extrabold text-stone-100">{item.nombre}</p>
                  <p className="text-amber-300 font-bold uppercase tracking-wider">{item.tipo}</p>
                  <p className="opacity-80 leading-normal text-stone-200">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-[10px] sm:text-[10.5px] text-stone-500 flex items-start gap-1.5 leading-snug">
            <Info className="w-4 h-4 text-stone-400 shrink-0" />
            <span>Pase el cursor por los puntos de color para auditar las recomendaciones de margen por plato.</span>
          </div>
        </div>

        {/* DEMORAS PROMEDIO BAR CHART */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-2 border-b border-stone-100 font-sans">
            <div className="min-w-0">
              <h4 className="font-extrabold text-sm text-stone-850 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-stone-600 shrink-0" />
                Tiempos de Demora por Plato
              </h4>
              <p className="text-[10px] sm:text-[11px] text-stone-400">
                Minutos promedio desde comanda a "Listo".
              </p>
            </div>
            <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded shrink-0">
              Ideal: &lt; 15 min
            </span>
          </div>

          <div className="relative pt-4 sm:pt-6 h-56 sm:h-64 flex flex-col justify-end">
            <div className="flex items-end justify-between h-40 sm:h-44 border-b border-stone-100 px-2 sm:px-4">
              {waitTimesData.map((d, index) => {
                const maxVal = 20; // max minutes for scale
                const barHeight = (d.minutos / maxVal) * 100;
                const idealHeight = (d.ideal / maxVal) * 100;

                return (
                  <div key={index} className="flex flex-col items-center flex-1 h-full justify-end group px-1 sm:px-2 relative">
                    <div className="absolute -top-12 bg-slate-900 text-white px-2 py-1 rounded text-[9px] sm:text-[10px] text-center font-sans tracking-tight z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="font-bold">{d.minutos} min</p>
                      <p className="text-[8px] opacity-75">Ideal: {d.ideal}m</p>
                    </div>

                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-rose-300 pointer-events-none h-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ bottom: `${idealHeight}%` }}
                    />

                    <div
                      className={`w-4 sm:w-6 rounded-t-md hover:brightness-95 transition-all shadow-xs ${
                        d.minutos > d.ideal ? 'bg-[#F97316]' : 'bg-[#624A3E]'
                      }`}
                      style={{ height: `${barHeight}%` }}
                    />

                    <span className="text-[8px] sm:text-[9px] text-[#624A3E] font-extrabold text-center mt-2 line-clamp-1 w-12 sm:w-16 truncate" title={d.plato}>
                      {d.plato}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-[10px] mt-3 pt-2 font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-[#624A3E] rounded" />
                <span>Tiempo Óptimo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-[#F97316] rounded" />
                <span>Excede Ideal</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* HISTORIAL DE COSTOS DE INSUMOS Y GRAFICA DE TENDENCIA */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-4 border-b border-[#ddd7ce]/40 gap-4">
          <div>
            <h4 className="font-extrabold text-sm text-[#624A3E] tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-[#624A3E] shrink-0" />
              Historial de Costos & Tendencia de Insumos (Auditoría de Proveedores)
            </h4>
            <p className="text-xs text-stone-500">
              Seguimiento de inflación por insumo y auditoría de variaciones por proveedor.
            </p>
          </div>
          <span className="text-[10px] font-mono bg-[#624A3E]/10 text-[#624A3E] font-bold px-2.5 py-0.5 rounded-full border border-[#624A3E]/20 shrink-0">
            {filteredHistorialCostos.length} registros filtrados
          </span>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/60 font-sans">
          <div>
            <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Filtrar por Insumo</label>
            <select
              value={selectedInsumoId}
              onChange={e => setSelectedInsumoId(e.target.value)}
              className="w-full text-xs p-2 border border-stone-200 rounded-lg bg-white text-stone-700 font-bold cursor-pointer"
            >
              <option value="todos">Todos los insumos</option>
              {insumos.map(i => (
                <option key={i.id_insumo} value={i.id_insumo}>{i.nombre} ({i.proveedor || 'Sin Proveedor'})</option>
              ))}
            </select>
          </div>
        </div>

        {/* GRID LAYOUT: TREND CHART + SUPPLIER AUDIT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: TREND CHART OR SUMMARY */}
          <div className="lg:col-span-7 space-y-4">
            <h5 className="text-[11px] font-black text-stone-500 uppercase tracking-widest">
              📈 Gráfica de Tendencia de Costo
            </h5>
            
            {selectedInsumoId === 'todos' ? (
              <div className="h-48 bg-stone-50 border border-dashed border-stone-200 rounded-xl flex flex-col justify-center items-center text-center p-6">
                <Info className="w-8 h-8 text-stone-400 mb-2" />
                <p className="text-xs text-stone-500 font-bold">Seleccione un insumo específico en el filtro superior</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Podrá ver la curva temporal del costo de compra y su histórico de evolución.</p>
              </div>
            ) : trendPoints.length === 0 ? (
              <div className="h-48 bg-stone-50 border border-dashed border-stone-200 rounded-xl flex flex-col justify-center items-center text-center p-6">
                <Clock className="w-8 h-8 text-stone-400 mb-2" />
                <p className="text-xs text-stone-500 font-bold">Sin histórico registrado</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Este insumo no tiene actualizaciones de costo registradas en el período seleccionado.</p>
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl">
                <div className="relative h-44 w-full flex items-end">
                  <svg className="w-full h-36 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {(() => {
                      const costs = trendPoints.map(p => p.costo);
                      const minCost = Math.min(...costs) * 0.9;
                      const maxCost = Math.max(...costs) * 1.1;
                      const range = maxCost - minCost || 1;

                      const coords = trendPoints.map((p, idx) => {
                        const x = (idx / (trendPoints.length - 1 || 1)) * 100;
                        const y = 100 - (((p.costo - minCost) / range) * 100);
                        return { x, y, val: p.costo, label: p.fecha };
                      });

                      const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

                      return (
                        <>
                          <line x1="0" y1="0" x2="100" y2="0" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2" />
                          <line x1="0" y1="50" x2="100" y2="50" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2" />
                          <line x1="0" y1="100" x2="100" y2="100" stroke="#E5E7EB" strokeWidth="0.5" />

                          <path d={pathD} fill="none" stroke="#624A3E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                          {coords.map((c, idx) => (
                            <g key={idx}>
                              <circle cx={c.x} cy={c.y} r="3" fill="#624A3E" stroke="#FFFFFF" strokeWidth="1" />
                              <text x={c.x} y={c.y - 6} textAnchor="middle" fontSize="5" className="fill-[#624A3E] font-bold font-mono">
                                ${c.val.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                  
                  <div className="absolute -bottom-1.5 inset-x-0 flex justify-between px-1 text-[8px] font-mono text-stone-500 font-bold">
                    {trendPoints.map((pt, idx) => {
                      if (idx === 0 || idx === trendPoints.length - 1 || trendPoints.length <= 4) {
                        return <span key={idx}>{pt.fecha}</span>;
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: SUPPLIER AUDIT STATISTICS */}
          <div className="lg:col-span-5 space-y-4">
            <h5 className="text-[11px] font-black text-stone-500 uppercase tracking-widest">
              🚚 Auditoría de Proveedores (Inflación)
            </h5>

            {proveedoresAudit.length === 0 ? (
              <p className="text-stone-400 text-xs italic py-8 text-center bg-stone-50 border border-dashed border-stone-200 rounded-xl">
                No hay datos de inflación de proveedores en este rango.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {proveedoresAudit.map((p, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-stone-850 truncate">{p.proveedor}</p>
                      <p className="text-[9px] text-stone-500 font-bold uppercase mt-0.5">
                        {p.updates} actualizaciones • {p.insumos.size} insumo(s)
                      </p>
                      <p className="text-[8px] text-stone-400 truncate mt-0.5 leading-tight">
                        Afecta a: {Array.from(p.insumos).join(', ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-stone-400 block font-bold uppercase">Max Aumento</span>
                      <span className="text-xs font-black text-rose-600 font-mono">
                        +{p.maxPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* DETAILED PRICE CHANGES TABLE */}
        <div className="pt-2">
          <h5 className="text-[11px] font-black text-stone-500 uppercase tracking-widest mb-3">
            📋 Registro de Cambios de Costo
          </h5>
          
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            {filteredHistorialCostos.length === 0 ? (
              <p className="text-stone-400 text-xs italic text-center py-6">No hay registros que coincidan con los filtros.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Insumo</th>
                    <th className="py-2.5 px-3 text-right">Costo Anterior</th>
                    <th className="py-2.5 px-3 text-right">Costo Nuevo</th>
                    <th className="py-2.5 px-3 text-right">Variación</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistorialCostos.slice(0, 10).map((h) => {
                    const diff = h.costo_nuevo - h.costo_anterior;
                    const pct = h.costo_anterior > 0 ? ((diff / h.costo_anterior) * 100).toFixed(1) : '100';
                    const isUp = diff > 0;
                    return (
                      <tr key={h.id_historial} className="border-b border-stone-150 hover:bg-stone-50 transition-colors">
                        <td className="py-2.5 px-3 text-stone-500 font-mono">
                          {new Date(h.fecha).toLocaleDateString('es-AR')} {new Date(h.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs
                        </td>
                        <td className="py-2.5 px-3 text-stone-800 font-black">{h.nombre_insumo}</td>
                        <td className="py-2.5 px-3 text-right text-stone-600 font-mono">${h.costo_anterior.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2.5 px-3 text-right text-stone-950 font-mono font-bold">${h.costo_nuevo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className={`py-2.5 px-3 text-right font-black font-mono ${isUp ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}`}>
                          {isUp ? '↑' : '↓'} {isUp ? '+' : ''}{pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* CORE AUDIT LOG TERMINAL PANEL */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 space-y-4">

        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-stone-100 pb-4 font-sans">
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-stone-850 tracking-tight flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-stone-600 shrink-0" />
              Consola de Auditoría en Tiempo Real
            </h4>
            <p className="text-xs text-stone-400">
              Logs cronológicos de comandas, mermas y stock.
            </p>
          </div>

          {/* Quick logs filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full min-h-11 pl-8 pr-3 py-1.5 bg-stone-50 rounded-lg text-xs text-stone-700 focus:outline-none placeholder-stone-400 border border-stone-150 focus:border-stone-300 font-semibold"
              />
            </div>

            <div className="flex bg-stone-50 p-0.5 rounded-lg border border-stone-150 overflow-x-auto">
              {(['todo', 'pedidos', 'stock', 'alertas'] as const).map(fl => (
                <button
                  key={fl}
                  onClick={() => setLogFilter(fl)}
                  className={`text-[9px] sm:text-[10px] font-bold px-2 sm:px-3 py-1.5 rounded-md capitalize transition-colors cursor-pointer whitespace-nowrap ${
                    logFilter === fl
                      ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {fl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrolling logs console */}
        <div className="bg-zinc-900 rounded-xl p-3 sm:p-4 font-mono text-[11px] leading-relaxed text-zinc-300 h-64 overflow-y-auto border border-zinc-950 space-y-2 select-all shadow-inner custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <p className="text-zinc-500 italic text-center py-2">Ningún registro coincide con el criterio de filtrado.</p>
          ) : (
            filteredLogs.slice().reverse().map(l => {
              const displayTime = l.timestamp.toLocaleTimeString('es-AR', { hour12: false });

              let prefixColor = 'text-sky-400';
              if (l.tipo === 'alerta_stock') prefixColor = 'text-rose-400';
              if (l.tipo === 'descuento_stock') prefixColor = 'text-amber-400';
              if (l.tipo === 'merma_registrada') prefixColor = 'text-purple-400';
              if (l.tipo === 'pedido_creado') prefixColor = 'text-emerald-400';

              return (
                <div key={l.id} className="hover:bg-zinc-800/60 p-1.5 rounded transition-colors flex items-start gap-2.5">
                  <span className="text-zinc-500 font-bold shrink-0">[{displayTime}]</span>
                  <span className={`uppercase font-bold tracking-tight shrink-0 font-mono text-[9px] ${prefixColor}`}>
                    [{l.tipo}]
                  </span>
                  <span className="text-zinc-200 text-[10px] sm:text-[11px]">{l.mensaje}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-stone-400 font-mono">
          <span>Toda operación simula un payload JSON de red REST API en las terminales</span>
          <span>Desarrollado para Gastrogénesis S.A. ©</span>
        </div>

      </div>

    </div>
  );
}
