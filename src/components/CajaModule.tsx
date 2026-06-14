import React, { useState, useMemo, useEffect } from 'react';
import { 
  Receipt, 
  Printer, 
  Coins, 
  CreditCard, 
  Download, 
  CheckCircle, 
  Percent, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Users, 
  ShieldCheck, 
  Settings, 
  Plus, 
  Trash2, 
  QrCode, 
  FileText, 
  Lock, 
  Unlock, 
  Info,
  ChevronRight,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { 
  Pedido, 
  ProductoMenu, 
  CierreCaja, 
  PrinterConfig, 
  TicketData, 
  TicketItem, 
  TipoComprobante,
  FacturaDb,
  PagoDb
} from '../types';
import { cajaService } from '../services/cajaService';
import { pagosService } from '../services/pagosService';
import { pdfService } from '../services/pdfService';
import { printerService } from '../services/printerService';
import { facturacionService, Factura } from '../services/facturacionService';
import { auditoriaService } from '../services/auditoriaService';
import { useToast, ToastContainer } from './ToastContainer';

interface CajaModuleProps {
  pedidos: Pedido[];
  productosMenu: ProductoMenu[];
  onFacturarMesa: (idPedido: number) => void;
  onCambiarEstadoPedido: (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => void;
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'sistema', mensaje: string) => void;
}

export default function CajaModule({
  pedidos,
  productosMenu,
  onFacturarMesa,
  onCambiarEstadoPedido,
  addLog
}: CajaModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  // Configurable Restaurant Details
  const [restaurante, setRestaurante] = useState({
    nombreComercial: 'El Patrón Restaurante',
    razonSocial: 'Gastronomía El Patrón S.A.S.',
    cuit: '30-71649251-4',
    direccion: 'Av. Pres. Figueroa Alcorta 3420, CABA',
    telefono: '+54 11 4802-9988',
    email: 'facturas@elpatronrestaurante.com.ar',
    inicioActividades: '15/04/2022',
    condicionIva: 'Responsable Inscripto',
    mensajePie: 'Gracias por su visita al verdadero rincón criollo.',
    moneda: 'ARS'
  });

  const [editRestauranteMode, setEditRestauranteMode] = useState(false);

  // Active cashier session states
  const [cajaSession, setCajaSession] = useState<CierreCaja | null>(null);
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
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('factura_b');
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

  // Printer configuration states
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(printerService.getDefaultConfig());
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);

  // Sync historical shifts and current state
  const loadCajaState = async () => {
    const active = cajaService.getOpenSession();
    setCajaSession(active);
    try {
      const history = await cajaService.list();
      setSessionInsumos(history);
      const facturas = await facturacionService.list();
      setLastFacturas(facturas.slice(0, 6));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCajaState();
  }, []);

  // Filter commands by active state waiting checkout
  const activeBills = useMemo(() => {
    return pedidos.filter(p => p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado');
  }, [pedidos]);

  // Selected Order Object
  const selectedPedido = useMemo(() => {
    return pedidos.find(p => p.id_pedido === selectedPedidoId) || null;
  }, [selectedPedidoId, pedidos]);

  // Pricing calculations
  const orderBreakdowns = useMemo(() => {
    if (!selectedPedido) return { subtotal: 0, promoDeduction: 0, manualDeduction: 0, baseTotal: 0, propinaValue: 0, ivaValue: 0, finalTotal: 0, itemsCalculados: [] };
    
    // Group products by ID to process quantities and categories
    const lineItems: TicketItem[] = selectedPedido.items.map(item => {
      const prod = productosMenu.find(p => p.id_producto === item.id_producto);
      const unit = prod ? prod.precio_venta : 0;
      return {
        cantidad: item.cantidad,
        descripcion: item.nombre,
        precio_unitario: unit,
        subtotal: item.cantidad * unit
      };
    });

    let subtotal = lineItems.reduce((acc, current) => acc + current.subtotal, 0);

    // Apply product split filters if active
    if (splitByProducts && selectedProductsForSplit.length > 0) {
      subtotal = selectedPedido.items.reduce((acc, item) => {
        if (selectedProductsForSplit.includes(item.id_producto)) {
          const prod = productosMenu.find(p => p.id_producto === item.id_producto);
          return acc + ((prod ? prod.precio_venta : 0) * item.cantidad);
        }
        return acc;
      }, 0);
    }

    // AUTOMATIC PROMOS CALCULATION:
    // Combo 1: Ojo de bife ("prod_car_ojo_bife" or "prod_bife") + Vino -> Deducts 15% from vino item sum
    // Combo 2: Hamburguesa ("prod_cri_hamburguesa" or "prod_hamburguesa") + Gaseosa -> Deducts $1,500 ARS combo discount
    let promoDeduction = 0;
    
    const hasOjoBife = selectedPedido.items.some(it => it.id_producto === 'prod_car_ojo_bife' || it.id_producto === 'prod_bife');
    const hasVino = selectedPedido.items.some(it => it.id_producto === 'prod_vino_malbec' || it.id_producto === 'prod_vino_rutini_botella');
    const hasBurger = selectedPedido.items.some(it => it.id_producto === 'prod_cri_hamburguesa' || it.id_producto === 'prod_hamburguesa');
    const hasGaseosa = selectedPedido.items.some(it => it.id_insumo === 'ins_beb_gaseosa' || it.nombre.toLowerCase().includes('gaseosa') || it.id_producto === 'prod_gaseosa');

    // Promos apply only if we are paying the whole ticket or paying those items
    const qualifiesForBifeVino = hasOjoBife && hasVino && (!splitByProducts || (selectedProductsForSplit.includes('prod_car_ojo_bife') && (selectedProductsForSplit.includes('prod_vino_malbec') || selectedProductsForSplit.includes('prod_vino_rutini_botella'))));
    const qualifiesForBurgerGaseosa = hasBurger && hasGaseosa && (!splitByProducts || (selectedProductsForSplit.includes('prod_cri_hamburguesa') && (selectedProductsForSplit.includes('ins_beb_gaseosa') || selectedProductsForSplit.includes('prod_gaseosa'))));

    if (qualifiesForBifeVino) {
      const vinoItem = selectedPedido.items.find(it => it.id_producto === 'prod_vino_malbec' || it.id_producto === 'prod_vino_rutini_botella');
      const prodVino = productosMenu.find(pr => pr.id_producto === vinoItem?.id_producto);
      if (prodVino && vinoItem) {
        promoDeduction += (prodVino.precio_venta * 0.15) * vinoItem.cantidad;
      }
    }

    if (qualifiesForBurgerGaseosa) {
      promoDeduction += 1500;
    }

    // Keep safe limits
    let manualDeduction = subtotal * (descuentoPorcentaje / 100);
    let baseTotal = Math.max(0, subtotal - promoDeduction - manualDeduction);
    let propinaValue = baseTotal * (propinaPorcentaje / 100);
    
    // In Argentina standard VAT 21.00% is computed inside the checkout
    let ivaValue = baseTotal * 0.21;
    let finalTotal = baseTotal + propinaValue;

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
  }, [selectedPedido, productosMenu, descuentoPorcentaje, propinaPorcentaje, splitByProducts, selectedProductsForSplit]);

  // Mixed payments calculations
  const mixedSum = useMemo(() => {
    return mixedPayments.reduce((sum, current) => sum + current.monto, 0);
  }, [mixedPayments]);

  const rawRemainingMixedBalance = useMemo(() => {
    return Math.max(0, orderBreakdowns.finalTotal - mixedSum);
  }, [mixedSum, orderBreakdowns.finalTotal]);

  // Cash change calculation (vuelto)
  const calculatedChange = useMemo(() => {
    const rawVal = parseFloat(montoEntregadoEfectivo);
    if (isNaN(rawVal)) return 0;
    
    const targetValue = metodoPago === 'mixto' ? rawRemainingMixedBalance : orderBreakdowns.finalTotal;
    return Math.max(0, rawVal - targetValue);
  }, [montoEntregadoEfectivo, metodoPago, rawRemainingMixedBalance, orderBreakdowns.finalTotal]);

  // Adding partial mixed payment line
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

  // Open cashier register session
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(openingCashInput);
    if (isNaN(amt) || amt < 0) {
      toast.error('Monto de inicio no válido.');
      return;
    }

    const session = await cajaService.open(amt, cashierNameInput);
    setCajaSession(session);
    setShowOpenModal(false);
    addLog('sistema', `CAJA: Turno fiscal de caja iniciado por ${cashierNameInput}. Monto inicial: ARS $${amt.toLocaleString('es-AR')}`);
    loadCajaState();
    toast.success('La jornada fiscal diaria ha sido abierta con éxito.');
  };

  // Close shift cashier session
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const money = parseFloat(closingPhysicalCashInput);
    if (isNaN(money) || money < 0) {
      toast.error('Monto de arqueo físico ingresado no es válido.');
      return;
    }

    if (!cajaSession) return;

    // Execute close
    const finalShift = await cajaService.close(money, closingObservationsInput);
    
    addLog('sistema', `CAJA: Turno fiscal cerrado por ${finalShift.usuario_cajero}. Arqueo Real: $${finalShift.monto_real?.toLocaleString('es-AR')}. Diferencia: ARS $${finalShift.diferencia?.toLocaleString('es-AR')}`);

    // Export CSV representation report of the closed daily cashier
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
    document.body.removeChild(link);

    // Reset states
    setCajaSession(null);
    setShowCloseModal(false);
    setClosingPhysicalCashInput('');
    setClosingObservationsInput('Facturación normal del turno');
    loadCajaState();
    toast.success('Jornada finalizada. Arqueo homologado y balance exportado en CSV.');
  };

  // MAIN TRANSACTION PROCESSOR (Step 8, 9 & 14)
  const handleConfirmCheckout = async () => {
    if (!selectedPedido) return;
    if (!cajaSession) {
      toast.error('Por favor abra la caja diaria primero para poder procesar facturas.');
      return;
    }

    // Validations: No double billing, validate calculations
    if (orderBreakdowns.finalTotal <= 0) {
      toast.error('No se permite emitir comprobantes por un valor negativo o cero.');
      return;
    }

    // Payment method logic validation
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

    // Check if cash received covers the total
    if (metodoPago === 'efectivo' && montoEntregadoEfectivo) {
      const delivered = parseFloat(montoEntregadoEfectivo);
      if (!isNaN(delivered) && delivered < orderBreakdowns.finalTotal) {
        toast.error('El efectivo entregado es menor que el total de la cuenta.');
        return;
      }
    }

    const compiledTicketNo = `T-0001-${Math.floor(Math.random() * 900000 + 100000)}`;

    // Build standard unified ticket structure
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
        const prod = productosMenu.find(pm => pm.id_producto === it.id_producto);
        const uni = prod ? prod.precio_venta : 0;
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
      metodosPago: pays,
      vuelto: calculatedChange,
      tipoComprobante: tipoComprobante,
      mensajePie: restaurante.mensajePie
    };

    // 1. Create Factura row
    const idFactura = `fac_${Date.now()}`;
    const mappedMedio = pays.map(p => p.metodo.toUpperCase()).join(' + ');

    const newFactura: FacturaDb = {
      id_factura: idFactura,
      id_pedido: selectedPedido.id_pedido,
      numero_factura: compiledTicketNo,
      tipo_comprobante: tipoComprobante === 'factura_a' ? 'Factura A' : (tipoComprobante === 'factura_b' ? 'Factura B' : 'Ticket Consumo'),
      total: orderBreakdowns.finalTotal,
      metodo_pago: mappedMedio,
      cuit_cliente: cuitCliente,
      fecha_emision: new Date().toISOString()
    };

    try {
      // Use existing services
      await facturacionService.create({
        id_factura: idFactura,
        id_pedido: selectedPedido.id_pedido,
        nro_ticket: compiledTicketNo,
        cliente: nombreCliente === 'Consumidor Final' ? 'Consumidor Final' : nombreCliente + ` (CUIT ${cuitCliente})`,
        cuit: cuitCliente,
        total: orderBreakdowns.finalTotal,
        iva_veintiuno: orderBreakdowns.ivaValue,
        medio_pago: metodoPago,
        fecha: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
        estado: 'emitido'
      });
    } catch (err) {
      console.warn('Network offline backup creation:', err);
    }

    // 2. Create Pago rows
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

    // 3. Update Sales stats in Cash register daily shift
    const paymentDesglosesCount = {
      efectivo: pays.filter(p => p.metodo === 'efectivo').reduce((s, c) => s + c.monto, 0),
      debito: pays.filter(p => p.metodo === 'transferencia' || p.metodo === 'debito').reduce((s, c) => s + c.monto, 0),
      credito: pays.filter(p => p.metodo === 'tarjeta' || p.metodo === 'credito').reduce((s, c) => s + c.monto, 0),
      transferencia: pays.filter(p => p.metodo === 'transferencia').reduce((s, c) => s + c.monto, 0),
      mercadopago: pays.filter(p => p.metodo === 'mp_qr' || p.metodo === 'mercadopago').reduce((s, c) => s + c.monto, 0)
    };

    await cajaService.updateSales(orderBreakdowns.finalTotal, paymentDesglosesCount);

    // 4. Libera Mesa, actualiza pedido de la comanda
    onFacturarMesa(selectedPedido.id_pedido);

    // 5. Register log events audit tracker
    await auditoriaService.create({
      id: `aud_${Date.now()}`,
      tipo: 'sistema',
      mensaje: `Cobro Exitoso Mesa ${selectedPedido.numero_mesa}. Factura Nº: ${compiledTicketNo}. Total: $${orderBreakdowns.finalTotal.toLocaleString('es-AR')}. Pago: ${mappedMedio}`,
      timestamp: new Date()
    });

    addLog('sistema', `CAJA: Cobro finalizado correctamente para Mesa ${selectedPedido.numero_mesa}. Transacción Fiscal ${compiledTicketNo} registrada. `);

    // Trigger auto printing of PDF & physical printer if configured
    pdfService.exportToPDF(dataTicket);
    await printerService.sendToPrinter(dataTicket, printerConfig);

    // Reset checkout states
    setSelectedPedidoId(null);
    setMixedPayments([]);
    setMontoEntregadoEfectivo('');
    setDescuentoPorcentaje(0);
    setPropinaPorcentaje(10);
    setSplitByProducts(false);
    setSelectedProductsForSplit([]);
    loadCajaState();

    toast.success(`Ticket emitido. Se cobró ${orderBreakdowns.finalTotal.toLocaleString('es-AR')}. PDF generado y mesa liberada.`);
  };

  // Print simulator fallback directly from active layout receipt
  const triggerManualPrint = async () => {
    if (!selectedPedido || !cajaSession) return;

    const dataTicket: TicketData = {
      nombreComercial: restaurante.nombreComercial,
      razonSocial: restaurante.razonSocial,
      cuit: restaurante.cuit,
      direccion: restaurante.direccion,
      telefono: restaurante.telefono,
      email: restaurante.email,
      nroComprobante: `SIM-${Math.floor(Math.random() * 900 + 100)}`,
      idPedido: selectedPedido.id_pedido,
      mesa: selectedPedido.numero_mesa,
      mozo: selectedPedido.mozo,
      cajero: cajaSession.usuario_cajero,
      fechaHora: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: selectedPedido.items.map(it => {
        const prod = productosMenu.find(pm => pm.id_producto === it.id_producto);
        const uni = prod ? prod.precio_venta : 0;
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
      tipoComprobante: tipoComprobante,
      mensajePie: restaurante.mensajePie
    };

    const res = await printerService.sendToPrinter(dataTicket, printerConfig);
    
    // audit logs
    await auditoriaService.create({
      id: `aud_${Date.now()}`,
      tipo: 'sistema',
      mensaje: `Envío a Impresora Ticket: ${res.methodUsed}. Destino: ${printerConfig.printerName}. Resultado: ${res.success ? 'OK' : 'Fallo/Simulación'}`,
      timestamp: new Date()
    });

    if (res.success) {
      toast.error(res.message);
    } else {
      toast.success(`${res.message} — ESC/POS enviado a la cola.`);
    }
  };

  const triggerPDFDownloadOnly = () => {
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
        const prod = productosMenu.find(pm => pm.id_producto === it.id_producto);
        const uni = prod ? prod.precio_venta : 0;
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
      tipoComprobante: tipoComprobante,
      mensajePie: restaurante.mensajePie
    };

    pdfService.exportToPDF(dataTicket);
  };

  const downloadFacturaHistorialPdf = async (factura: Factura) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const neto = Number((factura.total / 1.21).toFixed(2));

    doc.setFillColor(98, 74, 62);
    doc.rect(12, 12, 186, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(restaurante.nombreComercial.toUpperCase(), 18, 27);

    doc.setTextColor(35, 31, 28);
    doc.setFontSize(11);
    doc.text(`Comprobante: ${factura.nro_ticket}`, 14, 50);
    doc.text(`Cliente: ${factura.cliente}`, 14, 60);
    doc.text(`CUIT/DNI: ${factura.cuit || '-'}`, 14, 68);
    doc.text(`Fecha: ${factura.fecha}`, 14, 76);
    doc.text(`Medio de pago: ${factura.medio_pago.toUpperCase()}`, 14, 84);

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 98, 196, 98);
    doc.setFont('helvetica', 'normal');
    doc.text('Venta gastronomica segun ticket emitido', 14, 112);
    doc.text(`Neto: $${neto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 186, 130, { align: 'right' });
    doc.text(`IVA 21%: $${factura.iva_veintiuno.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 186, 140, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`TOTAL: $${factura.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 186, 154, { align: 'right' });
    doc.save(`${factura.nro_ticket}_ticket.pdf`);
  };

  // Group items by menu categories (Rule 3)
  const groupedItemsByCategory = useMemo(() => {
    if (!selectedPedido) return {};
    const grouped: { [category: string]: typeof selectedPedido.items } = {};
    
    selectedPedido.items.forEach(item => {
      const pm = productosMenu.find(p => p.id_producto === item.id_producto);
      const cat = pm?.categoria || 'Otros';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(item);
    });
    
    return grouped;
  }, [selectedPedido, productosMenu]);

  return (
    <div className="space-y-6" id="gastro-checkout-master">
      
      {/* HEADER BAR: Settings & Restaurant Config */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 ml-1 bg-[#624A3E]/10 rounded-xl text-[#624A3E]">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-stone-900 uppercase tracking-tight font-sans">
              Terminal de Caja & Facturación Fiscal
            </h1>
            <p className="text-[11px] text-stone-500 font-medium">
              Gestor de comprobantes de salón • {restaurante.nombreComercial}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setEditRestauranteMode(!editRestauranteMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-[10px] uppercase font-extrabold text-stone-600 hover:bg-stone-100 cursor-pointer transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Configurar Restaurant
          </button>
          
          <button
            onClick={() => setShowPrinterSettings(!showPrinterSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-[10px] uppercase font-extrabold text-stone-600 hover:bg-stone-100 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Configuración Ticketera
          </button>
        </div>
      </div>

      {/* RESTAURANTE EDIT FORM */}
      {editRestauranteMode && (
        <div className="bg-[#F5F1E9]/80 border border-stone-200 p-5 rounded-2xl animate-fadeIn space-y-4">
          <h3 className="text-xs font-black text-[#624A3E] uppercase flex items-center gap-1.5">
            <Settings className="w-4 h-4" /> Editorial de Datos de Emisión (Cambios en Comprobantes)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Nombre Fantasía</label>
              <input 
                type="text" 
                value={restaurante.nombreComercial} 
                onChange={e => setRestaurante(prev => ({ ...prev, nombreComercial: e.target.value }))}
                className="w-full p-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Razón Social</label>
              <input 
                type="text" 
                value={restaurante.razonSocial} 
                onChange={e => setRestaurante(prev => ({ ...prev, razonSocial: e.target.value }))}
                className="w-full p-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">CUIT Comercial</label>
              <input 
                type="text" 
                value={restaurante.cuit} 
                onChange={e => setRestaurante(prev => ({ ...prev, cuit: e.target.value }))}
                className="w-full p-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Dirección Física</label>
              <input 
                type="text" 
                value={restaurante.direccion} 
                onChange={e => setRestaurante(prev => ({ ...prev, direccion: e.target.value }))}
                className="w-full p-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Teléfono</label>
              <input 
                type="text" 
                value={restaurante.telefono} 
                onChange={e => setRestaurante(prev => ({ ...prev, telefono: e.target.value }))}
                className="w-full p-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Email Soporte factura</label>
              <input 
                type="text" 
                value={restaurante.email} 
                onChange={e => setRestaurante(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Pie de Comprobante</label>
              <input 
                type="text" 
                value={restaurante.mensajePie} 
                onChange={e => setRestaurante(prev => ({ ...prev, mensajePie: e.target.value }))}
                className="w-full p-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setEditRestauranteMode(false)}
                className="w-full py-2 bg-[#624A3E] hover:bg-[#503C32] text-white text-[10px] uppercase font-black rounded-lg cursor-pointer"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTER SETTINGS MODULE FOR ESC/POS */}
      {showPrinterSettings && (
        <div className="bg-white border border-stone-200 p-5 rounded-2xl animate-fadeIn space-y-3">
          <div className="flex justify-between items-center border-b border-stone-100 pb-2">
            <h4 className="text-xs font-black text-stone-800 uppercase flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-[#624A3E]" /> Parámetros de Integración Térmica (ESC/POS)
            </h4>
            <span className="text-[9px] text-[#22C55E] bg-emerald-50 px-2 py-0.5 rounded-full font-bold">API Enlazable</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Nombre de Impresora</label>
              <input 
                type="text" 
                value={printerConfig.printerName}
                onChange={e => setPrinterConfig(prev => ({ ...prev, printerName: e.target.value }))}
                className="w-full p-2.5 text-xs border border-stone-200 rounded-lg font-mono text-stone-700"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Ancho Papel</label>
              <select
                value={printerConfig.paperWidth}
                onChange={e => setPrinterConfig(prev => ({ ...prev, paperWidth: e.target.value as '58mm' | '80mm' }))}
                className="w-full p-2.5 text-xs border border-stone-200 rounded-lg bg-stone-50 font-bold"
              >
                <option value="80mm">80 milímetros (Estándar)</option>
                <option value="58mm">58 milímetros (Estrecha)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Copias Ticket</label>
              <input 
                type="number" 
                min="1" 
                max="5"
                value={printerConfig.copies}
                onChange={e => setPrinterConfig(prev => ({ ...prev, copies: parseInt(e.target.value) || 1 }))}
                className="w-full p-2.5 text-xs border border-stone-200 rounded-lg text-stone-700"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input 
                type="checkbox" 
                id="autoCutCheck" 
                checked={printerConfig.autoCut}
                onChange={e => setPrinterConfig(prev => ({ ...prev, autoCut: e.target.checked }))}
                className="w-4 h-4 accent-[#624A3E]"
              />
              <label htmlFor="autoCutCheck" className="text-[10px] font-bold text-stone-600 block cursor-pointer">Corte Automático</label>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input 
                type="checkbox" 
                id="openDrawerCheck" 
                checked={printerConfig.openDrawer}
                onChange={e => setPrinterConfig(prev => ({ ...prev, openDrawer: e.target.checked }))}
                className="w-4 h-4 accent-[#624A3E]"
              />
              <label htmlFor="openDrawerCheck" className="text-[10px] font-bold text-stone-600 block cursor-pointer">Abre Cajón Portamonedas</label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              onClick={() => {
                printerService.saveConfig(printerConfig);
                setShowPrinterSettings(false);
                toast.success('Ajustes de ticketera guardados en el navegador.');
              }}
              className="py-1.5 px-3 bg-[#624A3E] text-white text-[10px] font-black uppercase rounded-lg"
            >
              Aplicar Cambios
            </button>
          </div>
        </div>
      )}

      {/* CORE SPLIT SCREEN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE DRAWER & ACTIVE COMMANDS (LG: Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* DAILY DRAWER SHIFT COMPONENT (Rule 1) */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-black text-stone-400 block tracking-wider">Flujo Contable Diario</span>
                <h3 className="font-extrabold text-stone-900 text-sm tracking-tight font-sans">Estado de Caja Diaria</h3>
              </div>
              
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border ${
                cajaSession 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse' 
                  : 'bg-stone-50 text-stone-400 border-stone-200'
              }`}>
                {cajaSession ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {cajaSession ? 'Abierta' : 'Cerrada'}
              </span>
            </div>

            {/* Display detailed figures inside shift */}
            {cajaSession ? (
              <div className="space-y-2">
                <div className="p-3 bg-[#F5F1E9] rounded-xl border border-stone-200/60 font-sans space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-stone-600">
                    <span>Responsable:</span>
                    <span className="text-stone-900">{cajaSession.usuario_cajero}</span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold text-stone-600">
                    <span>Apertura:</span>
                    <span className="font-mono text-stone-900">{cajaSession.fecha_apertura}</span>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-stone-600 pt-1 border-t border-stone-150">
                    <span>Monto Inicial:</span>
                    <span className="font-mono text-stone-900">${cajaSession.monto_apertura.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="flex justify-between text-[13px] font-black text-[#624A3E] pt-1 border-t border-stone-150">
                    <span>Ventas registradas:</span>
                    <span className="font-mono">${cajaSession.monto_ventas.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="flex justify-between text-xs font-bold text-stone-900 pt-1 font-mono border-t border-stone-150 border-dotted">
                    <span>Arqueo Teórico:</span>
                    <span>${(cajaSession.monto_apertura + cajaSession.monto_ventas).toLocaleString('es-AR')}</span>
                  </div>

                  <div className="flex justify-between text-[11px] font-black text-emerald-700 pt-1 border-t border-emerald-100">
                    <span>Caja esperada:</span>
                    <span className="font-mono">${(cajaSession.monto_apertura + cajaSession.monto_ventas).toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {/* Turn revenue detailed tags */}
                {cajaSession.registros_totales && (
                  <div className="p-2 bg-stone-50 rounded-xl space-y-1 text-[9px] font-mono text-stone-500 font-bold border border-stone-200/50">
                    <p className="font-sans text-[8px] text-stone-400 uppercase tracking-widest block font-black border-b border-stone-100 pb-1 mb-1">
                      Desglose cobros en turno
                    </p>
                    <div className="flex justify-between">
                      <span>• EFECTIVO:</span>
                      <span>${cajaSession.registros_totales.efectivo.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• TRANS./DÉBITO:</span>
                      <span>${(cajaSession.registros_totales.debito + cajaSession.registros_totales.transferencia).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• TARJETAS CRÉD:</span>
                      <span>${cajaSession.registros_totales.credito.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• MERCADOPAGO QR:</span>
                      <span>${cajaSession.registros_totales.mercadopago.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowCloseModal(true)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-[10px] uppercase font-black transition-all cursor-pointer shadow-xs border border-[#ddd7ce] flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  Cierre de Turno comercial
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-dashed border-stone-200 text-center bg-stone-50/50">
                  <span className="text-stone-400 text-[11px] block font-medium">No se registran turnos fiscales abiertos</span>
                  <span className="text-stone-400 text-[9px] block font-normal mt-0.5">Es indispensable abrir el turno para facturar a las mesas.</span>
                </div>
                
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow cursor-pointer uppercase flex items-center justify-center gap-2"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-300" />
                  Abrir Caja Diaria
                </button>
              </div>
            )}
          </div>

          {/* ACTIVE UNBILLED COMMANDS LIST (Rule 2) */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <h4 className="font-black text-stone-800 font-sans tracking-tight text-xs uppercase flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#624A3E]" />
                Comandas en Salón
              </h4>
              <span className="text-[9px] font-bold bg-[#F5F1E9] text-[#624A3E] border border-stone-150 rounded-full px-2 py-0.5 font-mono">
                {activeBills.length} pendientes
              </span>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {activeBills.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-stone-150 rounded-xl bg-stone-50/50">
                  <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                  <p className="text-[11px] text-stone-500 font-black uppercase">¡Todo liquidado!</p>
                  <p className="text-[9px] text-stone-400 mt-0.5">No hay comandos de mesas pendientes de liquidación.</p>
                </div>
              ) : (
                activeBills.map(b => {
                  const itemsCountSum = b.items.reduce((sum, current) => sum + current.cantidad, 0);
                  const totalPrice = b.items.reduce((sum, item) => {
                    const pm = productosMenu.find(pr => pr.id_producto === item.id_producto);
                    return sum + (pm ? pm.precio_venta * item.cantidad : 0);
                  }, 0);

                  const isSelected = b.id_pedido === selectedPedidoId;
                  const isReady = b.estado_comanda === 'listo';

                  return (
                    <button
                      key={b.id_pedido}
                      onClick={() => {
                        if (!cajaSession) {
                          toast.error('Tenga a bien abrir primero la caja para proceder con la cuenta.');
                          return;
                        }
                        setSelectedPedidoId(b.id_pedido);
                        setSplitPayerCount(1);
                        setActivePayerIndex(0);
                        setSplitByProducts(false);
                        setSelectedProductsForSplit([]);
                        setMixedPayments([]);
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                        isSelected 
                          ? 'border-[#624A3E] bg-[#F5F1E9] ring-2 ring-[#624A3E]/10 shadow-sm'
                          : 'border-stone-250 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-stone-900 text-xs font-sans tracking-tight">{b.numero_mesa}</span>
                          
                          {/* Waiter condition badge mapping */}
                          {isReady ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-2 py-0.2 rounded-full border border-emerald-200 shrink-0">
                              Servido
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-800 text-[8px] font-black uppercase px-2 py-0.2 rounded-full border border-amber-200 shrink-0">
                              Activo
                            </span>
                          )}

                          {b.origen !== 'Mozo' && (
                            <span className="bg-stone-100 text-[#624A3E] text-[8px] font-extrabold px-1 py-0.2 rounded shrink-0 font-mono">
                              {b.origen.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 font-sans font-medium">
                          M-#{b.id_pedido} • Mozo: {b.mozo} • {itemsCountSum} ítems
                        </p>
                      </div>

                      <div className="text-right space-y-0.5 shrink-0">
                        <span className="font-mono text-xs font-black text-stone-950 block">
                          ${totalPrice.toLocaleString('es-AR')}
                        </span>
                        <span className="text-[9px] text-[#624A3E] uppercase font-black tracking-wide flex items-center gap-0.5 justify-end">
                          <Clock className="w-2.5 h-2.5" /> {b.minutos_transcurridos}m
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {lastFacturas.length > 0 && (
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Tickets emitidos
                  </span>
                  <span className="text-[9px] font-mono font-bold text-stone-400">{lastFacturas.length} disponibles</span>
                </div>
                {lastFacturas.map(f => (
                  <div key={f.id_factura} className="p-2 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-stone-800 font-mono truncate">{f.nro_ticket}</p>
                      <p className="text-[9px] text-stone-500 truncate">{f.cliente} - ${f.total.toLocaleString('es-AR')}</p>
                    </div>
                    <button
                      onClick={() => downloadFacturaHistorialPdf(f)}
                      className="px-2 py-1 rounded-lg bg-[#624A3E] text-white text-[9px] font-black uppercase flex items-center gap-1 shrink-0"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: CORE TERMINAL & RECEIPT PREVIEW (LG: Span 8) */}
        <div className="lg:col-span-8">
          
          {selectedPedido ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
              
              {/* TICKET OPTIONS CONTROLS (MD: Span 7) */}
              <div className="md:col-span-7 space-y-4 font-sans">
                
                {/* Header detail selected */}
                <div className="border-b border-stone-200 pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-[11px] text-amber-700 font-black uppercase tracking-wider block">Terminal de Liquidación</span>
                    <h3 className="font-extrabold text-stone-900 text-sm tracking-tight flex items-center gap-1.5 mt-0.5">
                      Saldando Cuenta: {selectedPedido.numero_mesa} ({selectedPedido.mozo})
                    </h3>
                  </div>

                  <span className="text-[10px] text-stone-500 font-mono bg-stone-100 px-2 py-0.5 rounded font-black">
                    Nro Trans: EP-{selectedPedido.id_pedido}
                  </span>
                </div>

                {/* Group categories of order items (Rule 3) */}
                <div className="bg-stone-50 border border-stone-200/60 p-3.5 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Items del pedido</h4>
                  
                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 text-xs">
                    {(Object.entries(groupedItemsByCategory) as [string, any[]][]).map(([category, items]) => (
                      <div key={category} className="space-y-1">
                        <h5 className="text-[9px] font-black text-[#624A3E] uppercase tracking-wider">
                          ■ {category}
                        </h5>
                        
                        <div className="pl-2 space-y-1">
                          {items.map((it, idx) => {
                            const pm = productosMenu.find(p => p.id_producto === it.id_producto);
                            const unitPrice = pm ? pm.precio_venta : 0;
                            const isProductSelected = selectedProductsForSplit.includes(it.id_producto);

                            return (
                              <div key={idx} className="flex justify-between items-center text-stone-700 py-0.5 font-medium">
                                <div className="flex items-center gap-2">
                                  {/* Item split selection checkbox (Dividir por productos - Rule 3) */}
                                  {splitByProducts && (
                                    <input 
                                      type="checkbox" 
                                      checked={isProductSelected}
                                      onChange={() => {
                                        if (isProductSelected) {
                                          setSelectedProductsForSplit(prev => prev.filter(id => id !== it.id_producto));
                                        } else {
                                          setSelectedProductsForSplit(prev => [...prev, it.id_producto]);
                                        }
                                      }}
                                      className="w-3.5 h-3.5 accent-[#624A3E]"
                                    />
                                  )}
                                  <span>{it.cantidad}x {it.nombre}</span>
                                </div>
                                <span className="font-mono text-stone-900">
                                  ${(it.cantidad * unitPrice).toLocaleString('es-AR')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Division controls helper line */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-stone-200 font-sans">
                    <button
                      onClick={() => {
                        setSplitByProducts(!splitByProducts);
                        setSelectedProductsForSplit([]);
                      }}
                      className="text-[9px] font-extrabold uppercase text-[#624A3E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Users className="w-3 h-3" />
                      {splitByProducts ? 'Quitar selector por producto' : 'Dividir o seleccionar ítems indiv.'}
                    </button>
                    {splitByProducts && (
                      <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold uppercase px-1.5 py-0.5 rounded">
                        Cuenta Fraccionada por Productos
                      </span>
                    )}
                  </div>
                </div>

                {/* Automated Promotions Detector flag box */}
                {((selectedPedido.items.some(it => it.id_producto === 'prod_car_ojo_bife' || it.id_producto === 'prod_bife') && selectedPedido.items.some(it => it.id_producto === 'prod_vino_malbec' || it.id_producto === 'prod_vino_rutini_botella')) || 
                 (selectedPedido.items.some(it => it.id_producto === 'prod_cri_hamburguesa' || it.id_producto === 'prod_hamburguesa') && selectedPedido.items.some(it => it.id_insumo === 'ins_beb_gaseosa' || it.id_producto === 'prod_gaseosa'))) && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-start gap-2 text-emerald-800">
                    <Percent className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                    <div className="text-[10px] font-sans">
                      <p className="font-bold uppercase tracking-wide">Promoción automática calificada</p>
                      <p className="text-stone-500 font-normal mt-0.5 leading-snug">Se han deducido $1.500 (Combo burger + lata) y/o el 15% del vino (Combo Ojo de bife + Vino) por compras cruzadas.</p>
                    </div>
                  </div>
                )}

                {/* CLIENT & AFIP TYPE SYSTEM */}
                <div className="bg-[#ebf1f5]/25 border border-slate-200/60 p-3 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Información Tributaria</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[8px] font-bold uppercase text-stone-500 block mb-0.5">Tipo de Factura</label>
                      <select
                        value={tipoComprobante}
                        onChange={e => setTipoComprobante(e.target.value as TipoComprobante)}
                        className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white text-stone-700 font-bold"
                      >
                        <option value="factura_b">Factura B (Cons. Final)</option>
                        <option value="factura_a">Factura A (Inscripto)</option>
                        <option value="ticket_interno">Ticket Interno (Mesa)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[8px] font-bold uppercase text-stone-500 block mb-0.5">DNI/CUIT Cliente</label>
                      <input 
                        type="text" 
                        value={cuitCliente}
                        onChange={e => {
                          const val = e.target.value;
                          setCuitCliente(val);
                          if (val === '99-99999999-9' || val === '') {
                            setNombreCliente('Consumidor Final');
                          }
                        }}
                        className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white text-stone-700 font-mono"
                        placeholder="Ej. 20-38449102-1"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-bold uppercase text-stone-500 block mb-0.5">Razón Social Cliente</label>
                      <input 
                        type="text" 
                        value={nombreCliente}
                        onChange={e => setNombreCliente(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white text-stone-700"
                        placeholder="Ej. José de San Martín"
                      />
                    </div>
                  </div>
                </div>

                {/* Standard split comensales (Rule 3) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-3 bg-[#F5F1E9]/50 border border-stone-200 rounded-xl space-y-2">
                    <h5 className="text-[10px] font-black text-stone-600 flex items-center gap-1 uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5 text-[#624A3E]" /> Partes Comensales (Partes Iguales)
                    </h5>
                    
                    <div className="flex items-center justify-between gap-2 bg-white border border-stone-200 p-1.5 rounded-lg">
                      <button
                        onClick={() => {
                          setSplitPayerCount(prev => Math.max(1, prev - 1));
                          setActivePayerIndex(0);
                        }}
                        className="w-7 h-7 bg-stone-50 hover:bg-stone-100 rounded text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-black text-stone-900">{splitPayerCount} pax</span>
                      <button
                        onClick={() => {
                          setSplitPayerCount(prev => prev + 1);
                          setActivePayerIndex(0);
                        }}
                        className="w-7 h-7 bg-stone-50 hover:bg-stone-100 rounded text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {splitPayerCount > 1 && (
                      <div className="text-[10px] text-stone-600 leading-normal bg-white p-2 rounded border border-stone-150 space-y-0.5 text-center">
                        <p className="font-bold">Monto partes iguales:</p>
                        <p className="text-emerald-700 text-xs font-black font-mono">
                          ${(orderBreakdowns.finalTotal / splitPayerCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })} c/u
                        </p>
                        <span className="bg-[#624A3E]/10 text-[#624A3E] px-1.5 py-0.2 rounded font-extrabold text-[8px] tracking-wider uppercase inline-block">
                          Pagador Actual: {activePayerIndex + 1} de {splitPayerCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Manual discounts & tip adjustments (Rule 3) */}
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                    <h5 className="text-[10px] font-black text-stone-600 flex items-center gap-1 uppercase tracking-wider">
                      <Percent className="w-3.5 h-3.5 text-[#624A3E]" /> Bonificación & Propinas
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] font-bold text-stone-500 block mb-0.5">Manual Desc %</label>
                        <select
                          value={descuentoPorcentaje}
                          onChange={e => setDescuentoPorcentaje(parseInt(e.target.value) || 0)}
                          className="w-full text-xs p-1.5 border border-stone-200 rounded bg-white font-bold"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="10">10%</option>
                          <option value="15">15%</option>
                          <option value="20">20%</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[8px] font-bold text-stone-500 block mb-0.5">Propina %</label>
                        <select
                          value={propinaPorcentaje}
                          onChange={e => setPropinaPorcentaje(parseInt(e.target.value) || 0)}
                          className="w-full text-xs p-1.5 border border-stone-200 rounded bg-white font-bold"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="10">10% (Rec.)</option>
                          <option value="15">15%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PAYMENT TYPE / MIXED PAYMENTS LAYOUT (Rule 4) */}
                <div className="bg-white border border-stone-200 p-4 rounded-xl space-y-3.5">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-1.5">
                      Método de Liquidación Caja
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { key: 'efectivo', label: 'Efectivo', icon: <Coins className="w-3.5 h-3.5 text-[#624A3E]" /> },
                        { key: 'tarjeta', label: 'Tarjeta Crédito', icon: <CreditCard className="w-3.5 h-3.5 text-blue-600" /> },
                        { key: 'transferencia', label: 'Transferencia/Deb.', icon: <Coins className="w-3.5 h-3.5 text-purple-600" /> },
                        { key: 'mp_qr', label: 'MercadoPago QR', icon: <Smartphone className="w-3.5 h-3.5 text-teal-600" /> },
                        { key: 'mixto', label: 'Pago Mixto (Varios)', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> }
                      ].map(m => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setMetodoPago(m.key as any);
                            setMixedPayments([]);
                            setMontoEntregadoEfectivo('');
                          }}
                          className={`p-2.5 rounded-xl text-xs font-black flex items-center justify-start gap-2 border transition-all cursor-pointer ${
                            metodoPago === m.key 
                              ? 'bg-[#624A3E] text-white border-[#624A3E] shadow-xs'
                              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {m.icon}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Fields for Payment Method details */}
                  {metodoPago === 'efectivo' && (
                    <div className="bg-amber-50/50 border border-stone-200 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-[#624A3E] block uppercase">Monto Entregado en Efectivo</label>
                        <p className="text-[10px] text-stone-500 font-medium">Ayuda vuelto rápido cajero</p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <input 
                          type="number"
                          value={montoEntregadoEfectivo}
                          onChange={e => setMontoEntregadoEfectivo(e.target.value)}
                          placeholder="Monto entregado"
                          className="p-2 border border-stone-200 rounded-lg text-xs font-mono font-black text-stone-850 w-28 bg-white"
                        />
                        {calculatedChange > 0 && (
                          <div className="text-right pl-2 border-l border-stone-200">
                            <span className="text-[8px] text-stone-400 block font-bold uppercase">Entregar Vuelto</span>
                            <span className="text-[11px] text-[#22C55E] font-black font-mono">
                              ${calculatedChange.toLocaleString('es-AR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mixed Payment Rows interface */}
                  {metodoPago === 'mixto' && (
                    <div className="space-y-3.5 bg-slate-50 p-3.5 rounded-xl border border-stone-200">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-500 border-b border-stone-200 pb-1">
                        <span>Pagos Cargados parciamente</span>
                        <span className="font-mono text-emerald-800">
                          Totaling Queue: ${mixedSum.toLocaleString('es-AR')} / ${orderBreakdowns.finalTotal.toLocaleString('es-AR')}
                        </span>
                      </div>

                      {mixedPayments.length > 0 ? (
                        <div className="space-y-1">
                          {mixedPayments.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-stone-150 p-2 rounded-lg text-xs font-bold text-stone-700">
                              <span className="uppercase flex items-center gap-1">
                                <ChevronRight className="w-3.5 h-3.5 text-[#624A3E]" /> {p.metodo}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-stone-900">${p.monto.toLocaleString('es-AR')}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMixedPayment(idx)}
                                  className="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Borrar pago parcial"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-stone-400 text-center italic">No hay pagos parciales ingresados. Introduzca por lo menos dos a continuación.</p>
                      )}

                      {/* Add partial form */}
                      {rawRemainingMixedBalance > 0 ? (
                        <form onSubmit={handleAddMixedPayment} className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={mixedMetodoInput}
                            onChange={e => setMixedMetodoInput(e.target.value)}
                            className="bg-white border text-xs p-2 rounded-lg"
                          >
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta Crédito</option>
                            <option value="transferencia">Transferencia/Deb.</option>
                            <option value="mp_qr">MercadoPago QR</option>
                          </select>

                          <input
                            type="number"
                            placeholder="Monto"
                            value={mixedMontoInput}
                            onChange={e => {
                              setMixedMontoInput(e.target.value);
                              // Auto pre-populate cash entregado for vuelto dynamic helper inside mixto if method is cash
                              if (mixedMetodoInput === 'efectivo') {
                                setMontoEntregadoEfectivo(e.target.value);
                              }
                            }}
                            className="flex-1 bg-white border p-2 text-xs rounded-lg font-mono font-bold"
                          />

                          <button
                            type="submit"
                            className="py-2 px-3 bg-[#624A3E] text-white text-xs font-black rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" /> Agregar Pago
                          </button>
                        </form>
                      ) : (
                        <div className="bg-emerald-50 text-emerald-800 text-[10px] p-2 text-center rounded border border-emerald-100 font-bold">
                          ✓ Saldo completado. Puede finalizar la transacción de cobro.
                        </div>
                      )}

                      {/* Cash change for mixed cash payments */}
                      {mixedPayments.some(p => p.metodo === 'efectivo') && (
                        <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex justify-between items-center text-xs">
                          <span className="text-stone-500 font-bold block uppercase text-[10px]">Arqueo Cambio Extra (Efectivo Mixto)</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={montoEntregadoEfectivo}
                              onChange={e => setMontoEntregadoEfectivo(e.target.value)}
                              placeholder="Monto entregado"
                              className="p-1.5 border border-stone-200 rounded text-xs text-stone-800 font-mono w-24"
                            />
                            {calculatedChange > 0 && (
                              <span className="text-[#22C55E] font-black">${calculatedChange.toLocaleString('es-AR')}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* EMISSION ACTIONS BAR */}
                <div className="space-y-2">
                  {splitPayerCount > 1 ? (
                    <button
                      onClick={async () => {
                        // Fraction payments progress loop
                        toast.success(`Cobro de la parte #${activePayerIndex + 1} procesado por ${(orderBreakdowns.finalTotal / splitPayerCount).toLocaleString('es-AR')}`);
                        if (activePayerIndex + 1 >= splitPayerCount) {
                          await handleConfirmCheckout();
                        } else {
                          setActivePayerIndex(prev => prev + 1);
                        }
                      }}
                      className="w-full py-3 bg-[#22C55E] hover:bg-[#16a34a] text-white text-xs uppercase tracking-wider font-extrabold rounded-xl transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Cobrar Parte #{activePayerIndex + 1} de {splitPayerCount} (${(orderBreakdowns.finalTotal / splitPayerCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })})
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmCheckout}
                      className="w-full py-3 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs uppercase tracking-wider font-extrabold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5 text-amber-300" />
                      Homologar Cobro y Emitir Comprobante - PDF/Térmico (${orderBreakdowns.finalTotal.toLocaleString('es-AR')} {restaurante.moneda})
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={triggerPDFDownloadOnly}
                      className="py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] uppercase font-extrabold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar PDF Muestra
                    </button>
                    
                    <button
                      onClick={triggerManualPrint}
                      className="py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] uppercase font-extrabold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir Ticket / Enviar
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPedidoId(null);
                      setSplitPayerCount(1);
                      setActivePayerIndex(0);
                    }}
                    className="w-full text-center py-2 text-stone-500 hover:text-stone-800 text-[10px] uppercase font-extrabold cursor-pointer"
                  >
                    ← Volver a Comandas
                  </button>
                </div>

              </div>

              {/* EPSON TICKET PREVIEW SIMULATOR (MD: Span 5) */}
              <div className="md:col-span-5 bg-stone-100/60 border border-stone-200/50 p-4 rounded-xl flex flex-col items-center justify-start">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> Simulación de Salida Térmica (80mm)
                </span>

                {/* Simulated thermal roll */}
                <div className="w-full bg-white text-stone-800 p-4 shadow-sm font-mono text-[9px] leading-relaxed border border-stone-200 relative">
                  
                  {/* Zig-zag top edge design */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-stone-300 flex overflow-hidden">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 shrink-0 bg-stone-200 rotate-45 transform -translate-y-0.5 border border-stone-200" />
                    ))}
                  </div>

                  <div className="text-center pt-2.5 pb-1 border-b border-dotted border-stone-300 space-y-0.5">
                    <span className="font-bold text-[10px] block uppercase tracking-tight">{restaurante.nombreComercial}</span>
                    <span className="block text-[8px] text-stone-500">Raz. Soc: {restaurante.razonSocial}</span>
                    <span className="block text-[8px] text-stone-500">CUIT: {restaurante.cuit}</span>
                    <span className="block text-[8px] text-stone-500">{restaurante.direccion}</span>
                    <span className="block text-[8px] text-stone-500">Telf: {restaurante.telefono}</span>
                  </div>

                  <div className="py-2 border-b border-dotted border-stone-300 space-y-0.5 text-[8.5px]">
                    <p>COMPROB.: {tipoComprobante === 'factura_b' ? 'FACTURA B-CONS. FINAL' : (tipoComprobante === 'factura_a' ? 'FACTURA A-RESP. INS.' : 'TICKET INTERNO')}</p>
                    <p>CLIENTE: {nombreCliente.toUpperCase()}</p>
                    <p>CUIT/DNI: {cuitCliente}</p>
                    <p>FECHA: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs</p>
                    <p>MESA: {selectedPedido.numero_mesa.toUpperCase()} • MOZO: {selectedPedido.mozo}</p>
                    <p>CAJERO: {cajaSession.usuario_cajero.toUpperCase()}</p>
                  </div>

                  {/* List of items */}
                  <div className="py-2 border-b border-dotted border-stone-300 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>DESCRIPCIÓN / CANT.</span>
                      <span>TOTAL ($)</span>
                    </div>

                    {selectedPedido.items.map((it, idx) => {
                      const pm = productosMenu.find(p => p.id_producto === it.id_producto);
                      const unit = pm ? pm.precio_venta : 0;
                      return (
                        <div key={idx} className="flex justify-between font-sans">
                          <span>{it.cantidad}x {it.nombre}</span>
                          <span className="font-mono">${(it.cantidad * unit).toLocaleString('es-AR')}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pricing summaries */}
                  <div className="py-2 border-b border-dotted border-stone-300 space-y-1 font-sans">
                    <div className="flex justify-between">
                      <span>Subtotal Neto:</span>
                      <span className="font-mono">${orderBreakdowns.subtotal.toLocaleString('es-AR')}</span>
                    </div>

                    {(orderBreakdowns.promoDeduction > 0 || orderBreakdowns.manualDeduction > 0) && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Descuentos:</span>
                        <span className="font-mono">-${(orderBreakdowns.promoDeduction + orderBreakdowns.manualDeduction).toLocaleString('es-AR')}</span>
                      </div>
                    )}

                    {orderBreakdowns.propinaValue > 0 && (
                      <div className="flex justify-between text-stone-500">
                        <span>Propina ({propinaPorcentaje}%):</span>
                        <span className="font-mono">${orderBreakdowns.propinaValue.toLocaleString('es-AR')}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-stone-900 border-t border-dashed mt-1 pt-1">
                      <span>TOTAL CUENTA:</span>
                      <span className="font-mono font-black">${orderBreakdowns.finalTotal.toLocaleString('es-AR')}</span>
                    </div>

                    <div className="flex justify-between text-[7.5px] italic text-stone-400 mt-1">
                      <span>(IVA 21.0% incl en subtotal:</span>
                      <span className="font-mono">${orderBreakdowns.ivaValue.toLocaleString('es-AR', { maximumFractionDigits: 1 })})</span>
                    </div>
                  </div>

                  {/* QR code simulated block */}
                  <div className="text-center pt-2 space-y-1 border-t border-stone-200">
                    <div className="w-14 h-14 bg-stone-50 border border-stone-200 mx-auto flex items-center justify-center relative">
                      <div className="grid grid-cols-4 gap-0.5 p-1 w-full h-full opacity-60">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className={`w-full h-full ${i % 3 === 0 || i % 7 === 1 ? 'bg-stone-900' : 'bg-transparent'}`} />
                        ))}
                      </div>
                      <span className="absolute bg-white px-0.5 text-[5px] font-bold text-stone-800 uppercase ring-1 ring-stone-900/5">AFIP QR</span>
                    </div>
                    <p className="text-[6.5px] text-stone-400 font-sans leading-tight">
                      CAE Nº: 732049182390 • VENCE: 15/12/2026
                    </p>
                  </div>

                  <p className="text-[8px] text-center text-stone-500 font-sans mt-2 pt-1 border-t border-dotted border-stone-300">
                    {restaurante.mensajePie}
                  </p>

                </div>

                <div className="mt-3 text-[10px] text-stone-500 max-w-xs text-center font-bold">
                  ✓ El Patrón POS emitirá este ticket y enviará el string compilado en bytes ESC/POS.
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl p-10 border border-stone-200 shadow-xs text-center flex flex-col justify-center items-center min-h-[450px]">
              <div className="p-4 bg-[#F5F1E9] rounded-2xl text-[#624A3E] mb-4">
                <Receipt className="w-10 h-10" />
              </div>
              <h3 className="font-black text-[#624A3E] text-lg uppercase tracking-tight">
                Terminal de Cobro El Patrón Pro
              </h3>
              <p className="text-stone-500 text-xs mt-2 max-w-md leading-relaxed font-semibold">
                Seleccione una mesa ocupada desde la lista lateral. Se iniciará el panel interactivo de check-out, permitiéndole coordinar pagos mixtos, aplicar deducciones manuales, configurar datos de CUIT, fraccionar saldos por comensales u artículos indivisos, y emitir comprobantes en PDF y thermal roll.
              </p>
              
              {!cajaSession && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-250 rounded-xl text-[11px] text-amber-800 max-w-sm flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-bold uppercase tracking-wide">Caja Cerrada</p>
                    <p className="mt-0.5 text-stone-600 font-medium leading-relaxed">Tenga a bien iniciar el turno con el botón <strong>"Abrir Caja Diaria"</strong> izquierdo antes de realizar operaciones de facturación.</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* SHIFT OPEN MODAL Dialog (Rule 1) */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 animate-scaleIn space-y-4 shadow-lg font-sans">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-tight flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" />
              Apertura de Caja Diaria
            </h3>
            
            <p className="text-[11px] text-stone-500 leading-normal font-medium">
              Por favor, ingrese el saldo inicial físico depositado en el cajón portamonedas para el cambio comercial, y su nombre de operador de caja.
            </p>

            <form onSubmit={handleOpenShift} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Monto Inicial ($ ARS)</label>
                <input 
                  type="number"
                  required
                  value={openingCashInput}
                  onChange={e => setOpeningCashInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 font-mono font-extrabold focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50"
                  placeholder="Ej. 25000"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Operador Responsable (Cajero)</label>
                <input 
                  type="text"
                  required
                  value={cashierNameInput}
                  onChange={e => setCashierNameInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#624A3E] focus:outline-none"
                  placeholder="Ej. Sofía Colombo"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-black uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer"
                >
                  Confirmar Apertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHIFT CLOSE MODAL Dialog (Rule 1) */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 animate-scaleIn space-y-4 shadow-lg font-sans">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-stone-900" />
              Cierre de turno & Conciliación (Arqueo)
            </h3>
            
            <p className="text-[11px] text-stone-500 leading-normal font-medium">
              Al procesar este cierre se sumarán las ventas totales de este turno. Por favor cuente físicamente el dinero de caja e ingréselo a continuación. El sistema computará el descuadre o diferencia automáticamente.
            </p>

            {cajaSession && (
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-150 text-[10px] font-mono space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>Monto inicial:</span>
                  <span>${cajaSession.monto_apertura.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas acumuladas:</span>
                  <span>${cajaSession.monto_ventas.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200 border-dotted text-xs font-sans">
                  <span>Total Esperado:</span>
                  <span>${(cajaSession.monto_apertura + cajaSession.monto_ventas).toLocaleString('es-AR')}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCloseShift} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Monto Real Físico de Arqueo ($ ARS)</label>
                <input 
                  type="number"
                  required
                  value={closingPhysicalCashInput}
                  onChange={e => setClosingPhysicalCashInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 font-mono font-extrabold focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50"
                  placeholder="Ej. 120000"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Observaciones Finales</label>
                <textarea 
                  value={closingObservationsInput}
                  onChange={e => setClosingObservationsInput(e.target.value)}
                  className="w-full h-16 text-xs p-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#624A3E] focus:outline-none"
                  placeholder="Ex. Todo perfectamente conciliado"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-black uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-stone-900 hover:bg-stone-850 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer border border-[#ddd7ce]"
                >
                  Confirmar Arqueo & Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORICAL SHIFTS LIST */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 font-sans">
        <h4 className="text-xs font-black text-stone-800 uppercase tracking-tight flex items-center gap-1.5 pb-2 border-b border-stone-100">
          <Calendar className="w-4 h-4 text-[#624A3E]" /> Registro de Auditoría de Cierres de Caja Homologados ({sessionInsumos.length})
        </h4>

        {sessionInsumos.length > 0 ? (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {sessionInsumos.map((cs, idx) => {
              const hasDiff = cs.diferencia !== null;
              const hasDiffErr = hasDiff && (cs.diferencia || 0) !== 0;

              return (
                <div key={idx} className="p-3 bg-stone-50 border border-stone-200/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-extrabold text-[#624A3E] flex items-center gap-1">
                      Cierre de Caja {cs.usuario_cajero}
                    </p>
                    <p className="text-[10px] text-stone-500 font-medium">
                      Apertura: {cs.fecha_apertura} • Cierre: {cs.fecha_cierre || 'En curso'}
                    </p>
                    <p className="text-[10px] font-medium text-stone-600 italic">
                      Observaciones: "{cs.observaciones}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:text-right shrink-0">
                    <div className="bg-white p-2 rounded border border-stone-150 min-w-[100px] text-center">
                      <span className="text-[8px] text-stone-400 block font-black uppercase">Ventas Turno</span>
                      <span className="font-mono font-bold text-stone-900">${cs.monto_ventas.toLocaleString('es-AR')}</span>
                    </div>

                    <div className="bg-white p-2 rounded border border-stone-150 min-w-[100px] text-center">
                      <span className="text-[8px] text-stone-400 block font-black uppercase">Monto Real</span>
                      <span className="font-mono font-bold text-stone-900">${(cs.monto_real || 0).toLocaleString('es-AR')}</span>
                    </div>

                    {hasDiff && (
                      <div className={`p-2 rounded border min-w-[90px] text-center ${
                        hasDiffErr ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        <span className="text-[8px] block font-black uppercase">Diferencia</span>
                        <span className="font-mono font-bold">
                          {cs.diferencia && cs.diferencia > 0 ? '+' : ''}{cs.diferencia?.toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-stone-400 italic text-center py-4">No se registran históricos de cierres almacenados.</p>
        )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
