import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Calendar, 
  TrendingUp, 
  UtensilsCrossed, 
  DollarSign, 
  Search, 
  RefreshCw, 
  Award, 
  Layers, 
  BarChart3, 
  Clock,
  ChevronRight
} from 'lucide-react';
import { ventasPlatosService, VentaPlatoRow, RankingResult } from '../services/ventasPlatosService';
import { ToastContainer, useToast } from './ToastContainer';

export default function RankingVentasModule() {
  const { toast, toasts, removeToast } = useToast();
  const [ventas, setVentas] = useState<VentaPlatoRow[]>(() => ventasPlatosService.getLocalCache());
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'historico'>('mes');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDia, setSelectedDia] = useState<string>('todos');

  const loadData = async (forceFresh = false) => {
    setIsLoading(true);
    try {
      const data = await ventasPlatosService.list(forceFresh);
      setVentas(data);
      if (forceFresh) {
        toast.success(`Datos sincronizados: ${data.length} registros en Google Sheets`);
      }
    } catch {
      toast.error('No se pudo conectar con Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const ranking: RankingResult = useMemo(() => {
    return ventasPlatosService.calculateRanking(ventas, periodo);
  }, [ventas, periodo]);

  const filteredItems = useMemo(() => {
    let list = ranking.todos;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(it => it.nombre.toLowerCase().includes(q) || it.categoria.toLowerCase().includes(q));
    }
    return list;
  }, [ranking.todos, searchTerm]);

  const maxCantidad = useMemo(() => {
    if (ranking.todos.length === 0) return 1;
    return Math.max(...ranking.todos.map(it => it.cantidad), 1);
  }, [ranking.todos]);

  const diasDisponibles = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER WITH CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-stone-900/60 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs">
        <div>
          <h2 className="font-serif font-black text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Ranking de Platos Más Vendidos
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Contabilización por día, semana y mes de los platos y bebidas despachados.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* Period Selector Tabs */}
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-extrabold flex-1 sm:flex-initial">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Esta Semana' },
              { key: 'mes', label: 'Este Mes' },
              { key: 'historico', label: 'Histórico' }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPeriodo(tab.key as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer border-none ${
                  periodo === tab.key
                    ? 'bg-[#624A3E] text-white shadow-xs font-black'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 bg-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="p-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl cursor-pointer border border-stone-200 dark:border-stone-700 transition-all active:scale-95 shrink-0"
            title="Sincronizar con Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900/40 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1">
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" /> Total Porciones
          </span>
          <p className="font-mono text-2xl font-black text-stone-900 dark:text-stone-100">
            {ranking.totalPorciones.toLocaleString('es-AR')}
          </p>
          <p className="text-[10px] text-stone-400">Platos y bebidas despachados</p>
        </div>

        <div className="bg-white dark:bg-stone-900/40 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Facturación
          </span>
          <p className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ${ranking.totalFacturado.toLocaleString('es-AR')}
          </p>
          <p className="text-[10px] text-stone-400">Generado en el período</p>
        </div>

        <div className="bg-white dark:bg-stone-900/40 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" /> Plato Estrella (#1)
          </span>
          <p className="font-sans text-base font-extrabold text-stone-900 dark:text-stone-100 truncate" title={ranking.top5[0]?.nombre || 'Sin ventas'}>
            {ranking.top5[0]?.nombre || 'Sin datos'}
          </p>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
            {ranking.top5[0] ? `${ranking.top5[0].cantidad} ventas (${ranking.top5[0].porcentaje}%)` : '-'}
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900/40 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-500" /> Variedad de Platos
          </span>
          <p className="font-mono text-2xl font-black text-purple-700 dark:text-purple-400">
            {ranking.todos.length}
          </p>
          <p className="text-[10px] text-stone-400">Platos con ventas registradas</p>
        </div>
      </div>

      {/* TOP 5 PODIUM & DETAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* TOP 5 SHOWCASE (LG: 5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-stone-900/40 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#624A3E] dark:text-[#C8956A] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" /> Top 5 Platos Más Vendidos
            </h3>
            <span className="text-[10px] font-bold text-stone-400 uppercase">
              {periodo === 'hoy' ? 'Hoy' : periodo === 'semana' ? 'Esta Semana' : periodo === 'mes' ? 'Este Mes' : 'Todo'}
            </span>
          </div>

          {ranking.top5.length > 0 ? (
            <div className="space-y-3">
              {ranking.top5.map((item, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                const barColor = idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-[#624A3E]';

                return (
                  <div key={idx} className="p-3 bg-stone-50/80 dark:bg-stone-950/40 rounded-xl border border-stone-200/70 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base font-black w-6 text-center">{medal}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-stone-900 dark:text-stone-100 truncate">
                            {item.nombre}
                          </p>
                          <span className="text-[9px] text-stone-400 uppercase font-bold block">
                            {item.categoria}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-black text-stone-900 dark:text-stone-100">
                          {item.cantidad} {item.cantidad === 1 ? 'porción' : 'porciones'}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block font-bold">
                          ${item.totalVendido.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden flex items-center">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.round((item.cantidad / maxCantidad) * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-stone-400 space-y-2">
              <UtensilsCrossed className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs italic">Aún no hay ventas de platos registradas en este período.</p>
            </div>
          )}
        </div>

        {/* DIARY BREAKDOWN & FULL SEARCHABLE LIST (LG: 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* DESGLOSE POR DÍA DE LA SEMANA */}
          <div className="bg-white dark:bg-stone-900/40 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3.5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" /> Ventas por Día de la Semana
              </h3>
            </div>

            {/* Day Selector pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDia('todos')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-all border ${
                  selectedDia === 'todos'
                    ? 'bg-[#624A3E] text-white border-[#624A3E]'
                    : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
              >
                Todos los días
              </button>
              {diasDisponibles.map(dia => {
                const totalDia = Object.values(ranking.porDiaSemana[dia] || {}).reduce((s, c) => s + c, 0);
                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => setSelectedDia(dia)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-all border flex items-center gap-1.5 ${
                      selectedDia === dia
                        ? 'bg-[#624A3E] text-white border-[#624A3E]'
                        : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <span>{dia}</span>
                    {totalDia > 0 && (
                      <span className="bg-amber-400 text-stone-900 px-1 py-0.2 rounded-full text-[8px] font-black">
                        {totalDia}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Day content */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(selectedDia === 'todos' ? diasDisponibles : [selectedDia]).map(dia => {
                const entries = Object.entries(ranking.porDiaSemana[dia] || {}).sort((a, b) => b[1] - a[1]);
                if (entries.length === 0) {
                  return selectedDia === dia ? (
                    <p key={dia} className="text-xs text-stone-400 italic py-2">No se registraron ventas el día {dia}.</p>
                  ) : null;
                }

                return (
                  <div key={dia} className="p-3 bg-stone-50 dark:bg-stone-950/40 rounded-xl border border-stone-200/60 dark:border-stone-850 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-[#624A3E] dark:text-[#C8956A] block">
                      {dia}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {entries.map(([plato, count]) => (
                        <span key={plato} className="inline-flex items-center gap-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-2.5 py-1 rounded-lg text-xs font-bold text-stone-800 dark:text-stone-200 shadow-2xs">
                          <span>{plato}</span>
                          <span className="font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded text-[10px] font-black">
                            {count}x
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TABLA COMPLETA DE PLATOS */}
          <div className="bg-white dark:bg-stone-900/40 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> Todos los Platos ({filteredItems.length})
              </h3>
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar plato o categoría..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                />
              </div>
            </div>

            <div className="border border-stone-200/80 dark:border-stone-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 dark:text-stone-400 text-[10px] font-black uppercase sticky top-0 border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Plato</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3 text-right">Porciones</th>
                    <th className="py-2.5 px-3 text-right">Total Facturado</th>
                    <th className="py-2.5 px-3 text-right">% Ventas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-850 font-sans">
                  {filteredItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/60 dark:hover:bg-stone-950/30 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-stone-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-stone-900 dark:text-stone-100">{it.nombre}</td>
                      <td className="py-2 px-3 text-[10px] text-stone-500 uppercase">{it.categoria}</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-stone-900 dark:text-stone-100">
                        {it.cantidad}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${it.totalVendido.toLocaleString('es-AR')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-500">
                        {it.porcentaje}%
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400 italic">
                        No se encontraron platos con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
