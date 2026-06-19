import React from 'react';
import { useToast, ToastContainer } from './ToastContainer';
import { 
  Database, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Sliders, 
  Search, 
  AlertTriangle,
  Beaker,
  Info,
  Layers,
  Truck,
  ArrowUpDown,
  Download,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { Insumo, ProductoMenu, RecetaEscandallo, Merma, Proveedor } from '../types';
import { useInventory, getInsumoDeposito } from '../features/inventario/hooks/useInventory';
import { proveedoresService } from '../services/proveedoresService';
import { jsPDF } from 'jspdf';

interface InventoryModuleProps {
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  mermas: Merma[];
  onRegistrarMerma: (idInsumo: string, cantidad: number, motivo: Merma['motivo']) => void;
  onRestockInsumo: (idInsumo: string, cantidad: number) => void;
  onRestockTodo: () => void;
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', mensaje: string) => void;
}

export default function InventoryModule({
  insumos,
  productosMenu,
  recetas,
  mermas,
  onRegistrarMerma,
  onRestockInsumo,
  onRestockTodo,
  addLog
}: InventoryModuleProps) {
  const { toasts, toast, dismissToast } = useToast();
  const [proveedores, setProveedores] = React.useState<Proveedor[]>([]);

  React.useEffect(() => {
    proveedoresService.list().then(data => {
      if (data && data.length > 0) {
        setProveedores(data);
      } else {
        setProveedores([
          { id_proveedor: 'prov_1', nombre: 'Frigorífico Central Sur S.A.', contacto: 'Federico Balestra', telefono: '+54 11 4488-2993', categoria: 'carnes', correo: 'pedidos@frigorificosursas.com', tiempo_entrega_dias: 1 },
          { id_proveedor: 'prov_2', nombre: 'Distribuidora Agrícola Verde Fresco', contacto: 'Laura Benítez', telefono: '+54 9 11 3998-2831', categoria: 'verduras', correo: 'ventas@verdefrescodist.com', tiempo_entrega_dias: 1 },
          { id_proveedor: 'prov_3', nombre: 'Bebidas Unidas S.R.L. Bodegas', contacto: 'Esteban Rutini', telefono: '+54 11 5003-8822', categoria: 'bebidas', correo: 'erutini@bebidasunidas.com', tiempo_entrega_dias: 2 },
          { id_proveedor: 'prov_4', nombre: 'Almacén Mayorista El Trébol', contacto: 'Jorge Alvarenga', telefono: '+54 11 4055-1212', categoria: 'viveres', correo: 'j.alvarenga@trebolsecos.com.ar', tiempo_entrega_dias: 3 },
          { id_proveedor: 'prov_5', nombre: 'Envases & Descartables Oeste', contacto: 'Damián Sabor', telefono: '+54 9 11 6554-1010', categoria: 'descartables', correo: 'dsabor@envasesoeste.com', tiempo_entrega_dias: 2 },
        ]);
      }
    }).catch(() => {});
  }, []);

  const inventory = useInventory({
    insumos,
    productosMenu,
    recetas,
    mermas,
    onRegistrarMerma,
    onRestockInsumo,
    addLog
  });

  const {
    activeSubTab,
    setActiveSubTab,
    filterCategory,
    setFilterCategory,
    filterDeposito,
    setFilterDeposito,
    inventorySearch,
    setInventorySearch,
    selectedEscandalloDishId,
    setSelectedEscandalloDishId,
    simulatePortions,
    setSimulatePortions,
    mermaInsumoId,
    setMermaInsumoId,
    mermaCantidad,
    setMermaCantidad,
    mermaMotivo,
    setMermaMotivo,
    ajusteInsumoId,
    setAjusteInsumoId,
    ajusteCantidad,
    setAjusteCantidad,
    ajusteOperacion,
    setAjusteOperacion,
    ajusteMotivo,
    setAjusteMotivo,
    selectedProveedor,
    setSelectedProveedor,
    compraInsumoId,
    setCompraInsumoId,
    compraCantidad,
    setCompraCantidad,
    compraCostoUnitarioInput,
    setCompraCostoUnitarioInput,
    purchaseCart,
    setPurchaseCart,
    comprasHistorial,
    setComprasHistorial,
    costHistory,
    isLoadingHistory,
    movimientosLocales,
    setMovimientosLocales,
    filteredInsumos,
    selectedProduct,
    selectedProductIngredients,
    maxYieldPortions,
    submitMermaForm,
    submitAjusteForm,
    handleAddToPurchaseCart,
    handleRemoveFromPurchaseCart,
    handleSuggestMissingStock,
    handleConfirmPurchaseOrder,
    handleDescargarMovimientosCSV
  } = inventory;

  const totalValuation = React.useMemo(() => {
    return insumos.reduce((sum, ins) => sum + (ins.stock_actual * (ins.costo_unitario ?? 0)), 0);
  }, [insumos]);

  const categoryValuation = React.useMemo(() => {
    const valMap: Record<string, number> = {};
    insumos.forEach(ins => {
      const cat = ins.categoria || 'otros';
      const itemVal = ins.stock_actual * (ins.costo_unitario ?? 0);
      valMap[cat] = (valMap[cat] || 0) + itemVal;
    });
    return Object.entries(valMap).map(([category, value]) => ({ category, value }));
  }, [insumos]);

  const handleExportPurchaseOrderPDF = async () => {
    if (purchaseCart.length === 0) {
      toast.warning("El carrito de compras está vacío");
      return;
    }
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Banner superior
      doc.setFillColor(98, 74, 62); // Brown #624A3E
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("EL PATRON", 15, 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("GESTOR GASTRONOMICO & BODEGA", 15, 28);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("ORDEN DE COMPRA Y RESTOCK", 120, 22);

      const ocId = `OC-${Math.floor(Math.random() * 300) + 2400}`;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Ref: ${ocId}`, 120, 28);

      // Info del Proveedor y Fecha
      doc.setTextColor(35, 31, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("PROVEEDOR SELECCIONADO:", 15, 50);

      doc.setFont("helvetica", "normal");
      doc.text(selectedProveedor || 'Proveedor General S.A.', 15, 56);
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-AR')}`, 15, 62);

      // Tabla de items
      let startY = 75;
      doc.setFillColor(245, 241, 233);
      doc.rect(15, startY, 180, 8, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Insumo / Descripción", 18, startY + 5.5);
      doc.text("Cantidad", 90, startY + 5.5);
      doc.text("Costo Unitario", 130, startY + 5.5);
      doc.text("Subtotal", 170, startY + 5.5);

      doc.setFont("helvetica", "normal");
      let currentY = startY + 8;
      let total = 0;

      purchaseCart.forEach((item) => {
        const ins = insumos.find(i => i.id_insumo === item.id_insumo);
        const name = ins ? ins.nombre : item.id_insumo;
        const qty = `${item.cantidad} ${ins?.unidad_medida ?? ''}`;
        const unitCost = `$${item.costo_unitario.toLocaleString('es-AR')}`;
        const subtotal = item.cantidad * item.costo_unitario;
        total += subtotal;

        // Linea divisoria
        doc.line(15, currentY, 195, currentY);

        doc.text(name, 18, currentY + 6);
        doc.text(qty, 90, currentY + 6);
        doc.text(unitCost, 130, currentY + 6);
        doc.text(`$${subtotal.toLocaleString('es-AR')}`, 170, currentY + 6);

        currentY += 8;
      });

      doc.line(15, currentY, 195, currentY);

      // Total
      currentY += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TOTAL ESTIMADO:", 120, currentY);
      doc.setFontSize(12);
      doc.setTextColor(22, 101, 52); // Emerald 800
      doc.text(`$${total.toLocaleString('es-AR')}`, 170, currentY);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(120, 113, 108);
      doc.text("Este documento sirve como remito de solicitud de cotización interna de El Patrón.", 15, 280);

      doc.save(`Orden_Compra_El_Patron_${ocId}.pdf`);
      toast.success("Orden de Compra exportada a PDF correctamente.");
    } catch (e) {
      console.error(e);
      toast.error("Error al exportar la Orden de Compra a PDF.");
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="inventory-module-container">
      
      {/* LEFT AREA: Sub-navigation & Inventory Stats (Column Span 3) */}
      <div className="xl:col-span-3 space-y-5">
        
        {/* Navigation block */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-1">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans px-2 mb-2">
            Módulo Inventario
          </h4>
          <button
            onClick={() => setActiveSubTab('deposito')}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-black font-sans text-left flex items-center justify-between transition-all cursor-pointer ${
              activeSubTab === 'deposito'
                ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/20 border border-[#5d3a2e]'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Depósitos y Bodega
            </span>
            {insumos.filter(i => i.stock_actual <= i.stock_minimo).length > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                {insumos.filter(i => i.stock_actual <= i.stock_minimo).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('escandallo')}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-black font-sans text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'escandallo'
                ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/20 border border-[#5d3a2e]'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Beaker className="w-4 h-4 text-amber-500" />
            Recetas y Fórmulas
          </button>

          <button
            onClick={() => setActiveSubTab('compras')}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-black font-sans text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'compras'
                ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/20 border border-[#5d3a2e]'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4 text-emerald-500" />
            Proveedores y Compras
          </button>

          <button
            onClick={() => setActiveSubTab('movimientos')}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-black font-sans text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'movimientos'
                ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/20 border border-[#5d3a2e]'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ArrowUpDown className="w-4 h-4 text-amber-500" />
            Historial de Movimientos
          </button>

          <button
            onClick={() => setActiveSubTab('precios')}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-black font-sans text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'precios'
                ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/20 border border-[#5d3a2e]'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <DollarSign className="w-4 h-4 text-[#EF4444]" />
            Historial de Precios
          </button>
        </div>

        {/* Global actions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            Operaciones Rápidas
          </h5>
          <button
            onClick={onRestockTodo}
            className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reabastecer todo (Demo)
          </button>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] text-slate-500 leading-snug font-sans">
            <Info className="w-4 h-4 text-slate-400 mb-1" />
            Utilice las fichas secundarias para asentar ingresos por lotes de proveedores ó auditar egresos en el historial exportable.
          </div>
        </div>

        {/* Valorización de Inventario (Kardex) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <h5 className="text-xs font-black text-[#624A3E] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            📊 Valorización de Inventario
          </h5>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Capital Total en Stock</span>
            <p className="text-xl font-mono font-black text-slate-900">
              ${totalValuation.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Desglose de Capital</span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {categoryValuation.map((cat, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px] font-sans">
                  <span className="capitalize text-slate-500 font-medium">{cat.category}</span>
                  <span className="font-mono font-bold text-slate-800">${cat.value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE (Column Span 9) */}
      <div className="xl:col-span-9 space-y-6">

        {/* WORKSPACE A: DEPOSITO & STOCK LIST */}
        {activeSubTab === 'deposito' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* INVENTORY LIST TABLE (Lg Span 8) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              
              {/* PANEL DE ALERTAS DE STOCK CRÍTICO Y COMPRAS */}
              {insumos.filter(i => i.stock_actual <= i.stock_minimo).length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight">
                        Alerta de Insumos Críticos ({insumos.filter(i => i.stock_actual <= i.stock_minimo).length})
                      </h4>
                    </div>
                    <button
                      onClick={() => {
                        const criticos = insumos.filter(i => i.stock_actual <= i.stock_minimo);
                        criticos.forEach(c => {
                          const suggestedQty = c.stock_minimo * 3 - c.stock_actual;
                          onRestockInsumo(c.id_insumo, suggestedQty);
                          addLog('sistema', `COMPRAS AUTO: Reabastecimiento inteligente de ${suggestedQty}${c.unidad_medida} para "${c.nombre}".`);
                          
                          const ocId = `OC-AUTO-${Math.floor(Math.random() * 900) + 1000}`;
                          const calculatedCost = suggestedQty * (c.unidad_medida === 'g' ? 12 : (c.unidad_medida === 'ml' ? 9 : 8500));
                          
                          setComprasHistorial(prev => [{
                            id: ocId,
                            proveedor: c.proveedor || 'Proveedor General S.A.',
                            insumo: c.nombre,
                            cantidad: `${suggestedQty} ${c.unidad_medida}`,
                            costo: calculatedCost,
                            fecha: new Date().toLocaleDateString('es-AR'),
                            estado: 'Entregado ✓'
                          }, ...prev]);

                          const mId = `MOV-${Math.floor(Math.random() * 90) + 100}`;
                          setMovimientosLocales(prev => [
                            { id: mId, insumo: c.nombre, cantidad: `+${suggestedQty} ${c.unidad_medida}`, operacion: 'Abastecimiento', motivo: `Restock sugerido: ${ocId}`, fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs' },
                            ...prev
                          ]);
                        });
                        toast.success("Órdenes sugeridas despachadas y stock restablecido.");
                      }}
                      className="text-[10px] font-black uppercase bg-[#624A3E] hover:bg-[#503C32] text-white py-1.5 px-3 rounded-lg shadow-sm cursor-pointer transition-all active:scale-95 border-0"
                    >
                      💡 Restock Inteligente Sugerido
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium text-amber-800 font-sans leading-normal">
                    {insumos.filter(i => i.stock_actual <= i.stock_minimo).map(c => {
                      const diff = c.stock_minimo * 3 - c.stock_actual;
                      return (
                        <div key={c.id_insumo} className="bg-white border border-amber-100 rounded-lg p-2 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-amber-950 block">{c.nombre}</span>
                            <span className="text-[10px] text-amber-600 block">Stock: {c.stock_actual}/{c.stock_minimo} {c.unidad_medida}</span>
                            <span className="text-[9px] text-[#624A3E] italic">Prov: {c.proveedor || 'Sin asignar'}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[9px] font-bold block uppercase text-amber-500">Orden Sugerida:</span>
                            <span className="font-mono font-black text-amber-950">+{diff} {c.unidad_medida}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar ingredientes..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={filterDeposito}
                    onChange={(e) => setFilterDeposito(e.target.value)}
                    className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border-0 rounded-lg text-slate-700 focus:outline-none cursor-pointer"
                    aria-label="Filtrar por Depósito"
                  >
                    <option value="todos">Todos los Depósitos</option>
                    <option value="Cámara Frigorífica">Cámara Frigorífica</option>
                    <option value="Cámara de Frescos">Cámara de Frescos</option>
                    <option value="Bodega y Cava">Bodega y Cava</option>
                    <option value="Almacén de Secos">Almacén de Secos</option>
                    <option value="Depósito General">Depósito General</option>
                  </select>

                  <div className="flex gap-1 overflow-x-auto">
                    {(['todo', 'bodega', 'frescos', 'secos'] as const).map(catName => (
                      <button
                        key={catName}
                        onClick={() => setFilterCategory(catName)}
                        className={`py-1 px-3 text-xs font-semibold rounded-lg capitalize transition-colors ${
                          filterCategory === catName 
                            ? 'bg-slate-100 text-slate-800' 
                            : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {catName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Insumos list container */}
              <div className="border border-slate-50 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="p-3">Insumo / Depósito</th>
                      <th className="p-3">Existencia Física</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Inyección</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredInsumos.map(ins => {
                      const isLow = ins.stock_actual <= ins.stock_minimo;
                      const isZero = ins.stock_actual <= 0;
                      
                      const maxHealthyCap = ins.unidad_medida === 'g' ? 15000 : (ins.unidad_medida === 'ml' ? 8000 : 80);
                      const currentPct = Math.min(100, (ins.stock_actual / maxHealthyCap) * 100);

                      return (
                        <tr key={ins.id_insumo} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{ins.nombre}</div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {ins.categoria} • Depósito: <span className="font-semibold text-slate-600">{getInsumoDeposito(ins)}</span> • Min: {ins.stock_minimo}{ins.unidad_medida}
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-700">
                            {ins.stock_actual.toLocaleString('es-AR')} {ins.unidad_medida}
                            <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden mt-1 relative">
                              <div 
                                className={`h-full rounded-full ${isZero ? 'bg-red-600' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${currentPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            {isZero ? (
                              <span className="bg-rose-100 text-rose-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                                AGOTADO 🚫
                              </span>
                            ) : isLow ? (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                CRÍTICO ⚠️
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                Saludable
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                const supplyAmount = ins.unidad_medida === 'g' ? 3000 : (ins.unidad_medida === 'ml' ? 1000 : 10);
                                onRestockInsumo(ins.id_insumo, supplyAmount);
                                addLog('sistema', `Reabastecido manualmente +${supplyAmount}${ins.unidad_medida} de ${ins.nombre}`);
                                
                                // local timeline movement log
                                const mId = `MOV-${Math.floor(Math.random() * 90) + 100}`;
                                setMovimientosLocales(prev => [
                                  { id: mId, insumo: ins.nombre, cantidad: `+${supplyAmount} ${ins.unidad_medida}`, operacion: 'Abastecimiento', motivo: 'Carga Express Manual', fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs' },
                                  ...prev
                                ]);
                              }}
                              className="text-[10px] font-bold text-slate-900 border border-slate-200 py-1 px-2.5 rounded bg-white hover:bg-slate-50 shadow-xs"
                            >
                              + Abastecer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

            {/* REGISTER WASTE AND ADJUSTMENTS TABS (Lg Span 4) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 font-sans tracking-tight flex items-center gap-1.5 mb-2">
                  <Sliders className="w-4.5 h-4.5 text-rose-600" />
                  Ajustes y Desperdicios
                </h4>
                <p className="text-[11px] text-slate-400 font-sans mb-3 leading-normal">
                  Fichas directas para corregir auditorias físicas ó asentar roturas para la conciliación de stock.
                </p>

                {/* Sub-form splits */}
                <div className="border-b border-slate-100 flex gap-2 pb-2 mb-3">
                  <button onClick={() => setAjusteOperacion('sumar')} className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer ${ajusteOperacion === 'sumar' ? 'bg-[#624A3E] text-white shadow-sm' : 'text-slate-500 bg-slate-50'}`}>Ajustar Stock</button>
                  <button onClick={() => setAjusteOperacion('restar')} className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer ${ajusteOperacion === 'restar' ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-500 bg-slate-50'}`}>Merma manual</button>
                </div>

                {ajusteOperacion === 'sumar' ? (
                  // ADJUSTMENT FORM
                  <form onSubmit={submitAjusteForm} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Insumo a Ajustar</label>
                      <select
                        value={ajusteInsumoId}
                        onChange={(e) => setAjusteInsumoId(e.target.value)}
                        className="w-full text-xs text-slate-700 bg-slate-50 p-2 border border-slate-100 rounded-lg focus:outline-none"
                      >
                        <option value="">-- Seleccionar --</option>
                        {insumos.map(i => (
                          <option key={i.id_insumo} value={i.id_insumo}>
                            {i.nombre} ({i.stock_actual})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Op.</label>
                        <select
                          className="w-full text-xs text-slate-700 bg-slate-50 p-2 border border-slate-100 rounded-lg focus:outline-none"
                          value={ajusteOperacion}
                          onChange={(e) => setAjusteOperacion(e.target.value as 'sumar' | 'restar')}
                        >
                          <option value="sumar">Aumentar (+)</option>
                          <option value="restar">Disminuir (-)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Cantidad</label>
                        <input
                          type="number"
                          value={ajusteCantidad || ''}
                          onChange={(e) => setAjusteCantidad(parseFloat(e.target.value))}
                          placeholder="Q."
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Motivo Justificativo</label>
                      <input
                        type="text"
                        value={ajusteMotivo}
                        onChange={(e) => setAjusteMotivo(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800"
                        placeholder="Ej: Arqueo fin de turno"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-[#624A3E] hover:bg-[#503C32] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-[#624A3E]/10"
                    >
                      Procesar Ajuste Físico
                    </button>
                  </form>
                ) : (
                  // MERMA FORM
                  <form onSubmit={submitMermaForm} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Ingrediente Afectado</label>
                      <select
                        value={mermaInsumoId}
                        onChange={(e) => setMermaInsumoId(e.target.value)}
                        className="w-full text-xs text-slate-700 bg-slate-50 p-2 border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="">-- Seleccionar insumo --</option>
                        {insumos.map(i => (
                          <option key={i.id_insumo} value={i.id_insumo}>
                            {i.nombre} ({i.stock_actual} {i.unidad_medida})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Cantidad a Descartar</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={mermaCantidad || ''}
                          onChange={(e) => setMermaCantidad(parseFloat(e.target.value))}
                          className="w-full text-xs p-2 pr-12 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none text-slate-800"
                          placeholder="Ej: 500"
                        />
                        <span className="text-[10px] font-mono text-slate-400 absolute right-3 top-1/2 -translate-y-1/2">
                          {mermaInsumoId ? insumos.find(i => i.id_insumo === mermaInsumoId)?.unidad_medida : ''}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-505 text-slate-550 text-slate-500 uppercase font-sans">Motivo del Descarte</label>
                      <select
                        value={mermaMotivo}
                        onChange={(e) => setMermaMotivo(e.target.value as Merma['motivo'])}
                        className="w-full text-xs text-slate-700 bg-slate-50 p-2 border border-slate-100 rounded-lg focus:outline-none"
                      >
                        <option value="vencimiento">Producto Vencido / Descartado</option>
                        <option value="rotura">Rotura / Envase Dañado</option>
                        <option value="error_cocina">Error en Línea de Cocción</option>
                        <option value="otro">Otro Motivo</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-[#EF4444] hover:bg-[#d83a3a] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-[#EF4444]/10"
                    >
                      Baja de Desperdicio
                    </button>
                  </form>
                )}
              </div>

              {/* RECENT HISTORIC LOST LOGS */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Últimas pérdidas registradas</h5>
                {mermas.length === 0 ? (
                  <p className="text-[10px] italic text-slate-400">Ningún desperdicio registrado hoy.</p>
                ) : (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {mermas.slice(-3).reverse().map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-50 p-1.5 border border-slate-100 rounded-lg">
                        <span className="text-slate-600 font-sans line-clamp-1">-{m.cantidad} {m.unidad_medida} de {m.nombre_insumo}</span>
                        <span className="text-rose-600 uppercase font-bold text-[8px] font-mono">{m.motivo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* WORKSPACE B: ESCANDALLO FORMULER SIMULATOR */}
        {activeSubTab === 'escandallo' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            
            <div className="flex border-b border-slate-50 pb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl mr-3 h-10 w-10 flex items-center justify-center">
                <Beaker className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-sans tracking-tight">
                  Diseñador Técnico de Escandallos (Fórmulas de Platos)
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  Cada plato vendido en carta posee una receta base que descuenta su gramaje correspondiente al marcarse como Producida en Cocina.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Selector of Plate */}
              <div className="lg:col-span-4 space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-sans">
                  Seleccione Plato Oficial
                </h4>
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                  {productosMenu.map(p => (
                    <button
                      key={p.id_producto}
                      onClick={() => setSelectedEscandalloDishId(p.id_producto)}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs font-sans transition-all flex items-center gap-2.5 ${
                        selectedEscandalloDishId === p.id_producto
                          ? 'border-slate-900 bg-slate-50 font-bold shadow-xs'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <img
                        src={p.imagen}
                        alt=""
                        loading="lazy" decoding="async"
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-slate-800">{p.nombre}</p>
                        <p className="text-[10px] text-slate-400 text-mono">${p.precio_venta.toLocaleString('es-AR')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Formula Specification & Yield simulator (Lg Span 8) */}
              <div className="lg:col-span-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-5">
                
                {selectedProduct && (
                  <div className="flex justify-between items-center bg-white p-3.5 border border-slate-50 rounded-xl shadow-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-sans">Plato Seleccionado</span>
                      <h4 className="font-extrabold text-sm text-slate-800 font-sans">{selectedProduct.nombre}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-sans">Precio de Venta</span>
                      <p className="font-mono text-sm font-extrabold text-slate-900">${selectedProduct.precio_venta.toLocaleString('es-AR')}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h5 className="text-[11px] font-bold text-slate-505 text-slate-500 uppercase tracking-wider font-sans">Ingredientes de la Receta</h5>
                  
                  <div className="space-y-2">
                    {selectedProductIngredients.map((ing, index) => {
                      const totalSimulatedReduction = ing.cantidad_a_descontar * simulatePortions;
                      const hasEnough = ing.stock_actual >= totalSimulatedReduction;

                      return (
                        <div key={index} className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs shadow-xs">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="font-bold text-slate-800">{ing.nombre_insumo}</p>
                              <p className="text-[10px] text-slate-400">Consumo técnico: {ing.cantidad_a_descontar}{ing.unidad_medida}</p>
                            </div>
                          </div>

                          <div className="text-right space-y-1">
                            <div className="font-semibold text-slate-700">
                              Simulado: <span className="font-bold font-mono text-slate-900 font-bold">-{totalSimulatedReduction}{ing.unidad_medida}</span>
                            </div>
                            <div className="text-[10px] leading-none text-slate-500">
                              Depósito: <span className="font-bold font-sans">{ing.stock_actual}{ing.unidad_medida}</span> •{' '}
                              <span className={hasEnough ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                                {hasEnough ? 'Suficiente ✓' : 'Insuficiente ✗'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* YIELD CALCULATOR SUMMARY BLOCK */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* Portions multiplier input */}
                  <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-2">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider font-sans text-slate-500">Simulador de Multiporciones</h5>
                    <p className="text-[10px] leading-none text-slate-400">Ajustar volumen teórico:</p>
                    <div className="flex items-center gap-3 bg-slate-50 p-1 border rounded-lg max-w-[150px]">
                      <button 
                        onClick={() => setSimulatePortions(p => Math.max(1, p - 1))}
                        className="w-6 h-6 rounded bg-white font-bold flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs flex-1 text-center">{simulatePortions}</span>
                      <button 
                        onClick={() => setSimulatePortions(p => p + 1)}
                        className="w-6 h-6 rounded bg-white font-bold flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Theoretical Yield Score */}
                  <div className="bg-slate-900 text-white p-4 rounded-xl shadow space-y-1.5 flex flex-col justify-between">
                    <div>
                      <h5 className="text-[9px] font-bold uppercase tracking-widest text-purple-300">Rendimiento Operativo</h5>
                      <p className="text-[10px] opacity-70">Capacidad remanente según bodega actual:</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono text-purple-300">
                        {maxYieldPortions} 
                      </span>
                      <span className="text-xs uppercase font-bold text-purple-200">Platos posibles</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* WORKSPACE C: PROVEEDORES & COMPRAS */}
        {activeSubTab === 'compras' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Purchase Order Form (Lg Span 5) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h4 className="font-extrabold text-sm text-slate-800 font-sans tracking-tight flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                Órden de Compra & Restock
              </h4>
              <p className="text-xs text-slate-400 font-sans leading-normal">
                Genere un pedido formal de abastecimiento. Se sumará al stock físico de manera inmediata en la simulación.
              </p>

              <form onSubmit={handleAddToPurchaseCart} className="space-y-3">
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Seleccionar Proveedor</label>
                  <select
                    className="w-full text-xs text-slate-700 bg-slate-50 p-2.5 border border-slate-150 rounded-lg shadow-inner focus:outline-none"
                    value={selectedProveedor}
                    onChange={(e) => setSelectedProveedor(e.target.value)}
                  >
                    {proveedores.map((p, idx) => (
                      <option key={idx} value={p.nombre}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Material a Abastecer</label>
                  <select
                    className="w-full text-xs text-slate-700 bg-slate-50 p-2.5 border border-slate-150 rounded-lg shadow-inner focus:outline-none"
                    value={compraInsumoId}
                    onChange={(e) => setCompraInsumoId(e.target.value)}
                  >
                    {insumos.map(i => (
                      <option key={i.id_insumo} value={i.id_insumo}>
                        {i.nombre} (Disponibles: {i.stock_actual} {i.unidad_medida})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Cantidad</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-150 rounded-lg text-slate-800 shadow-inner focus:outline-none"
                        value={compraCantidad || ''}
                        onChange={(e) => setCompraCantidad(Math.max(1, parseFloat(e.target.value)))}
                        placeholder="Cant."
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 font-bold">
                        {insumos.find(i => i.id_insumo === compraInsumoId)?.unidad_medida}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Costo Unitario ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-150 rounded-lg text-slate-800 shadow-inner focus:outline-none"
                      value={compraCostoUnitarioInput}
                      onChange={(e) => setCompraCostoUnitarioInput(e.target.value)}
                      placeholder="Costo"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar al Carrito
                  </button>

                  <button
                    type="button"
                    onClick={handleSuggestMissingStock}
                    className="w-full py-2 bg-[#624A3E] hover:bg-[#503C32] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    Sugerir por Stock Mínimo
                  </button>
                </div>

              </form>

              {/* SUPPLIER LOG CONTACTS */}
              <div className="pt-2 border-t border-slate-100">
                <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Directorio de Contactos</h5>
                <div className="space-y-1.5">
                  {proveedores.map((p, idx) => (
                    <div key={idx} className="bg-slate-50 p-2 rounded-lg border text-[9px] text-slate-500 leading-snug">
                      <p className="font-bold text-slate-800 font-sans">{p.nombre}</p>
                      <p>Email: {p.contacto} • Tel: {p.telefono}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Shopping Cart & Simulated Purchase Orders lists (Lg Span 7) */}
            <div className="lg:col-span-7 space-y-6">

              {/* Carrito de Compras (Actual) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm text-slate-800 font-sans tracking-tight flex items-center gap-2">
                    🛒 Carrito de Compras ({purchaseCart.length} ítems)
                  </h4>
                  {purchaseCart.length > 0 && (
                    <button
                      onClick={() => setPurchaseCart([])}
                      className="text-rose-500 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                    >
                      Vaciar Carrito
                    </button>
                  )}
                </div>

                {purchaseCart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-sans bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    El carrito está vacío. Agregue insumos manualmente o use "Sugerir por Stock Mínimo".
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {purchaseCart.map((item, idx) => {
                        const ins = insumos.find(i => i.id_insumo === item.id_insumo);
                        return (
                          <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-slate-800">{ins ? ins.nombre : item.id_insumo}</p>
                              <p className="text-[10px] text-slate-400">
                                Cantidad: {item.cantidad} {ins?.unidad_medida} • Costo Unitario: ${item.costo_unitario}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-900">
                                ${(item.cantidad * item.costo_unitario).toLocaleString('es-AR')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromPurchaseCart(idx)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Costo Total Estimado</span>
                        <p className="text-lg font-mono font-black text-emerald-700">
                          ${purchaseCart.reduce((acc, item) => acc + (item.cantidad * item.costo_unitario), 0).toLocaleString('es-AR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleExportPurchaseOrderPDF}
                          className="py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Download className="w-4 h-4" />
                          Exportar PDF
                        </button>
                        <button
                          onClick={handleConfirmPurchaseOrder}
                          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Truck className="w-4 h-4" />
                          Confirmar e Ingresar Compra
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Historial de Compras */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider font-sans">
                  Historial de Compras de Bodega & Insumos
                </h4>

                <div className="border rounded-xl bg-slate-50/50 p-2 text-[11px] text-slate-700 flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-650" />
                  <span>Historial de recepciones de mercadería y remitos liquidados.</span>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {comprasHistorial.map((oc, idx) => (
                    <div key={idx} className="bg-white border rounded-xl p-3.5 shadow-xs flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 font-sans">{oc.proveedor}</span>
                          <span className="bg-slate-150 text-slate-650 text-[8px] font-bold px-1.5 rounded-full uppercase">
                            {oc.id}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Insumo: {oc.insumo} • Cantidad: <strong className="text-slate-700">{oc.cantidad}</strong>
                        </p>
                        <p className="text-[9px] text-slate-400">Fecha de Arribo: {oc.fecha}</p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 block">${oc.costo.toLocaleString('es-AR')}</span>
                        <span className="bg-emerald-50 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                          {oc.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* WORKSPACE D: TIMELINE OF MOVEMENT HISTORIC */}
        {activeSubTab === 'movimientos' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-sans tracking-tight">
                  Libro Diario de Control de Stock
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  Registro cronológico de movimientos de bodega (egresos de Cocina por comanda, desajustes y mermas directas).
                </p>
              </div>

              <button
                onClick={handleDescargarMovimientosCSV}
                className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Reporte Stock (CSV)
              </button>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[450px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-505 text-slate-500 uppercase font-bold tracking-wider">
                    <th className="p-3">Ref ID</th>
                    <th className="p-3">Insumo</th>
                    <th className="p-3">Cantidad</th>
                    <th className="p-3">Tipo Operación</th>
                    <th className="p-3">Motivo / Justificación</th>
                    <th className="p-3">Timestamp Fiscal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimientosLocales.map((m, idx) => {
                    const isDescuento = m.operacion === 'Descuento' || m.operacion === 'Descarte/Merma';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-400">{m.id}</td>
                        <td className="p-3 font-semibold text-slate-800">{m.insumo}</td>
                        <td className={`p-3 font-mono font-extrabold ${isDescuento ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {m.cantidad}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                            m.operacion === 'Descuneto' || m.operacion === 'Descuento'
                              ? 'bg-amber-100 text-amber-800'
                              : m.operacion === 'Abastecimiento'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {m.operacion}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-slate-600">{m.motivo}</td>
                        <td className="p-3 text-slate-400 font-mono text-[10px]">{m.fecha}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* WORKSPACE E: PRICE HISTORY */}
        {activeSubTab === 'precios' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 font-sans tracking-tight">
                Auditoría de Historial de Precios
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Historial cronológico de cambios de costos unitarios de insumos. Registra variaciones para control de márgenes.
              </p>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Cargando historial de variaciones...
              </div>
            ) : costHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No se registran variaciones de costos aún.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[450px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      <th className="p-3">Insumo</th>
                      <th className="p-3">Costo Anterior</th>
                      <th className="p-3">Costo Nuevo</th>
                      <th className="p-3">Variación</th>
                      <th className="p-3">Fecha de Ajuste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {costHistory.map((h, idx) => {
                      const diff = h.costo_nuevo - h.costo_anterior;
                      const pct = h.costo_anterior > 0 ? (diff / h.costo_anterior) * 100 : 0;
                      const isIncrease = diff > 0;
                      return (
                        <tr key={h.id_historial || idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-semibold text-slate-800">{h.nombre_insumo || h.id_insumo}</td>
                          <td className="p-3 font-mono text-slate-600">${h.costo_anterior?.toFixed(2)}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">${h.costo_nuevo?.toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full inline-flex items-center gap-1 ${
                              diff === 0 
                                ? 'bg-slate-100 text-slate-800'
                                : isIncrease
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {diff === 0 ? '=' : isIncrease ? '↑' : '↓'}
                              {diff !== 0 && `${isIncrease ? '+' : ''}${pct.toFixed(1)}%`}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[10px]">
                            {new Date(h.fecha).toLocaleString('es-AR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
      <ToastContainer toasts={toasts} removeToast={dismissToast} />
    </>
  );
}
