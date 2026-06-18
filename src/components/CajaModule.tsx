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
  TipoComprobante,
  FacturaDb,
  PagoDb,
  Cliente
} from '../types';
import { useToast, ToastContainer } from './ToastContainer';
import { useCaja } from '../features/caja/hooks/useCaja';
import { cajaService } from '../services/cajaService';
import { pdfService } from '../services/pdfService';
import { printerService } from '../services/printerService';
import ElPatronLogo from './ElPatronLogo';

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
  const { toast, toasts, removeToast } = useToast();

  const caja = useCaja({
    pedidos,
    productosMenu,
    onFacturarMesa,
    onCambiarEstadoPedido,
    addLog,
    toast
  });

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
  } = caja;

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
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                className="w-full min-h-11 p-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800 font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Razón Social</label>
              <input 
                type="text" 
                value={restaurante.razonSocial} 
                onChange={e => setRestaurante(prev => ({ ...prev, razonSocial: e.target.value }))}
                className="w-full min-h-11 p-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">CUIT Comercial</label>
              <input 
                type="text" 
                value={restaurante.cuit} 
                onChange={e => setRestaurante(prev => ({ ...prev, cuit: e.target.value }))}
                className="w-full min-h-11 p-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Dirección Física</label>
              <input 
                type="text" 
                value={restaurante.direccion} 
                onChange={e => setRestaurante(prev => ({ ...prev, direccion: e.target.value }))}
                className="w-full min-h-11 p-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Teléfono</label>
              <input 
                type="text" 
                value={restaurante.telefono} 
                onChange={e => setRestaurante(prev => ({ ...prev, telefono: e.target.value }))}
                className="w-full min-h-11 p-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Email Soporte factura</label>
              <input 
                type="text" 
                value={restaurante.email} 
                onChange={e => setRestaurante(prev => ({ ...prev, email: e.target.value }))}
                className="w-full min-h-11 p-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Pie de Comprobante</label>
              <input 
                type="text" 
                value={restaurante.mensajePie} 
                onChange={e => setRestaurante(prev => ({ ...prev, mensajePie: e.target.value }))}
                className="w-full min-h-11 p-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setEditRestauranteMode(false)}
                className="w-full min-h-11 py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs uppercase font-black rounded-lg cursor-pointer"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTER SETTINGS MODULE FOR ESC/POS */}
      {showPrinterSettings && (
        <div className="bg-white border border-stone-200 p-4 sm:p-5 rounded-2xl animate-fadeIn space-y-3">
          <div className="flex justify-between items-center border-b border-stone-100 pb-2">
            <h4 className="text-xs sm:text-sm font-black text-stone-800 uppercase flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-[#624A3E]" /> Parámetros de Integración Térmica (ESC/POS)
            </h4>
            <span className="text-[9px] text-[#22C55E] bg-emerald-50 px-2 py-0.5 rounded-full font-bold">API Enlazable</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="sm:col-span-2 md:col-span-1">
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Nombre de Impresora</label>
              <input 
                type="text" 
                value={printerConfig.printerName}
                onChange={e => setPrinterConfig(prev => ({ ...prev, printerName: e.target.value }))}
                className="w-full min-h-11 p-2.5 text-sm border border-stone-200 rounded-lg font-mono text-stone-700"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone-500 block mb-1">Ancho Papel</label>
              <select
                value={printerConfig.paperWidth}
                onChange={e => setPrinterConfig(prev => ({ ...prev, paperWidth: e.target.value as '58mm' | '80mm' }))}
                className="w-full min-h-11 p-2.5 text-sm border border-stone-200 rounded-lg bg-stone-50 font-bold"
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
                className="w-full min-h-11 p-2.5 text-sm border border-stone-200 rounded-lg text-stone-700"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input 
                type="checkbox" 
                id="autoCutCheck" 
                checked={printerConfig.autoCut}
                onChange={e => setPrinterConfig(prev => ({ ...prev, autoCut: e.target.checked }))}
                className="w-5 h-5 accent-[#624A3E]"
              />
              <label htmlFor="autoCutCheck" className="text-[10px] font-bold text-stone-600 block cursor-pointer">Corte Automático</label>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input 
                type="checkbox" 
                id="openDrawerCheck" 
                checked={printerConfig.openDrawer}
                onChange={e => setPrinterConfig(prev => ({ ...prev, openDrawer: e.target.checked }))}
                className="w-5 h-5 accent-[#624A3E]"
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
              className="min-h-10 py-2 px-4 bg-[#624A3E] text-white text-xs font-black uppercase rounded-lg"
            >
              Aplicar Cambios
            </button>
          </div>
        </div>
      )}

      {/* CORE SPLIT SCREEN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        
        {/* LEFT COLUMN: ACTIVE DRAWER & ACTIVE COMMANDS (LG: Span 4) */}
        <div className="lg:col-span-4 space-y-4 lg:space-y-6">
          
          {/* DAILY DRAWER SHIFT COMPONENT (Rule 1) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-black text-stone-400 block tracking-wider">Flujo Contable Diario</span>
                <h3 className="font-extrabold text-stone-900 text-sm md:text-base tracking-tight font-sans">Estado de Caja Diaria</h3>
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

                  <div className="flex justify-between text-xs font-semibold text-stone-600 pt-1 border-t border-stone-100">
                    <span>Monto Inicial:</span>
                    <span className="font-mono text-stone-900">${cajaSession.monto_apertura.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="flex justify-between text-[13px] font-black text-[#624A3E] pt-1 border-t border-stone-100">
                    <span>Ventas registradas:</span>
                    <span className="font-mono">${cajaSession.monto_ventas.toLocaleString('es-AR')}</span>
                  </div>

                  {sumIngresosManuales > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-emerald-600">
                      <span>(+) Ingresos Manuales:</span>
                      <span className="font-mono">${sumIngresosManuales.toLocaleString('es-AR')}</span>
                    </div>
                  )}

                  {sumEgresosManuales > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-rose-600">
                      <span>(-) Egresos Manuales:</span>
                      <span className="font-mono">-${sumEgresosManuales.toLocaleString('es-AR')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-bold text-stone-900 pt-1 font-mono border-t border-stone-100 border-dotted">
                    <span>Arqueo Teórico:</span>
                    <span>${cajaEsperadaTotal.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="flex justify-between text-[11px] font-black text-emerald-700 pt-1 border-t border-emerald-100">
                    <span>Caja esperada:</span>
                    <span className="font-mono">${cajaEsperadaTotal.toLocaleString('es-AR')}</span>
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

                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => {
                      setMovimientoTipo('egreso');
                      setMovimientoMonto('');
                      setMovimientoConcepto('');
                      setShowMovimientoModal(true);
                    }}
                    className="w-full py-2 bg-[#F5F1E9] hover:bg-[#e8dfd8] text-[#624A3E] rounded-xl text-[10px] uppercase font-black transition-all cursor-pointer border border-[#d4b89a] flex items-center justify-center gap-1.5"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Movimiento Caja Chica (+/-)
                  </button>

                  <button
                    onClick={() => pdfService.exportShiftClosePDF({
                      ...cajaSession,
                      movimientos_manuales: movimientosCajaChica
                    })}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[10px] uppercase font-black transition-all cursor-pointer border border-stone-200 flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Reporte X (Parcial PDF)
                  </button>

                  <button
                    onClick={() => {
                      loadCajaState();
                      setClosingPhysicalCashInput('');
                      setClosingObservationsInput('Facturación normal del turno');
                      setShowCloseModal(true);
                    }}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-[10px] uppercase font-black transition-all cursor-pointer shadow-sm border border-[#ddd7ce] flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-300" />
                    Cierre de Turno comercial (Reporte Z)
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
          </div>

          {/* ACTIVE UNBILLED COMMANDS LIST (Rule 2) */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <h4 className="font-black text-stone-800 font-sans tracking-tight text-xs uppercase flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#624A3E]" />
                Comandas en Salón
              </h4>
              <span className="text-[9px] font-bold bg-[#F5F1E9] text-[#624A3E] border border-stone-100 rounded-full px-2 py-0.5 font-mono">
                {activeBills.length} pendientes
              </span>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {activeBills.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-stone-100 rounded-xl bg-stone-50/50">
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
                  const isReady = b.estado_comanda === 'listo' || b.estado_comanda === 'entregado';

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
                          : 'border-stone-200 bg-white hover:bg-stone-50'
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 bg-white rounded-2xl p-4 sm:p-6 border border-stone-200 shadow-sm">
              
              {/* TICKET OPTIONS CONTROLS (MD: Span 7) */}
              <div className="md:col-span-7 space-y-4 font-sans">
                
                {/* Header detail selected */}
                <div className="border-b border-stone-200 pb-3 flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] text-amber-700 font-black uppercase tracking-wider block">Terminal de Liquidación</span>
                    <h3 className="font-extrabold text-stone-900 text-sm md:text-base tracking-tight flex items-center gap-1.5 mt-0.5">
                      Saldando Cuenta: {selectedPedido.numero_mesa} ({selectedPedido.mozo})
                    </h3>
                  </div>

                  <span className="text-[10px] text-stone-500 font-mono bg-stone-100 px-2 py-0.5 rounded font-black">
                    Nro Trans: EP-{selectedPedido.id_pedido}
                  </span>
                </div>

                {/* Group categories of order items (Rule 3) */}
                <div className="bg-stone-50 border border-stone-200/60 p-3 sm:p-3.5 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Items del pedido</h4>
                  
                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 text-xs sm:text-sm">
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
                                <div className="flex items-center gap-2 min-w-0">
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
                                      className="w-4 h-4 accent-[#624A3E] shrink-0"
                                    />
                                  )}
                                  <span className="truncate">{it.cantidad}x {it.nombre}</span>
                                </div>
                                <span className="font-mono text-stone-900 shrink-0">
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
                      className="text-[10px] font-extrabold uppercase text-[#624A3E] hover:underline flex items-center gap-1 cursor-pointer"
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-stone-500 block mb-0.5">Tipo de Factura</label>
                      <select
                        value={tipoComprobante}
                        onChange={e => setTipoComprobante(e.target.value as TipoComprobante)}
                        className="w-full min-h-11 text-sm p-2 border border-slate-200 rounded bg-white text-stone-700 font-bold"
                      >
                        <option value="factura_b">Factura B (Cons. Final)</option>
                        <option value="factura_a">Factura A (Inscripto)</option>
                        <option value="ticket_interno">Ticket Interno (Mesa)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold uppercase text-stone-500 block mb-0.5">DNI/CUIT Cliente</label>
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
                        className="w-full min-h-11 text-sm p-2 border border-slate-200 rounded bg-white text-stone-700 font-mono"
                        placeholder="Ej. 20-38449102-1"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold uppercase text-stone-500 block mb-0.5">Razón Social Cliente</label>
                      <input 
                        type="text" 
                        value={nombreCliente}
                        onChange={e => setNombreCliente(e.target.value)}
                        className="w-full min-h-11 text-sm p-2 border border-slate-200 rounded bg-white text-stone-700"
                        placeholder="Ej. José de San Martín"
                      />
                    </div>
                  </div>
                </div>

                {/* FIDELIZACION Y CLUB EL PATRON */}
                <div className="bg-[#fcfaf7] border border-[#e8dfd8] p-3 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-black text-[#624A3E] uppercase tracking-widest flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#624A3E]" /> Fidelización de Clientes (Club El Patrón)
                  </h4>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={dniCuitBuscar}
                      onChange={e => setDniCuitBuscar(e.target.value)}
                      placeholder="Buscar DNI/CUIT de cliente"
                      className="flex-1 min-h-11 text-sm p-2 border border-slate-200 rounded bg-white text-stone-700 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleBuscarCliente}
                      className="px-3 min-h-11 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-black rounded-lg cursor-pointer transition-colors"
                    >
                      Buscar
                    </button>
                  </div>

                  {selectedCliente ? (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200/50 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-emerald-900">{selectedCliente.nombre}</p>
                          <p className="text-[10px] text-stone-500 font-mono">{selectedCliente.dni_cuit}</p>
                          <p className="text-[10px] text-[#624A3E] font-bold">Puntos Disponibles: {selectedCliente.puntos} (ARS ${selectedCliente.puntos})</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCliente(null);
                            setPuntosRedimidos(0);
                            setDniCuitBuscar('');
                          }}
                          className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                        >
                          Deseleccionar
                        </button>
                      </div>

                      {selectedCliente.puntos > 0 && (
                        <div className="flex items-center gap-2 pt-1 border-t border-emerald-100">
                          <label className="text-[9px] font-bold text-stone-600 uppercase">Canjear Puntos:</label>
                          <input 
                            type="number"
                            min="0"
                            max={Math.min(selectedCliente.puntos, orderBreakdowns.finalTotal + puntosRedimidos)}
                            value={puntosRedimidos || ''}
                            onChange={e => {
                              const pts = Math.max(0, parseInt(e.target.value) || 0);
                              const limit = Math.min(selectedCliente.puntos, orderBreakdowns.finalTotal + puntosRedimidos);
                              if (pts > limit) {
                                setPuntosRedimidos(limit);
                                toast.warning(`El límite de canje para esta cuenta es de ${limit} puntos.`);
                              } else {
                                setPuntosRedimidos(pts);
                              }
                            }}
                            className="w-20 p-1 border border-stone-300 rounded font-mono text-xs text-stone-800 text-center"
                          />
                          <span className="text-[10px] text-stone-500 font-medium">1 pt = ARS $1</span>
                        </div>
                      )}
                    </div>
                  ) : dniCuitBuscar.trim() !== '' && (
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                      <p className="text-[10px] text-stone-500 font-bold italic">Cliente no registrado. Registrar comensal:</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input 
                          type="text" 
                          placeholder="Nombre Completo"
                          value={nombreNuevoCliente}
                          onChange={e => setNombreNuevoCliente(e.target.value)}
                          className="p-1.5 border border-stone-200 rounded text-xs bg-white text-stone-700"
                        />
                        <input 
                          type="email" 
                          placeholder="Email"
                          value={emailNuevoCliente}
                          onChange={e => setEmailNuevoCliente(e.target.value)}
                          className="p-1.5 border border-stone-200 rounded text-xs bg-white text-stone-700"
                        />
                        <input 
                          type="text" 
                          placeholder="Teléfono"
                          value={telNuevoCliente}
                          onChange={e => setTelNuevoCliente(e.target.value)}
                          className="p-1.5 border border-stone-200 rounded text-xs bg-white text-stone-700"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleRegistrarCliente}
                        className="w-full py-1.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-[10px] font-black uppercase rounded transition-colors"
                      >
                        Registrar y Seleccionar Cliente
                      </button>
                    </div>
                  )}
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
                        className="touch-target w-9 h-9 bg-stone-50 hover:bg-stone-100 rounded text-stone-700 font-bold flex items-center justify-center cursor-pointer active:scale-90"
                      >
                        -
                      </button>
                      <span className="text-sm font-mono font-black text-stone-900">{splitPayerCount} pax</span>
                      <button
                        onClick={() => {
                          setSplitPayerCount(prev => prev + 1);
                          setActivePayerIndex(0);
                        }}
                        className="touch-target w-9 h-9 bg-stone-50 hover:bg-stone-100 rounded text-stone-700 font-bold flex items-center justify-center cursor-pointer active:scale-90"
                      >
                        +
                      </button>
                    </div>

                    {splitPayerCount > 1 && (
                      <div className="text-[10px] sm:text-xs text-stone-600 leading-normal bg-white p-2 rounded border border-stone-100 space-y-0.5 text-center">
                        <p className="font-bold">Monto partes iguales:</p>
                        <p className="text-emerald-700 text-sm font-black font-mono">
                          ${(orderBreakdowns.finalTotal / splitPayerCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })} c/u
                        </p>
                        <span className="bg-[#624A3E]/10 text-[#624A3E] px-1.5 py-0.5 rounded font-extrabold text-[9px] tracking-wider uppercase inline-block">
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
                        <label className="text-[9px] font-bold text-stone-500 block mb-0.5">Manual Desc %</label>
                        <select
                          value={descuentoPorcentaje}
                          onChange={e => setDescuentoPorcentaje(parseInt(e.target.value) || 0)}
                          className="w-full min-h-11 text-sm p-2 border border-stone-200 rounded bg-white font-bold"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="10">10%</option>
                          <option value="15">15%</option>
                          <option value="20">20%</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-stone-500 block mb-0.5">Propina %</label>
                        <select
                          value={propinaPorcentaje}
                          onChange={e => setPropinaPorcentaje(parseInt(e.target.value) || 0)}
                          className="w-full min-h-11 text-sm p-2 border border-stone-200 rounded bg-white font-bold"
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
                <div className="bg-white border border-stone-200 p-3 sm:p-4 rounded-xl space-y-3.5">
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
                          className={`min-h-11 py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-start gap-2 border transition-all cursor-pointer ${
                            metodoPago === m.key 
                              ? 'bg-[#624A3E] text-white border-[#624A3E] shadow-sm'
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
                      
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <input 
                          type="number"
                          inputMode="decimal"
                          value={montoEntregadoEfectivo}
                          onChange={e => setMontoEntregadoEfectivo(e.target.value)}
                          placeholder="Monto entregado"
                          className="min-h-11 p-2 border border-stone-200 rounded-lg text-sm font-mono font-black text-stone-800 w-full sm:w-28 bg-white"
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
                    <div className="space-y-3.5 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-stone-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] font-black uppercase text-stone-500 border-b border-stone-200 pb-1 gap-1">
                        <span>Pagos Cargados parciamente</span>
                        <span className="font-mono text-emerald-800">
                          Total: ${mixedSum.toLocaleString('es-AR')} / ${orderBreakdowns.finalTotal.toLocaleString('es-AR')}
                        </span>
                      </div>

                      {mixedPayments.length > 0 ? (
                        <div className="space-y-1">
                          {mixedPayments.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-stone-100 p-2 rounded-lg text-xs sm:text-sm font-bold text-stone-700">
                              <span className="uppercase flex items-center gap-1">
                                <ChevronRight className="w-3.5 h-3.5 text-[#624A3E]" /> {p.metodo}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-stone-900">${p.monto.toLocaleString('es-AR')}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMixedPayment(idx)}
                                  className="touch-target w-8 h-8 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center justify-center"
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
                            className="min-h-11 bg-white border text-sm p-2 rounded-lg"
                          >
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta Crédito</option>
                            <option value="transferencia">Transferencia/Deb.</option>
                            <option value="mp_qr">MercadoPago QR</option>
                          </select>

                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Monto"
                            value={mixedMontoInput}
                            onChange={e => {
                              setMixedMontoInput(e.target.value);
                              if (mixedMetodoInput === 'efectivo') {
                                setMontoEntregadoEfectivo(e.target.value);
                              }
                            }}
                            className="min-h-11 flex-1 bg-white border p-2 text-sm rounded-lg font-mono font-bold"
                          />

                          <button
                            type="submit"
                            className="min-h-11 py-2 px-3 bg-[#624A3E] text-white text-xs font-black rounded-lg cursor-pointer flex items-center justify-center gap-1 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" /> Agregar
                          </button>
                        </form>
                      ) : (
                        <div className="bg-emerald-50 text-emerald-800 text-[10px] p-2 text-center rounded border border-emerald-100 font-bold">
                          ✓ Saldo completado. Puede finalizar la transacción de cobro.
                        </div>
                      )}

                      {/* Cash change for mixed cash payments */}
                      {mixedPayments.some(p => p.metodo === 'efectivo') && (
                        <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2">
                          <span className="text-stone-500 font-bold block uppercase text-[10px]">Arqueo Cambio Extra (Efectivo Mixto)</span>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input 
                              type="number" 
                              inputMode="decimal"
                              value={montoEntregadoEfectivo}
                              onChange={e => setMontoEntregadoEfectivo(e.target.value)}
                              placeholder="Monto entregado"
                              className="min-h-11 p-1.5 border border-stone-200 rounded text-sm text-stone-800 font-mono w-full sm:w-24"
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
                        toast.success(`Cobro de la parte #${activePayerIndex + 1} procesado por ${(orderBreakdowns.finalTotal / splitPayerCount).toLocaleString('es-AR')}`);
                        if (activePayerIndex + 1 >= splitPayerCount) {
                          await handleConfirmCheckout();
                        } else {
                          setActivePayerIndex(prev => prev + 1);
                        }
                      }}
                      className="w-full min-h-11 py-3 bg-[#22C55E] hover:bg-[#16a34a] text-white text-sm uppercase tracking-wider font-extrabold rounded-xl transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Cobrar Parte #{activePayerIndex + 1} de {splitPayerCount} (${(orderBreakdowns.finalTotal / splitPayerCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })})
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmCheckout}
                      className="w-full min-h-11 py-3 bg-[#624A3E] hover:bg-[#503C32] text-white text-sm uppercase tracking-wider font-extrabold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5 text-amber-300" />
                      Cobrar y Emitir Comprobante (${orderBreakdowns.finalTotal.toLocaleString('es-AR')} {restaurante.moneda})
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={triggerPDFDownloadOnly}
                      className="min-h-10 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] uppercase font-extrabold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar PDF
                    </button>
                    
                    <button
                      onClick={triggerManualPrint}
                      className="min-h-10 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] uppercase font-extrabold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir Ticket
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPedidoId(null);
                      setSplitPayerCount(1);
                      setActivePayerIndex(0);
                    }}
                    className="w-full min-h-10 text-center py-2 text-stone-500 hover:text-stone-800 text-xs uppercase font-extrabold cursor-pointer"
                  >
                    ← Volver a Comandas
                  </button>
                </div>

              </div>

              {/* EPSON TICKET PREVIEW SIMULATOR (MD: Span 5) */}
              <div className="md:col-span-5 bg-stone-100/60 border border-stone-200/50 p-3 sm:p-4 rounded-xl flex flex-col items-center justify-start">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> Simulación Salida Térmica (80mm)
                </span>

                <div className="w-full bg-white text-stone-800 p-3 sm:p-4 shadow-sm font-mono text-[9px] sm:text-[10px] leading-relaxed border border-stone-200 relative">
                  
                  <div className="absolute top-0 inset-x-0 h-1 bg-stone-300 flex overflow-hidden">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 shrink-0 bg-stone-200 rotate-45 transform -translate-y-0.5 border border-stone-200" />
                    ))}
                  </div>

                  <div className="text-center pt-2.5 pb-1 border-b border-dotted border-stone-300 space-y-0.5">
                    <ElPatronLogo className="w-10 h-10 mx-auto mb-1.5" />
                    <span className="font-bold text-[10px] sm:text-xs block uppercase tracking-tight">{restaurante.nombreComercial}</span>
                    <span className="block text-[8px] sm:text-[9px] text-stone-500">Raz. Soc: {restaurante.razonSocial}</span>
                    <span className="block text-[8px] sm:text-[9px] text-stone-500">CUIT: {restaurante.cuit}</span>
                    <span className="block text-[8px] sm:text-[9px] text-stone-500">{restaurante.direccion}</span>
                    <span className="block text-[8px] sm:text-[9px] text-stone-500">Telf: {restaurante.telefono}</span>
                  </div>

                  <div className="py-2 border-b border-dotted border-stone-300 space-y-0.5 text-[8.5px] sm:text-[9px]">
                    <p>COMPROB.: {tipoComprobante === 'factura_b' ? 'FACTURA B-CONS. FINAL' : (tipoComprobante === 'factura_a' ? 'FACTURA A-RESP. INS.' : 'TICKET INTERNO')}</p>
                    <p>CLIENTE: {nombreCliente.toUpperCase()}</p>
                    <p>CUIT/DNI: {cuitCliente}</p>
                    <p>FECHA: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs</p>
                    <p>MESA: {selectedPedido.numero_mesa.toUpperCase()} • MOZO: {selectedPedido.mozo}</p>
                    <p>CAJERO: {(cajaSession?.usuario_cajero || 'SIN TURNO').toUpperCase()}</p>
                  </div>

                  <div className="py-2 border-b border-dotted border-stone-300 space-y-1">
                    <div className="flex justify-between font-bold text-[9px] sm:text-[10px]">
                      <span>DESCRIPCIÓN / CANT.</span>
                      <span>TOTAL ($)</span>
                    </div>

                    {selectedPedido.items.map((it, idx) => {
                      const pm = productosMenu.find(p => p.id_producto === it.id_producto);
                      const unit = pm ? pm.precio_venta : 0;
                      return (
                        <div key={idx} className="flex justify-between font-sans">
                          <span className="truncate pr-2">{it.cantidad}x {it.nombre}</span>
                          <span className="font-mono">${(it.cantidad * unit).toLocaleString('es-AR')}</span>
                        </div>
                      );
                    })}
                  </div>

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
            <div className="bg-white rounded-2xl p-10 border border-stone-200 shadow-sm text-center flex flex-col justify-center items-center min-h-[450px]">
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
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-stone-200 max-w-md w-full p-5 sm:p-6 animate-scaleIn space-y-4 shadow-lg font-sans">
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
                  inputMode="decimal"
                  required
                  value={openingCashInput}
                  onChange={e => setOpeningCashInput(e.target.value)}
                  className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 font-mono font-extrabold focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50"
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
                  className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#624A3E] focus:outline-none"
                  placeholder="Ej. Sofía Colombo"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="w-1/2 min-h-11 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-black uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 min-h-11 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer"
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
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-stone-200 max-w-md w-full p-5 sm:p-6 animate-scaleIn space-y-4 shadow-lg font-sans">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-stone-900" />
              Cierre de turno & Conciliación (Arqueo)
            </h3>
            
            <p className="text-[11px] text-stone-500 leading-normal font-medium">
              Al procesar este cierre se sumarán las ventas totales de este turno. Por favor cuente físicamente el dinero de caja e ingréselo a continuación. El sistema computará el descuadre o diferencia automáticamente.
            </p>

            {cajaSession && (
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-[10px] font-mono space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>Monto inicial:</span>
                  <span>${cajaSession.monto_apertura.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas acumuladas:</span>
                  <span>${cajaSession.monto_ventas.toLocaleString('es-AR')}</span>
                </div>
                {sumIngresosManuales > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>(+) Ingresos Manuales:</span>
                    <span>${sumIngresosManuales.toLocaleString('es-AR')}</span>
                  </div>
                )}
                {sumEgresosManuales > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>(-) Egresos Manuales:</span>
                    <span>-${sumEgresosManuales.toLocaleString('es-AR')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200 border-dotted text-xs font-sans">
                  <span>Total Esperado:</span>
                  <span>${cajaEsperadaTotal.toLocaleString('es-AR')}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCloseShift} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Monto Real Físico de Arqueo ($ ARS)</label>
                <input 
                  type="number"
                  inputMode="decimal"
                  required
                  value={closingPhysicalCashInput}
                  onChange={e => setClosingPhysicalCashInput(e.target.value)}
                  className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 font-mono font-extrabold focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50"
                  placeholder="Ej. 120000"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Observaciones Finales</label>
                <textarea 
                  value={closingObservationsInput}
                  onChange={e => setClosingObservationsInput(e.target.value)}
                  className="w-full h-16 text-sm p-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#624A3E] focus:outline-none"
                  placeholder="Ex. Todo perfectamente conciliado"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="w-1/2 min-h-11 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-black uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 min-h-11 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer border border-[#ddd7ce]"
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
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-stone-200 max-w-md w-full p-5 sm:p-6 animate-scaleIn space-y-4 shadow-lg font-sans">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#624A3E]" />
              Movimiento de Caja Chica
            </h3>
            
            <p className="text-[11px] text-stone-500 leading-normal font-medium">
              Registre un ingreso o egreso de efectivo manual (ej: compras de verdulería de urgencia o cambio adicional recibido).
            </p>

            <form onSubmit={handleRegistrarMovimientoCajaChica} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Tipo de Movimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovimientoTipo('egreso')}
                    className={`min-h-11 py-2 px-3 text-xs font-black uppercase rounded-lg border transition-all cursor-pointer ${
                      movimientoTipo === 'egreso'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    Egreso (Salida)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovimientoTipo('ingreso')}
                    className={`min-h-11 py-2 px-3 text-xs font-black uppercase rounded-lg border transition-all cursor-pointer ${
                      movimientoTipo === 'ingreso'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    Ingreso (Entrada)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Monto ($ ARS)</label>
                <input 
                  type="number"
                  inputMode="decimal"
                  required
                  value={movimientoMonto}
                  onChange={e => setMovimientoMonto(e.target.value)}
                  className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 font-mono font-extrabold focus:ring-1 focus:ring-[#624A3E] focus:outline-none bg-stone-50"
                  placeholder="Ej. 1500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Concepto / Motivo</label>
                <input 
                  type="text"
                  required
                  value={movimientoConcepto}
                  onChange={e => setMovimientoConcepto(e.target.value)}
                  className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#624A3E] focus:outline-none"
                  placeholder="Ej. Compra hielo de urgencia"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMovimientoModal(false)}
                  className="w-1/2 min-h-11 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-black uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 min-h-11 py-2.5 bg-[#624A3E] hover:bg-[#523A2E] text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer border-0"
                >
                  Registrar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORICAL SHIFTS LIST */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4 font-sans">
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
                    <div className="bg-white p-2 rounded border border-stone-100 min-w-[100px] text-center">
                      <span className="text-[8px] text-stone-400 block font-black uppercase">Ventas Turno</span>
                      <span className="font-mono font-bold text-stone-900">${cs.monto_ventas.toLocaleString('es-AR')}</span>
                    </div>

                    <div className="bg-white p-2 rounded border border-stone-100 min-w-[100px] text-center">
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

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const movs = await cajaService.listMovimientosCajaChica(cs.id_cierre);
                          pdfService.exportShiftClosePDF({ ...cs, movimientos_manuales: movs });
                        } catch {
                          pdfService.exportShiftClosePDF(cs);
                        }
                      }}
                      className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors flex items-center justify-center cursor-pointer active:scale-95 border border-stone-200"
                      title="Descargar Arqueo PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
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

      {/* SUCCESS MODAL FOR TRANSACTION POLISH (Step 3) */}
      {showSuccessModal && successDetails && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-sm w-full p-6 text-center space-y-4 shadow-xl relative">
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100 animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-stone-900 uppercase tracking-tight">Cobro Completado</h3>
              <p className="text-xs text-stone-500 font-semibold">Comprobante Nº: {successDetails.nro}</p>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-2 font-mono text-sm">
              <div className="flex justify-between text-stone-600">
                <span className="text-xs font-sans font-bold">Monto Cobrado:</span>
                <span className="font-extrabold text-[#624A3E]">${successDetails.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              {successDetails.vuelto > 0 && (
                <div className="flex justify-between text-emerald-600 pt-2 border-t border-stone-200 border-dotted">
                  <span className="text-xs font-sans font-bold">Vuelto Entregado:</span>
                  <span className="font-extrabold">${successDetails.vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full min-h-11 py-2.5 bg-[#624A3E] hover:bg-[#523A2E] text-white text-xs font-black uppercase rounded-xl shadow transition-all cursor-pointer border-0"
            >
              Cerrar y Continuar
            </button>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
