import React, { useMemo, useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  ChevronRight, 
  Bell, 
  AlertTriangle, 
  Flame, 
  Trophy,
  Search,
  X
} from 'lucide-react';
import { Mesa, Pedido, Insumo, ProductoMenu, Usuario } from '../types';
import { AppView } from '../lib/permissions';
import { getTableActiveInfo } from '../lib/tableOrders';
import { ventasPlatosService, RankingItem } from '../services/ventasPlatosService';
import ElPatronLogo from './ElPatronLogo';

interface HomeMenuModuleProps {
  activeRol: Usuario['rol'];
  mesas: Mesa[];
  pedidos: Pedido[];
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  usuarios: Usuario[];
  allowedViews: AppView[];
  canChangeUser: boolean;
  activeMozo: string;
  onMozoChange: (mozo: string) => void;
  onNavigate: (view: any) => void;
  getSimulatedTimeStr: () => string;
  autoTimerRunning: boolean;
  onToggleAutoTimer: () => void;
  onAdvanceTime: (mins: number) => void;
}

export default function HomeMenuModule({
  activeRol,
  mesas,
  pedidos,
  insumos,
  productosMenu,
  usuarios,
  allowedViews,
  canChangeUser,
  activeMozo,
  onMozoChange,
  onNavigate,
  getSimulatedTimeStr,
  autoTimerRunning,
  onToggleAutoTimer,
  onAdvanceTime
}: HomeMenuModuleProps) {
  
  // Ranking de Platos Más Vendidos (con integración de ventas_platos y fallback en vivo)
  const [rankingPeriodo, setRankingPeriodo] = useState<'semana' | 'mes' | 'hoy'>('mes');
  const [ventasPlatosRows, setVentasPlatosRows] = useState(() => ventasPlatosService.getLocalCache());
  const [showModalRanking, setShowModalRanking] = useState(false);
  const [searchPlatoRanking, setSearchPlatoRanking] = useState('');

  useEffect(() => {
    let mounted = true;
    ventasPlatosService.list(false).then(rows => {
      if (mounted && rows && rows.length > 0) {
        setVentasPlatosRows(rows);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const fullRankingResult = useMemo(() => {
    const res = ventasPlatosService.calculateRanking(ventasPlatosRows, rankingPeriodo);
    if (res.todos.length > 0) {
      return res;
    }

    // Fallback con comandas activas/entregadas en memoria si aún no hay cierres registrados
    const counts: Record<string, { id_producto: string; nombre: string; categoria: string; cantidad: number; totalVendido: number }> = {};
    pedidos.forEach(p => {
      if (p.estado_comanda !== 'cancelado') {
        p.items.forEach(item => {
          const prod = productosMenu.find(pr => pr.id_producto === item.id_producto);
          const name = item.nombre || prod?.nombre || item.id_producto;
          const cat = prod?.categoria || 'General';
          const price = item.precio_unitario ?? prod?.precio_venta ?? 0;
          if (!counts[name]) {
            counts[name] = { id_producto: item.id_producto, nombre: name, categoria: cat, cantidad: 0, totalVendido: 0 };
          }
          counts[name].cantidad += Number(item.cantidad) || 0;
          counts[name].totalVendido += (Number(item.cantidad) || 0) * price;
        });
      }
    });

    const totalCant = Object.values(counts).reduce((s, c) => s + c.cantidad, 0);
    const totalFact = Object.values(counts).reduce((s, c) => s + c.totalVendido, 0);
    const sorted: RankingItem[] = Object.values(counts)
      .sort((a, b) => b.cantidad - a.cantidad || b.totalVendido - a.totalVendido)
      .map(c => ({
        ...c,
        porcentaje: totalCant > 0 ? Math.round((c.cantidad / totalCant) * 100) : 0,
        precioPromedio: c.cantidad > 0 ? Math.round(c.totalVendido / c.cantidad) : 0
      }));

    return {
      periodo: rankingPeriodo,
      fechaInicio: '',
      fechaFin: '',
      totalPorciones: totalCant,
      totalFacturado: totalFact,
      top5: sorted.slice(0, 5),
      todos: sorted,
      porDiaSemana: {} as Record<string, Record<string, number>>,
      porCategoria: {} as Record<string, { cantidad: number; total: number }>
    };
  }, [ventasPlatosRows, rankingPeriodo, pedidos, productosMenu]);

  const rankingTop5 = fullRankingResult.top5;
  const rankingTodos = fullRankingResult.todos;

  const maxDishQty = useMemo(() => {
    if (rankingTodos.length === 0) return 1;
    return Math.max(...rankingTodos.map(i => i.cantidad), 1);
  }, [rankingTodos]);

  const filteredModalRanking = useMemo(() => {
    if (!searchPlatoRanking.trim()) return rankingTodos;
    const q = searchPlatoRanking.toLowerCase().trim();
    return rankingTodos.filter(d => 
      d.nombre.toLowerCase().includes(q) || 
      d.categoria.toLowerCase().includes(q)
    );
  }, [rankingTodos, searchPlatoRanking]);

  useEffect(() => {
    if (!showModalRanking) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModalRanking(false);
        setSearchPlatoRanking('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModalRanking]);

  // Ordenar mesas numéricamente para el mapa
  const sortedMesas = useMemo(() => {
    return [...mesas].sort((a, b) => String(a.numero_mesa || '').localeCompare(String(b.numero_mesa || ''), undefined, { numeric: true }));
  }, [mesas]);

  // Mapear qué mozo está asignado a cada mesa activa
  const mesaMozoMap = useMemo(() => {
    const map = new Map<string, string>();
    pedidos.forEach(p => {
      if (p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado') {
        map.set(String(p.id_mesa), p.mozo);
      }
    });
    return map;
  }, [pedidos]);

  // Live Alerts scanning
  const activeAlerts = useMemo(() => {
    const alerts: { text: string; action: any; type: 'warning' | 'info' | 'danger' }[] = [];
    


    const waitingTables = mesas.filter(m => m.estado === 'esperando_cuenta');
    if (waitingTables.length > 0) {
      alerts.push({
        text: `${waitingTables.length} mesas solicitando la cuenta.`,
        action: 'caja',
        type: 'warning'
      });
    }

    const delayedCookings = pedidos.filter(p => (p.estado_comanda === 'pendiente' || p.estado_comanda === 'en_cocina') && p.minutos_transcurridos > 15);
    if (delayedCookings.length > 0 && allowedViews.includes('cocina')) {
      alerts.push({
        text: `${delayedCookings.length} comandas demoradas en cocina (> 15m).`,
        action: 'cocina',
        type: 'danger'
      });
    }

    return alerts;
  }, [insumos, mesas, pedidos]);



  return (
    <div className="space-y-8 animate-fadeIn text-left" id="home-operational-menu">
      
      {/* 1. Impact Brand Header Block */}
      <div className="bg-gradient-to-br from-[#8C6239] via-[#B97F47] to-[#2E190E] rounded-3xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 border border-[#C8956A]/20">
        <div className="absolute right-[-25px] bottom-[-25px] opacity-10 rotate-12 scale-110 pointer-events-none">
          <ElPatronLogo className="w-64 h-64" variant="icon" color="#FFFDF8" />
        </div>
        
        <div className="w-24 h-24 md:w-28 md:h-28 bg-[#FFFDF8] rounded-full flex items-center justify-center p-1.5 shadow-lg border border-white/10 shrink-0 relative z-10">
          <ElPatronLogo className="w-full h-full object-contain rounded-full" variant="badge" color="#8C6239" />
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="bg-[#22C55E]/20 text-emerald-300 border border-[#22C55E]/30 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
            <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
            Servicio Activo
          </span>
        </div>

        <div className="flex-1 space-y-2.5 relative z-10 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#FFFDF8] font-sans">
            Bienvenido a El Patrón
          </h2>
          <p className="text-base md:text-lg text-[#FAF4EE]/90 font-medium leading-relaxed max-w-xl">
            Sistema integral de gestión gastronómica diseñado para el control operativo absoluto en cocina, salón, caja, facturación e inventario de alta precisión.
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
            <span className="bg-white/10 text-amber-250 text-[11px] px-3 py-1 rounded-full font-bold border border-white/5 font-mono">
              Estación Principal Terminal POS
            </span>
          </div>
        </div>
      </div>

      {/* Live Action Center - Notifications bell */}
      {activeAlerts.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-3xl p-5 max-w-7xl mx-auto space-y-3 shadow-md backdrop-blur-md">
          <h4 className="text-xs font-black text-amber-950 dark:text-amber-100 uppercase tracking-widest flex items-center gap-1.5 font-sans">
            <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
            Centro de Mensajes y Alertas en Vivo
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeAlerts.map((alert, idx) => (
              <div 
                key={idx} 
                onClick={() => onNavigate(alert.action)}
                className="p-3.5 rounded-2xl border flex justify-between items-center text-xs font-semibold cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all bg-white/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${alert.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
                  <span className="text-stone-800 dark:text-stone-200 leading-snug">{alert.text}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAPA VISUAL DEL SALÓN (IN LIVE MAP) */}
      <div className="max-w-7xl mx-auto bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-850 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-105 dark:border-stone-800 pb-3">
          <div>
            <h4 className="text-sm font-black text-stone-850 dark:text-white uppercase flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-orange-600 animate-pulse" />
              Mapa Visual del Salón (Monitoreo Rápido)
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">Haz clic en cualquier mesa ocupada para editar su comanda directamente.</p>
          </div>

          {/* Referencias */}
          <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase">
            <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Libre</span>
            <span className="flex items-center gap-1 text-rose-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Ocupada</span>
            <span className="flex items-center gap-1 text-amber-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" /> Cuenta</span>
          </div>
        </div>

        {/* Cuadrícula de Mesas */}
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-4 pt-2">
          {sortedMesas.map(m => {
            const info = getTableActiveInfo(m, pedidos);
            let tableStyle = 'bg-emerald-50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-350 dark:border-emerald-900/50';
            if (info.isOcupada) tableStyle = 'bg-rose-50 text-rose-800 border-rose-250 dark:bg-rose-955/20 dark:text-rose-355 dark:border-rose-900/50';
            else if (info.isInCuenta) tableStyle = 'bg-amber-50 text-amber-800 border-amber-250 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/50 animate-pulse shadow-md shadow-amber-400/5';

            const mozoAsignado = mesaMozoMap.get(String(m.id_mesa));

            return (
              <button
                key={m.id_mesa}
                onClick={() => {
                  if (info.isOcupada || info.isInCuenta) {
                    onNavigate('mozo');
                  } else {
                    onNavigate('mesas');
                  }
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${tableStyle}`}
              >
                <span className="text-xs font-black uppercase tracking-tight">{m.numero_mesa}</span>
                <span className="text-[9px] font-semibold opacity-70 mt-0.5">{info.comensales ?? m.comensales ?? '?'} pax</span>
                {mozoAsignado && info.isOcupada && (
                  <span className="text-[8px] font-black uppercase tracking-widest mt-1 bg-black/5 dark:bg-white/5 px-1 rounded truncate max-w-full">
                    👤 {mozoAsignado.split(' ')[0]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN DE RANKING DE PLATOS MÁS VENDIDOS */}
      <div className="max-w-7xl mx-auto">
        
        {/* WIDGET TOP 5 PLATOS MÁS VENDIDOS */}
        <div className="w-full bg-white dark:bg-stone-900 p-5 md:p-6 rounded-3xl border border-stone-200 dark:border-stone-850 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-105 dark:border-stone-800 pb-3">
              <div>
                <h4 className="text-sm font-black text-stone-900 dark:text-stone-100 uppercase flex items-center gap-2">
                  <Trophy className="w-4.5 h-4.5 text-amber-500" />
                  Platos Estrella & Más Vendidos
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Rendimiento y contabilización de ventas en tiempo real.
                </p>
              </div>

              {/* Selector de período rápido */}
              <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-[10px] font-extrabold">
                {[
                  { key: 'hoy', label: 'Hoy' },
                  { key: 'semana', label: 'Semana' },
                  { key: 'mes', label: 'Mes' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setRankingPeriodo(tab.key as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer border-none ${
                      rankingPeriodo === tab.key
                        ? 'bg-[#624A3E] text-white font-black shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 bg-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado de Platos */}
            {rankingTop5.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {rankingTop5.map((dish, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  const barColor = idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-[#624A3E]';

                  return (
                    <div key={idx} className="p-3 bg-stone-50/70 dark:bg-stone-950/40 rounded-2xl border border-stone-150 dark:border-stone-800/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-sm font-black w-5 text-center shrink-0">{medal}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-stone-900 dark:text-stone-100 truncate">
                              {dish.nombre}
                            </p>
                            <span className="text-[9px] text-stone-400 uppercase font-bold block">
                              {dish.categoria}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-black text-stone-900 dark:text-stone-100">
                            {dish.cantidad} {dish.cantidad === 1 ? 'porción' : 'porciones'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block font-bold">
                            ${dish.totalVendido.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden flex items-center">
                        <div
                          className={`h-full ${barColor} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.round((dish.cantidad / maxDishQty) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-stone-400 space-y-1.5">
                <UtensilsCrossed className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs italic">Aún no hay ventas de platos registradas en este período.</p>
              </div>
            )}
          </div>

          {/* Footer link to full ranking */}
          <div className="pt-3 border-t border-stone-105 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="text-[10px] text-stone-400 font-medium">
              Top 5 más vendidos {rankingTodos.length > 5 ? `(de ${rankingTodos.length} platos)` : ''}
            </span>
            <button
              type="button"
              onClick={() => setShowModalRanking(true)}
              className="text-xs font-extrabold text-[#624A3E] dark:text-[#C8956A] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
            >
              <span>Ver Ranking Completo y Estadísticas {rankingTodos.length > 0 ? `(${rankingTodos.length})` : ''}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>



      {/* MODAL RANKING COMPLETO DE PLATOS VENDIDOS */}
      {showModalRanking && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
          onClick={() => {
            setShowModalRanking(false);
            setSearchPlatoRanking('');
          }}
        >
          <div 
            className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-stone-150 dark:border-stone-800 flex items-start justify-between gap-4 bg-stone-50/50 dark:bg-stone-950/30">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                </span>
                <div>
                  <h3 className="font-serif font-black text-base sm:text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    Ranking Completo de Ventas
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                    Todos los platos y bebidas vendidos en el período seleccionado.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModalRanking(false);
                  setSearchPlatoRanking('');
                }}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer border-none bg-transparent"
                aria-label="Cerrar modal de ranking"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-header con Selector de Período, Métricas y Buscador */}
            <div className="p-4 sm:p-5 border-b border-stone-150 dark:border-stone-800/80 space-y-3 bg-white dark:bg-stone-900">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
                {/* Selector Período */}
                <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-extrabold">
                  {[
                    { key: 'hoy', label: 'Hoy' },
                    { key: 'semana', label: 'Esta Semana' },
                    { key: 'mes', label: 'Este Mes' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setRankingPeriodo(tab.key as any)}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer border-none ${
                        rankingPeriodo === tab.key
                          ? 'bg-[#624A3E] text-white shadow-xs font-black'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 bg-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Métricas resumidas */}
                <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
                  <span className="font-extrabold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800/60 px-2.5 py-1 rounded-lg">
                    🍽️ {fullRankingResult.totalPorciones} porciones
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                    💰 ${fullRankingResult.totalFacturado.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Input Buscador */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchPlatoRanking}
                  onChange={e => setSearchPlatoRanking(e.target.value)}
                  placeholder="Buscar plato o categoría en el ranking..."
                  className="w-full pl-9.5 pr-4 py-2.5 bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#624A3E]"
                />
              </div>
            </div>

            {/* Lista Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2.5">
              {filteredModalRanking.length > 0 ? (
                filteredModalRanking.map((dish, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  const barColor = idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-[#624A3E]';

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-stone-50/80 dark:bg-stone-950/40 rounded-2xl border border-stone-150 dark:border-stone-800/80 space-y-1.5 hover:border-stone-300 dark:hover:border-stone-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-sm font-black w-6 text-center shrink-0">{medal}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-stone-900 dark:text-stone-100 truncate">
                              {dish.nombre}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-stone-400 uppercase font-bold">
                                {dish.categoria}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-black text-stone-900 dark:text-stone-100">
                            {dish.cantidad} {dish.cantidad === 1 ? 'porción' : 'porciones'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block font-bold">
                            ${dish.totalVendido.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden flex items-center">
                        <div
                          className={`h-full ${barColor} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.round((dish.cantidad / maxDishQty) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-stone-400 space-y-1.5">
                  <UtensilsCrossed className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs italic">
                    {searchPlatoRanking ? 'No se encontraron platos que coincidan con la búsqueda.' : 'No hay ventas de platos registradas en este período.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-stone-150 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-2.5 bg-stone-50/50 dark:bg-stone-950/30">
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                Mostrando {filteredModalRanking.length} de {rankingTodos.length} platos vendidos
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalRanking(false);
                    try {
                      sessionStorage.setItem('menu_active_tab', 'ranking');
                    } catch {}
                    onNavigate('menu');
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-bold text-[#624A3E] dark:text-[#C8956A] hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all cursor-pointer border-none bg-transparent text-center"
                >
                  Estadísticas avanzadas en Menú →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModalRanking(false);
                    setSearchPlatoRanking('');
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-black rounded-xl transition-all cursor-pointer border-none shadow-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
