import { useState, useMemo, useEffect } from 'react';
import { 
  Pedido, 
  ProductoMenu, 
  CierreCaja, 
  PrinterConfig, 
  TicketData, 
  TicketItem,
  FacturaDb,
  PagoDb,
  Cliente
} from '../../../types';
import { cajaService } from '../../../services/cajaService';
import { pagosService } from '../../../services/pagosService';
import { pdfService } from '../../../services/pdfService';
import { printerService } from '../../../services/printerService';
import { facturacionService, Factura } from '../../../services/facturacionService';
import { auditoriaService } from '../../../services/auditoriaService';
import { clientesService } from '../../../services/clientesService';
import { CONDICIONES_IVA_RECEPTOR } from '../../../services/arcaService';
import { DEFAULT_RESTAURANT_PROFILE, normalizeRestaurantProfile } from '../../../lib/restaurantProfile';
import { resolvePedidoItemUnitPrice, roundCurrency } from '../../../lib/orderPricing';
import { internalTicketPreview } from '../../../lib/fiscalVoucherPolicy';

interface UseCajaProps {
  pedidos: Pedido[];
  productosMenu: ProductoMenu[];
  onFacturarMesa: (idPedido: number) => void;
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
  pedidos,
  productosMenu,
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

  // Shift opening/closing dialog states
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState<string>('25000');
  const [cashierNameInput, setCashierNameInput] = useState<string>('Sofía Colombo');
  const [closingPhysicalCashInput, setClosingPhysicalCashInput] = useState<string>('');
  const [closingObservationsInput, setClosingObservationsInput] = useState<string>('Facturación normal del turno');

