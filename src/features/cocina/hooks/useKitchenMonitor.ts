import { useState, useMemo, useCallback } from 'react';
import { Pedido, PedidoItem, ProductoMenu, RecetaEscandallo, Insumo } from '../../../types';
import { useDebounce } from '../../../hooks/useDebounce';

interface CancelRequest {
  pedido: Pedido;
  title: string;
  detail: string;
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

interface UseKitchenMonitorProps {
  pedidos: Pedido[];
  onCambiarEstadoPedido: (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => void;
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  insumos: Insumo[];
}

export function useKitchenMonitor({
  pedidos,
  onCambiarEstadoPedido,
  productosMenu,
  recetas,
  insumos
}: UseKitchenMonitorProps) {
  const [cancelRequest, setCancelRequest] = useState<CancelRequest | null>(null);
  const [kitchenSearch, setKitchenSearch] = useState('');
  const debouncedKitchenSearch = useDebounce(kitchenSearch, 300);
  const [showOnlyKitchen, setShowOnlyKitchen] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, { estado: Pedido['estado_comanda']; updating: boolean }>>(new Map());
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState<ProductoMenu | null>(null);

  const activeKitchenOrders = useMemo(() => {
    let filtered = pedidos.map(p => {
      const effective = optimisticUpdates.get(p.id_pedido)?.estado || p.estado_comanda;
      return { ...p, estado_comanda: effective };
    }).filter(p => {
      return p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'entregado' && p.estado_comanda !== 'cancelado';
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
          const itemEstado = item.estado ?? 'pendiente';
          if (isKitchenItem(item) && (itemEstado === 'pendiente' || itemEstado === 'en_cocina')) {
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

  const getSemaforoInfo = useCallback((minutosTranscurridos: number, pedido: Pedido) => {
    let maxPrepTime = 12;
    if (pedido && pedido.items) {
      const kitchenItems = pedido.items.filter(item => !isBarItem(item));
      const times = kitchenItems.map(item => {
        const prod = productosMenu.find(p => p.id_producto === item.id_producto);
        return prod?.tiempo_preparacion_estimado ?? 12;
      });
      if (times.length > 0) {
        maxPrepTime = Math.max(...times);
      }
    }

    const ratio = minutosTranscurridos / maxPrepTime;

    if (ratio <= 0.8) {
      return {
        border: 'border-l-[#2e8b57]',
        timeDot: 'bg-[#2e8b57]',
        timeText: 'text-[#2e8b57]',
        delayed: false
      };
    } else if (ratio <= 1.2) {
      return {
        border: 'border-l-[#a0522d]',
        timeDot: 'bg-[#a0522d]',
        timeText: 'text-[#a0522d]',
        delayed: false
      };
    } else {
      return {
        border: 'border-l-[#c0392b]',
        timeDot: 'bg-[#c0392b] animate-pulse',
        timeText: 'text-[#c0392b] font-black animate-pulse',
        delayed: true
      };
    }
  }, [productosMenu]);

  const isColdPlate = useCallback((pedido: Pedido) => {
    if (pedido.estado_comanda !== 'listo') return false;
    return (pedido.segundos_en_listo ?? 0) >= 300;
  }, []);

  const handleOptimisticStatus = useCallback((idPedido: number, nuevoEstado: Pedido['estado_comanda']) => {
    setOptimisticUpdates(prev => new Map(prev).set(idPedido, { estado: nuevoEstado, updating: true }));
    onCambiarEstadoPedido(idPedido, nuevoEstado);
    setTimeout(() => {
      setOptimisticUpdates(prev => {
        const next = new Map(prev);
        next.delete(idPedido);
        return next;
      });
    }, 7000);
  }, [onCambiarEstadoPedido]);

  const getEffectiveStatus = useCallback((pedido: Pedido): Pedido['estado_comanda'] => {
    const optimistic = optimisticUpdates.get(pedido.id_pedido);
    return optimistic ? optimistic.estado : pedido.estado_comanda;
  }, [optimisticUpdates]);

  const confirmCancel = useCallback(() => {
    if (!cancelRequest) return;
    onCambiarEstadoPedido(cancelRequest.pedido.id_pedido, 'cancelado');
    setCancelRequest(null);
  }, [cancelRequest, onCambiarEstadoPedido]);

  return {
    cancelRequest,
    setCancelRequest,
    kitchenSearch,
    setKitchenSearch,
    showOnlyKitchen,
    setShowOnlyKitchen,
    optimisticUpdates,
    selectedRecipeProduct,
    setSelectedRecipeProduct,
    activeKitchenOrders,
    batchProduction,
    getSemaforoInfo,
    isColdPlate,
    handleOptimisticStatus,
    getEffectiveStatus,
    confirmCancel,
    isBarItem,
    isKitchenItem
  };
}
