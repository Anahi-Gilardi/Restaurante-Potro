import React, { useMemo, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { 
  AlertTriangle,
  Flame, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  ChefHat, 
  Grid, 
  Snowflake, 
  X,
  Utensils,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Pedido, PedidoItem } from '../types';

interface KitchenMonitorProps {
  pedidos: Pedido[];
  onCambiarEstadoPedido: (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => void;
  onProducirPedidoConEscandallo: (idPedido: number) => void;
  minutosGlobal: number; // reference clock
}

const isBarItem = (item: PedidoItem) => {
  const categoria = item.categoria.toLowerCase();
  const nombre = item.nombre.toLowerCase();
  return (
    categoria.includes('bebida') ||
    categoria.includes('bodega') ||
    categoria.includes('vino') ||
    nombre.includes('vino') ||
    nombre.includes('gaseosa') ||
    nombre.includes('agua') ||
    nombre.includes('cerveza')
  );
};

const isKitchenItem = (item: PedidoItem) => !isBarItem(item);

type CancelRequest = {
  pedido: Pedido;
  title: string;
  detail: string;
};

export default function KitchenMonitor({
  pedidos,
  onCambiarEstadoPedido,
  onProducirPedidoConEscandallo,
  minutosGlobal
}: KitchenMonitorProps) {
  const [cancelRequest, setCancelRequest] = useState<CancelRequest | null>(null);
  const [kitchenSearch, setKitchenSearch] = useState('');
  const debouncedKitchenSearch = useDebounce(kitchenSearch, 300);
  const [showOnlyKitchen, setShowOnlyKitchen] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, { estado: Pedido['estado_comanda']; updating: boolean }>>(new Map());

  // Filter active orders inside the kitchen workflow
  const activeKitchenOrders = useMemo(() => {
    let filtered = pedidos.filter(p => {
      const effective = optimisticUpdates.get(p.id_pedido)?.estado || p.estado_comanda;
      return effective !== 'entregado_cobrado' && effective !== 'cancelado';
    });
    if (showOnlyKitchen) {
      filtered = filtered.map(p => ({
        ...p,
        items: p.items.filter(item => isKitchenItem(item))
      })).filter(p => p.items.length > 0);
    }
    if (debouncedKitchenSearch.trim()) {
      const q = debouncedKitchenSearch.toLowerCase();
      filtered = filtered.filter(p =>
        p.numero_mesa.toLowerCase().includes(q) ||
        p.mozo.toLowerCase().includes(q) ||
        p.items.some(it => it.nombre.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [pedidos, debouncedKitchenSearch, showOnlyKitchen, optimisticUpdates]);

  // Aggregate Batch Production (Modo Batch)
  const batchProduction = useMemo(() => {
    const totals: { [nombre: string]: { cantidad: number; categoria: string } } = {};
    
    activeKitchenOrders.forEach(p => {
      // Only sum items from 'pendiente' or 'en_cocina' stages (what is still to be made or currently on fire)
      if (p.estado_comanda === 'pendiente' || p.estado_comanda === 'en_cocina') {
        p.items.forEach(item => {
          if (isKitchenItem(item)) {
            if (!totals[item.nombre]) {
              totals[item.nombre] = { cantidad: 0, categoria: item.categoria };
            }
            totals[item.nombre].cantidad += item.cantidad;
          }
        });
      }
    });

    return Object.entries(totals).map(([nombre, meta]) => ({
      nombre,
      cantidad: meta.cantidad,
      categoria: meta.categoria
    })).filter(item => item.cantidad > 0);
  }, [activeKitchenOrders]);

  // Semáforo configuration matching specified metrics
  const getSemaforoInfo = (minutosTranscurridos: number) => {
    if (minutosTranscurridos <= 10) {
      return {
        bg: 'border-l-4 border-l-[#22C55E]/85 bg-white text-stone-800',
        badge: 'bg-[#22C55E] text-white',
        text: 'Óptimo',
        dot: 'bg-[#22C55E]'
      };
    } else if (minutosTranscurridos <= 18) {
      return {
        bg: 'border-l-4 border-l-[#F59E0B]/85 bg-white text-stone-800',
        badge: 'bg-[#F59E0B] text-white',
        text: 'Precaución',
        dot: 'bg-[#F59E0B]'
      };
    } else {
      return {
        bg: 'border-l-4 border-l-[#EF4444] bg-red-50/40 text-stone-900 animate-pulse',
        badge: 'bg-[#EF4444] text-white animate-bounce',
        text: 'Crítico (Prioridad Absoluta)',
        dot: 'bg-[#EF4444]'
      };
    }
  };

  // Helper: check if Listo for over 5 minutes (Quality Cold Plate logic)
  // Let's assume simulated seconds or minutes can trigger it. 
  // If segundos_en_listo is provided (derived in simulation state loop), we check if it is >= 300 (which is 5 minutes in real clock seconds or ticks)
  const isColdPlate = (pedido: Pedido) => {
    if (pedido.estado_comanda !== 'listo') return false;
    return (pedido.segundos_en_listo ?? 0) >= 300; // 5 minutes
  };

  const handleOptimisticStatus = (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => {
    setOptimisticUpdates(prev => new Map(prev).set(idPedido, { estado: nuevoEstado, updating: true }));
    onCambiarEstadoPedido(idPedido, nuevoEstado);
    setTimeout(() => {
      setOptimisticUpdates(prev => {
        const next = new Map(prev);
        next.delete(idPedido);
        return next;
      });
    }, 1500);
  };

  const getEffectiveStatus = (pedido: Pedido): Pedido['estado_comanda'] => {
    const optimistic = optimisticUpdates.get(pedido.id_pedido);
    return optimistic ? optimistic.estado : pedido.estado_comanda;
  };

  const confirmCancel = () => {
    if (!cancelRequest) return;
    onCambiarEstadoPedido(cancelRequest.pedido.id_pedido, 'cancelado');
    setCancelRequest(null);
  };

  return (
    <div className="space-y-6" id="kitchen-monitor-container">
      
      {/* SECTION VIEW: Modo Batch Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 font-sans tracking-tight">
                Vista de Producción Agrupada (Modo Batch)
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Consolidado total de preparaciones idénticas vigentes en freidoras y planchas en tiempo real.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-900 text-white font-mono font-extrabold py-0.5 px-2 rounded-full shadow-sm">
            {batchProduction.reduce((sum, item) => sum + item.cantidad, 0)} unidades activas
          </span>
        </div>

        {batchProduction.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50/55 rounded-xl">
            👨‍🍳 No hay comida activa en la línea de fuegos en este momento.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {batchProduction.map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-xs font-sans shadow-sm transition-all hover:border-slate-350"
              >
                <span className="bg-slate-900 text-white text-[10px] font-extrabold font-mono w-5 h-5 rounded-full flex items-center justify-center">
                  {item.cantidad}
                </span>
                <span className="font-semibold text-slate-700">{item.nombre}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar mesa, mozo o plato..."
            value={kitchenSearch}
            onChange={e => setKitchenSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
          />
        </div>
        <button
          onClick={() => setShowOnlyKitchen(!showOnlyKitchen)}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            showOnlyKitchen
              ? 'bg-[#624A3E] text-white border-[#624A3E]'
              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {showOnlyKitchen ? 'Solo Cocina' : 'Todo (Bar + Cocina)'}
        </button>
      </div>

      {/* KITCHEN KANBAN columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUMN 1: PENDIENTES (Amarillo Ámbar) */}
        <div className="space-y-4 bg-[#F59E0B]/5 p-4 rounded-2xl border border-[#F59E0B]/20 shadow-inner">
          <div className="flex justify-between items-center bg-[#F59E0B]/10 p-3 rounded-xl border border-[#F59E0B]/20 shadow-sm">
            <h4 className="font-extrabold text-amber-850 text-xs tracking-tight flex items-center gap-1.5 font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-ping"></span>
              PENDIENTES (Ingresos)
            </h4>
            <span className="bg-[#F59E0B] text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
              {activeKitchenOrders.filter(p => p.estado_comanda === 'pendiente').length}
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {activeKitchenOrders.filter(p => p.estado_comanda === 'pendiente').length === 0 ? (
              <div className="h-40 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col justify-center items-center text-center p-3">
                <ChefHat className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-[11px] text-slate-400">Sin comandas pendientes</p>
              </div>
            ) : (
              activeKitchenOrders.filter(p => p.estado_comanda === 'pendiente').map(p => {
                const sem = getSemaforoInfo(p.minutos_transcurridos);
                return (
                  <div
                    key={p.id_pedido}
                    id={`kds-card-pendiente-${p.id_pedido}`}
                    className={`bg-white rounded-2xl border border-stone-200/80 shadow-md overflow-hidden relative ${sem.bg}`}
                  >
                    {/* Header: Giant & legible from 2 meters away */}
                    <div className="bg-[#1E1E1E] text-[#E2E8F0] p-3.5 flex justify-between items-center border-b border-[#624A3E]/30 shadow-inner">
                      <div className="flex flex-col">
                        <span className="text-[2.2rem] font-black leading-none tracking-tighter text-white font-mono">
                          {p.numero_mesa.toUpperCase()}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-amber-500 tracking-wider font-mono mt-1">Orden #{p.id_pedido}</span>
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[9px] font-mono font-black uppercase text-stone-400 bg-stone-900 px-2 py-0.5 rounded-full">{p.origen}</span>
                        <div className="flex items-center gap-1 mt-1 text-xs text-white font-mono bg-black/30 border border-stone-800 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-stone-300" />
                          <span>{p.minutos_transcurridos}m</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body content */}
                    <div className="p-4 space-y-3.5">
                      {/* Items list with orange giant 3x format */}
                      <div className="space-y-2">
                        {p.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm font-sans text-stone-805 py-1.5 border-b border-stone-100 last:border-0">
                            <span className="flex items-center gap-2">
                              <strong className="text-[1.3rem] font-black text-[#F97316] font-mono tracking-tight shrink-0">{it.cantidad}x</strong>
                              <span className="font-extrabold text-stone-900 text-sm leading-snug">{it.nombre}</span>
                            </span>
                            <span className="text-[8px] uppercase tracking-wider font-extrabold font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md self-center">
                              {isBarItem(it) ? 'Bar' : 'Fuego'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Observaciones: Yellow box with italic text */}
                      {p.observaciones && (
                        <div className="bg-[#FEF3C7] text-amber-950 text-xs p-3 rounded-xl border border-amber-300 italic font-medium leading-relaxed my-2">
                          <strong className="text-[10px] uppercase font-mono tracking-wider text-amber-800 not-italic block mb-0.5">⚠️ Observación:</strong>
                          "{p.observaciones}"
                        </div>
                      )}

                      {/* Transfer controls */}
                      <button
                        onClick={() => handleOptimisticStatus(p.id_pedido, 'en_cocina')}
                        className="w-full mt-2 py-2 px-3 bg-[#624A3E] hover:bg-[#503C32] active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#624A3E]/10 cursor-pointer border border-amber-955/20 animate-pulse"
                      >
                        {optimisticUpdates.get(p.id_pedido)?.updating ? (
                          <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Actualizando...</>
                        ) : (
                          <><Flame className="w-3.5 h-3.5 text-[#F97316]" /> Iniciar Fuego (Marchar) 🔥</>
                        )}
                      </button>

                      <button
                        onClick={() => setCancelRequest({
                          pedido: p,
                          title: 'Cancelar comanda pendiente',
                          detail: 'La orden saldra de la cola de cocina y quedara marcada como cancelada.'
                        })}
                        className="w-full mt-2 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-red-200 shadow-sm"
                      >
                        Cancelar Comanda ❌
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: EN PREPARACIÓN (Naranja Fuego) */}
        <div className="space-y-4 bg-[#F97316]/5 p-4 rounded-2xl border border-[#F97316]/20 shadow-inner">
          <div className="flex justify-between items-center bg-[#F97316]/10 p-3 rounded-xl border border-[#F97316]/20 shadow-sm">
            <h4 className="font-black text-orange-850 text-xs tracking-tight flex items-center gap-1.5 font-sans">
              <Flame className="w-4 h-4 text-[#F97316] animate-pulse" />
              EN PREPARACIÓN (Fuegos)
            </h4>
            <span className="bg-[#F97316] text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
              {activeKitchenOrders.filter(p => p.estado_comanda === 'en_cocina').length}
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {activeKitchenOrders.filter(p => p.estado_comanda === 'en_cocina').length === 0 ? (
              <div className="h-40 border-2 border-dashed border-amber-100 rounded-2xl flex flex-col justify-center items-center text-center p-3 bg-amber-50/10">
                <Flame className="w-8 h-8 text-amber-200 mb-2" />
                <p className="text-[11px] text-slate-400">Sin comandas activas en la hornalla</p>
              </div>
            ) : (
              activeKitchenOrders.filter(p => p.estado_comanda === 'en_cocina').map(p => {
                const sem = getSemaforoInfo(p.minutos_transcurridos);
                return (
                  <div
                    key={p.id_pedido}
                    id={`kds-card-fuego-${p.id_pedido}`}
                    className={`bg-white rounded-2xl border border-amber-200 shadow-md overflow-hidden relative ${sem.bg} ring-1 ring-amber-400/10`}
                  >
                    {/* Header: Giant & legible from 2 meters away */}
                    <div className="bg-[#624A3E] text-white p-3.5 flex justify-between items-center border-b border-[#624A3E]/30 shadow-inner">
                      <div className="flex flex-col">
                        <span className="text-[2.2rem] font-black leading-none tracking-tighter text-white font-mono">
                          {p.numero_mesa.toUpperCase()}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-amber-200 tracking-wider font-mono mt-1 font-sans">Orden #{p.id_pedido}</span>
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[9px] font-mono font-black uppercase text-amber-200 bg-amber-900 border border-amber-800/10 px-2 py-0.5 rounded-full">{p.origen}</span>
                        <div className="flex items-center gap-1 mt-1 text-xs text-white font-mono bg-[#1E1E1E]/30 border border-stone-850 px-2 py-0.5 rounded-full">
                          <Flame className="w-3 h-3 text-orange-400 animate-pulse" />
                          <span>{p.minutos_transcurridos}m</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body Content */}
                    <div className="p-4 space-y-3.5">
                      {/* Items list with orange giant 3x format */}
                      <div className="space-y-2">
                        {p.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm font-sans text-stone-805 py-1.5 border-b border-stone-100 last:border-0 font-sans">
                            <span className="flex items-center gap-2">
                              <strong className="text-[1.3rem] font-black text-[#F97316] font-mono tracking-tight shrink-0">{it.cantidad}x</strong>
                              <span className="font-extrabold text-stone-900 text-sm leading-snug">{it.nombre}</span>
                            </span>
                            <span className="text-[8px] uppercase tracking-wider font-extrabold font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md self-center">
                              {isBarItem(it) ? 'Bar' : 'Cocina'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Observaciones: Yellow box with italic text */}
                      {p.observaciones && (
                        <div className="bg-[#FEF3C7] text-amber-950 text-xs p-3 rounded-xl border border-amber-300 italic font-medium leading-relaxed my-2">
                          <strong className="text-[10px] uppercase font-mono tracking-wider text-amber-800 not-italic block mb-0.5">⚠️ Observación:</strong>
                          "{p.observaciones}"
                        </div>
                      )}

                      {/* Transfer controls: Mark order as fully ready to serve */}
                      <button
                        onClick={() => { handleOptimisticStatus(p.id_pedido, 'listo'); onProducirPedidoConEscandallo(p.id_pedido); }}
                        className="w-full mt-2 py-2.5 px-3 bg-[#F97316] hover:bg-[#EA580C] active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#F97316]/10 cursor-pointer border border-[#F97316]/20"
                      >
                        {optimisticUpdates.get(p.id_pedido)?.updating ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Actualizando...</>
                        ) : (
                          <><ChevronRight className="w-4 h-4" /> ¡Terminado! (Listo para Servir) 🍽️</>
                        )}
                      </button>

                      <button
                        onClick={() => setCancelRequest({
                          pedido: p,
                          title: 'Cancelar preparacion en curso',
                          detail: 'La comanda se cancela desde cocina. Revise stock si ya se habian consumido insumos.'
                        })}
                        className="w-full mt-2 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-red-200 shadow-sm"
                      >
                        Cancelar y Reversar Insumos ❌
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: LISTO PARA SERVIR (Verde Oliva Activo) */}
        <div className="space-y-4 bg-[#22C55E]/5 p-4 rounded-2xl border border-[#22C55E]/20 shadow-inner">
          <div className="flex justify-between items-center bg-[#22C55E]/10 p-3 rounded-xl border border-[#22C55E]/20 shadow-sm">
            <h4 className="font-black text-emerald-850 text-xs tracking-tight flex items-center gap-1.5 font-sans">
              <CheckCircle className="w-4 h-4 text-[#22C55E]" />
              LISTOS (A Servir / Retirada)
            </h4>
            <span className="bg-[#22C55E] text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
              {activeKitchenOrders.filter(p => p.estado_comanda === 'listo').length}
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {activeKitchenOrders.filter(p => p.estado_comanda === 'listo').length === 0 ? (
              <div className="h-40 border-2 border-dashed border-emerald-100 rounded-2xl flex flex-col justify-center items-center text-center p-3 bg-emerald-50/10">
                <Utensils className="w-8 h-8 text-emerald-200 mb-2" />
                <p className="text-[11px] text-slate-400">Sin comandas listas para servir</p>
              </div>
            ) : (
              activeKitchenOrders.filter(p => p.estado_comanda === 'listo').map(p => {
                const cold = isColdPlate(p);
                const holdMinutes = Math.floor((p.segundos_en_listo ?? 0) / 60);
                
                return (
                  <div
                    key={p.id_pedido}
                    id={`kds-card-listo-${p.id_pedido}`}
                    className={`bg-white rounded-2xl border border-emerald-200 shadow-md overflow-hidden relative ring-1 ring-emerald-400/10 ${
                      cold 
                        ? 'bg-blue-50/85 border-blue-200 animate-pulse text-blue-900' 
                        : ''
                    }`}
                  >
                    
                    {/* FROZEN PLATE QUALITY WARNING (TEMP 5 MIN ALERTS) */}
                    {cold && (
                      <div className="bg-blue-600 text-white text-[9px] uppercase font-bold tracking-wider rounded-none px-3 py-1 flex items-center gap-1 shadow">
                        <Snowflake className="w-3.5 h-3.5 text-white animate-spin" />
                        <span>Alerta: Plato Frío • {holdMinutes}m sin retirar!</span>
                      </div>
                    )}

                    {/* Header: Giant & legible from 2 meters away */}
                    <div className="bg-[#1E1E1E] text-white p-3.5 flex justify-between items-center border-b border-emerald-900/30 shadow-inner">
                      <div className="flex flex-col">
                        <span className="text-[2.2rem] font-black leading-none tracking-tighter text-white font-mono">
                          {p.numero_mesa.toUpperCase()}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-emerald-300 tracking-wider font-mono mt-1">Orden #{p.id_pedido}</span>
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[9px] font-mono font-black uppercase text-emerald-305 bg-emerald-950 px-2 py-0.5 rounded-full">Listo</span>
                        {(p.segundos_en_listo ?? 0) > 0 ? (
                          <span className="text-[10px] font-extrabold font-mono text-emerald-400 mt-1">Demora: {holdMinutes}m</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Card Body Content */}
                    <div className="p-4 space-y-3.5">
                      {/* Items list with line through but highlighted OK badge */}
                      <div className="space-y-2">
                        {p.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm font-sans text-stone-805 py-1.5 border-b border-stone-100 last:border-0">
                            <span className="flex items-center gap-2 max-w-[70%]">
                              <strong className="text-[1.3rem] font-black text-[#22C55E] font-mono tracking-tight shrink-0">{it.cantidad}x</strong>
                              <span className="font-extrabold text-stone-900 text-sm leading-snug line-through opacity-50">{it.nombre}</span>
                            </span>
                            <span className="bg-emerald-100 text-emerald-805 text-[9px] px-2 py-0.5 rounded-full font-black uppercase inline-flex items-center">
                              OK ✅
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Observaciones: Yellow box with italic text */}
                      {p.observaciones && (
                        <div className="bg-[#FEF3C7] text-amber-950 text-xs p-3 rounded-xl border border-amber-300 italic font-medium leading-relaxed my-2">
                          <strong className="text-[10px] uppercase font-mono tracking-wider text-amber-800 not-italic block mb-0.5">⚠️ Observación:</strong>
                          "{p.observaciones}"
                        </div>
                      )}

                      {/* Complete/Deliver Trigger with explicit text highlighting archival */}
                      <button
                        onClick={() => handleOptimisticStatus(p.id_pedido, 'entregado_cobrado')}
                        className={`w-full mt-2 py-2 px-3 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all shadow-md cursor-pointer border ${
                          cold 
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/10' 
                            : 'bg-[#22C55E] hover:bg-[#16a34a] text-white shadow-emerald-500/10'
                        }`}
                      >
                        {optimisticUpdates.get(p.id_pedido)?.updating ? (
                          <span className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px]">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Archivando...
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px]">
                              <Utensils className="w-3.5 h-3.5" />
                              Entregar a Mesa (Servido) 🍽️
                            </span>
                            <span className="text-[9px] font-medium opacity-90 block">
                              [Acción: Archivar de Cocina y transferir a cuenta]
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {cancelRequest && (
        <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-100 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-red-900 uppercase">{cancelRequest.title}</h3>
                  <p className="text-xs text-red-700 mt-1">{cancelRequest.detail}</p>
                </div>
              </div>
              <button onClick={() => setCancelRequest(null)} className="p-1 rounded-lg text-red-500 hover:bg-red-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-[10px] font-black text-stone-400 uppercase">Comanda seleccionada</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-black text-stone-900 font-mono">{cancelRequest.pedido.numero_mesa}</span>
                  <span className="text-xs font-bold text-stone-500">Orden #{cancelRequest.pedido.id_pedido}</span>
                </div>
                <p className="text-xs text-stone-600 mt-1">{cancelRequest.pedido.items.length} articulos - Mozo {cancelRequest.pedido.mozo}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCancelRequest(null)}
                  className="py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-xs font-black uppercase hover:bg-stone-50"
                >
                  Volver
                </button>
                <button
                  onClick={confirmCancel}
                  className="py-2.5 rounded-xl bg-red-600 text-white text-xs font-black uppercase hover:bg-red-500 shadow-sm"
                >
                  Confirmar cancelacion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
