import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Pedido, 
  ProductoMenu, 
  CierreCaja, 
  PrinterConfig, 
  TicketData, 
  TicketItem,
  FacturaDb,
  PagoDb,
  Cliente,
  Mesa
} from '../../../types';
import { cajaService } from '../../../services/cajaService';
import { pdfService } from '../../../services/pdfService';
import { printerService } from '../../../services/printerService';
import { facturacionService, Factura } from '../../../services/facturacionService';
import { salesPersistenceService } from '../../../services/salesPersistenceService';
import { auditoriaService } from '../../../services/auditoriaService';
import { clientesService } from '../../../services/clientesService';
import { CONDICIONES_IVA_RECEPTOR } from '../../../services/arcaService';
import { DEFAULT_RESTAURANT_PROFILE, normalizeRestaurantProfile } from '../../../lib/restaurantProfile';
import { resolvePedidoItemUnitPrice, roundCurrency } from '../../../lib/orderPricing';
import { internalTicketPreview } from '../../../lib/fiscalVoucherPolicy';
import { isSameTable, mergeTableOrders } from '../../../lib/tableOrders';
import { formatTicketTableName } from '../../../lib/tableUnions';
import { getArgentinaIsoString, getArgentinaDateTimeString, formatArgentinaDateTime, formatArgentinaTime, argentinaDateIso } from '../../../lib/argentinaDate';

export interface PendingCloseMesaData {
  pedidoId: number;
  numeroMesa: string | number;
  finalTotal: number;
  compiledTicketNo: string;
  mappedMedio: string;
  calculatedChange: number;
  factura: Factura;
  pagos: PagoDb[];
  paymentDesglosesCount: {
    efectivo: number;
    debito: number;
    credito: number;
    transferencia: number;
    mercadopago: number;
  };
  selectedCliente: Cliente | null;
  puntosRedimidos: number;
}

interface UseCajaProps {
  mesas?: Mesa[];
  pedidos: Pedido[];
  productosMenu: ProductoMenu[];
  operatorName: string;
  onFacturarMesa: (idPedido: number, alreadyUpdatedInCaja?: boolean) => void;
  onCambiarEstadoPedido: (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => void;
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', mensaje: string) => void;
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
}

export function useCaja({
  mesas,
  pedidos,
  productosMenu,
  operatorName,
  onFacturarMesa,
  onCambiarEstadoPedido,
  addLog,
  toast
}: UseCajaProps) {
  // Configurable Restaurant Details
  const [restaurante, setRestaurante] = useState(() => {
    const cached = cajaService.safeStorage.getItem('el_patron_restaurante_config');
    if (cached) {
      try {
        return normalizeRestaurantProfile(JSON.parse(cached));
      } catch {
        // fallback
      }
    }
    return { ...DEFAULT_RESTAURANT_PROFILE };
  });

  useEffect(() => {
    cajaService.safeStorage.setItem('el_patron_restaurante_config', JSON.stringify(restaurante));
  }, [restaurante]);

  const [editRestauranteMode, setEditRestauranteMode] = useState(false);

  // Active cashier session states
  const [cajaSession, setCajaSession] = useState<CierreCaja | null>(() => {
    return cajaService.getOpenSession();
  });
  const [sessionInsumos, setSessionInsumos] = useState<CierreCaja[]>([]);
  const [lastFacturas, setLastFacturas] = useState<Factura[]>([]);
  const [isRefreshingFacturas, setIsRefreshingFacturas] = useState(false);

  const refreshFacturas = async () => {
    setIsRefreshingFacturas(true);
    try {
      const fresh = await facturacionService.list(true);
      setLastFacturas(fresh);
      toast.success(`Comprobantes sincronizados: ${fresh.length} en Google Sheets`);
    } catch (err) {
      console.warn('[useCaja] Error al refrescar facturas:', err);
      toast.error('No se pudo sincronizar con Google Sheets');
    } finally {
      setIsRefreshingFacturas(false);
    }
  };
  const [showTicketsAuditModal, setShowTicketsAuditModal] = useState(false);
  const [isExportingTicketsPdf, setIsExportingTicketsPdf] = useState(false);
  const [auditFilterScope, setAuditFilterScope] = useState<'todos' | 'turno_actual' | 'hoy'>('todos');
  const [auditArcaFilter, setAuditArcaFilter] = useState<'todos' | 'arca' | 'sin_arca'>('todos');

  // Load facturas on mount and when cajaSession updates
  useEffect(() => {
    let isMounted = true;
    // 1. Carga inmediata desde almacenamiento local (0ms)
    facturacionService.list().then(list => {
      if (isMounted && Array.isArray(list)) {
        setLastFacturas(list);
      }
    }).catch(err => console.warn('[useCaja] Error cargando facturas:', err));

    // 2. Consulta fresca a Google Sheets para sincronizar inmediatamente borrados o cambios remotos
    facturacionService.list(true).then(list => {
      if (isMounted && Array.isArray(list)) {
        setLastFacturas(list);
      }
    }).catch(() => {});

    return () => { isMounted = false; };
  }, [cajaSession]);

  // Shift opening/closing dialog states
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState<string>('25000');
  const cashierNameInput = operatorName;
  const [closingPhysicalCashInput, setClosingPhysicalCashInput] = useState<string>('');
  const [closingObservationsInput, setClosingObservationsInput] = useState<string>('Cierre de turno');
  const checkoutInFlightRef = useRef(false);
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
  const [showConfirmCerrarMesaModal, setShowConfirmCerrarMesaModal] = useState(false);
  const [pendingCloseMesaData, setPendingCloseMesaData] = useState<PendingCloseMesaData | null>(null);
  const [isFinalizingClose, setIsFinalizingClose] = useState(false);

  useEffect(() => {
    const handleCashShiftSynced = (event: Event) => {
      const idCierre = (event as CustomEvent<{ idCierre?: string }>).detail?.idCierre;
      if (!idCierre) return;
      setCajaSession(current => current?.id_cierre === idCierre
        ? { ...current, sync_status: 'synced' }
        : current);
      setSessionInsumos(current => current.map(shift => shift.id_cierre === idCierre
        ? { ...shift, sync_status: 'synced' }
        : shift));
    };

    window.addEventListener('el-patron-cash-shift-synced', handleCashShiftSynced);
    return () => window.removeEventListener('el-patron-cash-shift-synced', handleCashShiftSynced);
  }, []);


  // Interactive cashier selection
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);
  
  // Checkout options
  const [cuitCliente, setCuitCliente] = useState<string>('');
  const [nombreCliente, setNombreCliente] = useState<string>('Consumidor Final');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'mp_qr' | 'mixto'>('efectivo');

