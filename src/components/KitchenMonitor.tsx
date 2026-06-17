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
  onCambiarEstadoPedido: (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => boolean | void;
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
        text: 'Crítico (prioridad absoluta)',
        dot: 'bg-[#EF4444]'
      };
    }
  };

  const isColdPlate = (pedido: Pedido) => {
    if (pedido.estado_comanda !== 'listo') return false;
    return (pedido.segundos_en_listo ?? 0) >= 300;
  };

  const handleOptimisticStatus = (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => {
    if (optimisticUpdates.get(idPedido)?.updating) return;
    const accepted = onCambiarEstadoPedido(idPedido, nuevoEstado);
    if (accepted === false) return;

    setOptimisticUpdates(prev => new Map(prev).set(idPedido, { estado: nuevoEstado, updating: true }));
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
    const accepted = onCambiarEstadoPedido(cancelRequest.pedido.id_pedido, 'cancelado');
    if (accepted === false) return;
    setCancelRequest(null);
  };

  const renderOrderCard = (p: Pedido, estado: Pedido['estado_comanda']) => {
    const sem = estado === 'pendiente' || estado === 'en_cocina' ? getSemaforoInfo(p.minutos_transcurridos) : null;
    const cold = estado === 'listo' && isColdPlate(p);
    const holdMinutes = estado === 'listo' ? Math.floor((p.segundos_en_listo ?? 0) / 60) : 0;
    const isUpdating = optimisticUpdates.get(p.id_pedido)?.updating === true;

    const headerBg = {
      pendiente: 'bg-[#1E1E1E] text-[#E2E8F0] border-[#624A3E]/30',
      en_cocina: 'bg-[#624A3E] text-white border-[#624A3E]/30',
      listo: 'bg-[#1E1E1E] text-white border-emerald-900/30'
    }[estado];

    return (
      <div
        key={p.id_pedido}
        id={`kds-card-${estado}-${p.id_pedido}`}
        className={`rounded-2xl border shadow-md overflow-hidden relative ${
          estado === 'pendiente' ? 'border-stone-200/80 bg-white ' + (sem?.bg || '') :
          estado === 'en_cocina' ? 'border-amber-200 bg-white ring-1 ring-amber-400/10 ' + (sem?.bg || '') :
          `border-emerald-200 bg-white ring-1 ring-emerald-400/10 ${cold ? 'bg-blue-50/85 border-blue-200 animate-pulse text-blue-900' : ''}`
        }`}
      >
        {cold && (
          <div className="bg-blue-600 text-white text-[9px] uppercase font-bold tracking-wider rounded-none px-3 py-1 flex items-center gap-1 shadow">
            <Snowflake className="w-3.5 h-3.5 text-white animate-spin" />
            <span>Alerta: plato frío - {holdMinutes}m sin retirar</span>
          </div>
        )}

        <div className={`p-3 sm:p-3.5 flex justify-between items-center border-b shadow-inner ${headerBg}`}>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.75rem] sm:text-[2.2rem] font-black leading-none tracking-tighter text-white font-mono truncate">
              {p.numero_mesa.toUpperCase()}
            </span>
            <span className="text-[9px] uppercase font-bold text-amber-500 tracking-wider font-mono mt-1 truncate">Orden #{p.id_pedido}</span>
          </div>
          
          <div className="text-right flex flex-col items-end shrink-0">
            <span className="text-[9px] font-mono font-black uppercase text-stone-400 bg-stone-900 px-2 py-0.5 rounded-full">{p.origen}</span>
            <div className="flex items-center gap-1 mt-1 text-xs text-white font-mono bg-black/30 border border-stone-800 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-stone-300" />
              <span className="text-sm font-bold">{p.minutos_transcurridos}m</span>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          <div className="space-y-2">
            {p.items.map((it, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm font-sans text-stone-800 py-1.5 border-b border-stone-100 last:border-0">
                <span className="flex items-center gap-2 min-w-0">
                  <strong className="text-[1.1rem] sm:text-[1.3rem] font-black text-[#F97316] font-mono tracking-tight shrink-0">{it.cantidad}x</strong>
                  <span className="font-extrabold text-stone-900 text-sm sm:text-base leading-snug truncate">{it.nombre}</span>
                </span>
                <span className="text-[8px] uppercase tracking-wider font-extrabold font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md self-center shrink-0">
                  {isBarItem(it) ? 'Bar' : 'Fuego'}
                </span>
              </div>
            ))}
          </div>

          {p.observaciones && (
            <div className="bg-[#FEF3C7] text-amber-950 text-xs sm:text-sm p-3 rounded-xl border border-amber-300 italic font-medium leading-relaxed">
              <strong className="text-[10px] uppercase font-mono tracking-wider text-amber-800 not-italic block mb-0.5">Observación:</strong>
              "{p.observaciones}"
            </div>
          )}

          {estado === 'pendiente' && (
            <button
              onClick={() => handleOptimisticStatus(p.id_pedido, 'en_cocina')}
              disabled={isUpdating}
              className="w-full min-h-11 mt-2 py-2.5 px-3 bg-[#624A3E] hover:bg-[#503C32] active:scale-95 text-white rounded-xl text-sm font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#624A3E]/10 cursor-pointer border border-amber-950/20 animate-pulse disabled:opacity-60 disabled:cursor-wait"
            >
              {isUpdating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Actualizando...</>
              ) : (
                <><Flame className="w-4 h-4 text-[#F97316]" /> Iniciar fuego</>
              )}
            </button>
          )}

          {estado === 'en_cocina' && (
            <button
              onClick={() => handleOptimisticStatus(p.id_pedido, 'listo')}
              disabled={isUpdating}
              className="w-full min-h-11 mt-2 py-2.5 px-3 bg-[#F97316] hover:bg-[#EA580C] active:scale-95 text-white rounded-xl text-sm font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#F97316]/10 cursor-pointer border border-[#F97316]/20 disabled:opacity-60 disabled:cursor-wait"
            >
              {isUpdating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Actualizando...</>
              ) : (
                <><ChevronRight className="w-4 h-4" /> Terminado</>
              )}
            </button>
          )}

          {estado === 'listo' && (
            <button
              onClick={() => handleOptimisticStatus(p.id_pedido, 'entregado_cobrado')}
              disabled={isUpdating}
              className="w-full min-h-11 mt-2 py-2.5 px-3 bg-[#22C55E] hover:bg-[#16A34A] active:scale-95 text-white rounded-xl text-sm font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#22C55E]/10 cursor-pointer border border-[#22C55E]/20 disabled:opacity-60 disabled:cursor-wait"
            >
              {isUpdating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Actualizando...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Entregar y finalizar</>
              )}
            </button>
          )}

          <button
            onClick={() => setCancelRequest({
              pedido: p,
              title: estado === 'pendiente' ? 'Cancelar comanda pendiente' : 'Cancelar preparación en curso',
              detail: 'La orden saldrá de la cola de cocina y quedará marcada como cancelada.'
            })}
            disabled={isUpdating}
            className="w-full min-h-10 mt-2 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-red-200 shadow-sm disabled:opacity-60 disabled:cursor-wait"
          >
            Cancelar comanda
          </button>
        </div>
      </div>
    );
  };

  const renderColumn = (estado: Pedido['estado_comanda'], title: string, icon: React.ReactNode, colorClass: string, orders: Pedido[]) => (
    <div className={`space-y-3 sm:space-y-4 ${colorClass} p-3 sm:p-4 rounded-2xl border shadow-inner`}>
      <div className={`flex justify-between items-center p-2.5 sm:p-3 rounded-xl border shadow-sm ${
        estado === 'pendiente' ? 'bg-[#F59E0B]/10 border-[#F59E0B]/20' :
        estado === 'en_cocina' ? 'bg-[#F97316]/10 border-[#F97316]/20' :
        'bg-[#22C55E]/10 border-[#22C55E]/20'
      }`}>
        <h4 className={`font-black text-xs sm:text-sm tracking-tight flex items-center gap-1.5 font-sans ${
          estado === 'pendiente' ? 'text-amber-800' :
          estado === 'en_cocina' ? 'text-orange-800' :
          'text-emerald-800'
        }`}>
          {icon}
          {title}
        </h4>
        <span className={`${
          estado === 'pendiente' ? 'bg-[#F59E0B]' :
          estado === 'en_cocina' ? 'bg-[#F97316]' :
          'bg-[#22C55E]'
        } text-white text-[10px] sm:text-xs font-bold font-mono px-2 py-0.5 rounded-full`}>
          {orders.length}
        </span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {orders.length === 0 ? (
          <div className={`h-32 sm:h-40 border-2 border-dashed rounded-2xl flex flex-col justify-center items-center text-center p-3 ${
            estado === 'pendiente' ? 'border-slate-100' :
            estado === 'en_cocina' ? 'border-amber-100 bg-amber-50/10' :
            'border-emerald-100 bg-emerald-50/10'
          }`}>
            {estado === 'pendiente' ? (
              <><ChefHat className="w-8 h-8 text-slate-300 mb-2" /><p className="text-[11px] text-slate-400">Sin comandas pendientes</p></>
            ) : estado === 'en_cocina' ? (
              <><Flame className="w-8 h-8 text-amber-200 mb-2" /><p className="text-[11px] text-slate-400">Sin comandas activas en la hornalla</p></>
            ) : (
              <><Utensils className="w-8 h-8 text-emerald-200 mb-2" /><p className="text-[11px] text-slate-400">Sin comandas listas para servir</p></>
            )}
          </div>
        ) : (
          orders.map(p => renderOrderCard(p, estado))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6" id="kitchen-monitor-container">
      
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg shrink-0">
              <Grid className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm md:text-base text-slate-800 font-sans tracking-tight">Producción agrupada</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-sans truncate">Consolidado de preparaciones activas en fuegos.</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-900 text-white font-mono font-extrabold py-0.5 px-2 rounded-full shadow-sm w-fit">
            {batchProduction.reduce((sum, item) => sum + item.cantidad, 0)} unidades
          </span>
        </div>

        {batchProduction.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50/55 rounded-xl">No hay comida activa en la línea de fuegos.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {batchProduction.map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-sans shadow-sm transition-all hover:border-slate-350"
              >
                <span className="bg-slate-900 text-white text-[10px] font-extrabold font-mono w-6 h-6 rounded-full flex items-center justify-center">{item.cantidad}</span>
                <span className="font-semibold text-slate-700">{item.nombre}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar mesa, mozo o plato..."
            value={kitchenSearch}
            onChange={e => setKitchenSearch(e.target.value)}
            className="w-full min-h-11 pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
          />
        </div>
        <button
          onClick={() => setShowOnlyKitchen(!showOnlyKitchen)}
          className={`min-h-11 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
            showOnlyKitchen
              ? 'bg-[#624A3E] text-white border-[#624A3E]'
              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {showOnlyKitchen ? 'Solo Cocina' : 'Todo'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {renderColumn(
          'pendiente',
          'Pendientes (Ingresos)',
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-ping" />,
          'bg-[#F59E0B]/5 border-[#F59E0B]/20',
          activeKitchenOrders.filter(p => getEffectiveStatus(p) === 'pendiente')
        )}
        {renderColumn(
          'en_cocina',
          'En preparación (fuegos)',
          <Flame className="w-4 h-4 text-[#F97316] animate-pulse" />,
          'bg-[#F97316]/5 border-[#F97316]/20',
          activeKitchenOrders.filter(p => getEffectiveStatus(p) === 'en_cocina')
        )}
        {renderColumn(
          'listo',
          'Listos (A Servir)',
          <CheckCircle className="w-4 h-4 text-[#22C55E]" />,
          'bg-[#22C55E]/5 border-[#22C55E]/20',
          activeKitchenOrders.filter(p => getEffectiveStatus(p) === 'listo')
        )}
      </div>

      {cancelRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{cancelRequest.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{cancelRequest.detail}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCancelRequest(null)}
                className="flex-1 min-h-11 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold cursor-pointer hover:bg-stone-200"
              >
                Volver
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 min-h-11 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer hover:bg-red-700"
              >
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