  // Interactive cashier selection
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);
  
  // Checkout options
  const [cuitCliente, setCuitCliente] = useState<string>('99-99999999-9'); // Default Consumidor Final
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
  const [propinaPorcentaje, setPropinaPorcentaje] = useState<number>(10); // Standard 10%

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
  const loadCajaState = async () => {
    let active = cajaService.getOpenSession();
    // Instantly set the local session to avoid UI flicker or requiring reopen on refresh
    setCajaSession(active);

    try {
      // Fetch history, invoices, and cash movements in parallel to minimize load times
      const [history, facturas, movs] = await Promise.all([
        cajaService.list(),
        facturacionService.list(),
        active ? cajaService.listMovimientosCajaChica(active.id_cierre) : Promise.resolve([])
      ]);

      setSessionInsumos(history);
      setLastFacturas(facturas.slice(0, 6));
      setMovimientosCajaChica(movs);
    } catch (err) {
      console.error('Error loading history in loadCajaState:', err);
    }

    // Update with remote state in the background
    if (active) {
      try {
        const remote = await cajaService.getOpenSessionRemote(active.id_cierre);
        if (remote) {
          const isClosedRemotely = remote.fecha_cierre && 
            remote.fecha_cierre !== remote.fecha_apertura && 
            remote.observaciones !== 'Sesión Activa - En Turno';

          if (isClosedRemotely) {
            // The session has been closed remotely on another terminal
            cajaService.safeStorage.removeItem('el_patron_caja_activa');
            setCajaSession(null);
            toast.info('La sesión de caja fue cerrada desde otro terminal.');
          } else {
            const updatedActive = {
              ...active,
              monto_ventas: remote.monto_ventas ?? active.monto_ventas,
              monto_apertura: remote.monto_apertura ?? active.monto_apertura,
              usuario_cajero: remote.usuario_cajero ?? active.usuario_cajero,
              observaciones: remote.observaciones ?? active.observaciones,
              movimientos_manuales: remote.movimientos_manuales ?? active.movimientos_manuales
            };
            cajaService.safeStorage.setItem('el_patron_caja_activa', JSON.stringify(updatedActive));
            setCajaSession(updatedActive);
          }
        }
      } catch (err) {
        console.warn('Offline active session loading fallback');
      }
    }
  };

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

  function mergePedidos(tablePedidos: Pedido[]): Pedido | null {
    if (tablePedidos.length === 0) return null;
    const base = tablePedidos[0];
    
    const itemMap = new Map<string, { item: any; qty: number }>();
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

  function isSameTable(p1: { id_mesa?: any; numero_mesa?: string }, p2: { id_mesa?: any; numero_mesa?: string }): boolean {
    if (p1.id_mesa !== undefined && p1.id_mesa !== null && p2.id_mesa !== undefined && p2.id_mesa !== null) {
      if (String(p1.id_mesa) === String(p2.id_mesa)) return true;
    }
    const norm1 = String(p1.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
    const norm2 = String(p2.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
    return norm1 !== '' && norm1 === norm2;
  }

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

    const mergedBills: Pedido[] = [];
    groups.forEach((tablePedidos) => {
      const merged = mergePedidos(tablePedidos);
      if (merged) {
        mergedBills.push(merged);
      }
    });

    return mergedBills;
  }, [pedidos]);

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

    return mergePedidos(tablePedidos);
  }, [selectedPedidoId, pedidos]);

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

      if (!cashierNameInput.trim() || cashierNameInput.trim().length < 2) {
        toast.error('El nombre del cajero debe tener al menos 2 caracteres.');
        return;
      }

      const session = await cajaService.open(amt, cashierNameInput);
      setCajaSession(session);
      setShowOpenModal(false);
      addLog('sistema', `CAJA: Turno fiscal de caja iniciado por ${cashierNameInput}. Monto inicial: ARS $${amt.toLocaleString('es-AR')}`);
      loadCajaState();
      toast.success('La jornada fiscal diaria ha sido abierta con éxito.');
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
      
      addLog('sistema', `CAJA: Turno fiscal cerrado por ${finalShift.usuario_cajero}. Arqueo Real: $${finalShift.monto_real?.toLocaleString('es-AR')}. Diferencia: ARS $${finalShift.diferencia?.toLocaleString('es-AR')}`);

      const csvRows = [
        ['EL PATRON GRILL - REPORTE DE BALANCE DIARIO'],
        ['Cajero Responsable', finalShift.usuario_cajero],
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

      setCajaSession(null);
      setShowCloseModal(false);
      setClosingPhysicalCashInput('');
      setClosingObservationsInput('Facturación normal del turno');
      loadCajaState();
      toast.success('Jornada finalizada. Arqueo homologado y balance exportado en CSV y PDF.');
    } catch (err: any) {
      console.error('Error closing shift:', err);
      toast.error('Error al cerrar la caja: ' + (err?.message || err));
    }
  };

  const handleConfirmCheckout = async () => {
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

    const idFactura = `fac_${Date.now()}`;
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
      mesa: selectedPedido.numero_mesa,
      mozo: selectedPedido.mozo,
      cajero: cajaSession.usuario_cajero,
      fechaHora: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs',
      items: selectedPedido.items.map(it => {
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

    try {
      await facturacionService.create({
        id_factura: idFactura,
        id_pedido: selectedPedido.id_pedido,
        nro_ticket: compiledTicketNo,
        cliente: nombreCliente === 'Consumidor Final' ? 'Consumidor Final' : nombreCliente + ` (CUIT ${cuitCliente})`,
        cuit: cuitCliente,
        total: orderBreakdowns.finalTotal,
        iva_veintiuno: 0,
        medio_pago: metodoPago,
        fecha: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
        estado: 'borrador',
        tipo: 'ticket',
      });
    } catch (err) {
      console.warn('Network offline backup creation:', err);
    }

    const paymentRows: PagoDb[] = pays.map((p, idx) => ({
      id_pago: `pag_${Date.now()}_${idx}`,
      id_factura: idFactura,
      monto: p.monto,
      metodo: p.metodo,
      fecha: new Date().toISOString()
    }));

    try {
      await pagosService.bulkCreate(paymentRows);
    } catch {
      // fallbacked
    }

    const paymentDesglosesCount = {
      efectivo: pays.filter(p => p.metodo === 'efectivo').reduce((s, c) => s + c.monto, 0),
      debito: pays.filter(p => p.metodo === 'debito').reduce((s, c) => s + c.monto, 0),
      credito: pays.filter(p => p.metodo === 'tarjeta' || p.metodo === 'credito').reduce((s, c) => s + c.monto, 0),
      transferencia: pays.filter(p => p.metodo === 'transferencia').reduce((s, c) => s + c.monto, 0),
      mercadopago: pays.filter(p => p.metodo === 'mp_qr' || p.metodo === 'mercadopago').reduce((s, c) => s + c.monto, 0)
    };

    try {
      await cajaService.updateSales(orderBreakdowns.finalTotal, paymentDesglosesCount);
    } catch (e: any) {
      toast.error(`Error al actualizar ventas: ${e.message}`);
    }

    if (selectedCliente) {
      try {
        const puntosGanados = Math.round(orderBreakdowns.finalTotal * 0.05);
        const nextPuntos = Math.max(0, selectedCliente.puntos - puntosRedimidos) + puntosGanados;
        await clientesService.updatePuntos(selectedCliente.id_cliente, nextPuntos);
        addLog('sistema', `FIDELIDAD: Cliente ${selectedCliente.nombre} redimió ${puntosRedimidos} puntos y ganó ${puntosGanados} puntos. Balance actual: ${nextPuntos}.`);
      } catch (err) {
        console.error('Error updating customer points:', err);
      }
    }

    onFacturarMesa(selectedPedido.id_pedido);

    try {
      await auditoriaService.create({
        id: `aud_${Date.now()}`,
        tipo: 'sistema',
        mensaje: `Cobro exitoso Mesa ${selectedPedido.numero_mesa}. Ticket interno: ${compiledTicketNo}. Total: $${orderBreakdowns.finalTotal.toLocaleString('es-AR')}. Pago: ${mappedMedio}`,
        timestamp: new Date()
      });
    } catch (e: any) {
      console.error('Audit log error:', e);
    }

    addLog('sistema', `CAJA: Cobro finalizado para Mesa ${selectedPedido.numero_mesa}. Ticket interno ${compiledTicketNo} registrado sin solicitar CAE.`);

    try {
      await pdfService.exportToPDF(dataTicket);
      await printerService.sendToPrinter(dataTicket, printerConfig);
    } catch (e: any) {
      toast.warning(`Cobro registrado, pero hubo un error al generar el PDF/impresión: ${e.message}`);
    }

    setSelectedPedidoId(null);
    setMixedPayments([]);
    setMontoEntregadoEfectivo('');
    setDescuentoPorcentaje(0);
    setPropinaPorcentaje(10);
    setSplitByProducts(false);
    setSelectedProductsForSplit([]);
    setSelectedCliente(null);
    setPuntosRedimidos(0);
    setDniCuitBuscar('');
    setNombreNuevoCliente('');
    setEmailNuevoCliente('');
    setTelNuevoCliente('');
    loadCajaState();

    setSuccessDetails({
      nro: compiledTicketNo,
      total: orderBreakdowns.finalTotal,
      vuelto: calculatedChange
    });
    setShowSuccessModal(true);
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
      mesa: selectedPedido.numero_mesa,
      mozo: selectedPedido.mozo,
      cajero: cajaSession.usuario_cajero,
      fechaHora: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: selectedPedido.items.map(it => {
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
      mesa: selectedPedido.numero_mesa,
      mozo: selectedPedido.mozo,
      cajero: cajaSession.usuario_cajero,
      fechaHora: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: selectedPedido.items.map(it => {
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

  const downloadFacturaHistorialPdf = async (factura: Factura) => {
    const isFacturaC = factura.tipo === 'C' || factura.tipo === 'NC';
    const neto = isFacturaC ? factura.total : Number((factura.total / 1.21).toFixed(2));
    const emitter = factura.arca_emisor;
    await pdfService.exportToPDF({
      idPedido: factura.id_pedido || 0,
      nroComprobante: factura.nro_ticket,
      tipoComprobante: factura.tipo === 'NC' ? 'nota_credito_c' : factura.tipo === 'C' ? 'factura_c' : 'ticket_consumo',
      fechaHora: factura.fecha,
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
      items: [{
        cantidad: 1,
        descripcion: 'Venta gastronomica segun ticket emitido',
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
      qrData: factura.afip_qr
    });
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
    setCashierNameInput,
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
    triggerManualPrint,
    triggerPDFDownloadOnly,
    downloadFacturaHistorialPdf,
    loadCajaState
  };
}