  // Mixed payments queue
  const [mixedPayments, setMixedPayments] = useState<{ metodo: string; monto: number }[]>([]);
  const [mixedMetodoInput, setMixedMetodoInput] = useState<string>('efectivo');
  const [mixedMontoInput, setMixedMontoInput] = useState<string>('');

  // Cash payment calculated change
  const [montoEntregadoEfectivo, setMontoEntregadoEfectivo] = useState<string>('');

  // Custom discounts & standard tips percentage selectors
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);
  const [propinaPorcentaje, setPropinaPorcentaje] = useState<number>(0); // Default 0% (manual)

  // Auto-reset discounts and tip when selecting or clearing an order
  useEffect(() => {
    setDescuentoPorcentaje(0);
    setPropinaPorcentaje(0);
    setMixedPayments([]);
    setMontoEntregadoEfectivo('');
    setSplitByProducts(false);
    setSelectedProductsForSplit([]);
    setSelectedCliente(null);
    setPuntosRedimidos(0);
  }, [selectedPedidoId]);

  // Splits for payment
  const [splitPayerCount, setSplitPayerCount] = useState<number>(1);
  const [activePayerIndex, setActivePayerIndex] = useState<number>(0);

  // Divide account by specific products checkbox
  const [splitByProducts, setSplitByProducts] = useState<boolean>(false);
  const [selectedProductsForSplit, setSelectedProductsForSplit] = useState<string[]>([]); // id_producto keys

  // Success transaction modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{ nro: string, total: number, vuelto: number } | null>(null);

  // Printer configuration states
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(printerService.getDefaultConfig());
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);

  // Loyalty / Cliente states
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [dniCuitBuscar, setDniCuitBuscar] = useState<string>('');
  const [nombreNuevoCliente, setNombreNuevoCliente] = useState<string>('');
  const [emailNuevoCliente, setEmailNuevoCliente] = useState<string>('');
  const [telNuevoCliente, setTelNuevoCliente] = useState<string>('');
  const [puntosRedimidos, setPuntosRedimidos] = useState<number>(0);

  // Caja chica states
  const [movimientosCajaChica, setMovimientosCajaChica] = useState<any[]>(() => {
    const active = cajaService.getOpenSession();
    return active?.movimientos_manuales || [];
  });
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [movimientoMonto, setMovimientoMonto] = useState('');
  const [movimientoTipo, setMovimientoTipo] = useState<'ingreso' | 'egreso'>('egreso');
  const [movimientoConcepto, setMovimientoConcepto] = useState('');

  // Sync historical shifts and current state
  const loadCajaState = useCallback(async () => {
    let active = cajaService.getOpenSession();
    // Instantly set the local session to avoid UI flicker or requiring reopen on refresh
    if (active) {
      setCajaSession(active);
    } else {
      setCajaSession(null);
    }

    try {
      // Fetch history, invoices, cash movements and active session in parallel
      const [history, facturas, movs, remoteSession] = await Promise.all([
        cajaService.list(true),
        facturacionService.list(true),
        active ? cajaService.listMovimientosCajaChica(active.id_cierre) : Promise.resolve([]),
        cajaService.findActiveSessionRemote(true)
      ]);

      setSessionInsumos(history);
      setLastFacturas(facturas);
      setMovimientosCajaChica(movs);

      // Sincronización entre múltiples computadoras
      if (!active && remoteSession) {
        const lastClosedId = cajaService.safeStorage.getItem('el_patron_ultimo_cierre_cerrado_id');
        if (remoteSession.id_cierre !== lastClosedId) {
          // La caja fue abierta desde otra computadora
          cajaService.safeStorage.setItem('el_patron_caja_activa', JSON.stringify(remoteSession));
          setCajaSession(remoteSession);
          active = remoteSession;
        }
      } else if (active && !remoteSession && (typeof navigator === 'undefined' || navigator.onLine)) {
        // Si teníamos sesión local pero en Google Sheets/Supabase ya no hay sesión activa
        const inHistory = history.find(h => h.id_cierre === active?.id_cierre);
        if (!inHistory || (inHistory && inHistory.fecha_cierre)) {
          cajaService.safeStorage.removeItem('el_patron_caja_activa');
          setCajaSession(null);
          toast.info('La sesión de caja fue cerrada desde otra computadora.');
          active = null;
        }
      } else if (active && remoteSession && remoteSession.id_cierre === active.id_cierre) {
        if (remoteSession.monto_ventas !== active.monto_ventas || remoteSession.monto_apertura !== active.monto_apertura) {
          const updatedActive = {
            ...active,
            monto_ventas: remoteSession.monto_ventas,
            monto_apertura: remoteSession.monto_apertura,
            usuario_cajero: remoteSession?.usuario_cajero || active?.usuario_cajero || 'Cajero',
            observaciones: remoteSession.observaciones,
            sync_status: 'synced' as const
          };
          cajaService.safeStorage.setItem('el_patron_caja_activa', JSON.stringify(updatedActive));
          setCajaSession(updatedActive);
        }
      }
    } catch (err) {
      console.error('Error loading history in loadCajaState:', err);
    }
  }, []);

  // Sincronización en tiempo real y polling entre computadoras distintas
  useEffect(() => {
    // 1. Carga inmediata del estado real de caja al montar el módulo
    loadCajaState();

    const handleCajaAbierta = (event: Event) => {
      const session = (event as CustomEvent<CierreCaja>).detail;
      if (session) {
        cajaService.safeStorage.setItem('el_patron_caja_activa', JSON.stringify(session));
        setCajaSession(session);
        loadCajaState();
      }
    };

    const handleCajaCerrada = () => {
      cajaService.safeStorage.removeItem('el_patron_caja_activa');
      setCajaSession(null);
      loadCajaState();
    };

    const handleCajaSyncNeeded = () => {
      loadCajaState();
    };

    const handleSheetsSync = () => {
      loadCajaState();
    };

    const handleSheetDataUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string }>).detail;
      if (!detail?.table || detail.table === 'facturas') {
        facturacionService.list().then(list => {
          if (Array.isArray(list)) setLastFacturas(list);
        }).catch(() => {});
      }
    };

    window.addEventListener('el_patron_caja_abierta', handleCajaAbierta);
    window.addEventListener('el_patron_caja_cerrada', handleCajaCerrada);
    window.addEventListener('el_patron_caja_sync_needed', handleCajaSyncNeeded);
    window.addEventListener('el_patron_sheets_sync_completed', handleSheetsSync);
    window.addEventListener('el_patron_sheet_data_updated', handleSheetDataUpdated);

    // Polling cada 8 segundos para garantizar consistencia entre computadoras
    const pollTimer = setInterval(() => {
      loadCajaState();
    }, 8000);

    return () => {
      window.removeEventListener('el_patron_caja_abierta', handleCajaAbierta);
      window.removeEventListener('el_patron_caja_cerrada', handleCajaCerrada);
      window.removeEventListener('el_patron_caja_sync_needed', handleCajaSyncNeeded);
      window.removeEventListener('el_patron_sheets_sync_completed', handleSheetsSync);
      window.removeEventListener('el_patron_sheet_data_updated', handleSheetDataUpdated);
      clearInterval(pollTimer);
    };
  }, [loadCajaState]);

  const sumIngresosManuales = useMemo(() => {
    return movimientosCajaChica.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  }, [movimientosCajaChica]);

  const sumEgresosManuales = useMemo(() => {
    return movimientosCajaChica.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
  }, [movimientosCajaChica]);

  const cajaEsperadaTotal = useMemo(() => {
    if (!cajaSession) return 0;
    return cajaSession.monto_apertura + cajaSession.monto_ventas + sumIngresosManuales - sumEgresosManuales;
  }, [cajaSession, sumIngresosManuales, sumEgresosManuales]);

  const handleRegistrarMovimientoCajaChica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaSession) return;
    const montoNum = parseFloat(movimientoMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('El monto debe ser un número positivo.');
      return;
    }
    if (montoNum > 5000000) {
      toast.error('El monto ingresado es demasiado alto. Verifique el valor.');
      return;
    }
    if (!movimientoConcepto.trim() || movimientoConcepto.trim().length < 3) {
      toast.error('Debe ingresar un concepto o descripción descriptiva (mínimo 3 caracteres).');
      return;
    }

    try {
      const nuevoMov = {
        id_movimiento: `mcc_${Date.now()}`,
        id_cierre: cajaSession.id_cierre,
        tipo: movimientoTipo,
        monto: montoNum,
        concepto: movimientoConcepto.trim(),
        fecha: new Date().toISOString()
      };

      await cajaService.addMovimientoCajaChica(nuevoMov);
      toast.success(`Movimiento de caja chica (${movimientoTipo}) registrado correctamente.`);
      setMovimientoMonto('');
      setMovimientoConcepto('');
      setShowMovimientoModal(false);
      await loadCajaState();
    } catch (err: any) {
      toast.error('Error al registrar movimiento: ' + err.message);
    }
  };

  useEffect(() => {
    loadCajaState();
  }, []);

  const handleBuscarCliente = async () => {
    if (!dniCuitBuscar.trim()) {
      toast.error('Ingrese un DNI/CUIT para buscar.');
      return;
    }
    try {
      const c = await clientesService.getByDniCuit(dniCuitBuscar.trim());
      if (c) {
        setSelectedCliente(c);
        setCuitCliente(c.dni_cuit);
        setNombreCliente(c.nombre);
        toast.success(`Cliente ${c.nombre} encontrado.`);
      } else {
        setSelectedCliente(null);
        toast.info('Cliente no registrado. Ingrese los datos para registrarlo.');
      }
    } catch (err: any) {
      toast.error('Error al buscar cliente: ' + err.message);
    }
  };

  const handleRegistrarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dniCuitBuscar.trim() || !nombreNuevoCliente.trim()) {
      toast.error('DNI/CUIT y Nombre son obligatorios para el registro.');
      return;
    }
    try {
      const idCliente = `cli_${Date.now()}`;
      const nuevo = await clientesService.create({
        id_cliente: idCliente,
        dni_cuit: dniCuitBuscar.trim(),
        nombre: nombreNuevoCliente.trim(),
        email: emailNuevoCliente.trim(),
        telefono: telNuevoCliente.trim(),
        puntos: 0
      });
      setSelectedCliente(nuevo);
      setCuitCliente(nuevo.dni_cuit);
      setNombreCliente(nuevo.nombre);
      setNombreNuevoCliente('');
      setEmailNuevoCliente('');
      setTelNuevoCliente('');
      toast.success(`Cliente ${nuevo.nombre} registrado con éxito.`);
    } catch (err: any) {
      toast.error('Error al registrar cliente: ' + err.message);
    }
  };

  // Filter commands by active state waiting checkout
  const activeBills = useMemo(() => {
    const activePedidos = pedidos.filter(p => p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado');
    const groups: Pedido[][] = [];
    activePedidos.forEach(p => {
      const foundGroup = groups.find(g => isSameTable(g[0], p));
      if (foundGroup) {
        foundGroup.push(p);
      } else {
        groups.push([p]);
      }
    });

    const mergedBills: (Pedido & { isEsperandoCuenta?: boolean })[] = [];
    groups.forEach((tablePedidos) => {
      const merged = mergeTableOrders(tablePedidos, productosMenu);
      if (merged) {
        const matchingMesa = mesas?.find(m => {
          if (merged.id_mesa && m.id_mesa === merged.id_mesa) return true;
          if (merged.numero_mesa && (m.numero_mesa === merged.numero_mesa || String(m.numero_mesa) === String(merged.numero_mesa))) return true;
          return false;
        });
        const isEsperandoCuenta = matchingMesa?.estado === 'esperando_cuenta' || tablePedidos.some(p => (p as any).estado_comanda === 'esperando_cuenta');
        (merged as any).isEsperandoCuenta = isEsperandoCuenta;
        mergedBills.push(merged);
      }
    });

    const statePriority: Record<string, number> = {
      listo: 1,
      entregado: 2,
      en_cocina: 3,
      en_preparacion: 3,
      pendiente: 4,
    };

    mergedBills.sort((a, b) => {
      const isEspA = Boolean((a as any).isEsperandoCuenta || (a as any).estado_comanda === 'esperando_cuenta');
      const isEspB = Boolean((b as any).isEsperandoCuenta || (b as any).estado_comanda === 'esperando_cuenta');
      if (isEspA && !isEspB) return -1;
      if (!isEspA && isEspB) return 1;

      const prioA = statePriority[a.estado_comanda] ?? 99;
      const prioB = statePriority[b.estado_comanda] ?? 99;
      if (prioA !== prioB) return prioA - prioB;
      const timeA = new Date(a.fecha_hora).getTime() || 0;
      const timeB = new Date(b.fecha_hora).getTime() || 0;
      return timeA - timeB;
    });

    return mergedBills;
  }, [pedidos, productosMenu, mesas]);

  // Selected Order Object
  const selectedPedido = useMemo(() => {
    if (selectedPedidoId === null) return null;
    const targetPedido = pedidos.find(p => p.id_pedido === selectedPedidoId);
    if (!targetPedido) return null;

    const tablePedidos = pedidos.filter(p => 
      isSameTable(p, targetPedido) && 
      p.estado_comanda !== 'entregado_cobrado' && 
      p.estado_comanda !== 'cancelado'
    );

    return mergeTableOrders(tablePedidos, productosMenu);
  }, [selectedPedidoId, pedidos, productosMenu]);

  // Pricing calculations
  const orderBreakdowns = useMemo(() => {
    if (!selectedPedido) return { subtotal: 0, promoDeduction: 0, manualDeduction: 0, baseTotal: 0, propinaValue: 0, ivaValue: 0, finalTotal: 0, itemsCalculados: [] };
    
    const lineItems: TicketItem[] = selectedPedido.items.map(item => {
      const unit = resolvePedidoItemUnitPrice(item, productosMenu);
      return {
        cantidad: item.cantidad,
        descripcion: item.nombre,
        precio_unitario: unit,
        subtotal: item.cantidad * unit
      };
    });

    let subtotal = roundCurrency(lineItems.reduce((acc, current) => acc + current.subtotal, 0));

    if (splitByProducts && selectedProductsForSplit.length > 0) {
      subtotal = roundCurrency(selectedPedido.items.reduce((acc, item) => {
        if (selectedProductsForSplit.includes(item.id_producto)) {
          return acc + resolvePedidoItemUnitPrice(item, productosMenu) * item.cantidad;
        }
        return acc;
      }, 0));
    }

    let promoDeduction = 0;
    
    const hasOjoBife = selectedPedido.items.some(it => it.id_producto === 'prod_car_ojo_bife' || it.id_producto === 'prod_bife');
    const hasVino = selectedPedido.items.some(it => (it.id_producto.startsWith('prod_vin_trumpeter_') && !it.id_producto.includes('copa')) || it.id_producto.startsWith('prod_vin_rutini_'));
    const hasBurger = selectedPedido.items.some(it => it.id_producto === 'prod_cri_hamburguesa' || it.id_producto === 'prod_hamburguesa');
    const hasGaseosa = selectedPedido.items.some(it => it.id_insumo === 'ins_beb_gaseosa' || it.nombre.toLowerCase().includes('gaseosa') || it.id_producto === 'prod_gaseosa');

    const qualifiesForBifeVino = hasOjoBife && hasVino && (!splitByProducts || (selectedProductsForSplit.includes('prod_car_ojo_bife') && selectedProductsForSplit.some(id => (id.startsWith('prod_vin_trumpeter_') && !id.includes('copa')) || id.startsWith('prod_vin_rutini_'))));
    const qualifiesForBurgerGaseosa = hasBurger && hasGaseosa && (!splitByProducts || (selectedProductsForSplit.includes('prod_cri_hamburguesa') && (selectedProductsForSplit.includes('ins_beb_gaseosa') || selectedProductsForSplit.includes('prod_gaseosa'))));

    if (qualifiesForBifeVino) {
      const vinoItem = selectedPedido.items.find(it => (it.id_producto.startsWith('prod_vin_trumpeter_') && !it.id_producto.includes('copa')) || it.id_producto.startsWith('prod_vin_rutini_'));
      if (vinoItem) {
        promoDeduction += (resolvePedidoItemUnitPrice(vinoItem, productosMenu) * 0.15) * vinoItem.cantidad;
      }
    }

    if (qualifiesForBurgerGaseosa) {
      promoDeduction += 1500;
    }

    promoDeduction = roundCurrency(promoDeduction);
    let manualDeduction = roundCurrency(subtotal * (descuentoPorcentaje / 100));
    let baseTotal = roundCurrency(Math.max(0, subtotal - promoDeduction - manualDeduction));
    let propinaValue = roundCurrency(baseTotal * (propinaPorcentaje / 100));
    // El emisor es monotributista: la Factura C no discrimina IVA.
    let ivaValue = 0;
    let finalTotal = roundCurrency(Math.max(0, baseTotal + propinaValue - puntosRedimidos));

    return {
      subtotal,
      promoDeduction,
      manualDeduction,
      baseTotal,
      propinaValue,
      ivaValue,
      finalTotal,
      itemsCalculados: lineItems
    };
  }, [selectedPedido, productosMenu, descuentoPorcentaje, propinaPorcentaje, splitByProducts, selectedProductsForSplit, puntosRedimidos]);

  const mixedSum = useMemo(() => {
    return mixedPayments.reduce((sum, current) => sum + current.monto, 0);
  }, [mixedPayments]);

  const rawRemainingMixedBalance = useMemo(() => {
    return Math.max(0, orderBreakdowns.finalTotal - mixedSum);
  }, [mixedSum, orderBreakdowns.finalTotal]);

  const calculatedChange = useMemo(() => {
    const rawVal = parseFloat(montoEntregadoEfectivo);
    if (isNaN(rawVal)) return 0;
    
    const targetValue = metodoPago === 'mixto' ? rawRemainingMixedBalance : orderBreakdowns.finalTotal;
    return Math.max(0, rawVal - targetValue);
  }, [montoEntregadoEfectivo, metodoPago, rawRemainingMixedBalance, orderBreakdowns.finalTotal]);

  const handleAddMixedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(mixedMontoInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Por favor, tipee un monto numérico mayor a cero.');
      return;
    }
    if (amt > rawRemainingMixedBalance) {
      toast.error('El monto del pago excede el saldo pendiente de la cuenta.');
      return;
    }

    setMixedPayments(prev => [...prev, { metodo: mixedMetodoInput, monto: amt }]);
    setMixedMontoInput('');
  };

  const handleRemoveMixedPayment = (idx: number) => {
    setMixedPayments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amt = parseFloat(openingCashInput);
      if (isNaN(amt) || amt < 0) {
        toast.error('Monto de inicio no válido.');
        return;
      }

      if (!operatorName.trim() || operatorName.trim().length < 2) {
        toast.error('El nombre del cajero debe tener al menos 2 caracteres.');
        return;
      }

      const session = await cajaService.open(amt, operatorName);
      setCajaSession(session);
      setShowOpenModal(false);
      addLog('sistema', `CAJA: Turno de caja iniciado por ${operatorName}. Monto inicial: ARS $${amt.toLocaleString('es-AR')}`);
      loadCajaState();
      if (session.sync_status === 'pending') {
        toast.warning('Caja abierta localmente. La sincronización con Supabase quedó pendiente.');
      } else {
        toast.success('La jornada de caja fue abierta correctamente.');
      }
    } catch (err: any) {
      console.error('Error opening shift:', err);
      toast.error('Error al abrir la caja: ' + (err?.message || err));
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const money = parseFloat(closingPhysicalCashInput);
      if (isNaN(money) || money < 0) {
        toast.error('Monto de arqueo físico ingresado no es válido.');
        return;
      }

      if (!cajaSession) return;

      const finalShift = await cajaService.close(money, closingObservationsInput, movimientosCajaChica);
      
      // Cerrar modal y limpiar estados inmediatamente para respuesta visual instantánea (0ms)
      setCajaSession(null);
      setShowCloseModal(false);
      setClosingPhysicalCashInput('');
      setClosingObservationsInput('Cierre de turno');
      loadCajaState();

      addLog('sistema', `CAJA: Turno fiscal cerrado por ${finalShift?.usuario_cajero || 'Cajero'}. Arqueo Real: $${finalShift?.monto_real?.toLocaleString('es-AR')}. Diferencia: ARS $${finalShift?.diferencia?.toLocaleString('es-AR')}`);

      if (finalShift.sync_status === 'pending') {
        toast.warning('Jornada cerrada y respaldada localmente. Supabase se sincronizará al recuperar conexión.');
      } else {
        toast.success('Jornada finalizada. Arqueo sincronizado y balance exportado en CSV y PDF.');
      }

      const csvRows = [
        ['EL PATRON GRILL - REPORTE DE BALANCE DIARIO'],
        ['Cajero Responsable', finalShift?.usuario_cajero || 'Cajero'],
        ['Apertura', finalShift.fecha_apertura],
        ['Cierre de Turno', finalShift.fecha_cierre || 'N/A'],
        ['Monto Inicial de Caja ($)', finalShift.monto_apertura.toFixed(2)],
        ['Total de Ventas Turno ($)', finalShift.monto_ventas.toFixed(2)],
        ['Arqueo Físico Caja ($)', finalShift.monto_real ? finalShift.monto_real.toFixed(2) : '0.00'],
        ['Diferencia Conciliación ($)', finalShift.diferencia ? finalShift.diferencia.toFixed(2) : '0.00'],
        ['Observaciones Turno', finalShift.observaciones],
        ['']
      ];

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(e => e.join(";")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Arqueo_Turno_Caja_${finalShift.id_cierre}.csv`);
      document.body.appendChild(link);
      link.click();
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }

      try {
        await pdfService.exportShiftClosePDF(finalShift);
      } catch (err: any) {
        console.error('Error generating shift close PDF:', err);
        toast.warning('No se pudo descargar el comprobante en formato PDF: ' + err.message);
      }
    } catch (err: any) {
      console.error('Error closing shift:', err);
      toast.error('Error al cerrar la caja: ' + (err?.message || err));
    }
  };

  const executeCheckout = async () => {
    if (!selectedPedido) return;
    if (!cajaSession) {
      toast.error('Por favor abra la caja diaria primero para registrar cobros e imprimir tickets.');
      return;
    }

    if (orderBreakdowns.finalTotal <= 0) {
      toast.error('No se permite cobrar una cuenta por un valor negativo o cero.');
      return;
    }

    let pays: { metodo: string; monto: number }[] = [];
    if (metodoPago === 'mixto') {
      if (Math.abs(mixedSum - orderBreakdowns.finalTotal) > 0.5) {
        toast.error(`Monto incompleto en forma mixta. Saldo faltante: ${rawRemainingMixedBalance.toLocaleString('es-AR')}`);
        return;
      }
      pays = [...mixedPayments];
    } else {
      pays = [{ metodo: metodoPago, monto: orderBreakdowns.finalTotal }];
    }

    if (metodoPago === 'efectivo' && montoEntregadoEfectivo) {
      const delivered = parseFloat(montoEntregadoEfectivo);
      if (!isNaN(delivered) && delivered < orderBreakdowns.finalTotal) {
        toast.error('El efectivo entregado es menor que el total de la cuenta.');
        return;
      }
    }

    const saleTimestamp = Date.now();
    const saleDate = new Date(saleTimestamp);
    const idFactura = `fac_${saleTimestamp}`;
    const compiledTicketNo = internalTicketPreview(lastFacturas.map(factura => factura.nro_ticket));

    const dataTicket: TicketData = {
      nombreComercial: restaurante.nombreComercial,
      razonSocial: restaurante.razonSocial,
      cuit: restaurante.cuit,
      direccion: restaurante.direccion,
      telefono: restaurante.telefono,
      email: restaurante.email,
      nroComprobante: compiledTicketNo,
      idPedido: selectedPedido.id_pedido,
      mesa: formatTicketTableName(selectedPedido.numero_mesa),
      mozo: selectedPedido.mozo,
      cajero: cajaSession?.usuario_cajero || cashierNameInput || 'Caja',
      fechaHora: formatArgentinaDateTime(saleDate),
      items: (splitByProducts && selectedProductsForSplit.length > 0
        ? selectedPedido.items.filter(it => selectedProductsForSplit.includes(it.id_producto))
        : selectedPedido.items
      ).map(it => {
        const uni = resolvePedidoItemUnitPrice(it, productosMenu);
        return {
          cantidad: it.cantidad,
          descripcion: it.nombre,
          precio_unitario: uni,
          subtotal: it.cantidad * uni
        };
      }),
      subtotal: orderBreakdowns.subtotal,
      descuento: orderBreakdowns.promoDeduction + orderBreakdowns.manualDeduction,
      propina: orderBreakdowns.propinaValue,
      iva: 0,
      total: orderBreakdowns.finalTotal,
      metodosPago: pays,
      vuelto: calculatedChange,
      tipoComprobante: 'ticket_consumo',
      mensajePie: 'TICKET DE CONSUMO - DOCUMENTO NO VALIDO COMO FACTURA. Para factura electronica solicitala en Facturacion.',
      clienteNombre: selectedCliente ? selectedCliente.nombre : nombreCliente,
      clienteCuit: selectedCliente ? selectedCliente.dni_cuit : cuitCliente,
      clienteDniCuit: selectedCliente ? selectedCliente.dni_cuit : cuitCliente,
      puntosCanjeados: puntosRedimidos,
      puntosGanados: selectedCliente ? Math.round(orderBreakdowns.finalTotal * 0.05) : 0,
      descuentoFidelidad: puntosRedimidos
    };

    const mappedMedio = pays.map(p => p.metodo.toUpperCase()).join(' + ');

    const internalFactura: Factura = {
      id_factura: idFactura,
      id_pedido: selectedPedido.id_pedido,
      nro_ticket: compiledTicketNo,
      cliente: nombreCliente === 'Consumidor Final' ? 'Consumidor Final' : nombreCliente + ` (CUIT ${cuitCliente})`,
      cuit: cuitCliente,
      total: orderBreakdowns.finalTotal,
      iva_veintiuno: 0,
      medio_pago: metodoPago,
      fecha: formatArgentinaTime(saleDate),
      fecha_completa: getArgentinaDateTimeString(saleDate),
      estado: 'borrador',
      tipo: 'ticket',
    };
    const paymentRows: PagoDb[] = pays.map((p, idx) => ({
      id_pago: `pag_${saleTimestamp}_${idx}`,
      id_factura: idFactura,
      monto: p.monto,
      metodo: p.metodo,
      fecha: getArgentinaDateTimeString(saleDate)
    }));

    // Disparar la impresión del ticket de inmediato (0ms de demora) hacia la tiquetera
    const printPromise = printerService.sendToPrinter(dataTicket, printerConfig);
    printPromise.then(printRes => {
      if (printRes.success) {
        toast.success(printRes.message);
      } else {
        toast.warning(printRes.message);
      }
    }).catch(e => {
      toast.warning(`Detalle en la impresora: ${e?.message || e}`);
    });

    const paymentDesglosesCount = {
      efectivo: pays.filter(p => p.metodo === 'efectivo').reduce((s, c) => s + c.monto, 0),
      debito: pays.filter(p => p.metodo === 'debito').reduce((s, c) => s + c.monto, 0),
      credito: pays.filter(p => p.metodo === 'tarjeta' || p.metodo === 'credito').reduce((s, c) => s + c.monto, 0),
      transferencia: pays.filter(p => p.metodo === 'transferencia').reduce((s, c) => s + c.monto, 0),
      mercadopago: pays.filter(p => p.metodo === 'mp_qr' || p.metodo === 'mercadopago').reduce((s, c) => s + c.monto, 0)
    };

    // Almacenar transacción pendiente de confirmación de cierre de mesa
    setPendingCloseMesaData({
      pedidoId: selectedPedido.id_pedido,
      numeroMesa: selectedPedido.numero_mesa,
      finalTotal: orderBreakdowns.finalTotal,
      compiledTicketNo,
      mappedMedio,
      calculatedChange,
      factura: internalFactura,
      pagos: paymentRows,
      paymentDesglosesCount,
      selectedCliente,
      puntosRedimidos
    });

    // Abrir cartel de confirmación: ¿Confirmar comanda cobrada y cerrar mesa?
    setShowConfirmCerrarMesaModal(true);
  };

  const handleConfirmCheckout = async () => {
    if (checkoutInFlightRef.current) return;
    checkoutInFlightRef.current = true;
    setIsCheckoutProcessing(true);
    try {
      await executeCheckout();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error('Error processing checkout:', error);
      toast.error(`No se pudo completar el cobro. La mesa sigue abierta. Detalle: ${detail}`);
    } finally {
      checkoutInFlightRef.current = false;
      setIsCheckoutProcessing(false);
    }
  };

  const handleConfirmCerrarMesa = async () => {
    if (!pendingCloseMesaData || isFinalizingClose) return;
    setIsFinalizingClose(true);

    try {
      const {
        pedidoId,
        numeroMesa,
        finalTotal,
        compiledTicketNo,
        mappedMedio,
        calculatedChange,
        factura,
        pagos,
        paymentDesglosesCount,
        selectedCliente: checkoutCliente,
        puntosRedimidos: checkoutPuntos
      } = pendingCloseMesaData;

      // 1. Liberar mesa y comanda en salón y Google Sheets de forma inmediata (0ms)
      onFacturarMesa(pedidoId, true);

      const persistence = await salesPersistenceService.persist({ factura, pagos });
      if (persistence.pendingSync) {
        toast.warning('Cobro respaldado localmente. Se sincronizará con Supabase al recuperar conexión.');
      }

      try {
        await cajaService.updateSales(finalTotal, paymentDesglosesCount);
      } catch (e: any) {
        toast.error(`Error al actualizar ventas: ${e.message}`);
      }

      if (checkoutCliente) {
        try {
          const puntosGanados = Math.round(finalTotal * 0.05);
          const nextPuntos = Math.max(0, checkoutCliente.puntos - checkoutPuntos) + puntosGanados;
          await clientesService.updatePuntos(checkoutCliente.id_cliente, nextPuntos);
          addLog('sistema', `FIDELIDAD: Cliente ${checkoutCliente.nombre} redimió ${checkoutPuntos} puntos y ganó ${puntosGanados} puntos. Balance actual: ${nextPuntos}.`);
        } catch (err) {
          console.error('Error updating customer points:', err);
        }
      }

      try {
        await auditoriaService.create({
          id: `aud_${Date.now()}`,
          tipo: 'sistema',
          mensaje: `Cobro exitoso Mesa ${numeroMesa}. Ticket interno: ${compiledTicketNo}. Total: $${finalTotal.toLocaleString('es-AR')}. Pago: ${mappedMedio}`,
          timestamp: new Date()
        });
      } catch (e: any) {
        console.error('Audit log error:', e);
      }

      addLog('sistema', `CAJA: Cobro finalizado para Mesa ${numeroMesa}. Ticket interno ${compiledTicketNo} registrado sin solicitar CAE.`);

      setSelectedPedidoId(null);
      setMixedPayments([]);
      setMontoEntregadoEfectivo('');
      setDescuentoPorcentaje(0);
      setPropinaPorcentaje(0);
      setSplitByProducts(false);
      setSelectedProductsForSplit([]);
      setSelectedCliente(null);
      setPuntosRedimidos(0);
      setDniCuitBuscar('');
      setNombreNuevoCliente('');
      setEmailNuevoCliente('');
      setTelNuevoCliente('');
      loadCajaState();

      setShowConfirmCerrarMesaModal(false);
      setPendingCloseMesaData(null);

      setSuccessDetails({
        nro: compiledTicketNo,
        total: finalTotal,
        vuelto: calculatedChange
      });
      setShowSuccessModal(true);
      toast.success(`Mesa ${numeroMesa} cobrada y cerrada.`);
    } catch (err: any) {
      console.error('Error al finalizar cobro y cerrar mesa:', err);
      toast.error(`Error al cerrar mesa: ${err?.message || err}`);
    } finally {
      setIsFinalizingClose(false);
    }
  };

  const handleKeepMesaOpen = () => {
    const mesa = pendingCloseMesaData?.numeroMesa || (selectedPedido ? selectedPedido.numero_mesa : '');
    setShowConfirmCerrarMesaModal(false);
    setPendingCloseMesaData(null);
    toast.info(`Cobro cancelado. Mesa ${mesa} permanece abierta en el salón.`);
  };


  const triggerManualPrint = async () => {
    if (!selectedPedido || !cajaSession) return;

    const dataTicket: TicketData = {
      nombreComercial: restaurante.nombreComercial,
      razonSocial: restaurante.razonSocial,
      cuit: restaurante.cuit,
      direccion: restaurante.direccion,
      telefono: restaurante.telefono,
      email: restaurante.email,
      nroComprobante: `PREV-001-${selectedPedido.id_pedido}`,
      idPedido: selectedPedido.id_pedido,
      mesa: formatTicketTableName(selectedPedido.numero_mesa),
      mozo: selectedPedido.mozo,
      cajero: cajaSession?.usuario_cajero || cashierNameInput || 'Caja',
      fechaHora: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: (splitByProducts && selectedProductsForSplit.length > 0
        ? selectedPedido.items.filter(it => selectedProductsForSplit.includes(it.id_producto))
        : selectedPedido.items
      ).map(it => {
        const uni = resolvePedidoItemUnitPrice(it, productosMenu);
        return {
          cantidad: it.cantidad,
          descripcion: it.nombre,
          precio_unitario: uni,
          subtotal: it.cantidad * uni
        };
      }),
      subtotal: orderBreakdowns.subtotal,
      descuento: orderBreakdowns.promoDeduction + orderBreakdowns.manualDeduction,
      propina: orderBreakdowns.propinaValue,
      iva: orderBreakdowns.ivaValue,
      total: orderBreakdowns.finalTotal,
      metodosPago: [{ metodo: metodoPago, monto: orderBreakdowns.finalTotal }],
      vuelto: calculatedChange,
      tipoComprobante: 'ticket_consumo',
      mensajePie: 'TICKET DE CONSUMO - DOCUMENTO NO VALIDO COMO FACTURA.',
      cae: undefined,
      vto: undefined,
      qrData: undefined,
      clienteNombre: selectedCliente ? selectedCliente.nombre : nombreCliente,
      clienteCuit: selectedCliente ? selectedCliente.dni_cuit : cuitCliente,
      clienteDniCuit: selectedCliente ? selectedCliente.dni_cuit : cuitCliente,
      puntosCanjeados: puntosRedimidos,
      puntosGanados: 0,
      descuentoFidelidad: puntosRedimidos
    };

    const res = await printerService.sendToPrinter(dataTicket, printerConfig);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(`${res.message} — revisar conexión ESC/POS.`);
    }
  };

  const triggerPDFDownloadOnly = async () => {
    if (!selectedPedido || !cajaSession) return;

    const dataTicket: TicketData = {
      nombreComercial: restaurante.nombreComercial,
      razonSocial: restaurante.razonSocial,
      cuit: restaurante.cuit,
      direccion: restaurante.direccion,
      telefono: restaurante.telefono,
      email: restaurante.email,
      nroComprobante: `PREV-001-${selectedPedido.id_pedido}`,
      idPedido: selectedPedido.id_pedido,
      mesa: formatTicketTableName(selectedPedido.numero_mesa),
      mozo: selectedPedido.mozo,
      cajero: cajaSession?.usuario_cajero || cashierNameInput || 'Caja',
      fechaHora: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: (splitByProducts && selectedProductsForSplit.length > 0
        ? selectedPedido.items.filter(it => selectedProductsForSplit.includes(it.id_producto))
        : selectedPedido.items
      ).map(it => {
        const uni = resolvePedidoItemUnitPrice(it, productosMenu);
        return {
          cantidad: it.cantidad,
          descripcion: it.nombre,
          precio_unitario: uni,
          subtotal: it.cantidad * uni
        };
      }),
      subtotal: orderBreakdowns.subtotal,
      descuento: orderBreakdowns.promoDeduction + orderBreakdowns.manualDeduction,
      propina: orderBreakdowns.propinaValue,
      iva: orderBreakdowns.ivaValue,
      total: orderBreakdowns.finalTotal,
      metodosPago: [{ metodo: metodoPago, monto: orderBreakdowns.finalTotal }],
      vuelto: calculatedChange,
      tipoComprobante: 'ticket_consumo',
      mensajePie: 'TICKET DE CONSUMO - DOCUMENTO NO VALIDO COMO FACTURA.',
      clienteNombre: selectedCliente ? selectedCliente.nombre : nombreCliente,
      clienteCuit: selectedCliente ? selectedCliente.dni_cuit : cuitCliente
    };

    await pdfService.exportToPDF(dataTicket);
  };

  const buildFacturaHistorialTicketData = (factura: Factura): TicketData => {
    const isFacturaC = factura.tipo === 'C' || factura.tipo === 'NC';
    const neto = isFacturaC ? factura.total : Number((factura.total / 1.21).toFixed(2));
    const emitter = factura.arca_emisor;
    return {
      idPedido: factura.id_pedido || 0,
      nroComprobante: factura.nro_ticket,
      tipoComprobante: factura.tipo === 'NC' ? 'nota_credito_c' : factura.tipo === 'C' ? 'factura_c' : 'ticket_consumo',
      fechaHora: factura.fecha_completa || factura.fecha,
      mesa: 'Historial',
      mozo: 'Caja',
      cajero: cajaSession?.usuario_cajero || 'Caja',
      nombreComercial: emitter?.tradeName || restaurante.nombreComercial,
      razonSocial: emitter?.legalName || restaurante.razonSocial,
      cuit: emitter?.cuit || restaurante.cuit,
      direccion: emitter?.commercialAddress || restaurante.direccion,
      telefono: restaurante.telefono,
      email: restaurante.email,
      ingresosBrutos: emitter?.grossIncomeNumber,
      inicioActividades: emitter?.activityStartDate,
      condicionIvaEmisor: isFacturaC ? 'Monotributo' : undefined,
      condicionIvaReceptor: CONDICIONES_IVA_RECEPTOR.find(condition => condition.id === factura.condicion_iva_receptor)?.label,
      items: (factura.items && factura.items.length > 0)
        ? factura.items.map(it => ({
            descripcion: it.descripcion,
            cantidad: it.cantidad,
            precio_unitario: it.precio_unitario,
            subtotal: it.subtotal
          }))
        : [{
            cantidad: 1,
            descripcion: 'Venta gastronómica según ticket emitido',
            precio_unitario: neto,
            subtotal: neto
          }],
      subtotal: neto,
      descuento: 0,
      propina: 0,
      iva: isFacturaC ? 0 : factura.iva_veintiuno || 0,
      total: factura.total,
      metodosPago: [{ metodo: factura.medio_pago || 'efectivo', monto: factura.total }],
      vuelto: 0,
      mensajePie: factura.afip_cae ? 'Comprobante electrónico autorizado por ARCA.' : 'DOCUMENTO NO VALIDO COMO FACTURA.',
      cae: factura.afip_cae,
      vto: factura.afip_vto,
      qrData: factura.afip_qr,
      clienteNombre: factura.cliente,
      clienteCuit: factura.cuit,
      puntoVenta: factura.afip_pto_vta,
      numeroFiscal: factura.afip_cbte_nro,
      fechaEmision: factura.fecha_completa,
      clienteDocumentoTipo: factura.documento_tipo_receptor === 80 ? 'CUIT' : factura.documento_tipo_receptor === 96 ? 'DNI' : 'Consumidor Final',
      clienteDomicilio: factura.cliente_domicilio,
      comprobanteAsociado: factura.comprobante_asociado,
    };
  };

  const downloadFacturaHistorialPdf = async (factura: Factura) => {
    const ticketData = buildFacturaHistorialTicketData(factura);
    await pdfService.exportToPDF(ticketData);
  };

  const printFacturaHistorialTermica = async (factura: Factura) => {
    try {
      const ticketData = buildFacturaHistorialTicketData(factura);
      const config = printerService.getDefaultConfig();
      const res = await printerService.sendToPrinter(ticketData, config);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error('Error al imprimir ticket térmico historial:', err);
      toast.error('No se pudo enviar el comprobante a la ticketera térmica.');
    }
  };

  const handleDownloadTicketsAuditPDF = async (
    filtroScope: 'todos' | 'turno_actual' | 'hoy' = auditFilterScope,
    arcaFilter: 'todos' | 'arca' | 'sin_arca' = auditArcaFilter
  ) => {
    setIsExportingTicketsPdf(true);
    try {
      // Always query latest from facturas (Google Sheets + cache)
      const allFacturas = await facturacionService.list();
      setLastFacturas(allFacturas);

      let filtered = [...allFacturas];
      let scopeTitle = 'Todos los Comprobantes';

      if (filtroScope === 'turno_actual') {
        scopeTitle = 'Turno Actual de Caja';
        if (cajaSession?.fecha_apertura) {
          const aperturaTime = new Date(cajaSession.fecha_apertura).getTime();
          filtered = filtered.filter(f => {
            if (!f.fecha_completa) return true;
            const fTime = new Date(f.fecha_completa).getTime();
            return !isNaN(fTime) ? fTime >= aperturaTime : true;
          });
        }
      } else if (filtroScope === 'hoy') {
        scopeTitle = 'Cobros de Hoy';
        const todayStr = argentinaDateIso();
        filtered = filtered.filter(f => {
          if (!f.fecha_completa) return true;
          return f.fecha_completa.startsWith(todayStr);
        });
      }

      if (arcaFilter === 'arca') {
        scopeTitle += ' (Solo Fiscales ARCA)';
        filtered = filtered.filter(f => Boolean(f.afip_cae || (f.tipo && f.tipo !== 'ticket' && f.tipo !== 'X')));
      } else if (arcaFilter === 'sin_arca') {
        scopeTitle += ' (Solo Tickets Consumo sin ARCA)';
        filtered = filtered.filter(f => !f.afip_cae && (!f.tipo || f.tipo === 'ticket' || f.tipo === 'X'));
      }

      await pdfService.exportTicketsAuditReportPDF({
        facturas: filtered,
        configRestaurante: restaurante,
        session: cajaSession,
        filtroTitulo: scopeTitle,
        operatorName: operatorName || 'Administrador'
      });

      toast.success(`Reporte PDF descargado exitosamente (${filtered.length} comprobantes incluidos).`);
      setShowTicketsAuditModal(false);
    } catch (err: any) {
      console.error('Error generando reporte de auditoría de tickets:', err);
      toast.error(`Error al generar el PDF: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsExportingTicketsPdf(false);
    }
  };

  return {
    restaurante,
    setRestaurante,
    editRestauranteMode,
    setEditRestauranteMode,
    cajaSession,
    sessionInsumos,
    lastFacturas,
    showOpenModal,
    setShowOpenModal,
    showCloseModal,
    setShowCloseModal,
    openingCashInput,
    setOpeningCashInput,
    cashierNameInput,
    closingPhysicalCashInput,
    setClosingPhysicalCashInput,
    closingObservationsInput,
    setClosingObservationsInput,
    selectedPedidoId,
    setSelectedPedidoId,
    cuitCliente,
    setCuitCliente,
    nombreCliente,
    setNombreCliente,
    metodoPago,
    setMetodoPago,
    mixedPayments,
    setMixedPayments,
    mixedMetodoInput,
    setMixedMetodoInput,
    mixedMontoInput,
    setMixedMontoInput,
    montoEntregadoEfectivo,
    setMontoEntregadoEfectivo,
    descuentoPorcentaje,
    setDescuentoPorcentaje,
    propinaPorcentaje,
    setPropinaPorcentaje,
    splitPayerCount,
    setSplitPayerCount,
    activePayerIndex,
    setActivePayerIndex,
    splitByProducts,
    setSplitByProducts,
    selectedProductsForSplit,
    setSelectedProductsForSplit,
    showSuccessModal,
    setShowSuccessModal,
    successDetails,
    isCheckoutProcessing,
    printerConfig,
    setPrinterConfig,
    showPrinterSettings,
    setShowPrinterSettings,
    selectedCliente,
    setSelectedCliente,
    dniCuitBuscar,
    setDniCuitBuscar,
    nombreNuevoCliente,
    setNombreNuevoCliente,
    emailNuevoCliente,
    setEmailNuevoCliente,
    telNuevoCliente,
    setTelNuevoCliente,
    puntosRedimidos,
    setPuntosRedimidos,
    movimientosCajaChica,
    showMovimientoModal,
    setShowMovimientoModal,
    movimientoMonto,
    setMovimientoMonto,
    movimientoTipo,
    setMovimientoTipo,
    movimientoConcepto,
    setMovimientoConcepto,
    sumIngresosManuales,
    sumEgresosManuales,
    cajaEsperadaTotal,
    handleRegistrarMovimientoCajaChica,
    handleBuscarCliente,
    handleRegistrarCliente,
    activeBills,
    selectedPedido,
    orderBreakdowns,
    mixedSum,
    rawRemainingMixedBalance,
    calculatedChange,
    handleAddMixedPayment,
    handleRemoveMixedPayment,
    handleOpenShift,
    handleCloseShift,
    handleConfirmCheckout,
    showConfirmCerrarMesaModal,
    setShowConfirmCerrarMesaModal,
    pendingCloseMesaData,
    isFinalizingClose,
    handleConfirmCerrarMesa,
    handleKeepMesaOpen,
    triggerManualPrint,
    triggerPDFDownloadOnly,
    downloadFacturaHistorialPdf,
    printFacturaHistorialTermica,
    loadCajaState,
    showTicketsAuditModal,
    setShowTicketsAuditModal,
    isExportingTicketsPdf,
    auditFilterScope,
    setAuditFilterScope,
    auditArcaFilter,
    setAuditArcaFilter,
    handleDownloadTicketsAuditPDF,
    refreshFacturas,
    isRefreshingFacturas
  };
}

