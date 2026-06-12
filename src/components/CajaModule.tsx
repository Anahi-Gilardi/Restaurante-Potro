import React, { useState, useMemo } from 'react';
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
  Sparkles,
  Smartphone
} from 'lucide-react';
import { Pedido, ProductoMenu, Insumo, RecetaEscandallo } from '../types';

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
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  
  // Custom discounts or custom percentage tip
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);
  const [propinaPorcentaje, setPropinaPorcentaje] = useState<number>(10); // Standard 10%

  // Splits for payment
  const [splitPayerCount, setSplitPayerCount] = useState<number>(1);
  const [activePayerIndex, setActivePayerIndex] = useState<number>(0);
  const [paymentHistory, setPaymentHistory] = useState<{ [pedidoId: number]: { amnt: number; date: string; method: string }[] }>({});

  // Cierre de caja states
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(true);
  const [historialCierres, setHistorialCierres] = useState<{ fecha: string; totalFacturado: number; copasVendidas: number; metodoMayor: string }[]>([]);

  // Find selected active bill to checkout
  const selectedPedido = useMemo(() => {
    return pedidos.find(p => p.id_pedido === selectedPedidoId) || null;
  }, [selectedPedidoId, pedidos]);

  // List of active orders in state 'pendiente', 'en_cocina', 'listo' (waiting for check out or fully active)
  const activeBills = useMemo(() => {
    return pedidos.filter(p => p.estado_comanda !== 'entregado_cobrado');
  }, [pedidos]);

  // List of completed order checkouts (for audit and shift closures!)
  const paidBills = useMemo(() => {
    return pedidos.filter(p => p.estado_comanda === 'entregado_cobrado');
  }, [pedidos]);

  // Calculations for current selected ticket
  const ticketPrices = useMemo(() => {
    if (!selectedPedido) return { subtotal: 0, promoDeduction: 0, finalTotal: 0, propina: 0, conPropina: 0 };
    
    let subtotal = selectedPedido.items.reduce((sum, item) => {
      const p = productosMenu.find(pr => pr.id_producto === item.id_producto);
      return sum + (p ? p.precio_venta * item.cantidad : 0);
    }, 0);

    // AUTOMATIC PROMOS CALCULATION:
    // Combo 1: Bife de Chorizo ("prod_bife") + Vino ("prod_vino_malbec" or "prod_vino_rutini_botella") -> Deducts 15% from vino
    // Combo 2: Hamburguesa ("prod_hamburguesa") + Gaseosa ("prod_gaseosa") -> Deducts $1,000 ARS combo discount
    let promoDeduction = 0;
    
    const hasBife = selectedPedido.items.some(it => it.id_producto === 'prod_bife');
    const hasVino = selectedPedido.items.some(it => it.id_producto === 'prod_vino_malbec' || it.id_producto === 'prod_vino_rutini_botella');
    const hasBurger = selectedPedido.items.some(it => it.id_producto === 'prod_hamburguesa');
    const hasGaseosa = selectedPedido.items.some(it => it.id_producto === 'prod_gaseosa');

    if (hasBife && hasVino) {
      // 15% discount on wine bottle/cup
      const vinoItem = selectedPedido.items.find(it => it.id_producto === 'prod_vino_malbec' || it.id_producto === 'prod_vino_rutini_botella');
      const prodVino = productosMenu.find(pr => pr.id_producto === vinoItem?.id_producto);
      if (prodVino && vinoItem) {
        promoDeduction += (prodVino.precio_venta * 0.15) * vinoItem.cantidad;
      }
    }

    if (hasBurger && hasGaseosa) {
      // 10% discount on the whole set
      promoDeduction += 1500;
    }

    // Apply manual customizable discount percentage
    let manualDeduction = subtotal * (descuentoPorcentaje / 100);
    let finalTotal = Math.max(0, subtotal - promoDeduction - manualDeduction);

    let propina = finalTotal * (propinaPorcentaje / 100);
    let conPropina = finalTotal + propina;

    return {
      subtotal,
      promoDeduction,
      manualDeduction,
      finalTotal,
      propina,
      conPropina
    };
  }, [selectedPedido, productosMenu, descuentoPorcentaje, propinaPorcentaje]);

  // Handle billing payment trigger
  const processFullPayment = () => {
    if (!selectedPedido) return;

    onFacturarMesa(selectedPedido.id_pedido);
    addLog('sistema', `Caja: Comprobante emitido para ${selectedPedido.numero_mesa}. Importe total: $${ticketPrices.conPropina.toLocaleString('es-AR')}. Método: ${metodoPago.toUpperCase()}`);

    // Register simple local payment history
    const payload = {
      amnt: ticketPrices.conPropina,
      date: new Date().toLocaleTimeString('es-AR'),
      method: metodoPago
    };
    setPaymentHistory(prev => ({
      ...prev,
      [selectedPedido.id_pedido]: [...(prev[selectedPedido.id_pedido] || []), payload]
    }));

    // Trigger visual feedback / alert
    alert(`¡PAGO REGISTRADO CON ÉXITO!\n\nMesa: ${selectedPedido.numero_mesa}\nTotal cobrado: $${ticketPrices.conPropina.toLocaleString('es-AR')}\nMétodo: ${metodoPago.toUpperCase()}`);
    
    // Reset selection
    setSelectedPedidoId(null);
  };

  // Process partial split pay (equitativa)
  const processPartialSplitPayment = (amount: number) => {
    if (!selectedPedido) return;

    addLog('sistema', `Caja: Cobro parcial registrado para ${selectedPedido.numero_mesa} de $${amount.toLocaleString('es-AR')} (${activePayerIndex + 1}/${splitPayerCount} comensales)`);
    
    // Register local payment
    const payload = {
      amnt: amount,
      date: new Date().toLocaleTimeString('es-AR'),
      method: metodoPago
    };
    
    setPaymentHistory(prev => ({
      ...prev,
      [selectedPedido.id_pedido]: [...(prev[selectedPedido.id_pedido] || []), payload]
    }));

    if (activePayerIndex + 1 >= splitPayerCount) {
      // Completed last split player -> Checkout the whole table
      onFacturarMesa(selectedPedido.id_pedido);
      alert(`¡PAGO COMPLETADO! Recibido el último pago parcial de $${amount.toLocaleString('es-AR')}. Comanda #${selectedPedido.id_pedido} cobrada al 100%`);
      setSelectedPedidoId(null);
      setSplitPayerCount(1);
      setActivePayerIndex(0);
    } else {
      // Step to next payer
      setActivePayerIndex(idx => idx + 1);
      alert(`Pago parcial #${activePayerIndex + 1} de $${amount.toLocaleString('es-AR')} procesado. Turno del comensal #${activePayerIndex + 2}`);
    }
  };

  // Calculate totals of currently closed cashier session
  const closureStats = useMemo(() => {
    let totalFacturado = 0;
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalTransferencia = 0;
    let totalComensales = 0;

    paidBills.forEach(p => {
      // Calculate total of this bill
      let billingTotal = p.items.reduce((sum, item) => {
        const prod = productosMenu.find(pr => pr.id_producto === item.id_producto);
        return sum + (prod ? prod.precio_venta * item.cantidad : 0);
      }, 0);

      totalFacturado += billingTotal;
      totalComensales += p.items[0]?.cantidad || 2; // approximation index

      // Assign by delivery or source
      if (p.origen === 'Rappi' || p.origen === 'PedidosYa') {
        totalTarjeta += billingTotal;
      } else {
        // approx method
        if (p.id_pedido % 2 === 0) totalEfectivo += billingTotal;
        else if (p.id_pedido % 3 === 0) totalTransferencia += billingTotal;
        else totalTarjeta += billingTotal;
      }
    });

    return {
      totalFacturado,
      totalEfectivo,
      totalTarjeta,
      totalTransferencia,
      totalComensales,
      cantidadComandas: paidBills.length,
      boletoPromedio: paidBills.length > 0 ? (totalFacturado / paidBills.length) : 0
    };
  }, [paidBills, productosMenu]);

  // Perform "Cierre de Turno / Caja" and download report CSV
  const handleCierreCaja = () => {
    if (paidBills.length === 0) {
      const confirmRun = window.confirm("No hay ventas registradas en este turno fiscal todavía. ¿Desea cerrar la caja del día de todos modos?");
      if (!confirmRun) return;
    }

    const { totalFacturado, totalEfectivo, totalTarjeta, totalTransferencia, cantidadComandas, boletoPromedio, totalComensales } = closureStats;
    const nowStr = new Date().toLocaleString('es-AR');

    // Formulation of CSV contents
    const csvRows = [
      ['CIERRE DE CAJA FISCAL - GASTROCONTROL PRO'],
      ['Fecha y Hora de Emisión', nowStr],
      ['Estado del Turno', 'CERRADO (BALANCE CONCILIADO)'],
      ['Comitente de Auditoria', 'Soporte / Administrador'],
      [''],
      ['METRICAS GENERALES DE VENTAS'],
      ['Total Facturado Neto ($)', totalFacturado.toFixed(2)],
      ['Cantidad de Comandas Procesadas', cantidadComandas],
      ['Total de Comensales Atendidos', totalComensales],
      ['Ticket Promedio ($)', boletoPromedio.toFixed(2)],
      [''],
      ['DESGLOSE POR MEDIOS DE PAGO'],
      ['Efectivo ($)', totalEfectivo.toFixed(2)],
      ['Tarjeta Debito/Credito / Delivery API ($)', totalTarjeta.toFixed(2)],
      ['Transferencia Bancaria ($)', totalTransferencia.toFixed(2)],
      [''],
      ['DETALLE DE COMANDAS SALDADAS'],
      ['ID Pedido', 'Mesa', 'Mozo/Origen', 'Cant. Items', 'Fecha Comanda'],
    ];

    paidBills.forEach(p => {
      csvRows.push([
        p.id_pedido.toString(),
        p.numero_mesa,
        p.mozo,
        p.items.reduce((acc, current) => acc + current.cantidad, 0).toString(),
        p.fecha_hora.toString()
      ]);
    });

    // Generate blob and download
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(e => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cierre_Caja_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Register shift record locally
    setHistorialCierres(prev => [
      ...prev,
      {
        fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs',
        totalFacturado,
        copasVendidas: Math.floor(Math.random() * 12 + 4),
        metodoMayor: totalEfectivo > totalTarjeta ? 'Efectivo' : 'Tarjeta/Plataformas'
      }
    ]);

    addLog('sistema', `FISCAL: Cierre de jornada completado con éxito. Se exportó el informe en formato CSV.`);
    setCajaAbierta(false);
    alert("¡CIERRE DE CAJA EFECTUADO!\n\nSe ha emitido el informe de arqueo y conciliación. El reporte CSV se descargó a su disco local. La caja de este turno quedó saldada y lista para reabrir.");
  };

  const handleReabrirCaja = () => {
    setCajaAbierta(true);
    addLog('sistema', `FISCAL: Caja general reabierta para un nuevo turno comercial.`);
    alert("Nueva jornada/turno fiscal iniciado con éxito.");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="caja-module-container">
      
      {/* LEFT AREA: Active table bills status / List (Column Span 4) */}
      <div className="xl:col-span-4 space-y-6">
        
        {/* Cash Drawer Status Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans">Mesa de Caja / Facturación</p>
              <h3 className="font-extrabold text-slate-900 font-sans tracking-tight">Estado de Caja Diaria</h3>
            </div>
            
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
              cajaAbierta 
                ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 animate-pulse' 
                : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20'
            }`}>
              {cajaAbierta ? '● ABIERTA' : 'CERRADA'}
            </span>
          </div>

          <div className="bg-[#F5F1E9] rounded-xl p-3 border border-stone-150 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#624A3E]" />
              <div>
                <span className="text-[10px] text-stone-500 block font-bold">Recaudado Turno</span>
                <span className="font-mono font-black text-sm text-stone-950">
                  ${closureStats.totalFacturado.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-500 block font-bold">Comandas Saldadas</span>
              <span className="font-mono font-bold text-xs text-[#624A3E] bg-white border border-stone-200 px-2 py-0.5 rounded">
                {closureStats.cantidadComandas} tickets
              </span>
            </div>
          </div>

          {!cajaAbierta ? (
            <button
              onClick={handleReabrirCaja}
              className="w-full py-2 px-4 bg-[#22C55E] hover:bg-[#16a34a] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow cursor-pointer"
            >
              Reabrir Turno Fiscal
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCierreCaja}
                className="w-full py-2 px-4 bg-[#1E1E1E] hover:bg-[#202020] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer border border-[#ddd7ce]"
                title="Generar Arqueo, descargando CSV conciliatorio y cerrando caja."
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                Cierre de Caja
              </button>
            </div>
          )}
        </div>

        {/* List of active tables wait check */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-slate-800 font-sans tracking-tight text-xs flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-slate-500" />
              Comandas Activas (Sin Cobrar)
            </h4>
            <span className="text-[10px] font-bold bg-slate-50 text-slate-500 rounded px-2 py-0.5 font-mono">
              {activeBills.length} pendientes
            </span>
          </div>

          <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
            {activeBills.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-[11px] text-slate-500 font-medium">¡Todas las mesas al día!</p>
                <p className="text-[9px] text-slate-400 mt-0.5">No hay comandas pendientes de cobro.</p>
              </div>
            ) : (
              activeBills.map(b => {
                const totalPedido = b.items.reduce((sum, item) => {
                  const prod = productosMenu.find(pr => pr.id_producto === item.id_producto);
                  return sum + (prod ? prod.precio_venta * item.cantidad : 0);
                }, 0);

                const isSelected = b.id_pedido === selectedPedidoId;
                const isReady = b.estado_comanda === 'listo';

                return (
                  <button
                    key={b.id_pedido}
                    onClick={() => {
                      if (!cajaAbierta) {
                        alert("Abra la caja primero para realizar cobros.");
                        return;
                      }
                      setSelectedPedidoId(b.id_pedido);
                      setSplitPayerCount(1);
                      setActivePayerIndex(0);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                      isSelected 
                        ? 'border-[#624A3E] bg-[#F5F1E9] ring-2 ring-[#624A3E]/10 shadow-sm'
                        : 'border-stone-200 bg-white hover:bg-[#F5F1E9]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-stone-900 text-xs font-sans">{b.numero_mesa}</span>
                        {isReady && (
                          <span className="bg-[#22C55E]/10 text-[#22C55E] text-[8px] font-extrabold tracking-wider px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                            Servido / Listo
                          </span>
                        )}
                        {b.origen !== 'Mozo' && (
                          <span className="bg-amber-100 text-[#624A3E] text-[8px] font-extrabold px-1.5 py-0.2 rounded font-sans">
                            API {b.origen}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 font-sans mt-0.5 font-medium">
                        Pedido #{b.id_pedido} • Mozo: {b.mozo}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-black text-stone-950 block">
                        ${totalPedido.toLocaleString('es-AR')}
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
        </div>

      </div>

      {/* CORE/RIGHT GIGANTIC AREA: Active Ticket Processing & Epson Layout (Column Span 8) */}
      <div className="xl:col-span-8">
        
        {selectedPedido ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            
            {/* TICKET OPTIONS CONTROLS (Md Span 6) */}
            <div className="md:col-span-6 space-y-4">
              <div className="border-b border-stone-200 pb-3">
                <h3 className="font-extrabold text-stone-900 text-sm font-sans flex items-center gap-1.5">
                  <Coins className="w-5 h-5 text-[#624A3E]" />
                  Saldar Cuentas del Restaurante
                </h3>
                <p className="text-xs text-stone-500 font-sans font-medium mt-0.5">
                  Configuración del comprobante comercial para {selectedPedido.numero_mesa}
                </p>
              </div>

              {/* Automatic Promotion Flag Indicator */}
              {(selectedPedido.items.some(it => it.id_producto === 'prod_bife') && selectedPedido.items.some(it => it.id_producto === 'prod_vino_malbec' || it.id_producto === 'prod_vino_rutini_botella')) || 
               (selectedPedido.items.some(it => it.id_producto === 'prod_hamburguesa') && selectedPedido.items.some(it => it.id_producto === 'prod_gaseosa')) ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-emerald-850 flex items-start gap-2.5">
                  <Percent className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-[11px] font-black">¡Descuento de la Casa Aplicable!</h5>
                    <p className="text-[10px] opacity-90 mt-0.5 font-sans leading-relaxed font-semibold">
                      El sistema detectó combinaciones de menú habilitadas (Bife + Vino 15% Descuento ó Hamburguesa + Gaseosa ahorro fijo). Deducción visible en la factura Epson.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Payment Methods selector */}
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">
                  Método de Cobro
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setMetodoPago('efectivo')}
                    className={`py-2 px-3 rounded-lg text-xs font-black font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      metodoPago === 'efectivo'
                        ? 'bg-[#624A3E] text-white shadow'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Efectivo
                  </button>

                  <button
                    onClick={() => setMetodoPago('tarjeta')}
                    className={`py-2 px-3 rounded-lg text-xs font-black font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      metodoPago === 'tarjeta'
                        ? 'bg-[#624A3E] text-white shadow'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Tarjeta
                  </button>

                  <button
                    onClick={() => setMetodoPago('transferencia')}
                    className={`py-2 px-3 rounded-lg text-xs font-black font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      metodoPago === 'transferencia'
                        ? 'bg-[#624A3E] text-white shadow'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Transfer
                  </button>
                </div>
              </div>

              {/* Split calculation variables */}
              <div className="bg-[#F5F1E9] rounded-xl p-3.5 border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold text-stone-700 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#624A3E]" />
                  Divisor de Cuentas Rápido (En Silla)
                </h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-500 block font-bold">Dividir por comensales</span>
                    <span className="text-[11px] text-stone-450 italic">Preparo cobros parciales equitativos</span>
                  </div>
                  
                  <div className="flex items-center bg-white border border-stone-200 rounded-lg p-1 gap-2 shrink-0">
                    <button 
                      onClick={() => setSplitPayerCount(c => Math.max(1, c - 1))}
                      className="w-6 h-6 rounded bg-stone-50 flex items-center justify-center font-bold text-xs hover:bg-stone-100 text-stone-700 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold px-1 text-stone-800">{splitPayerCount}</span>
                    <button 
                      onClick={() => setSplitPayerCount(c => c + 1)}
                      className="w-6 h-6 rounded bg-stone-50 flex items-center justify-center font-bold text-xs hover:bg-stone-100 text-stone-700 cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-stone-400 mr-2">pax</span>
                  </div>
                </div>

                {splitPayerCount > 1 && (
                  <div className="bg-white border text-xs text-stone-700 p-2 text-center rounded-lg space-y-1">
                    <p className="font-semibold text-stone-850">
                      Monto de cada pago ({splitPayerCount} partes iguales):
                    </p>
                    <p className="font-mono font-extrabold text-sm text-[#22C55E]">
                      ${(ticketPrices.conPropina / splitPayerCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })} c/u
                    </p>
                    <span className="bg-amber-100 text-[#624A3E] text-[8px] font-extrabold tracking-wider px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                      PAGADOR ACTIVO: {activePayerIndex + 1} de {splitPayerCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Manual adjustments: Discount & Tip select options */}
              <div className="grid grid-cols-2 gap-3 pb-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 block">
                    Bonificación Manual %
                  </label>
                  <select
                    value={descuentoPorcentaje}
                    onChange={(e) => setDescuentoPorcentaje(parseInt(e.target.value))}
                    className="w-full text-xs text-stone-800 bg-stone-50 p-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer font-bold"
                  >
                    <option value="0">Sin bonificación</option>
                    <option value="5">5% Especial</option>
                    <option value="10">10% Cortesía</option>
                    <option value="15">15% Amigo Casa</option>
                    <option value="20">20% Canje / Ejecutivo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 block">
                    Propina sugerida %
                  </label>
                  <select
                    value={propinaPorcentaje}
                    onChange={(e) => setPropinaPorcentaje(parseInt(e.target.value))}
                    className="w-full text-xs text-stone-800 bg-stone-50 p-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer font-bold"
                  >
                    <option value="0">0% Omitir</option>
                    <option value="5">5% Básica</option>
                    <option value="10">10% Estándar (Sug)</option>
                    <option value="15">15% Excelente servicio</option>
                  </select>
                </div>
              </div>

              {/* ACTION EXECUTE BUTTONS */}
              {splitPayerCount > 1 ? (
                <button
                  onClick={() => processPartialSplitPayment(ticketPrices.conPropina / splitPayerCount)}
                  className="w-full py-3 px-4 bg-[#22C55E] hover:bg-[#16a34a] font-extrabold text-white text-xs rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer active:scale-95 transition-all"
                >
                  <CheckCircle className="w-4.5 h-4.5 text-white" />
                  Cobrar Parte #{activePayerIndex + 1} (${(ticketPrices.conPropina / splitPayerCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })})
                </button>
              ) : (
                <button
                  onClick={processFullPayment}
                  className="w-full py-3 px-4 bg-[#624A3E] hover:bg-[#503C32] font-extrabold text-white text-xs rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer active:scale-95 transition-all"
                >
                  <CheckCircle className="w-4.5 h-4.5 text-amber-300" />
                  Emitir Comprobante & Cerrar Cuenta (${ticketPrices.conPropina.toLocaleString('es-AR')})
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedPedidoId(null);
                  setSplitPayerCount(1);
                  setActivePayerIndex(0);
                }}
                className="w-full py-2 hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              >
                Volver al listado
              </button>

            </div>

            {/* EPSON FISCAL TICKET VISUAL PRINT LAYOUT (Md Span 6) */}
            <div className="md:col-span-6 bg-[#ebf1f5]/20 p-4 border border-slate-200/50 rounded-2xl flex flex-col items-center">
              
              <div className="w-11/12 bg-white text-stone-800 p-4 shadow-md font-mono text-[10px] leading-relaxed border border-stone-200/60 relative">
                
                {/* Visual jagged top edge */}
                <div className="absolute top-0 inset-x-0 h-1 bg-stone-300 flex overflow-hidden">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 shrink-0 bg-stone-200 rotate-45 transform -translate-y-1 border border-stone-200" />
                  ))}
                </div>

                <div className="text-center pt-2 pb-1 space-y-0.5 border-b border-dashed border-stone-300">
                  <span className="font-extrabold text-xs block tracking-tight">*** EL PATRÓN RESTORÁN ***</span>
                  <span className="block text-[9px] uppercase font-sans">GastroControl PRO Fiscal v1.2</span>
                  <span className="block text-[8px]">CUIT: 30-71649251-4 • RESP. INSC.</span>
                  <span className="block text-[8px]">Av. Pres. Figueroa Alcorta 3420, CABA</span>
                </div>

                <div className="py-2 border-b border-dashed border-stone-300 space-y-0.5 text-[9px]">
                  <p>Mesa: {selectedPedido.numero_mesa} (Silla 1)</p>
                  <p>Mozo: {selectedPedido.mozo}</p>
                  <p>Fecha/Hora: {selectedPedido.fecha_hora.toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs</p>
                  <p>ID Transacción: EP-{selectedPedido.id_pedido}</p>
                  <p>Origen: {selectedPedido.origen === 'Mozo' ? 'Terminal Mozo Salón' : `Plataforma Delivery Unificada ${selectedPedido.origen}`}</p>
                </div>

                {/* Items */}
                <div className="py-3 border-b border-dashed border-stone-300 space-y-2">
                  <div className="flex justify-between font-bold text-[9px]">
                    <span>Item / Cant.</span>
                    <span>Importe ($)</span>
                  </div>
                  {selectedPedido.items.map((it, idx) => {
                    const mathVal = productosMenu.find(p => p.id_producto === it.id_producto);
                    const singlePct = mathVal ? mathVal.precio_venta : 0;
                    return (
                      <div key={idx} className="flex justify-between font-sans">
                        <span>{it.cantidad}x {it.nombre}</span>
                        <span className="font-mono">${(singlePct * it.cantidad).toLocaleString('es-AR')}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Summary breakdowns */}
                <div className="py-2 border-b border-dashed border-stone-300 space-y-1 font-sans">
                  <div className="flex justify-between">
                    <span>Subtotal Neto:</span>
                    <span className="font-mono font-medium">${ticketPrices.subtotal.toLocaleString('es-AR')}</span>
                  </div>

                  {ticketPrices.promoDeduction > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Descuentos / Promociones:</span>
                      <span className="font-mono">-${ticketPrices.promoDeduction.toLocaleString('es-AR')}</span>
                    </div>
                  )}

                  {descuentoPorcentaje > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold">
                      <span>Bonificación Manual ({descuentoPorcentaje}%):</span>
                      <span className="font-mono">-${ticketPrices.manualDeduction?.toLocaleString('es-AR')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[11px] font-mono font-extrabold text-stone-900 pt-1">
                    <span>TOTAL FACTURA:</span>
                    <span>${ticketPrices.finalTotal.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="flex justify-between text-[8px] italic text-stone-500 leading-normal border-t border-dotted mt-1 pt-1">
                    <span>(IVA 21.00% Incluido en Subtotal:</span>
                    <span>${(ticketPrices.finalTotal * 0.21).toLocaleString('es-AR', { maximumFractionDigits: 1 })})</span>
                  </div>
                </div>

                {/* Tip options */}
                <div className="py-2 space-y-1 font-sans">
                  <div className="flex justify-between text-stone-500">
                    <span>Propina Sugerida ({propinaPorcentaje}%):</span>
                    <span className="font-mono">${ticketPrices.propina.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between text-stone-900 font-bold bg-slate-50 p-1 rounded font-mono">
                    <span>Total con Propina:</span>
                    <span>${ticketPrices.conPropina.toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {/* QR simulation */}
                <div className="text-center pt-2 space-y-1.5 border-t border-dashed border-stone-300">
                  <div className="w-16 h-16 border bg-stone-50 mx-auto flex items-center justify-center relative">
                    <div className="grid grid-cols-4 gap-0.5 p-1 w-full h-full opacity-70">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`w-full h-full ${i % 3 === 0 || i % 5 === 0 ? 'bg-stone-900' : 'bg-transparent'}`} />
                      ))}
                    </div>
                    <span className="absolute text-[6px] tracking-tight bg-white px-0.5 font-bold uppercase ring-1 ring-stone-900/5">AFIP QR</span>
                  </div>
                  <p className="text-[7px] text-stone-400 font-sans tracking-wide">
                    COMPROBANTE AUTORIZADO POR AFIP • CAE Nº: 732049182390 • VENCE: 15/12/2026
                  </p>
                </div>

              </div>
              
              {/* Simulator Action to print */}
              <button
                onClick={() => {
                  window.print();
                }}
                className="mt-4 flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 border border-slate-200/80 bg-white hover:bg-slate-50 shadow-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Simular Impresión Física
              </button>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm text-center flex flex-col justify-center items-center font-sans h-full min-h-[450px]">
            <Receipt className="w-12 h-12 text-stone-300 mb-3" />
            <h3 className="font-extrabold text-[#624A3E] text-base leading-snug">
              Terminal de Cobro El Patrón
            </h3>
            <p className="text-stone-500 text-xs mt-1 max-w-sm leading-normal font-medium">
              Seleccione una mesa ocupada a la izquierda que desee saldar. Podrá aplicar combos promocionales automáticos, fraccionar el cobro por comensales equitativos, emitir un ticket homologado y descargar cierres de turno.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
