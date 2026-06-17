import React, { useMemo, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import {
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle,
  ChefHat,
  Snowflake,
  X,
  Utensils,
  Search,
  Filter,
  RefreshCw,
  Pencil,
  LayoutGrid,
  CircleDot
} from 'lucide-react';
import { Pedido, PedidoItem } from '../types';

interface KitchenMonitorProps {
  pedidos: Pedido[];
  onCambiarEstadoPedido: (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => void;
  onProducirPedidoConEscandallo: (idPedido: number) => void;
  minutosGlobal: number;
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
        border: 'border-l-[#2e8b57]',
        timeDot: 'bg-[#2e8b57]',
        timeText: 'text-[#2e8b57]'
      };
    } else if (minutosTranscurridos <= 18) {
      return {
        border: 'border-l-[#a0522d]',
        timeDot: 'bg-[#a0522d]',
        timeText: 'text-[#a0522d]'
      };
    } else {
      return {
        border: 'border-l-[#c0392b]',
        timeDot: 'bg-[#c0392b] animate-pulse',
        timeText: 'text-[#c0392b]'
      };
    }
  };

  const isColdPlate = (pedido: Pedido) => {
    if (pedido.estado_comanda !== 'listo') return false;
    return (pedido.segundos_en_listo ?? 0) >= 300;
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

  const renderTicket = (p: Pedido, estado: Pedido['estado_comanda']) => {
    const sem = estado === 'pendiente' || estado === 'en_cocina' ? getSemaforoInfo(p.minutos_transcurridos) : null;
    const cold = estado === 'listo' && isColdPlate(p);
    const holdMinutes = estado === 'listo' ? Math.floor((p.segundos_en_listo ?? 0) / 60) : 0;

    const headerTheme = {
      pendiente: 'bg-[#4b3621] text-[#f4ecd8]',
      en_cocina: 'bg-[#a0522d] text-[#f4ecd8]',
      listo: 'bg-[#2e8b57] text-[#f4ecd8]'
    }[estado];

    const btnTheme = {
      pendiente: 'bg-[#4b3621] hover:bg-[#3a2a19] text-[#f4ecd8] border-[#4b3621]',
      en_cocina: 'bg-[#a0522d] hover:bg-[#8a4626] text-[#f4ecd8] border-[#a0522d]',
      listo: 'bg-[#2e8b57] hover:bg-[#247a4b] text-[#f4ecd8] border-[#2e8b57]'
    }[estado];

    return (
      <div
        key={p.id_pedido}
        className={`rounded-[20px] border border-[#d4b89a] bg-[#f4ecd8] shadow-[0_8px_15px_rgba(0,0,0,0.1)] overflow-hidden relative ${sem?.border || ''} border-l-4`}
      >
        {cold && (
          <div className="bg-[#c0392b] text-[#f4ecd8] text-[9px] uppercase font-black tracking-wider px-4 py-1.5 flex items-center gap-1.5 shadow">
            <Snowflake className="w-3.5 h-3.5 animate-spin" />
            <span>Alerta: Plato Frío • {holdMinutes}m sin retirar</span>
          </div>
        )}

        <div className={`p-4 flex justify-between items-start ${headerTheme} shadow-inner`}>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.6rem] sm:text-[2rem] font-black leading-none tracking-tight uppercase font-serif truncate">
              {p.numero_mesa}
            </span>
            <span className="text-[10px] uppercase font-black tracking-widest opacity-70 font-mono mt-1 truncate">
              Orden #{p.id_pedido}
            </span>
          </div>

          <div className="text-right flex flex-col items-end shrink-0 gap-1">
            <span className="text-[9px] font-black uppercase text-[#f4ecd8] bg-black/30 px-2 py-0.5 rounded-full">
              {p.origen || 'MOZO'}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono bg-black/20 border border-black/10 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-[#e2dabf]" />
              <span className={`text-sm font-black ${sem?.timeText || 'text-[#f4ecd8]'}`}>{p.minutos_transcurridos}m</span>
              {sem && <span className={`w-1.5 h-1.5 rounded-full ${sem.timeDot}`} />}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-2">
            {p.items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 py-2.5 border-b border-dashed border-[#d4b89a] last:border-0"
              >
                <span className="text-lg font-black text-[#a0522d] font-mono shrink-0">
                  {it.cantidad}x
                </span>
                <span className="flex-1 font-bold text-[#4b3621] text-sm leading-snug truncate">
                  {it.nombre}
                </span>
                <span className="text-[9px] uppercase font-black tracking-wider text-[#4b3621]/60 bg-[#e2dabf] px-2 py-0.5 rounded-md shrink-0">
                  {isBarItem(it) ? 'BAR' : 'FUEGO'}
                </span>
              </div>
            ))}
          </div>

          {p.observaciones && (
            <div className="bg-[#e2dabf] text-[#4b3621] text-xs p-3 rounded-xl border border-[#d4b89a] italic font-medium leading-relaxed">
              <strong className="text-[10px] uppercase font-black tracking-wider text-[#a0522d] not-italic block mb-0.5">
                ⚠️ Observación:
              </strong>
              "{p.observaciones}"
            </div>
          )}

          {estado === 'pendiente' && (
            <button
              onClick={() => handleOptimisticStatus(p.id_pedido, 'en_cocina')}
              className={`w-full min-h-12 mt-2 py-3 px-3 ${btnTheme} rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md`}
            >
              {optimisticUpdates.get(p.id_pedido)?.updating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Actualizando...</>
              ) : (
                <><Flame className="w-4 h-4" /> Iniciar Fuego</>
              )}
            </button>
          )}

          {estado === 'en_cocina' && (
            <button
              onClick={() => handleOptimisticStatus(p.id_pedido, 'listo')}
              className={`w-full min-h-12 mt-2 py-3 px-3 ${btnTheme} rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md`}
            >
              {optimisticUpdates.get(p.id_pedido)?.updating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Actualizando...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Terminado</>
              )}
            </button>
          )}

          {estado === 'listo' && (
            <button
              onClick={() => handleOptimisticStatus(p.id_pedido, 'entregado_cobrado')}
              className={`w-full min-h-12 mt-2 py-3 px-3 ${btnTheme} rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md`}
            >
              {optimisticUpdates.get(p.id_pedido)?.updating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Actualizando...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Entregar y finalizar</>
              )}
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button className="min-h-10 py-2 px-3 bg-[#f4ecd8] hover:bg-[#e2dabf] text-[#4b3621] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#d4b89a]">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button
              onClick={() => setCancelRequest({
                pedido: p,
                title: estado === 'pendiente' ? 'Cancelar comanda pendiente' : 'Cancelar preparación en curso',
                detail: 'La orden saldrá de la cola de cocina y quedará marcada como cancelada.'
              })}
              className="min-h-10 py-2 px-3 bg-transparent hover:bg-red-50 text-[#c0392b] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#fab1a0]"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderColumn = (estado: Pedido['estado_comanda'], title: string, icon: React.ReactNode, headerClass: string, orders: Pedido[]) => {
    const emptyMessages = {
      pendiente: { text: 'Sin comandas pendientes', icon: <ChefHat className="w-8 h-8 text-[#d4b89a] mb-2" /> },
      en_cocina: { text: 'Sin comandas activas en la hornalla', icon: <Flame className="w-8 h-8 text-[#e2dabf] mb-2" /> },
      listo: { text: 'Sin comandas listas para servir', icon: <Utensils className="w-8 h-8 text-[#d4b89a] mb-2" /> }
    };

    return (
      <div className="space-y-4">
        <div className={`flex justify-between items-center p-4 rounded-t-xl border-b-[3px] ${headerClass}`}>
          <h4 className="font-black text-xs sm:text-sm tracking-tight flex items-center gap-2 uppercase font-serif text-[#4b3621]">
            {icon}
            {title}
          </h4>
          <span className="bg-[#3e2723] text-[#f4ecd8] text-[11px] font-black font-mono w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
            {orders.length}
          </span>
        </div>

        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
          {orders.length === 0 ? (
            <div className="h-36 border-2 border-dashed border-[#d4b89a] rounded-[20px] flex flex-col justify-center items-center text-center p-4 opacity-60 bg-[#f4ecd8]/40">
              {emptyMessages[estado].icon}
              <p className="text-[11px] text-[#4b3621]/70 font-semibold">{emptyMessages[estado].text}</p>
            </div>
          ) : (
            orders.map(p => renderTicket(p, estado))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5" id="kitchen-monitor-container">

      {/* Producción agrupada */}
      <div className="bg-[#f4ecd8] rounded-[20px] p-5 border border-[#d4b89a] shadow-[0_4px_6px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#d4b89a]/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#4b3621] text-[#f4ecd8] flex items-center justify-center text-xl shadow-sm">
              📋
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-lg text-[#4b3621] font-serif">Producción agrupada</h3>
              <p className="text-xs text-[#4b3621]/70 font-semibold">Consolidado de preparaciones activas en fuegos.</p>
            </div>
          </div>
          <span className="bg-[#3e2723] text-[#f4ecd8] text-xs font-black py-1 px-3 rounded-full shadow-sm w-fit">
            {batchProduction.reduce((sum, item) => sum + item.cantidad, 0)} UNIDADES
          </span>
        </div>

        {batchProduction.length === 0 ? (
          <p className="text-xs text-[#4b3621]/60 italic text-center py-3 bg-[#e2dabf]/50 rounded-xl">
            No hay comida activa en la línea de fuegos.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {batchProduction.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#e2dabf] border border-[#d4b89a] rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm font-black text-[#4b3621] shadow-sm hover:border-[#a0522d] transition-colors"
              >
                <span className="bg-[#3e2723] text-[#f4ecd8] text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center">
                  {item.cantidad}
                </span>
                <span>{item.nombre}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#f4ecd8] rounded-[20px] p-4 border border-[#d4b89a] shadow-[0_4px_6px_rgba(0,0,0,0.05)]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#4b3621]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar mesa, mozo o plato..."
            value={kitchenSearch}
            onChange={e => setKitchenSearch(e.target.value)}
            className="w-full min-h-11 pl-9 pr-3 py-2 bg-white border border-[#d4b89a] rounded-xl text-sm text-[#4b3621] placeholder:text-[#4b3621]/40 focus:outline-none focus:ring-2 focus:ring-[#a0522d]/30"
          />
        </div>
        <button
          onClick={() => setShowOnlyKitchen(!showOnlyKitchen)}
          className={`min-h-11 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-sm font-black transition-all cursor-pointer border ${
            showOnlyKitchen
              ? 'bg-[#4b3621] text-[#f4ecd8] border-[#4b3621]'
              : 'bg-white text-[#4b3621] border-[#d4b89a] hover:bg-[#e2dabf]'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {showOnlyKitchen ? 'Solo Cocina' : 'Todo'}
        </button>
      </div>

      {/* Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderColumn(
          'pendiente',
          'Pendientes (Ingresos)',
          <CircleDot className="w-4 h-4 text-[#a0522d]" />,
          'bg-[#e2dabf] border-[#a0522d]',
          activeKitchenOrders.filter(p => p.estado_comanda === 'pendiente')
        )}
        {renderColumn(
          'en_cocina',
          'En Preparación (Fuegos)',
          <Flame className="w-4 h-4 text-[#a0522d]" />,
          'bg-[#f3e5ab] border-[#a0522d]',
          activeKitchenOrders.filter(p => p.estado_comanda === 'en_cocina')
        )}
        {renderColumn(
          'listo',
          'Listos (A Servir)',
          <CheckCircle className="w-4 h-4 text-[#2e8b57]" />,
          'bg-[#d0f0c0] border-[#2e8b57]',
          activeKitchenOrders.filter(p => p.estado_comanda === 'listo')
        )}
      </div>

      {cancelRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-[#f4ecd8] rounded-t-[20px] sm:rounded-[20px] p-6 w-full max-w-md shadow-2xl border border-[#d4b89a]">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-red-50 text-[#c0392b] flex items-center justify-center shrink-0 border border-[#fab1a0]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-[#4b3621] font-serif">{cancelRequest.title}</h3>
                <p className="text-xs text-[#4b3621]/70 mt-1">{cancelRequest.detail}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelRequest(null)}
                className="flex-1 min-h-11 py-2.5 rounded-xl bg-[#e2dabf] text-[#4b3621] text-sm font-black cursor-pointer hover:bg-[#d4b89a] transition-colors border border-[#d4b89a]"
              >
                Volver
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 min-h-11 py-2.5 rounded-xl bg-[#c0392b] text-[#f4ecd8] text-sm font-black cursor-pointer hover:bg-[#a93226] transition-colors shadow-md"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
