import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Insumo, Mesa, Pedido, PedidoItem, ProductoMenu, RecetaEscandallo } from '../types';

type CartByProductId = Record<string, number>;
type LogType = 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'sistema';

type ToastApi = {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
};

export type ItemComanda = PedidoItem & {
  precio_unitario: number;
};

export interface ComandaDraft {
  mesaId: number | null;
  cart: CartByProductId;
  observaciones: string;
  updatedAt: string;
}

interface StockEvaluation {
  allowed: boolean;
  isCritical: boolean;
  remainingForProduct: number;
  warning?: string;
}

interface UseMozoTerminalArgs {
  mesas: Mesa[];
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  pedidos: Pedido[];
  activeMozo: string;
  permitirVentaSinStock: boolean;
  toast: ToastApi;
  addLog: (tipo: LogType, mensaje: string) => void;
  onCrearPedido: (
    pedido: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & {
      origen?: 'Mozo';
      comensales?: number;
    }
  ) => void | Promise<void>;
}

const CART_STORAGE_PREFIX = 'el_patron_mozo_cart_v2';

const getCartStorageKey = (mesaId: number) => `${CART_STORAGE_PREFIX}:${mesaId}`;

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const sanitizeCart = (cart: CartByProductId): CartByProductId => {
  return Object.fromEntries(
    Object.entries(cart)
      .map(([productId, qty]) => [productId, Math.max(0, Number(qty) || 0)] as const)
      .filter(([, qty]) => qty > 0)
  );
};

