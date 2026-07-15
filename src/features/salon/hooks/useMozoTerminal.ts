import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mesa, Insumo, ProductoMenu, RecetaEscandallo, Pedido, PedidoItem, Usuario, EventoLog, TicketData } from '../../../types';
import { clearMozoCartDraft, createMozoCartIdempotencyKey, MozoCart, readMozoCartDraft, writeMozoCartDraft } from '../../../lib/mozoCartDraft';
import { pdfService } from '../../../services/pdfService';
import { useCategories } from '../../../hooks/useCategories';
import { DEFAULT_RESTAURANT_PROFILE } from '../../../lib/restaurantProfile';

const CHECKOUT_TIMEOUT_MS = 12000;



function withCheckoutTimeout<T>(operation: Promise<T>, timeoutMs = CHECKOUT_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Tiempo de espera agotado al enviar la comanda.')), timeoutMs);
  });

  return Promise.race([operation, timeout]).finally(() => clearTimeout(timeoutId));
}

interface UseMozoTerminalProps {
  mesas: Mesa[];
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  setProductosMenu: (items: ProductoMenu[] | ((prev: ProductoMenu[]) => ProductoMenu[])) => void;
  recetas: RecetaEscandallo[];
  usuarios: Usuario[];
  activeMozo: string;
  onMozoChange: (mozo: string) => void;
  onCrearPedido: (pedido: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo'; idempotency_key?: string }) => void | Promise<void>;
  pedidos: Pedido[];
  onFacturarMesa: (idPedido: number) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
  permitirVentaSinStock?: boolean;
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
}

export function useMozoTerminal({
  mesas,
  insumos,
  productosMenu,
  setProductosMenu,
  recetas,
  usuarios,
  activeMozo,
  onMozoChange,
  onCrearPedido,
  pedidos,
  onFacturarMesa,
  addLog,
  permitirVentaSinStock = false,
  toast
}: UseMozoTerminalProps) {
  const checkoutInFlightRef = useRef(false);
  const { categories } = useCategories();

  // States
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
  const [comensales, setComensales] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todo');
  
  // Current order cart
  const [cart, setCart] = useState<MozoCart>({});
  const [observaciones, setObservaciones] = useState('');
  const [cartIdempotencyKey, setCartIdempotencyKey] = useState<string | null>(null);
  const [lastCheckoutTime, setLastCheckoutTime] = useState<number | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'sending' | 'done'>('idle');

  // Admin menu state
  const [adminMenuProduct, setAdminMenuProduct] = useState<string | null>(null);
  const [editingPriceProduct, setEditingPriceProduct] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<number>(0);

  // Bill splitting state
  const [splittingPedidoId, setSplittingPedidoId] = useState<number | null>(null);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [splitItemsChecked, setSplitItemsChecked] = useState<{ [itemIdx: number]: boolean }>({});

  const activeUser = useMemo(() => usuarios.find(u => u.nombre === activeMozo), [usuarios, activeMozo]);
  const isAdmin = activeUser?.rol === 'superadmin' || activeUser?.rol === 'administrador';

  const isSameTable = useCallback((m: Mesa, p: Pedido) => {
    if (m.id_mesa !== undefined && m.id_mesa !== null && p.id_mesa !== undefined && p.id_mesa !== null) {
      if (String(m.id_mesa) === String(p.id_mesa)) return true;
    }
    const norm1 = String(m.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
    const norm2 = String(p.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
    return norm1 !== '' && norm1 === norm2;
  }, []);

  const dynamicMesas = useMemo(() => {
    return mesas.map(m => {
      const activePedido = pedidos.find(p => 
        isSameTable(m, p) && 
        ['abierta', 'pendiente', 'en_cocina', 'listo', 'entregado'].includes(p.estado_comanda)
      );
      if (activePedido) {
        return {
          ...m,
          estado: 'ocupada' as const,
          comensales: (activePedido as any).comensales || m.comensales || 2
        };
      }
      return {
        ...m,
        estado: m.estado === 'ocupada' ? 'libre' : m.estado
      };
    });
  }, [mesas, pedidos, isSameTable]);

  const selectedMesa = useMemo(() => {
    return dynamicMesas.find(m => m.id_mesa === selectedMesaId) || null;
  }, [selectedMesaId, dynamicMesas]);

  const getValidCartFromDraft = useCallback((draftCart: MozoCart): { cart: MozoCart; removed: string[] } => {
    return Object.entries(draftCart).reduce<{ cart: MozoCart; removed: string[] }>((acc, [productId, qty]) => {
      const product = productosMenu.find(p => p.id_producto === productId);
      if (!product || !product.activo) {
        acc.removed.push(product?.nombre ?? productId);
        return acc;
      }
      acc.cart[productId] = qty;
      return acc;
    }, { cart: {}, removed: [] });
  }, [productosMenu]);

  // Sync draft to storage on change
  useEffect(() => {
    if (!selectedMesaId) return;
    writeMozoCartDraft(selectedMesaId, {
      cart,
      observaciones,
      mozo: activeMozo,
      idempotencyKey: cartIdempotencyKey ?? undefined,
    });
  }, [selectedMesaId, cart, observaciones, activeMozo, cartIdempotencyKey]);

  const handleSelectMesa = useCallback((mesa: Mesa) => {
    if (checkoutInFlightRef.current) return;
    if (selectedMesaId) {
      writeMozoCartDraft(selectedMesaId, {
        cart,
        observaciones,
        mozo: activeMozo,
        idempotencyKey: cartIdempotencyKey ?? undefined,
      });
    }

    const draft = readMozoCartDraft(mesa.id_mesa);
    const validatedDraft = draft ? getValidCartFromDraft(draft.cart) : { cart: {}, removed: [] };
    setSelectedMesaId(mesa.id_mesa);
    setCart(validatedDraft.cart);
    setObservaciones(draft?.observaciones ?? '');
    setCartIdempotencyKey(draft?.idempotencyKey ?? createMozoCartIdempotencyKey(mesa.id_mesa));
    setCheckoutStatus('idle');

    if (mesa.estado === 'ocupada' && mesa.comensales) {
      setComensales(mesa.comensales);
    }

    if (validatedDraft.removed.length > 0) {
      toast.warning(`Quitamos ${validatedDraft.removed.length} producto(s) del borrador porque ya no están activos.`);
    }

    if (Object.keys(validatedDraft.cart).length > 0) {
      toast.info(`Recuperamos la comanda pendiente de ${mesa.numero_mesa}.`);
    }
  }, [activeMozo, cart, cartIdempotencyKey, getValidCartFromDraft, observaciones, selectedMesaId, toast]);

  // Find active order of the selected table if any (to split or pay)
  const activePedidoDeMesa = useMemo(() => {
    if (!selectedMesaId) return null;
    function mergePedidos(tablePedidos: Pedido[]): Pedido | null {
      if (tablePedidos.length === 0) return null;
      const base = tablePedidos[0];
      
      const itemMap = new Map<string, { item: PedidoItem; qty: number }>();
      tablePedidos.forEach(p => {
        (p.items || []).forEach(item => {
          const key = item.id_producto;
          if (!key) return;
          const existing = itemMap.get(key);
          if (existing) {
            existing.qty += item.cantidad;
          } else {
            itemMap.set(key, { item: { ...item }, qty: item.cantidad });
          }
        });
      });

      const mergedItems = Array.from(itemMap.values()).map(({ item, qty }) => ({
        ...item,
        cantidad: qty
      }));

      const mergedObservations = tablePedidos
        .map(p => p.observaciones?.trim())
        .filter(Boolean)
        .join(' | ');

      const oldestFechaHora = tablePedidos.reduce((oldest, current) => {
        const currentMs = current.fecha_hora ? new Date(current.fecha_hora).getTime() : Date.now();
        const oldestMs = oldest ? new Date(oldest).getTime() : Date.now();
        return currentMs < oldestMs ? current.fecha_hora : oldest;
      }, base.fecha_hora);

      return {
        ...base,
        items: mergedItems,
        observaciones: mergedObservations || undefined,
        fecha_hora: oldestFechaHora
      };
    }

    const tablePedidos = pedidos.filter(p => {
      const matchMesaId = String(p.id_mesa) === String(selectedMesaId);
      const matchMesaNum = selectedMesa ? String(p.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim() === String(selectedMesa.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim() : false;
      return (matchMesaId || matchMesaNum) && p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado';
    });
    return mergePedidos(tablePedidos);
  }, [selectedMesaId, selectedMesa, pedidos]);

  const getCategorySlug = useCallback((catName: string) => {
    if (!catName) return '';
    const norm = catName.toLowerCase().trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const cat = categories.find(c => {
      const dbNorm = c.nombre.toLowerCase().trim()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      return dbNorm === norm || c.slug.toLowerCase() === norm;
    });
    if (cat) return cat.slug.toLowerCase();

    if (norm.includes('bebida') || norm.includes('vino') || norm.includes('cerveza') || norm.includes('gaseosa')) {
      return 'bebidas';
    }
    if (norm.includes('bodega')) {
      return 'bodega';
    }
    if (norm.includes('postre') || norm.includes('dulce') || norm.includes('helado')) {
      return 'postres';
    }
    return norm;
  }, [categories]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return productosMenu.filter(p => {
      const pSlug = getCategorySlug(p.categoria);
      const matchCat = selectedCategoria === 'todo' || pSlug.toLowerCase() === selectedCategoria.toLowerCase();
      const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      return p.activo && matchCat && matchSearch;
    });
  }, [productosMenu, selectedCategoria, searchQuery, getCategorySlug]);

  // Helper: check how much of an insumo would be required by the current cart
  const calculateCartInsumoRequirements = useCallback((tempCart: MozoCart) => {
    const requirements: { [id_insumo: string]: number } = {};
    
    Object.keys(tempCart).forEach(prodId => {
      const qty = tempCart[prodId];
      if (qty <= 0) return;
      
      // Find recipes
      const productRecipes = recetas.filter(r => r.id_producto === prodId);
      productRecipes.forEach(rec => {
        if (!requirements[rec.id_insumo]) {
          requirements[rec.id_insumo] = 0;
        }
        requirements[rec.id_insumo] += rec.cantidad_a_descontar * qty;
      });
    });

    return requirements;
  }, [recetas]);

  // Helper: evaluate if adding 1 unit of a product breaches current stock
  const evaluateStockAdd = useCallback((productoId: string, quantity = 1): { allowed: boolean; warning?: string; isCritical: boolean } => {
    const nextCart = { ...cart, [productoId]: (cart[productoId] || 0) + quantity };
    const requirements = calculateCartInsumoRequirements(nextCart);

    for (const [insumoId, reqAmount] of Object.entries(requirements)) {
      const insumo = insumos.find(i => i.id_insumo === insumoId);
      if (!insumo) continue;

      if (insumo.stock_actual < reqAmount) {
        if (permitirVentaSinStock) {
          return { 
            allowed: true, 
            isCritical: false, 
            warning: `[FORZADO] Stock insuficiente de: "${insumo.nombre}" (Faltante: ${(reqAmount - insumo.stock_actual).toFixed(2)}${insumo.unidad_medida}).` 
          };
        } else {
          return { 
            allowed: false, 
            isCritical: true, 
            warning: `¡BLOQUEADO! Sin material suficiente de: "${insumo.nombre}". Se requiere ${reqAmount}${insumo.unidad_medida} y el stock actual es de ${insumo.stock_actual}${insumo.unidad_medida}.` 
          };
        }
      }

      if (insumo.stock_actual - reqAmount <= insumo.stock_minimo) {
        return { 
          allowed: true, 
          isCritical: false, 
          warning: `Existencia cercana al Stock Mínimo de Seguridad para "${insumo.nombre}" (${insumo.stock_actual}${insumo.unidad_medida} disponibles).` 
        };
      }
    }

    return { allowed: true, isCritical: false };
  }, [cart, insumos, permitirVentaSinStock, calculateCartInsumoRequirements]);

  // Quick check of remaining simulated capacity for UI tags
  const getSimulatedStockRemaining = useCallback((prod: ProductoMenu) => {
    const productRecipes = recetas.filter(r => r.id_producto === prod.id_producto);
    if (productRecipes.length === 0) return 999;
    let maxPlatesSimulated = Infinity;
    productRecipes.forEach(rec => {
      const insumo = insumos.find(i => i.id_insumo === rec.id_insumo);
      if (insumo) {
        const remainingForThis = Math.floor(insumo.stock_actual / rec.cantidad_a_descontar);
        if (remainingForThis < maxPlatesSimulated) {
          maxPlatesSimulated = remainingForThis;
        }
      }
    });
    return maxPlatesSimulated === Infinity ? 999 : maxPlatesSimulated;
  }, [insumos, recetas]);

  // Cart operations
  const handleAddToCart = (productoId: string, quantity = 1) => {
    if (checkoutInFlightRef.current || checkoutStatus === 'sending') return;
    if (!selectedMesaId) {
      toast.error('Seleccioná una mesa antes de cargar productos.');
      return;
    }
    const evalResult = evaluateStockAdd(productoId, quantity);
    if (!evalResult.allowed) {
      addLog('alerta_stock', `Cancelado intento de pedido: ${evalResult.warning}`);
      toast.error(evalResult.warning || 'No hay stock suficiente para este producto.');
      return;
    }
    if (evalResult.warning) toast.warning(evalResult.warning);
    
    setCart(prev => ({
      ...prev,
      [productoId]: (prev[productoId] || 0) + quantity
    }));
  };

  const handleRemoveFromCart = (productoId: string) => {
    if (checkoutInFlightRef.current || checkoutStatus === 'sending') return;
    setCart(prev => {
      const updated = { ...prev };
      if (updated[productoId] > 1) {
        updated[productoId] -= 1;
      } else {
        delete updated[productoId];
      }
      return updated;
    });
  };

  const handleClearCart = () => {
    setCart({});
    setObservaciones('');
    if (selectedMesaId) clearMozoCartDraft(selectedMesaId);
  };

  const checkoutCart = async () => {
    if (checkoutInFlightRef.current || checkoutStatus === 'sending') return;
    if (!selectedMesaId) return;
    if (Object.keys(cart).length === 0) return;

    // Double check stock at moment of checkout
    const requirements = calculateCartInsumoRequirements(cart);
    for (const [insumoId, reqAmount] of Object.entries(requirements)) {
      const insumo = insumos.find(i => i.id_insumo === insumoId);
      if (insumo && insumo.stock_actual < reqAmount && !permitirVentaSinStock) {
        toast.error(`No es posible procesar la orden. Se agotó un insumo clave: ${insumo.nombre}`);
        return;
      }
    }

    // Build items list
    const items: PedidoItem[] = [];
    for (const [prodId, qty] of Object.entries(cart)) {
      const p = productosMenu.find(item => item.id_producto === prodId);
      if (!p) {
        toast.error('Hay un producto que ya no existe en la carta. Quitalo del carrito e intentá nuevamente.');
        return;
      }
      items.push({
        id_producto: prodId,
        nombre: p.nombre,
        cantidad: Number(qty),
        categoria: p.categoria,
        precio_unitario: p.precio_venta
      });
    }

    // Optimistic UI update: show feedback immediately
    checkoutInFlightRef.current = true;
    setCheckoutStatus('sending');
    setLastCheckoutTime(Date.now());
    const idempotencyKey = cartIdempotencyKey ?? createMozoCartIdempotencyKey(selectedMesaId);
    setCartIdempotencyKey(idempotencyKey);

    try {
      await withCheckoutTimeout(Promise.resolve(onCrearPedido({
        idempotency_key: idempotencyKey,
        id_mesa: selectedMesaId,
        numero_mesa: selectedMesa ? selectedMesa.numero_mesa : `Mesa ${selectedMesaId}`,
        mozo: activeMozo,
        estado_comanda: 'pendiente',
        items,
        observaciones: observaciones.trim() || undefined,
      })));

      setCart({});
      setObservaciones('');
      setCartIdempotencyKey(null);
      clearMozoCartDraft(selectedMesaId);
      setTimeout(() => {
        setCheckoutStatus('done');
        setTimeout(() => {
          setCheckoutStatus('idle');
          checkoutInFlightRef.current = false;
        }, 1500);
      }, 200);
      addLog('pedido_creado', `Mozo ${activeMozo} envió pedido para ${selectedMesa?.numero_mesa} con ${items.length} platos.`);
    } catch (err: any) {
      console.error('[checkoutCart] Detailed error:', err);
      checkoutInFlightRef.current = false;
      setCheckoutStatus('idle');
      const detail = err?.message || 'Error desconocido';
      toast.error(`No se pudo confirmar la comanda. Detalle: ${detail}. Revisá la conexión y reintentá; el carrito quedó guardado.`);
    }
  };

  const handleDownloadPreTicket = async (pedido: Pedido) => {
    try {
      const ticketItems = pedido.items.map(item => {
        const prod = productosMenu.find(p => p.id_producto === item.id_producto);
        const unit = prod ? prod.precio_venta : 0;
        return {
          cantidad: item.cantidad,
          descripcion: item.nombre,
          precio_unitario: unit,
          subtotal: unit * item.cantidad
        };
      });

      const total = ticketItems.reduce((sum, item) => sum + item.subtotal, 0);

      const ticketData: TicketData = {
        idPedido: pedido.id_pedido,
        nroComprobante: `PRE-${String(pedido.id_pedido).padStart(8, '0')}`,
        tipoComprobante: 'ticket_consumo',
        fechaHora: new Date(pedido.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
        mesa: pedido.numero_mesa,
        mozo: pedido.mozo,
        cajero: 'Mozo',
        nombreComercial: DEFAULT_RESTAURANT_PROFILE.nombreComercial,
        razonSocial: DEFAULT_RESTAURANT_PROFILE.razonSocial,
        cuit: DEFAULT_RESTAURANT_PROFILE.cuit,
        direccion: DEFAULT_RESTAURANT_PROFILE.direccion,
        telefono: DEFAULT_RESTAURANT_PROFILE.telefono,
        email: DEFAULT_RESTAURANT_PROFILE.email,
        items: ticketItems,
        subtotal: total,
        descuento: 0,
        propina: 0,
        iva: 0,
        total: total,
        metodosPago: [],
        vuelto: 0,
        mensajePie: 'DOCUMENTO NO VALIDO COMO FACTURA. Pre-ticket interno sin CAE de ARCA.'
      };

      await pdfService.exportToPDF(ticketData);
      toast.success(`Pre-ticket descargado para la Mesa ${pedido.numero_mesa}`);
      addLog('sistema', `Mozo ${activeMozo} descargó pre-ticket para la Mesa ${pedido.numero_mesa} (Pedido #${pedido.id_pedido})`);
    } catch (err) {
      console.error('Error generating pre-ticket PDF:', err);
      toast.error('No se pudo descargar el pre-ticket.');
    }
  };

  const handlePrintSplitTicket = async (pedido: Pedido, tipo: 'cocina' | 'barra') => {
    try {
      await pdfService.exportPreparationTicketPDF(pedido, tipo);
      toast.success(`Comanda de ${tipo === 'barra' ? 'Barra' : 'Cocina'} descargada.`);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo generar la comanda.');
    }
  };

  // Calculating totals
  const totalCartValue = useMemo(() => {
    return Object.entries(cart).reduce((total, [prodId, qty]) => {
      const p = productosMenu.find(item => item.id_producto === prodId);
      return total + (p ? p.precio_venta * Number(qty) : 0);
    }, 0);
  }, [cart, productosMenu]);

  // Admin: optimistic price update
  const handleUpdatePrice = (id: string, newPrice: number) => {
    setEditingPriceProduct(null);
    setProductosMenu(prev => prev.map(p => p.id_producto === id ? { ...p, precio_venta: newPrice } : p));
  };

  // Admin: toggle availability (soft delete)
  const handleToggleAvailability = (id: string) => {
    setAdminMenuProduct(null);
    setProductosMenu(prev => prev.map(p => p.id_producto === id ? { ...p, activo: !p.activo } : p));
  };

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
    setCart,
    observaciones,
    setObservaciones,
    cartIdempotencyKey,
    lastCheckoutTime,
    checkoutStatus,
    adminMenuProduct,
    setAdminMenuProduct,
    editingPriceProduct,
    setEditingPriceProduct,
    editingPriceValue,
    setEditingPriceValue,
    splittingPedidoId,
    setSplittingPedidoId,
    splitCount,
    setSplitCount,
    splitItemsChecked,
    setSplitItemsChecked,
    activeUser,
    isAdmin,
    selectedMesa,
    dynamicMesas,
    activePedidoDeMesa,
    filteredProducts,
    totalCartValue,
    handleSelectMesa,
    evaluateStockAdd,
    getSimulatedStockRemaining,
    handleAddToCart,
    handleRemoveFromCart,
    handleClearCart,
    checkoutCart,
    handleDownloadPreTicket,
    handlePrintSplitTicket,
    handleUpdatePrice,
    handleToggleAvailability,
    isSameTable
  };
}
