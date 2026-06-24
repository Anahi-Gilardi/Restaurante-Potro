import React, { useState, useMemo } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { ProductoMenu, EventoLog } from '../types';

interface BusinessIntelligenceProps {
  productosMenu: ProductoMenu[];
  logs: EventoLog[];
}

export default function BusinessIntelligence({ productosMenu, logs }: BusinessIntelligenceProps) {
  const [logFilter, setLogFilter] = useState<'todo' | 'pedidos' | 'stock' | 'alertas'>('todo');
  const [logSearch, setLogSearch] = useState('');

  // BCG mapping matrix theoretical positions for high-fidelity rendering
  // Stars (High sales, high profit), Cash Cows (High sales, low profit), Question Marks (Low sales, high profit), Dogs (Low sales, low profit)
  const bcgData = useMemo(() => {
    return [
      { id: 'prod_car_lomo_pimienta', nombre: 'Lomo en demiglace de pimienta', x: 80, y: 85, tipo: 'Estrella 🌟', desc: 'Plato insignia, alta demanda y excelente rentabilidad.', color: 'bg-yellow-500' },
      { id: 'prod_vin_rutini_botella', nombre: 'Rutini Cab-Malbec 750ml', x: 25, y: 80, tipo: 'Incógnita ❓', desc: 'Margen excelente, venta ocasional premium.', color: 'bg-purple-500' },
      { id: 'prod_car_mila_entrecot', nombre: 'Milanesa de entrecot con fideos', x: 85, y: 45, tipo: 'Vaca Sagrada 🐄', desc: 'Volumen inmenso, genera flujo constante aunque margen ajustado.', color: 'bg-emerald-500' },
      { id: 'prod_pas_lasagna_pollo', nombre: 'Lasagna de pollo y espinaca al forno', x: 75, y: 55, tipo: 'Vaca Sagrada 🐄', desc: 'Muy popular. Costo moderado, rotación sumamente saludable.', color: 'bg-emerald-500' },
      { id: 'prod_ent_peras_quesoazul', nombre: 'Pera asada con queso azul', x: 60, y: 40, tipo: 'Vaca Sagrada 🐄', desc: 'Entrada recurrente de costo operativo bajo.', color: 'bg-emerald-500' },
      { id: 'prod_pos_tarta_vasca', nombre: 'Tarta de queso vasca', x: 30, y: 25, tipo: 'Perro 🐕', desc: 'Rotación magra y rentabilidad baja. Evaluar recambio de carta.', color: 'bg-slate-400' },
    ];
  }, []);

  // Static performance delay metrics for high fidelity display
  const waitTimesData = [
    { plato: 'Lomo en demiglace de pimienta', minutos: 15.4, ideal: 14.0, color: 'fill-emerald-500' },
    { plato: 'Lasagna de pollo al forno', minutos: 9.8, ideal: 11.0, color: 'fill-emerald-500' },
    { plato: 'Milanesa de entrecot', minutos: 11.2, ideal: 10.0, color: 'fill-emerald-500' },
    { plato: 'Tarta de queso vasca', minutos: 8.5, ideal: 9.0, color: 'fill-emerald-500' },
  ];

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

  return (
    <div className="space-y-6" id="bi-analytics-container">
      
      {/* OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white border border-stone-200/80 border-l-4 border-l-[#624A3E]/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wider block">Tiempo Promedio</span>
            <h4 className="text-xl font-black text-stone-900 font-mono mt-1">12.4 min</h4>
            <p className="text-[9px] text-[#22C55E] mt-1.5 flex items-center gap-0.5 font-sans font-bold">
              <span>↓ 1.2 min vs semana anterior</span>
            </p>
          </div>
          <div className="w-10 h-10 bg-[#624A3E] text-white rounded-xl flex items-center justify-center shadow-md shadow-[#624A3E]/10">
            <Clock className="w-5 h-5 text-amber-250 text-amber-300" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 border-l-4 border-l-[#22C55E] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wider block">Efectividad Mesa</span>
            <h4 className="text-xl font-black text-stone-900 font-mono mt-1">97.8%</h4>
            <p className="text-[9px] text-stone-500 mt-1.5 font-sans leading-tight">
              Despachos antes de semáforo rojo
            </p>
          </div>
          <div className="w-10 h-10 bg-[#22C55E] text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/10">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 border-l-4 border-l-[#EF4444] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wider block">Alertas Críticas</span>
            <h4 className="text-xl font-black text-stone-900 font-mono mt-1">
              {logs.filter(l => l.tipo === 'alerta_stock').length} registradas
            </h4>
            <p className="text-[9px] text-[#EF4444] mt-1.5 font-sans font-bold">
              Acciones de reabastecimiento urgente
            </p>
          </div>
          <div className="w-10 h-10 bg-[#EF4444] text-white rounded-xl flex items-center justify-center shadow-md shadow-red-500/10">
            <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 border-l-4 border-l-[#F97316] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wider block">Canal API Unificado</span>
            <h4 className="text-xl font-black text-[#624A3E] font-mono mt-1">En Línea</h4>
            <p className="text-[9px] text-[#F97316] mt-1.5 font-sans font-bold">
              Rappi & PedidosYa integrados
            </p>
          </div>
          <div className="w-10 h-10 bg-[#1E1E1E] text-white rounded-xl flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-[#F97316]" />
          </div>
        </div>

      </div>

      {/* CORE BI GRAPHS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BCG MATRIX REPORT */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-start pb-2 border-b border-slate-50">
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 font-sans tracking-tight flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-slate-600" />
                Matriz BCG Comercial del Menú
              </h4>
              <p className="text-[11px] text-slate-400">
                Segmentación estratégica relacionando volumen de demanda (eje X) y rentabilidad neta (eje Y).
              </p>
            </div>
            <span className="text-[9px] font-mono bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
              Matriz 2x2 Dinámica
            </span>
          </div>

          {/* Core BCG Canvas drawing */}
          <div className="relative bg-slate-50 border border-slate-100 rounded-xl aspect-[1.5/1] overflow-hidden p-3 mt-4">
            
            {/* Axis titles */}
            <div className="absolute top-1 left-1 bg-white/70 backdrop-blur-[2px] px-2 py-0.5 rounded text-[8px] font-bold text-slate-400 uppercase">
              Alta rentabilidad ↑
            </div>
            <div className="absolute bottom-1 right-1 bg-white/70 backdrop-blur-[2px] px-2 py-0.5 rounded text-[8px] font-bold text-slate-400 uppercase">
              Alto volumen de venta →
            </div>

            {/* Quadrant Borders */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {/* Top Left: Question Marks */}
              <div className="border-r border-b border-dashed border-slate-205 flex items-start p-2">
                <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-sans uppercase">INCÓGNITA ❓</span>
              </div>
              {/* Top Right: Stars */}
              <div className="border-b border-dashed border-slate-205 flex items-start justify-end p-2">
                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-sans uppercase">ESTRELLA 🌟</span>
              </div>
              {/* Bottom Left: Dogs */}
              <div className="border-r border-dashed border-slate-205 flex items-end p-2">
                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded font-sans uppercase">PERRO 🐕</span>
              </div>
              {/* Bottom Right: Cash Cows */}
              <div className="flex items-end justify-end p-2">
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans uppercase">VACA SAGRADA 🐄</span>
              </div>
            </div>

            {/* Plotting menu points */}
            {bcgData.map((item, idx) => {
              return (
                <div
                  key={idx}
                  className="absolute group"
                  style={{ left: `${item.x}%`, top: `${100 - item.y}%` }}
                >
                  {/* Floating Pulsator Dot */}
                  <div className={`w-3 h-3 rounded-full ${item.color} cursor-pointer border border-white ring-2 ring-slate-900/10 hover:scale-125 transition-transform`} />
                  
                  {/* Hover tooltip */}
                  <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-lg p-2.5 w-44 shadow-lg z-20 text-[10px] space-y-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-pre-wrap font-sans">
                    <p className="font-extrabold text-slate-100">{item.nombre}</p>
                    <p className="text-indigo-300 font-bold uppercase tracking-wider">{item.tipo}</p>
                    <p className="opacity-80 leading-normal text-slate-200">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] text-slate-500 flex items-start gap-1.5 leading-snug">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Pase el cursor por encima de los puntos de la matriz para revelar las recomendaciones comerciales y categorización del producto para el cliente.</span>
          </div>
        </div>

        {/* DEMORAS PROMEDIO BAR CHART */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-start pb-2 border-b border-slate-50 font-sans">
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-slate-600" />
                Tiempos de Demora Promedio por Plato
              </h4>
              <p className="text-[11px] text-slate-400">
                Minutos promedio transcurridos desde que se inyecta la comanda hasta que se marca "Listo".
              </p>
            </div>
            <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded">
              Ideal: &lt; 15 min
            </span>
          </div>

          {/* SVG Custom Column Chart render */}
          <div className="relative pt-6 h-56 flex flex-col justify-end">
            <div className="flex items-end justify-between h-40 border-b border-slate-100 px-4">
              {waitTimesData.map((d, index) => {
                const maxVal = 20; // max minutes for scale
                const barHeight = (d.minutos / maxVal) * 100;
                const idealHeight = (d.ideal / maxVal) * 100;

                return (
                  <div key={index} className="flex flex-col items-center flex-1 h-full justify-end group px-2 relative">
                    
                    {/* Hover delay helper */}
                    <div className="absolute -top-12 bg-slate-900 text-white px-2 py-1 rounded text-[10px] text-center font-sans tracking-tight z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="font-bold">{d.minutos} min</p>
                      <p className="text-[8px] opacity-75">Ideal: {d.ideal}m</p>
                    </div>

                    {/* Target line guideline */}
                    <div 
                      className="absolute left-0 right-0 border-t border-dashed border-rose-300 pointer-events-none h-0 opacity-60 group-hover:opacity-100 transition-opacity" 
                      style={{ bottom: `${idealHeight}%` }}
                      title={`Gráfico Ideal: ${d.ideal} min`}
                    />

                    {/* Column bar block */}
                    <div 
                      className={`w-6 rounded-t-md hover:brightness-95 transition-all shadow-xs ${
                        d.minutos > d.ideal ? 'bg-[#F97316]' : 'bg-[#624A3E]'
                      }`}
                      style={{ height: `${barHeight}%` }}
                    />

                    {/* Label */}
                    <span className="text-[9px] text-[#624A3E] font-extrabold text-center mt-2 line-clamp-1 w-16 truncate" title={d.plato}>
                      {d.plato}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Legend indicators */}
            <div className="flex justify-center gap-4 text-[10px] mt-3 pt-2 font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-[#624A3E] rounded" />
                <span>Tiempo Óptimo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-[#F97316] rounded" />
                <span>Excede Tiempo Ideal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="border-t border-dashed border-[#EF4444] w-5 h-0" style={{ borderTopWidth: '1.5px' }} />
                <span>Límite Estimado</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* CORE AUDIT LOG TERMINAL PANEL */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-50 pb-4 font-sans">
          <div>
            <h4 className="font-bold text-sm text-slate-800 tracking-tight flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-slate-600" />
              Consola de Auditoría Gastronómica en Tiempo Real
            </h4>
            <p className="text-xs text-slate-400">
              Logs cronológicos detallados registrando inyección de comandas, mermas manuales, y cálculos del stock escandallo.
            </p>
          </div>

          {/* Quick logs filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 rounded-lg text-[10px] text-slate-705 text-slate-700 focus:outline-none placeholder-slate-400 border border-slate-100 focus:border-slate-300"
              />
            </div>

            <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-100">
              {(['todo', 'pedidos', 'stock', 'alertas'] as const).map(fl => (
                <button
                  key={fl}
                  onClick={() => setLogFilter(fl)}
                  className={`text-[9px] font-bold px-2 py-1 rounded-md capitalize transition-colors ${
                    logFilter === fl 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {fl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrolling logs console */}
        <div className="bg-slate-900 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 h-64 overflow-y-auto border border-slate-950 space-y-2 select-all shadow-inner custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <p className="text-slate-500 italic text-center py-2">Ningún registro coincide con el criterio de filtrado.</p>
          ) : (
            filteredLogs.slice().reverse().map(l => {
              const displayTime = l.timestamp.toLocaleTimeString('es-AR', { hour12: false });
              
              let prefixColor = 'text-sky-400';
              if (l.tipo === 'alerta_stock') prefixColor = 'text-rose-500';
              if (l.tipo === 'descuento_stock') prefixColor = 'text-amber-400';
              if (l.tipo === 'merma_registrada') prefixColor = 'text-purple-400';
              if (l.tipo === 'pedido_creado') prefixColor = 'text-emerald-400';

              return (
                <div key={l.id} className="hover:bg-slate-800/60 p-1.5 rounded transition-colors flex items-start gap-2.5">
                  <span className="text-slate-500 font-bold shrink-0">[{displayTime}]</span>
                  <span className={`uppercase font-bold tracking-tight shrink-0 font-mono text-[9px] ${prefixColor}`}>
                    [{l.tipo}]
                  </span>
                  <span className="text-slate-200">{l.mensaje}</span>
                </div>
              );
            })
          )}
        </div>
        
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>Toda operación simula un payload JSON de red REST API en las terminales</span>
          <span>Desarrollado para Gastrogénesis S.A. ©</span>
        </div>

      </div>

    </div>
  );
}