export const useMozoTerminal = ({
  mesas,
  insumos,
  productosMenu,
  recetas,
  pedidos,
  activeMozo,
  permitirVentaSinStock,
  toast,
  addLog,
  onCrearPedido,
}: UseMozoTerminalArgs) => {
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
  const [comensales, setComensales] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todo');
  const [cart, setCart] = useState<CartByProductId>({});
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productsById = useMemo(() => {
    return new Map(productosMenu.map(producto => [producto.id_producto, producto]));
  }, [productosMenu]);

  const insumosById = useMemo(() => {
    return new Map(insumos.map(insumo => [insumo.id_insumo, insumo]));
  }, [insumos]);

  const recetasByProductId = useMemo(() => {
    const grouped = new Map<string, RecetaEscandallo[]>();
    recetas.forEach(receta => {
      const current = grouped.get(receta.id_producto) ?? [];
      current.push(receta);
      grouped.set(receta.id_producto, current);
    });
    return grouped;
  }, [recetas]);

  const selectedMesa = useMemo(() => {
    return mesas.find(mesa => mesa.id_mesa === selectedMesaId) ?? null;
  }, [mesas, selectedMesaId]);

  const activePedidoDeMesa = useMemo(() => {
    if (!selectedMesaId) return null;
    return pedidos.find(pedido => pedido.id_mesa === selectedMesaId && pedido.estado_comanda !== 'entregado_cobrado') ?? null;
  }, [pedidos, selectedMesaId]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return productosMenu.filter(producto => {
      const matchCat = selectedCategoria === 'todo' || producto.categoria === selectedCategoria;
      const matchSearch = producto.nombre.toLowerCase().includes(normalizedSearch);
      return producto.activo && matchCat && matchSearch;
    });
  }, [productosMenu, searchQuery, selectedCategoria]);

  useEffect(() => {
    if (!selectedMesaId || !isBrowser()) return;

    try {
      const rawDraft = window.localStorage.getItem(getCartStorageKey(selectedMesaId));
      if (!rawDraft) {
        setCart({});
        setObservaciones('');
        return;
      }

      const parsedDraft = JSON.parse(rawDraft) as Partial<ComandaDraft>;
      setCart(sanitizeCart(parsedDraft.cart ?? {}));
      setObservaciones(typeof parsedDraft.observaciones === 'string' ? parsedDraft.observaciones : '');
    } catch (error) {
      console.warn('[MozoTerminal] No se pudo restaurar la comanda local:', error);
      setCart({});
      setObservaciones('');
    }
  }, [selectedMesaId]);

  useEffect(() => {
    if (!selectedMesaId || !isBrowser()) return;

    const safeCart = sanitizeCart(cart);
    const hasDraft = Object.keys(safeCart).length > 0 || observaciones.trim().length > 0;

    try {
      if (!hasDraft) {
        window.localStorage.removeItem(getCartStorageKey(selectedMesaId));
        return;
      }

      const draft: ComandaDraft = {
        mesaId: selectedMesaId,
        cart: safeCart,
        observaciones,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(getCartStorageKey(selectedMesaId), JSON.stringify(draft));
    } catch (error) {
      console.warn('[MozoTerminal] No se pudo respaldar la comanda local:', error);
    }
  }, [cart, observaciones, selectedMesaId]);

  const calculateCartInsumoRequirements = useCallback((tempCart: CartByProductId) => {
    const requirements: Record<string, number> = {};

    Object.entries(tempCart).forEach(([productId, quantity]) => {
      if (quantity <= 0) return;

      const productRecipes = recetasByProductId.get(productId) ?? [];
      productRecipes.forEach(receta => {
        requirements[receta.id_insumo] = (requirements[receta.id_insumo] ?? 0) + receta.cantidad_a_descontar * quantity;
      });
    });

    return requirements;
  }, [recetasByProductId]);

  const getSimulatedStockRemaining = useCallback((producto: ProductoMenu) => {
    const productRecipes = recetasByProductId.get(producto.id_producto) ?? [];
    if (productRecipes.length === 0) return 0;

    return productRecipes.reduce((maxPlates, receta) => {
      const insumo = insumosById.get(receta.id_insumo);
      if (!insumo || receta.cantidad_a_descontar <= 0) return maxPlates;
      return Math.min(maxPlates, Math.floor(insumo.stock_actual / receta.cantidad_a_descontar));
    }, Number.POSITIVE_INFINITY) || 0;
  }, [insumosById, recetasByProductId]);

  const evaluateStockAdd = useCallback((productoId: string, quantity = 1): StockEvaluation => {
    const producto = productsById.get(productoId);
    const nextCart = sanitizeCart({ ...cart, [productoId]: (cart[productoId] ?? 0) + quantity });
    const requirements = calculateCartInsumoRequirements(nextCart);
    const remainingForProduct = producto ? getSimulatedStockRemaining(producto) : 0;

    for (const [insumoId, requiredAmount] of Object.entries(requirements)) {
      const insumo = insumosById.get(insumoId);
      if (!insumo) continue;

      if (insumo.stock_actual < requiredAmount) {
        const missing = requiredAmount - insumo.stock_actual;
        const warning = permitirVentaSinStock
          ? `Venta forzada: falta ${missing.toFixed(2)}${insumo.unidad_medida} de "${insumo.nombre}".`
          : `Sin stock suficiente de "${insumo.nombre}". Disponible: ${insumo.stock_actual}${insumo.unidad_medida}. Requerido: ${requiredAmount}${insumo.unidad_medida}.`;

        return {
          allowed: permitirVentaSinStock,
          isCritical: !permitirVentaSinStock,
          remainingForProduct,
          warning,
        };
      }

      if (insumo.stock_actual - requiredAmount <= insumo.stock_minimo) {
        return {
          allowed: true,
          isCritical: false,
          remainingForProduct,
          warning: `Stock bajo de "${insumo.nombre}". Queda cerca del mínimo de seguridad.`,
        };
      }
    }

    return { allowed: true, isCritical: false, remainingForProduct };
  }, [
    calculateCartInsumoRequirements,
    cart,
    getSimulatedStockRemaining,
    insumosById,
    permitirVentaSinStock,
    productsById,
  ]);

  const canAddQuantity = useCallback((productoId: string, quantity = 1) => {
    return evaluateStockAdd(productoId, quantity).allowed;
  }, [evaluateStockAdd]);

  const addToCart = useCallback((productoId: string, quantity = 1) => {
    if (!selectedMesaId) {
      toast.error('Seleccione una mesa antes de cargar platos.');
      return;
    }

    if (isSubmitting) return;

    const evaluation = evaluateStockAdd(productoId, quantity);
    if (!evaluation.allowed) {
      const message = evaluation.warning ?? 'No hay stock suficiente para agregar esa cantidad.';
      toast.warning(message, 4200);
      addLog('alerta_stock', `Carga bloqueada: ${message}`);
      return;
    }

    if (evaluation.warning) {
      toast.info(evaluation.warning, 3200);
      addLog('alerta_stock', evaluation.warning);
    }

    setCart(prev => sanitizeCart({ ...prev, [productoId]: (prev[productoId] ?? 0) + quantity }));
  }, [addLog, evaluateStockAdd, isSubmitting, selectedMesaId, toast]);

  const removeFromCart = useCallback((productoId: string, quantity = 1) => {
    if (isSubmitting) return;

    setCart(prev => {
      const current = prev[productoId] ?? 0;
      const nextQuantity = Math.max(0, current - quantity);
      const updated = { ...prev };

      if (nextQuantity <= 0) {
        delete updated[productoId];
      } else {
        updated[productoId] = nextQuantity;
      }

      return updated;
    });
  }, [isSubmitting]);

  const clearCart = useCallback(() => {
    if (isSubmitting) return;
    setCart({});
    setObservaciones('');
  }, [isSubmitting]);

  const totalCartValue = useMemo(() => {
    return Object.entries(cart).reduce((total, [productId, quantity]) => {
      const producto = productsById.get(productId);
      return total + (producto ? producto.precio_venta * quantity : 0);
    }, 0);
  }, [cart, productsById]);

  const checkoutCart = useCallback(async () => {
    if (!selectedMesaId || Object.keys(cart).length === 0 || isSubmitting) return;

    const requirements = calculateCartInsumoRequirements(cart);
    for (const [insumoId, requiredAmount] of Object.entries(requirements)) {
      const insumo = insumosById.get(insumoId);
      if (insumo && insumo.stock_actual < requiredAmount && !permitirVentaSinStock) {
        toast.error(`No se pudo enviar: se agotó "${insumo.nombre}" antes de confirmar la comanda.`);
        return;
      }
    }

    const items: ItemComanda[] = Object.entries(cart)
      .map(([productId, quantity]) => {
        const producto = productsById.get(productId);
        if (!producto) return null;

        return {
          id_producto: productId,
          nombre: producto.nombre,
          cantidad: Number(quantity),
          categoria: producto.categoria,
          precio_unitario: producto.precio_venta,
        };
      })
      .filter((item): item is ItemComanda => item !== null);

    if (items.length === 0) return;

    const rollbackDraft = {
      cart,
      observaciones,
    };

    setIsSubmitting(true);
    setCart({});
    setObservaciones('');

    try {
      if (isBrowser()) window.localStorage.removeItem(getCartStorageKey(selectedMesaId));

      await Promise.resolve(onCrearPedido({
        id_mesa: selectedMesaId,
        numero_mesa: selectedMesa?.numero_mesa ?? `Mesa ${selectedMesaId}`,
        mozo: activeMozo,
        estado_comanda: 'pendiente',
        items,
        observaciones: observaciones.trim() || undefined,
        origen: 'Mozo',
        comensales,
      }));

      toast.success(`Comanda enviada a cocina para ${selectedMesa?.numero_mesa ?? 'la mesa seleccionada'}.`, 2600);
      addLog('pedido_creado', `Mozo ${activeMozo} envió pedido para ${selectedMesa?.numero_mesa ?? `Mesa ${selectedMesaId}`} con ${items.length} ítems.`);
    } catch (error) {
      setCart(rollbackDraft.cart);
      setObservaciones(rollbackDraft.observaciones);
      toast.error('No se pudo sincronizar la comanda. Recuperamos el carrito para reintentar.', 6000);
      addLog('sistema', `Rollback de comanda por error de red: ${error instanceof Error ? error.message : 'error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeMozo,
    addLog,
    calculateCartInsumoRequirements,
    cart,
    comensales,
    insumosById,
    isSubmitting,
    observaciones,
    onCrearPedido,
    permitirVentaSinStock,
    productsById,
    selectedMesa,
    selectedMesaId,
    toast,
  ]);

  return {
    selectedMesaId,
    setSelectedMesaId,
    comensales,
    setComensales,
    searchQuery,
    setSearchQuery,
    selectedCategoria,
    setSelectedCategoria,
    cart,
    observaciones,
    setObservaciones,
    selectedMesa,
    activePedidoDeMesa,
    filteredProducts,
    getSimulatedStockRemaining,
    addToCart,
    removeFromCart,
    clearCart,
    checkoutCart,
    totalCartValue,
    isSubmitting,
    canAddQuantity,
  };
};
