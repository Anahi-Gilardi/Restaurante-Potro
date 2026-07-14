import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Smartphone,
  X
} from 'lucide-react';
import { 
  Pedido, 
  ProductoMenu, 
  CierreCaja, 
  PrinterConfig, 
  TicketData, 
  TicketItem, 
  TipoComprobante
} from '../types';
import { useCaja } from '../features/caja/hooks/useCaja';
import { useToast } from './ToastContainer';
import { pdfService } from '../services/pdfService';
import { printerService } from '../services/printerService';
import { Factura } from '../services/facturacionService';

interface CajaModuleProps {
  pedidos: Pedido[];
  productosMenu: ProductoMenu[];
  onFacturarMesa: (idPedido: number) => void;
  onCambiarEstadoPedido: (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => void;
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', mensaje: string) => void;
}

export default function CajaModule({
  pedidos,
  productosMenu,
  onFacturarMesa,
  onCambiarEstadoPedido,
  addLog
}: CajaModuleProps) {
  const { toast } = useToast();
  
  const {
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
    tipoComprobante,
    setTipoComprobante,
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
  } = useCaja({
    pedidos,
    productosMenu,
    onFacturarMesa,
    onCambiarEstadoPedido,
    addLog,
    toast
  });

  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<CierreCaja | null>(null);
  const [failedPrintsCount, setFailedPrintsCount] = useState(0);

  // Calculadora de Billetes para Arqueo Físico
  const [showBillCounter, setShowBillCounter] = useState<'open' | 'close' | null>(null);
  const [billCounts, setBillCounts] = useState<{ [denom: number]: number }>({
    20000: 0,
    10000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0
  });

  const billTotal = useMemo(() => {
    return Object.entries(billCounts).reduce((sum, [denom, count]) => sum + parseInt(denom) * count, 0);
  }, [billCounts]);

  const refreshFailedPrintsCount = () => {
    setFailedPrintsCount(printerService.getFailedPrints().length);
  };

  useEffect(() => {
    refreshFailedPrintsCount();
  }, [cajaSession, lastFacturas]);

  const handleExportCSV = (cierre: CierreCaja) => {
    const movs = cierre.movimientos_manuales || [];
    if (movs.length === 0) {
      alert("No hay movimientos de caja chica en esta sesión para exportar.");
      return;
    }
    const headers = ["ID", "Fecha", "Tipo", "Monto", "Concepto"];
    const rows = movs.map(m => [
      m.id_movimiento,
      new Date(m.fecha).toISOString(),
      m.tipo,
      m.monto,
      `"${m.concepto.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `movimientos-caja-${cierre.id_cierre}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <div className="glass-panel rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 ml-1 bg-[#624A3E]/10 dark:bg-[#FAF7F0]/10 rounded-xl text-[#624A3E] dark:text-[#FAF7F0]">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-stone-900 dark:text-stone-100 uppercase tracking-tight font-sans">
              Terminal de Caja & Facturación Fiscal
            </h1>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
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
                alert('Ajustes de ticketera guardados en el almacenamiento del navegador.');
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
          
          {/* DAILY DRAWER SHIFT COMPONENT */}
          <div className="glass-panel rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-black text-stone-400 dark:text-stone-300 block tracking-wider">Flujo Contable Diario</span>
                <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-sm tracking-tight font-sans">Estado de Caja Diaria</h3>
              </div>
              
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border ${
                cajaSession 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse' 
                  : 'bg-stone-50 dark:bg-stone-900/60 text-stone-400 dark:text-stone-300 border-stone-200 dark:border-stone-800'
              }`}>
                {cajaSession ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {cajaSession ? 'Abierta' : 'Cerrada'}
              </span>
            </div>

            {/* Display detailed figures inside shift */}
            {cajaSession ? (
              <div className="space-y-2">
                <div className="p-3 bg-[#F5F1E9] dark:bg-stone-955/60 rounded-xl border border-stone-200/60 dark:border-stone-850 font-sans space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
                    <span>Responsable:</span>
                    <span className="text-stone-900 dark:text-stone-200">{cajaSession.usuario_cajero}</span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
                    <span>Apertura:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-200">{cajaSession.fecha_apertura}</span>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-150 dark:border-stone-800">
                    <span>Monto Inicial:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-200">${cajaSession.monto_apertura.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="flex justify-between text-[13px] font-black text-[#624A3E] dark:text-amber-500 pt-1 border-t border-stone-150 dark:border-stone-800">
                    <span>Ventas registradas:</span>
                    <span className="font-mono">${cajaSession.monto_ventas.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="flex justify-between text-xs font-bold text-stone-900 dark:text-stone-100 pt-1 font-mono border-t border-stone-150 dark:border-stone-800 border-dotted">
                    <span>Caja Chica (Neto):</span>
                    <span className={sumIngresosManuales - sumEgresosManuales >= 0 ? 'text-emerald-700' : 'text-rose-750'}>
                      ${(sumIngresosManuales - sumEgresosManuales).toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-black text-emerald-700 dark:text-emerald-400 pt-1 font-mono border-t border-emerald-100 dark:border-emerald-900/60">
                    <span>Caja esperada:</span>
                    <span>${cajaEsperadaTotal.toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {/* Turn revenue detailed tags */}
                {cajaSession.registros_totales && (
                  <div className="p-3 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2.5">
                    <span className="text-[8px] font-black uppercase text-stone-400 dark:text-stone-300 block tracking-wider">Distribución de Cobros</span>
                    <div className="space-y-2 text-[10px]">
                      {(() => {
                        const totals = cajaSession.registros_totales;
                        const sum = (totals.efectivo || 0) + (totals.debito || 0) + (totals.credito || 0) + (totals.transferencia || 0) + (totals.mercadopago || 0);
                        const getPct = (val: number) => sum > 0 ? (val / sum) * 100 : 0;
                        
                        const items = [
                          { label: 'Efectivo', val: totals.efectivo, color: 'bg-[#E8B800]', text: 'text-[#E8B800]' },
                          { label: 'Transf./Deb.', val: totals.debito + totals.transferencia, color: 'bg-purple-500', text: 'text-purple-600' },
                          { label: 'Crédito', val: totals.credito, color: 'bg-blue-500', text: 'text-blue-600' },
                          { label: 'QR / MP', val: totals.mercadopago, color: 'bg-teal-500', text: 'text-teal-600' }
                        ];
                        
                        return (
                          <>
                            {/* Horizontal visual progress row */}
                            <div className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full flex overflow-hidden border border-stone-250/20">
                              {items.map((it, i) => {
                                const pct = getPct(it.val);
                                if (pct <= 0) return null;
                                return (
                                  <div 
                                    key={i} 
                                    className={`h-full ${it.color}`} 
                                    style={{ width: `${pct}%` }} 
                                    title={`${it.label}: ${pct.toFixed(1)}%`}
                                  />
                                );
                              })}
                            </div>
                            {/* Legend list */}
                            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                              {items.map((it, i) => (
                                <div key={i} className="flex items-center justify-between font-bold border-b border-stone-150/40 pb-1">
                                  <span className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${it.color}`} />
                                    {it.label}
                                  </span>
                                  <span className="text-stone-700 dark:text-stone-300">${it.val.toLocaleString('es-AR')}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => setShowMovimientoModal(true)}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[10px] uppercase font-black transition-all cursor-pointer border border-[#ddd7ce] flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#624A3E]" />
                    Registrar Movimiento de Caja Chica
                  </button>

                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-[10px] uppercase font-black transition-all cursor-pointer shadow-xs border border-[#ddd7ce] flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-300" />
                    Cierre de Turno comercial
                  </button>
                </div>
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

            {/* Print queue retry card */}
            {failedPrintsCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2 mt-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Cola de Impresión</span>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  Hay <strong>{failedPrintsCount}</strong> {failedPrintsCount === 1 ? 'ticket pendiente' : 'tickets pendientes'} de impresión física local.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const res = await printerService.retryFailedPrints(printerConfig);
                      refreshFailedPrintsCount();
                      if (res.successCount > 0) {
                        alert(`¡Se imprimieron con éxito ${res.successCount} ticket(s) de la cola!`);
                      } else if (res.failedCount > 0) {
                        alert(`No se pudo imprimir. Siguen pendientes ${res.failedCount} ticket(s). Verifique la conexión del bridge local en el puerto 8012.`);
                      }
                    } catch (err: any) {
                      alert(`Error al reintentar impresión: ${err.message}`);
                    }
                  }}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] uppercase font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs border border-amber-500"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-200" />
                  Reintentar Impresión ({failedPrintsCount})
                </button>
              </div>
            )}
          </div>

          {/* ACTIVE UNBILLED COMMANDS LIST */}
          <div className="glass-panel rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800/80">
              <h4 className="font-black text-stone-800 dark:text-stone-100 font-sans tracking-tight text-xs uppercase flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#624A3E] dark:text-stone-300" />
                Comandas en Salón
              </h4>
              <span className="text-[9px] font-bold bg-[#F5F1E9] dark:bg-[#FAF7F0]/10 text-[#624A3E] dark:text-stone-300 border border-stone-150 dark:border-stone-800 rounded-full px-2 py-0.5 font-mono">
                {activeBills.length} pendientes
              </span>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {activeBills.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-stone-150 rounded-xl bg-stone-50/50">
                  <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                  <p className="text-[11px] text-stone-500 font-black uppercase">¡Todo liquidado!</p>
                  <p className="text-[9px] text-stone-400 mt-0.5">No hay comandos de mesas pendientes de liquidación.</p>
                  <div className="mt-5 text-left bg-white rounded-xl border border-stone-200 p-3 space-y-2">
                    <p className="text-[10px] font-black uppercase text-stone-600 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-[#624A3E]" />
                      Tickets emitidos
                    </p>
                    {lastFacturas.length > 0 ? (
                      lastFacturas.map(factura => (
                        <div key={factura.id_factura} className="flex items-center justify-between gap-2 border-t border-stone-100 pt-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono font-black text-stone-80 truncate">{factura.nro_ticket}</p>
                            <p className="text-[9px] text-stone-400 truncate">{factura.cliente} - ${factura.total.toLocaleString('es-AR')}</p>
                          </div>
                          <button
                            onClick={() => downloadFacturaHistorialPdf(factura)}
                            className="px-2 py-1 rounded-lg bg-[#624A3E] text-white text-[9px] font-black uppercase shrink-0 cursor-pointer border-none"
                          >
                            Descargar PDF
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[9px] text-stone-400">Aun no hay tickets emitidos en el historial.</p>
                    )}
                  </div>
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
                          alert('Tenga a bien abrir primero la caja para proceder con la cuenta.');
                          return;
                        }
                        setSelectedPedidoId(isSelected ? null : b.id_pedido);
                        setSplitPayerCount(1);
                        setActivePayerIndex(0);
                      }}
                      className={`w-full p-3.5 rounded-xl border text-left flex justify-between items-center gap-3 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-stone-900 bg-stone-950/5 font-extrabold shadow-2xs' 
                          : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-stone-900 dark:text-stone-100 text-xs font-sans">Mesa {b.numero_mesa}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                            isReady ? 'bg-amber-100 text-amber-800' : 'bg-stone-150 text-stone-500'
                          }`}>
                            {b.estado_comanda}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1 font-medium font-sans">
                          Mozo: {b.mozo} • {itemsCountSum} items
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-stone-900 dark:text-stone-100 block text-xs font-black">${totalPrice.toLocaleString('es-AR')}</span>
                        <span className="text-[8px] font-bold text-stone-400 block font-mono">#{b.id_pedido}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: MAIN CHECKOUT WORKSPACE (LG: Span 8) */}
        <div className="lg:col-span-8">
          {selectedPedido ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* INTERACTIVE FORMULERS (MD: Span 7) */}
              <div className="md:col-span-7 bg-white dark:bg-stone-900/40 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
                
                <div className="flex justify-between items-center bg-[#F5F1E9] dark:bg-[#8C6239]/40 p-3 border border-stone-200/50 dark:border-stone-800/80 rounded-xl">
                  <div>
                    <span className="text-[8px] font-black uppercase text-[#624A3E] dark:text-[#C8956A] block">Cuenta Activa</span>
                    <h4 className="font-extrabold text-stone-900 dark:text-stone-100 text-xs font-sans">Mesa {selectedPedido.numero_mesa}</h4>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase text-stone-400 block">Subtotal Carta</span>
                    <p className="font-mono text-stone-900 dark:text-stone-100 font-extrabold text-xs">${orderBreakdowns.subtotal.toLocaleString('es-AR')}</p>
                  </div>
                </div>

                {/* Customer Loyalty Search / Register */}
                <div className="bg-stone-50 dark:bg-stone-900/50 p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 space-y-3 font-sans">
                  <span className="text-[9px] font-black text-stone-550 dark:text-stone-400 uppercase block tracking-wider">
                    Programa de Fidelización (Clientes Club El Patrón)
                  </span>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Buscar por DNI o CUIT..."
                      value={dniCuitBuscar}
                      onChange={e => setDniCuitBuscar(e.target.value)}
                      className="flex-1 text-xs p-2 border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-950 font-mono text-stone-850 dark:text-stone-150 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleBuscarCliente}
                      className="px-3 py-2 bg-[#624A3E] hover:bg-[#523e34] text-white text-xs font-black uppercase rounded-lg cursor-pointer transition-all active:scale-95 shrink-0 border-none"
                    >
                      Buscar
                    </button>
                  </div>

                  {selectedCliente ? (
                    <div className="bg-emerald-50 dark:bg-emerald-955 border border-emerald-250 dark:border-emerald-900/30 p-3 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <div>
                        <p className="font-extrabold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          {selectedCliente.nombre}
                        </p>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                          DNI/CUIT: {selectedCliente.dni_cuit} • Tel: {selectedCliente.telefono || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold block uppercase tracking-wider text-stone-500">Puntos Club</span>
                        <span className="font-mono text-base font-extrabold text-emerald-700 dark:text-emerald-400">{selectedCliente.puntos} pts</span>
                        {selectedCliente.puntos > 0 && (
                          <div className="mt-1 flex items-center gap-1.5 justify-end">
                            <span className="text-[8px] font-bold text-stone-500">Redimir:</span>
                            <input
                              type="number"
                              min="0"
                              max={selectedCliente.puntos}
                              value={puntosRedimidos || ''}
                              onChange={e => setPuntosRedimidos(Math.min(selectedCliente.puntos, Math.max(0, parseInt(e.target.value) || 0)))}
                              className="p-1 border border-stone-250 rounded w-16 text-xs text-center font-mono font-bold text-stone-800 dark:text-stone-100 bg-white dark:bg-stone-900"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    dniCuitBuscar.trim() && (
                      <div className="bg-stone-100/80 dark:bg-stone-950/40 border border-stone-200 p-3.5 rounded-lg space-y-2.5">
                        <p className="text-[10px] text-stone-550 dark:text-stone-400 font-bold italic">
                          Cliente no encontrado. Complete los datos si desea registrarlo en el club:
                        </p>
                        <form onSubmit={handleRegistrarCliente} className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[8px] font-bold text-stone-400 block mb-0.5">Nombre *</label>
                            <input
                              type="text"
                              required
                              value={nombreNuevoCliente}
                              onChange={e => setNombreNuevoCliente(e.target.value)}
                              className="w-full p-2 border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                              placeholder="Ej. José López"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-stone-400 block mb-0.5">Email</label>
                            <input
                              type="email"
                              value={emailNuevoCliente}
                              onChange={e => setEmailNuevoCliente(e.target.value)}
                              className="w-full p-2 border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                              placeholder="Ej. jose@mail.com"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-stone-400 block mb-0.5">Teléfono</label>
                            <input
                              type="text"
                              value={telNuevoCliente}
                              onChange={e => setTelNuevoCliente(e.target.value)}
                              className="w-full p-2 border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                              placeholder="Ej. +54 9..."
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg cursor-pointer border-none"
                            >
                              Registrar Cliente
                            </button>
                          </div>
                        </form>
                      </div>
                    )
                  )}
                </div>

                {/* Fiscal parameters configuration (Rule 4) */}
                <div className="p-3.5 bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 rounded-xl space-y-3 font-sans">
                  <div className="flex justify-between items-center pb-1 border-b border-stone-150 dark:border-stone-800/80">
                    <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-400 block">Datos del Receptor / Comprobante</span>
                    <span className="text-[8px] text-stone-400 uppercase font-black tracking-wider">Autorización ARCA al cobrar</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-bold uppercase text-stone-500 dark:text-stone-400 block mb-0.5">Comprobante</label>
                      <select 
                        value={tipoComprobante} 
                        onChange={e => setTipoComprobante(e.target.value as TipoComprobante)}
                        className="w-full text-[11px] p-1.5 border border-stone-200 dark:border-stone-800 rounded bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-bold"
                      >
                        <option value="factura_b">Factura B</option>
                        <option value="factura_a">Factura A</option>
                        <option value="factura_c">Factura C</option>
                        <option value="ticket_consumo">Ticket Consumo</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[8px] font-bold uppercase text-stone-500 dark:text-stone-400 block mb-0.5">DNI/CUIT Cliente</label>
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
                        className="w-full text-xs p-1.5 border border-stone-200 dark:border-stone-800 rounded bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-mono focus:outline-none"
                        placeholder="Ej. 20-38449102-1"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-bold uppercase text-stone-500 dark:text-stone-400 block mb-0.5">Razón Social Cliente</label>
                      <input 
                        type="text" 
                        value={nombreCliente}
                        onChange={e => setNombreCliente(e.target.value)}
                        className="w-full text-xs p-1.5 border border-stone-200 dark:border-stone-800 rounded bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 focus:outline-none"
                        placeholder="Ej. José de San Martín"
                      />
                    </div>
                  </div>
                </div>

                {/* Standard split comensales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-3 bg-[#F5F1E9]/50 dark:bg-[#8C6239]/10 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2">
                    <h5 className="text-[10px] font-black text-stone-600 dark:text-stone-300 flex items-center gap-1 uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5 text-[#624A3E] dark:text-stone-300" /> Partes Comensales (Partes Iguales)
                    </h5>
                    
                    <div className="flex items-center justify-between gap-2 bg-[#FAF7F0] dark:bg-[#8C6239]/40 border border-stone-200/50 p-1.5 rounded-lg">
                      <button
                        onClick={() => {
                          setSplitPayerCount(prev => Math.max(1, prev - 1));
                          setActivePayerIndex(0);
                        }}
                        className="w-7 h-7 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 rounded-lg border-none"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-black text-stone-900 dark:text-stone-100">{splitPayerCount} pax</span>
                      <button
                        onClick={() => {
                          setSplitPayerCount(prev => prev + 1);
                          setActivePayerIndex(0);
                        }}
                        className="w-7 h-7 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 rounded-lg border-none"
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

                  {/* Manual discounts & tip adjustments */}
                  <div className="p-3 bg-stone-50 dark:bg-[#FAF7F0]/5 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2">
                    <h5 className="text-[10px] font-black text-stone-600 dark:text-stone-300 flex items-center gap-1 uppercase tracking-wider">
                      <Percent className="w-3.5 h-3.5 text-[#624A3E] dark:text-stone-300" /> Bonificación & Propinas
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] font-bold text-stone-500 block mb-0.5">Manual Desc %</label>
                        <select
                          value={descuentoPorcentaje}
                          onChange={e => setDescuentoPorcentaje(parseInt(e.target.value) || 0)}
                          className="w-full text-xs p-1.5 border border-stone-200 dark:border-stone-800 rounded bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 font-bold font-sans"
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
                          className="w-full text-xs p-1.5 border border-stone-200 dark:border-stone-800 rounded bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 font-bold font-sans"
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

                {/* PAYMENT TYPE / MIXED PAYMENTS LAYOUT */}
                <div className="glass-panel p-4 rounded-xl space-y-3.5">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-1.5">
                      Método de Liquidación Caja
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { key: 'efectivo', label: 'Efectivo', icon: <Coins className="w-3.5 h-3.5 text-[#E8B800]" /> },
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
                              ? 'btn-premium-primary glow-gold border-[#E8B800]'
                              : 'btn-premium-secondary'
                          }`}
                        >
                          {m.icon}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash change dynamic helper */}
                  {metodoPago === 'efectivo' && (
                    <div className="space-y-2 bg-[#F5F1E9]/40 dark:bg-stone-900/40 p-3 rounded-xl border border-stone-200/50 dark:border-stone-850">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-650 dark:text-stone-300">
                        <label className="uppercase text-[9px]">Efectivo Entregado por Cliente</label>
                        {calculatedChange > 0 && (
                          <span className="text-[#22C55E] font-black uppercase text-[9px] animate-pulse">Vuelto Sugerido</span>
                        )}
                      </div>

                      <div className="flex gap-2 items-center">
                        <input 
                          type="number" 
                          placeholder="Ingrese monto ej: $5000"
                          value={montoEntregadoEfectivo}
                          onChange={e => setMontoEntregadoEfectivo(e.target.value)}
                          className="flex-1 p-2 text-xs border border-stone-200 dark:border-stone-800 rounded bg-white dark:bg-stone-950 font-mono font-bold text-stone-800 dark:text-stone-100 focus:outline-none"
                        />
                        {calculatedChange > 0 && (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-[#22C55E] font-mono font-black text-sm">
                            ${calculatedChange.toLocaleString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MercadoPago dynamic QR code placeholder */}
                  {metodoPago === 'mp_qr' && (
                    <div className="bg-teal-50/50 dark:bg-teal-955/20 border border-teal-200 dark:border-teal-900/40 p-4 rounded-xl space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
                        <Smartphone className="w-4 h-4 text-teal-600 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Código QR de Pago MercadoPago</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-stone-900 p-3 rounded-lg border border-teal-150/50 dark:border-teal-900/30">
                        <div className="w-24 h-24 bg-white p-1 rounded-lg border border-stone-250/60 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 100 100" className="w-full h-full text-stone-900">
                            <rect x="0" y="0" width="100" height="100" fill="white" />
                            <rect x="5" y="5" width="25" height="25" fill="black" />
                            <rect x="8" y="8" width="19" height="19" fill="white" />
                            <rect x="12" y="12" width="11" height="11" fill="black" />
                            
                            <rect x="70" y="5" width="25" height="25" fill="black" />
                            <rect x="73" y="8" width="19" height="19" fill="white" />
                            <rect x="77" y="12" width="11" height="11" fill="black" />
                            
                            <rect x="5" y="70" width="25" height="25" fill="black" />
                            <rect x="8" y="73" width="19" height="19" fill="white" />
                            <rect x="12" y="77" width="11" height="11" fill="black" />
                            
                            <rect x="42" y="42" width="16" height="16" fill="black" rx="3" />
                            <rect x="45" y="45" width="10" height="10" fill="white" rx="1.5" />
                            <circle cx="50" cy="50" r="3" fill="#009EE3" />
                            
                            <rect x="35" y="10" width="5" height="15" fill="black" />
                            <rect x="45" y="5" width="10" height="5" fill="black" />
                            <rect x="60" y="15" width="5" height="10" fill="black" />
                            <rect x="10" y="35" width="15" height="5" fill="black" />
                            <rect x="15" y="45" width="5" height="10" fill="black" />
                            <rect x="30" y="30" width="10" height="10" fill="black" />
                            <rect x="35" y="45" width="5" height="5" fill="black" />
                            
                            <rect x="70" y="35" width="15" height="5" fill="black" />
                            <rect x="80" y="45" width="10" height="5" fill="black" />
                            <rect x="85" y="55" width="10" height="10" fill="black" />
                            <rect x="65" y="60" width="5" height="15" fill="black" />
                            <rect x="75" y="70" width="15" height="5" fill="black" />
                            <rect x="70" y="80" width="5" height="10" fill="black" />
                            <rect x="85" y="80" width="10" height="5" fill="black" />
                            
                            <rect x="35" y="65" width="5" height="15" fill="black" />
                            <rect x="45" y="75" width="15" height="5" fill="black" />
                            <rect x="55" y="65" width="5" height="10" fill="black" />
                            <rect x="35" y="85" width="20" height="5" fill="black" />
                          </svg>
                        </div>
                        <div className="flex-1 text-xs text-stone-600 dark:text-stone-300 space-y-1 text-left">
                          <p className="font-extrabold text-[#624A3E] dark:text-[#C8956A]">Código QR de Cobro</p>
                          <p className="text-[10px] leading-relaxed">Presente este código QR al comensal para abonar desde cualquier billetera virtual (MercadoPago, MODO, etc.). El importe de <strong className="font-mono text-emerald-600">${orderBreakdowns.finalTotal.toLocaleString('es-AR')}</strong> se cargará automáticamente al escanear.</p>
                          <span className="inline-block bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-black text-[8px] uppercase tracking-wider mt-1">Sincronizado vía MercadoPago API</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mixed Payment Rows interface */}
                  {metodoPago === 'mixto' && (
                    <div className="space-y-3.5 bg-slate-50 dark:bg-stone-950 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-850 pb-1">
                        <span>Pagos Cargados parcialmente</span>
                        <span className="font-mono text-emerald-800 dark:text-emerald-400">
                          Totaling Queue: ${mixedSum.toLocaleString('es-AR')} / ${orderBreakdowns.finalTotal.toLocaleString('es-AR')}
                        </span>
                      </div>

                      {mixedPayments.length > 0 ? (
                        <div className="space-y-1">
                          {mixedPayments.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 p-2 rounded-lg text-xs font-bold text-stone-700 dark:text-stone-300">
                              <span className="uppercase flex items-center gap-1">
                                <ChevronRight className="w-3.5 h-3.5 text-[#624A3E]" /> {p.metodo}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-stone-900 dark:text-stone-100">${p.monto.toLocaleString('es-AR')}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMixedPayment(idx)}
                                  className="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer border-none bg-transparent"
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
                            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs p-2 rounded-lg text-stone-800 dark:text-stone-200"
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
                              if (mixedMetodoInput === 'efectivo') {
                                setMontoEntregadoEfectivo(e.target.value);
                              }
                            }}
                            className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 text-xs rounded-lg font-mono font-bold text-stone-850 dark:text-stone-200 focus:outline-none"
                          />

                          <button
                            type="submit"
                            className="py-2 px-3 bg-[#624A3E] text-white text-xs font-black rounded-lg cursor-pointer flex items-center gap-1 shrink-0 border-none"
                          >
                            <Plus className="w-3.5 h-3.5" /> Agregar Pago
                          </button>
                        </form>
                      ) : (
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-[10px] p-2 text-center rounded border border-emerald-100 dark:border-emerald-900/30 font-bold">
                          ✓ Saldo completado. Puede finalizar la transacción de cobro.
                        </div>
                      )}

                      {/* Cash change for mixed cash payments */}
                      {mixedPayments.some(p => p.metodo === 'efectivo') && (
                        <div className="bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 flex justify-between items-center text-xs">
                          <span className="text-stone-500 dark:text-stone-400 font-bold block uppercase text-[10px]">Arqueo Cambio Extra (Efectivo Mixto)</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={montoEntregadoEfectivo}
                              onChange={e => setMontoEntregadoEfectivo(e.target.value)}
                              placeholder="Monto entregado"
                              className="p-1.5 border border-stone-200 dark:border-stone-850 rounded text-xs text-stone-800 dark:text-stone-200 font-mono w-24 bg-white dark:bg-stone-950"
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
              </div>

              {/* EMISSION ACTIONS BAR */}
              <div className="md:col-span-5 space-y-4">
                
                <div className="space-y-2">
                  {splitPayerCount > 1 ? (
                    <button
                      onClick={async () => {
                        alert(`Se ha procesado y validado el cobro de la parte #${activePayerIndex + 1} por $${(orderBreakdowns.finalTotal / splitPayerCount).toLocaleString('es-AR')}`);
                        if (activePayerIndex + 1 >= splitPayerCount) {
                          await handleConfirmCheckout();
                        } else {
                          setActivePayerIndex(prev => prev + 1);
                        }
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] active:scale-95 text-white text-xs uppercase tracking-wider font-extrabold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border-none"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Cobrar Parte #{activePayerIndex + 1} de {splitPayerCount} (${(orderBreakdowns.finalTotal / splitPayerCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })})
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmCheckout}
                      className="btn-premium-primary w-full py-3 text-xs uppercase tracking-wider font-extrabold rounded-xl flex items-center justify-center gap-2 glow-gold cursor-pointer"
                    >
                      <CheckCircle className="w-5 h-5 text-[#E8B800]" />
                      Homologar Cobro y Emitir Comprobante - PDF/Térmico (${orderBreakdowns.finalTotal.toLocaleString('es-AR')} {restaurante.moneda})
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={triggerPDFDownloadOnly}
                      className="btn-premium-secondary py-2 text-[10px] uppercase font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#C8956A]" />
                      Descargar PDF Muestra
                    </button>
                    
                    <button
                      onClick={triggerManualPrint}
                      className="btn-premium-secondary py-2 text-[10px] uppercase font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#C8956A]" />
                      Imprimir Ticket / Enviar
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPedidoId(null);
                      setSplitPayerCount(1);
                      setActivePayerIndex(0);
                    }}
                    className="w-full text-center py-2 text-stone-500 hover:text-stone-850 dark:hover:text-stone-200 text-[10px] uppercase font-extrabold cursor-pointer border-none bg-transparent"
                  >
                    ← Volver a Comandas
                  </button>
                </div>

                {/* EPSON TICKET PREVIEW SIMULATOR */}
                <div className="bg-stone-100/40 dark:bg-stone-900/30 border border-stone-200/30 dark:border-stone-800/40 p-4 rounded-xl flex flex-col items-center justify-start">
                  <span className="text-[10px] font-black text-stone-400 dark:text-stone-300 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <Printer className="w-3.5 h-3.5 text-[#E8B800]" /> Simulación de Salida Térmica (80mm)
                  </span>

                  {/* Simulated thermal roll in 3D container */}
                  <div style={{ perspective: 1200 }} className="w-full overflow-hidden">
                    <motion.div
                      key={selectedPedido.id_pedido}
                      initial={{ rotateX: -30, y: -100, opacity: 0, scaleY: 0.1 }}
                      animate={{ rotateX: 0, y: 0, opacity: 1, scaleY: 1 }}
                      transition={{ type: 'spring', damping: 18, stiffness: 70 }}
                      style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d' }}
                      className="w-full bg-white text-stone-800 p-4 shadow-md font-mono text-[9px] leading-relaxed border border-stone-200 relative"
                    >
                    
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
                      <span className="block text-[8px] text-stone-550">{restaurante.telefono}</span>
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

                      {puntosRedimidos > 0 && (
                        <div className="flex justify-between text-indigo-750 font-bold">
                          <span>Puntos Canjeados:</span>
                          <span className="font-mono">-${puntosRedimidos.toLocaleString('es-AR')}</span>
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

                    {/* El QR fiscal real se agrega al comprobante luego de recibir el CAE. */}
                    <div className="text-center pt-2 space-y-1 border-t border-stone-200">
                      <div className="w-14 h-14 bg-stone-50 border border-stone-200 mx-auto flex items-center justify-center relative">
                        <span className="px-1 text-[6px] font-bold text-stone-500 uppercase leading-tight">QR luego de autorización</span>
                      </div>
                      <p className="text-[6.5px] text-stone-400 font-sans leading-tight">
                        Vista previa no fiscal · CAE pendiente
                      </p>
                    </div>

                    <p className="text-[8px] text-center text-stone-500 font-sans mt-2 pt-1 border-t border-dotted border-stone-300">
                      {restaurante.mensajePie}
                    </p>

                    </motion.div>
                  </div>

                  <div className="mt-3 text-[10px] text-stone-500 dark:text-stone-400 max-w-xs text-center font-bold">
                    ✓ El Patrón POS emitirá este ticket y enviará el string compilado en bytes ESC/POS.
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-10 shadow-xs text-center flex flex-col justify-center items-center min-h-[450px]">
              <div className="p-4 bg-[#F5F1E9] dark:bg-stone-900/60 rounded-2xl text-[#624A3E] dark:text-stone-200 mb-4 border dark:border-stone-800">
                <Receipt className="w-10 h-10" />
              </div>
              <h3 className="font-black text-[#624A3E] dark:text-stone-100 text-lg uppercase tracking-tight">
                Terminal de Cobro El Patrón Pro
              </h3>
              <p className="text-stone-500 dark:text-stone-300 text-xs mt-2 max-w-md leading-relaxed font-semibold">
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

      {/* SHIFT OPEN MODAL Dialog */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-stone-955/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1e1b18] rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full p-6 animate-scaleIn space-y-4 shadow-lg font-sans">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 uppercase tracking-tight flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" />
              Apertura de Caja Diaria
            </h3>
            
            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-normal font-medium">
              Por favor, ingrese el saldo inicial físico depositado en el cajón portamonedas para el cambio comercial, y su nombre de operador de caja.
            </p>

            <form onSubmit={handleOpenShift} className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block">Monto Inicial ($ ARS)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setBillCounts({ 20000: 0, 10000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0 });
                      setShowBillCounter(showBillCounter === 'open' ? null : 'open');
                    }}
                    className="text-[9px] font-black uppercase text-[#624A3E] dark:text-[#C8956A] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    🪙 Calculadora de Billetes
                  </button>
                </div>
                <input 
                  type="number"
                  required
                  value={openingCashInput}
                  onChange={e => setOpeningCashInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 font-mono font-extrabold focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50 dark:bg-stone-955 text-stone-900 dark:text-stone-100"
                  placeholder="Ej. 25000"
                />
              </div>

              {showBillCounter === 'open' && (
                <div className="bg-stone-50 dark:bg-stone-950 p-3.5 rounded-xl border border-stone-200 dark:border-stone-850 space-y-3 animate-fadeIn text-left">
                  <span className="text-[9px] font-black text-[#624A3E] dark:text-amber-500 uppercase block">Conteo Físico por Denominación</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {[20000, 10000, 2000, 1000, 500, 200, 100, 50].map(denom => (
                      <div key={denom} className="flex items-center justify-between bg-white dark:bg-stone-900 p-1.5 rounded border border-stone-150 dark:border-stone-800">
                        <span className="font-mono font-bold text-stone-600 dark:text-stone-300">${denom.toLocaleString('es-AR')}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setBillCounts(prev => ({ ...prev, [denom]: Math.max(0, (prev[denom] || 0) - 1) }))}
                            className="w-5 h-5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center rounded cursor-pointer border-none"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={billCounts[denom] || ''}
                            onChange={e => setBillCounts(prev => ({ ...prev, [denom]: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-8 text-center text-xs font-mono font-bold border-none bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setBillCounts(prev => ({ ...prev, [denom]: (prev[denom] || 0) + 1 }))}
                            className="w-5 h-5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center rounded cursor-pointer border-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-stone-150 dark:border-stone-800">
                    <span className="text-[10px] font-black uppercase text-stone-500">Total Arqueado:</span>
                    <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">${billTotal.toLocaleString('es-AR')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpeningCashInput(String(billTotal));
                      setShowBillCounter(null);
                    }}
                    className="w-full py-1.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-[10px] font-black uppercase rounded-lg cursor-pointer transition-colors"
                  >
                    Aplicar Total de Arqueo
                  </button>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block mb-1">Operador Responsable (Cajero)</label>
                <input 
                  type="text"
                  required
                  value={cashierNameInput}
                  onChange={e => setCashierNameInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50 dark:bg-stone-955 text-stone-900 dark:text-stone-100"
                  placeholder="Ej. Sofía Colombo"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-black uppercase rounded-xl border-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer border-none"
                >
                  Confirmar Apertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHIFT CLOSE MODAL Dialog */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-stone-955/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1e1b18] rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full p-6 animate-scaleIn space-y-4 shadow-lg font-sans">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 uppercase tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-stone-900 dark:text-stone-100" />
              Cierre de turno & Conciliación (Arqueo)
            </h3>
            
            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-normal font-medium">
              Al procesar este cierre se sumarán las ventas totales de este turno. Por favor cuente físicamente el dinero de caja e ingréselo a continuación. El sistema computará el descuadre o diferencia automáticamente.
            </p>

            {cajaSession && (
              <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-150 dark:border-stone-850 text-[10px] font-mono space-y-1 text-stone-600 dark:text-stone-400">
                <div className="flex justify-between">
                  <span>Monto inicial:</span>
                  <span>${cajaSession.monto_apertura.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas acumuladas:</span>
                  <span>${cajaSession.monto_ventas.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Caja Chica (Ingresos):</span>
                  <span className="text-emerald-700">${sumIngresosManuales.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Caja Chica (Gastos/Egresos):</span>
                  <span className="text-rose-750">-${sumEgresosManuales.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 dark:text-stone-100 pt-1 border-t border-stone-200 dark:border-stone-800 border-dotted text-xs font-sans">
                  <span>Total Esperado:</span>
                  <span>${cajaEsperadaTotal.toLocaleString('es-AR')}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCloseShift} className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-stone-750 dark:text-stone-300 uppercase block">Monto Real Físico de Arqueo ($ ARS)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setBillCounts({ 20000: 0, 10000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0 });
                      setShowBillCounter(showBillCounter === 'close' ? null : 'close');
                    }}
                    className="text-[9px] font-black uppercase text-[#624A3E] dark:text-[#C8956A] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    🪙 Calculadora de Billetes
                  </button>
                </div>
                <input 
                  type="number"
                  required
                  value={closingPhysicalCashInput}
                  onChange={e => setClosingPhysicalCashInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 font-mono font-extrabold focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50 dark:bg-stone-955 text-stone-900 dark:text-stone-100"
                  placeholder="Ej. 120000"
                />
              </div>

              {showBillCounter === 'close' && (
                <div className="bg-stone-50 dark:bg-stone-955 p-3.5 rounded-xl border border-stone-150 dark:border-stone-850 space-y-3 animate-fadeIn text-left">
                  <span className="text-[9px] font-black text-[#624A3E] dark:text-amber-500 uppercase block">Conteo Físico por Denominación</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {[20000, 10000, 2000, 1000, 500, 200, 100, 50].map(denom => (
                      <div key={denom} className="flex items-center justify-between bg-white dark:bg-stone-900 p-1.5 rounded border border-stone-150 dark:border-stone-800">
                        <span className="font-mono font-bold text-stone-600 dark:text-stone-300">${denom.toLocaleString('es-AR')}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setBillCounts(prev => ({ ...prev, [denom]: Math.max(0, (prev[denom] || 0) - 1) }))}
                            className="w-5 h-5 bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center rounded cursor-pointer border-none"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={billCounts[denom] || ''}
                            onChange={e => setBillCounts(prev => ({ ...prev, [denom]: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-8 text-center text-xs font-mono font-bold border-none bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setBillCounts(prev => ({ ...prev, [denom]: (prev[denom] || 0) + 1 }))}
                            className="w-5 h-5 bg-stone-100 dark:bg-stone-855 hover:bg-stone-200 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center rounded cursor-pointer border-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-stone-150 dark:border-stone-800">
                    <span className="text-[10px] font-black uppercase text-stone-500">Total Arqueado:</span>
                    <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">${billTotal.toLocaleString('es-AR')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClosingPhysicalCashInput(String(billTotal));
                      setShowBillCounter(null);
                    }}
                    className="w-full py-1.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-[10px] font-black uppercase rounded-lg cursor-pointer transition-colors"
                  >
                    Aplicar Total de Arqueo
                  </button>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-stone-750 dark:text-stone-300 uppercase block mb-1">Observaciones Finales</label>
                <textarea 
                  value={closingObservationsInput}
                  onChange={e => setClosingObservationsInput(e.target.value)}
                  className="w-full h-16 text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50 dark:bg-stone-955 text-stone-900 dark:text-stone-100"
                  placeholder="Ex. Todo perfectamente conciliado"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-black uppercase rounded-xl border-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-stone-900 hover:bg-stone-850 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-xs font-black uppercase rounded-xl shadow cursor-pointer border border-[#ddd7ce] dark:border-stone-800"
                >
                  Confirmar Arqueo & Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PETTY CASH MOVEMENT MODAL */}
      {showMovimientoModal && (
        <div className="fixed inset-0 bg-stone-955/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1e1b18] rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full p-6 animate-scaleIn space-y-4 shadow-lg font-sans">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 uppercase tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#624A3E] dark:text-[#C8956A]" />
              Movimiento de Caja Chica
            </h3>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-normal font-medium">
              Registre una entrada o salida de dinero en efectivo de la caja chica para gastos operativos o ingresos extraordinarios.
            </p>

            <form onSubmit={handleRegistrarMovimientoCajaChica} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block mb-1">Tipo</label>
                  <select
                    value={movimientoTipo}
                    onChange={e => setMovimientoTipo(e.target.value as 'ingreso' | 'egreso')}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50 dark:bg-stone-955 text-stone-900 dark:text-stone-100 font-bold"
                  >
                    <option value="egreso">Egreso (Salida / Gasto)</option>
                    <option value="ingreso">Ingreso (Entrada / Cambio)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block mb-1">Monto ($ ARS)</label>
                  <input
                    type="number"
                    required
                    value={movimientoMonto}
                    onChange={e => setMovimientoMonto(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 font-mono font-extrabold focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50 dark:bg-stone-955 text-stone-900 dark:text-stone-100"
                    placeholder="Ej. 1500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block mb-1">Concepto / Justificación</label>
                <input
                  type="text"
                  required
                  value={movimientoConcepto}
                  onChange={e => setMovimientoConcepto(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50 dark:bg-stone-955 text-stone-900 dark:text-stone-100"
                  placeholder="Ej. Compra de perejil / Carga de cambio"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMovimientoModal(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-black uppercase rounded-xl border-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#624A3E] hover:bg-[#523e34] text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer border-none"
                >
                  Registrar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORICAL SHIFTS LIST */}
      <div className="glass-panel p-5 rounded-2xl shadow-xs space-y-4 font-sans">
        <h4 className="text-xs font-black text-stone-800 dark:text-stone-100 uppercase tracking-tight flex items-center gap-1.5 pb-2 border-b border-stone-100 dark:border-stone-800/80">
          <Calendar className="w-4 h-4 text-[#624A3E] dark:text-stone-300" /> Registro de Auditoría de Cierres de Caja Homologados ({sessionInsumos.length})
        </h4>

        {sessionInsumos.length > 0 ? (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {sessionInsumos.map((cs, idx) => {
              const hasDiff = cs.diferencia !== null;
              const hasDiffErr = hasDiff && (cs.diferencia || 0) !== 0;

              return (
                <div key={idx} className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200/60 dark:border-stone-855 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-extrabold text-[#624A3E] dark:text-amber-550 flex items-center gap-1">
                      Cierre de Caja {cs.usuario_cajero}
                    </p>
                    <p className="text-[10px] text-stone-500 font-medium">
                      Apertura: {cs.fecha_apertura} • Cierre: {cs.fecha_cierre || 'En curso'}
                    </p>
                    <p className="text-[10px] font-medium text-stone-600 dark:text-stone-400 italic">
                      Observaciones: "{cs.observaciones}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:text-right shrink-0">
                    <div className="bg-white dark:bg-stone-900 p-2 rounded border border-stone-150 dark:border-stone-800 min-w-[100px] text-center">
                      <span className="text-[8px] text-stone-400 block font-black uppercase">Ventas Turno</span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">${cs.monto_ventas.toLocaleString('es-AR')}</span>
                    </div>

                    <div className="bg-white dark:bg-stone-900 p-2 rounded border border-stone-150 dark:border-stone-800 min-w-[100px] text-center">
                      <span className="text-[8px] text-stone-400 block font-black uppercase">Monto Real</span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">${(cs.monto_real || 0).toLocaleString('es-AR')}</span>
                    </div>

                    {hasDiff && (
                      <div className={`p-2 rounded border min-w-[90px] text-center ${
                        hasDiffErr ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900/30'
                      }`}>
                        <span className="text-[8px] block font-black uppercase">Diferencia</span>
                        <span className="font-mono font-bold">
                          {cs.diferencia && cs.diferencia > 0 ? '+' : ''}{cs.diferencia?.toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedShiftForDetail(cs)}
                      className="px-3 py-2 bg-[#624A3E] hover:bg-[#523e34] dark:bg-[#C8956A] dark:hover:bg-[#b8855a] text-white dark:text-[#8C6239] text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 border-none"
                    >
                      Detalle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-stone-400 italic text-center py-4">No se registran históricos de cierres almacenados.</p>
        )}
      </div>

      {selectedShiftForDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel rounded-[20px] p-6 w-full max-w-2xl shadow-2xl border border-stone-200/40 dark:border-stone-800/40 text-stone-850 dark:text-stone-100 bg-white dark:bg-stone-900 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-stone-200/50 dark:border-stone-800/60 pb-3 mb-4">
              <div>
                <h3 className="font-serif font-black text-lg text-[#624A3E] dark:text-[#C8956A]">Detalle de Turno y Cierre</h3>
                <p className="text-[10px] text-stone-500 font-bold uppercase mt-0.5">ID Sesión: {selectedShiftForDetail.id_cierre}</p>
              </div>
              <button 
                onClick={() => setSelectedShiftForDetail(null)}
                className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 bg-stone-50 dark:bg-stone-950 p-3.5 rounded-xl border border-stone-100 dark:border-stone-850">
                <span className="text-[9px] font-black text-stone-455 text-stone-400 uppercase block">Información General</span>
                <p className="font-bold">Cajero: <span className="font-normal text-stone-700 dark:text-stone-300">{selectedShiftForDetail.usuario_cajero}</span></p>
                <p className="font-bold">Apertura: <span className="font-mono font-normal text-stone-700 dark:text-stone-300">{new Date(selectedShiftForDetail.fecha_apertura).toLocaleString('es-AR')}</span></p>
                <p className="font-bold">Cierre: <span className="font-mono font-normal text-stone-700 dark:text-stone-300">{selectedShiftForDetail.fecha_cierre ? new Date(selectedShiftForDetail.fecha_cierre).toLocaleString('es-AR') : 'SESIÓN ABIERTA'}</span></p>
              </div>

              <div className="space-y-1.5 bg-stone-50 dark:bg-stone-955 p-3.5 rounded-xl border border-stone-100 dark:border-stone-850">
                <span className="text-[9px] font-black text-stone-455 text-stone-400 uppercase block">Arqueo Financiero</span>
                <p className="font-bold">Caja Inicial: <span className="font-mono font-normal text-stone-700 dark:text-stone-300">${selectedShiftForDetail.monto_apertura.toLocaleString('es-AR')}</span></p>
                <p className="font-bold">Ventas Registradas: <span className="font-mono font-normal text-stone-700 dark:text-stone-300">${selectedShiftForDetail.monto_ventas.toLocaleString('es-AR')}</span></p>
                {selectedShiftForDetail.monto_real !== null && (
                  <>
                    <p className="font-bold">Efectivo Físico Arqueado: <span className="font-mono font-normal text-stone-700 dark:text-stone-300">${selectedShiftForDetail.monto_real.toLocaleString('es-AR')}</span></p>
                    <p className="font-bold">Diferencia detectada: <span className={`font-mono font-extrabold ${selectedShiftForDetail.diferencia && selectedShiftForDetail.diferencia < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>${selectedShiftForDetail.diferencia?.toLocaleString('es-AR')}</span></p>
                  </>
                )}
              </div>
            </div>

            {selectedShiftForDetail.registros_totales && (
              <div className="mt-4 bg-stone-50 dark:bg-stone-950 p-3.5 rounded-xl text-xs space-y-2 border border-stone-100 dark:border-stone-850">
                <span className="text-[9px] font-black text-stone-455 text-stone-400 uppercase block">Desglose de Medios de Pago</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                  <div className="bg-white dark:bg-stone-900 p-2 rounded text-center border border-stone-200/50 dark:border-stone-800">
                    <span className="text-[8px] text-stone-400 block uppercase font-sans font-bold">Efectivo</span>
                    <span>${selectedShiftForDetail.registros_totales.efectivo.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-2 rounded text-center border border-stone-200/50 dark:border-stone-800">
                    <span className="text-[8px] text-stone-400 block uppercase font-sans font-bold">Débito</span>
                    <span>${selectedShiftForDetail.registros_totales.debito.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-2 rounded text-center border border-stone-200/50 dark:border-stone-800">
                    <span className="text-[8px] text-stone-400 block uppercase font-sans font-bold">Crédito</span>
                    <span>${selectedShiftForDetail.registros_totales.credito.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-2 rounded text-center border border-stone-200/50 dark:border-stone-800">
                    <span className="text-[8px] text-stone-400 block uppercase font-sans font-bold">Transf.</span>
                    <span>${selectedShiftForDetail.registros_totales.transferencia.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-2 rounded text-center border border-stone-200/50 dark:border-stone-800 col-span-2 sm:col-span-1">
                    <span className="text-[8px] text-stone-400 block uppercase font-sans font-bold">QR / MP</span>
                    <span>${selectedShiftForDetail.registros_totales.mercadopago.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Manual movements table */}
            <div className="mt-4 text-xs space-y-2">
              <span className="text-[9px] font-black text-stone-455 text-stone-400 uppercase block">Movimientos de Caja Chica</span>
              {(selectedShiftForDetail.movimientos_manuales || []).length > 0 ? (
                <div className="border border-stone-200/60 dark:border-stone-800 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-stone-50 dark:bg-stone-955 text-stone-500 font-bold border-b border-stone-200/60 dark:border-stone-850">
                        <th className="py-2 px-3 text-left">Hora</th>
                        <th className="py-2 px-3 text-left">Tipo</th>
                        <th className="py-2 px-3 text-left">Concepto</th>
                        <th className="py-2 px-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedShiftForDetail.movimientos_manuales || []).map((m: any, mIdx: number) => (
                        <tr key={mIdx} className="border-b border-stone-100 dark:border-stone-900 last:border-none hover:bg-stone-50/50 dark:hover:bg-stone-950/30">
                          <td className="py-2 px-3 font-mono text-stone-505 text-stone-500">{new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</td>
                          <td className="py-2 px-3 uppercase font-extrabold" style={{ color: m.tipo === 'ingreso' ? '#10B981' : '#EF4444' }}>{m.tipo}</td>
                          <td className="py-2 px-3 truncate max-w-[200px] text-stone-700 dark:text-stone-300" title={m.concepto}>{m.concepto}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100">${m.monto.toLocaleString('es-AR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[10px] text-stone-400 italic bg-stone-50 dark:bg-stone-950 p-3.5 rounded-xl text-center border border-dashed border-stone-200/60 dark:border-stone-850">No se registraron entradas ni salidas de caja chica.</p>
              )}
            </div>

            {selectedShiftForDetail.observaciones && (
              <div className="mt-4 text-xs space-y-1 bg-amber-500/5 border border-amber-500/25 p-3.5 rounded-xl">
                <span className="text-[9px] font-black text-amber-600 dark:text-amber-450 uppercase block font-sans">Observaciones del Cajero</span>
                <p className="italic text-stone-600 dark:text-stone-300">"{selectedShiftForDetail.observaciones}"</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 pt-4 border-t border-stone-200/50 dark:border-stone-800 mt-5">
              <button
                onClick={() => pdfService.exportCierreCajaPDF(selectedShiftForDetail, restaurante)}
                className="px-4 py-2.5 bg-[#624A3E] hover:bg-[#523e34] dark:bg-[#C8956A] dark:hover:bg-[#b8855a] text-white dark:text-[#8C6239] text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all border-none"
              >
                <Download className="w-4 h-4" /> Exportar PDF
              </button>
              {(selectedShiftForDetail.movimientos_manuales || []).length > 0 && (
                <button
                  onClick={() => handleExportCSV(selectedShiftForDetail)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all border-none"
                >
                  <FileText className="w-4 h-4" /> Exportar CSV
                </button>
              )}
              <button
                onClick={() => setSelectedShiftForDetail(null)}
                className="ml-auto px-4 py-2.5 bg-stone-200 hover:bg-stone-250 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-black uppercase rounded-xl cursor-pointer border-none"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TICKET EMISSION SUCCESS MODAL */}
      {showSuccessModal && successDetails && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1e1b18] rounded-2xl border border-stone-200 dark:border-stone-800 max-w-sm w-full p-6 animate-scaleIn text-center space-y-4 shadow-lg font-sans">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 dark:text-stone-100 uppercase tracking-tight">
                ¡Cobro Exitoso!
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                La mesa ha sido liberada y el comprobante emitido.
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-150 dark:border-stone-850 font-mono text-xs text-stone-700 dark:text-stone-300 space-y-1">
              <div className="flex justify-between">
                <span>Comprobante:</span>
                <span className="font-bold">{successDetails.nro}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cobrado:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">${successDetails.total.toLocaleString('es-AR')}</span>
              </div>
              {successDetails.vuelto > 0 && (
                <div className="flex justify-between border-t border-stone-200 dark:border-stone-800 pt-1 mt-1 text-[#22C55E] font-bold">
                  <span>Vuelto:</span>
                  <span>${successDetails.vuelto.toLocaleString('es-AR')}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#523e34] text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer border-none"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
