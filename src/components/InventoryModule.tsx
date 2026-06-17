import React, { useState, useMemo } from 'react';
import { useToast, ToastContainer } from './ToastContainer';
import { 
  Database, 
  Trash2, 
  Plus, 
  RefreshCw, 
  FolderMinus, 
  Sliders, 
  Search, 
  AlertTriangle,
  Beaker,
  TrendingDown,
  Info,
  Layers,
  ArrowRight,
  Truck,
  ArrowUpDown,
  Download,
  ShieldAlert,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { Insumo, ProductoMenu, RecetaEscandallo, Merma } from '../types';

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
  const { toast, toasts, dismissToast } = useToast();

  // Local toggles
  const [activeSubTab, setActiveSubTab] = useState<'deposito' | 'escandallo' | 'compras' | 'movimientos'>('deposito');
  const [filterCategory, setFilterCategory] = useState<'todo' | 'bodega' | 'frescos' | 'secos'>('todo');
  const [inventorySearch, setInventorySearch] = useState('');

  // Selected dish for escandallo simulator
  const [selectedEscandalloDishId, setSelectedEscandalloDishId] = useState<string>('prod_bife');
  const [simulatePortions, setSimulatePortions] = useState<number>(1);

  // Waste (Merma) form states
  const [mermaInsumoId, setMermaInsumoId] = useState<string>('');
  const [mermaCantidad, setMermaCantidad] = useState<number>(0);
  const [mermaMotivo, setMermaMotivo] = useState<Merma['motivo']>('vencimiento');

  // Manual Adjustments Form States
  const [ajusteInsumoId, setAjusteInsumoId] = useState<string>('');
  const [ajusteCantidad, setAjusteCantidad] = useState<number>(0);
  const [ajusteOperacion, setAjusteOperacion] = useState<'sumar' | 'restar'>('sumar');
  const [ajusteMotivo, setAjusteMotivo] = useState<string>('Ajuste de Arqueo Físico');

  // Supplier Purchase orders state simulator
  const [selectedProveedor, setSelectedProveedor] = useState<string>('Distribuidora Alvear S.A. (Bebidas)');
  const [compraInsumoId, setCompraInsumoId] = useState<string>('ins_vin_malbec');
  const [compraCantidad, setCompraCantidad] = useState<number>(10);
  const [comprasHistorial, setComprasHistorial] = useState([
    { id: 'OC-2512', proveedor: 'Frigorífico Pampeano Premium', insumo: 'Corte de Carne Vacuna (Bife)', cantidad: '15000g', costo: 180000, fecha: '04/06/2026', estado: 'Entregado ✓' },
    { id: 'OC-2513', proveedor: 'Distribuidora Alvear S.A. (Bebidas)', insumo: 'Vino Rutini Cabernet 750ml', cantidad: '12 uds', costo: 156000, fecha: '05/06/2026', estado: 'Entregado ✓' },
  ]);

  const proveedores = [
    { nombre: 'Distribuidora Alvear S.A. (Bebidas)', contacto: 'ventas@alvear-bodegas.top', telefono: '+54 11 4821 9302' },
    { nombre: 'Frigorífico Pampeano Premium', contacto: 'pedidos@pampeanocarnes.com', telefono: '+54 11 5012 4432' },
    { nombre: 'Granja Sol Sanitaria (Pollo/Frescos)', contacto: 'solgranja@frescos.org', telefono: '+54 11 3942 9110' },
    { nombre: 'Mercado de Abasto CABA (Vegetales)', contacto: 'abasto@central-vegetal.com', telefono: '+54 11 4110 5510' }
  ];

  // List of simulated log of movements
  const [movimientosLocales, setMovimientosLocales] = useState([
    { id: 'MOV-010', insumo: 'Vino Malbec Reservado 750ml', cantidad: '3 uds', operacion: 'Descuento', motivo: 'Consumo Bebidas Comanda', fecha: '2026-06-05 13:42hs' },
    { id: 'MOV-011', insumo: 'Corte de Carne Vacuna (Bife)', cantidad: '1050g', operacion: 'Descuento', motivo: 'Producción Cocina Escandallo', fecha: '2026-06-05 14:15hs' },
    { id: 'MOV-012', insumo: 'Papa Negra Bastón', cantidad: '15000g', operacion: 'Abastecimiento', motivo: 'Órden de Compra OC-2512', fecha: '2026-06-05 15:00hs' },
    { id: 'MOV-013', insumo: 'Lechuga Romana Orgánica', cantidad: '500g', operacion: 'Descarte/Merma', motivo: 'Desperdicio Manual Vencido', fecha: '2026-06-05 16:30hs' }
  ]);

  // Filtered insumos
  const filteredInsumos = useMemo(() => {
    return insumos.filter(ins => {
      const matchCat = filterCategory === 'todo' || ins.categoria === filterCategory;
      const matchSearch = ins.nombre.toLowerCase().includes(inventorySearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [insumos, filterCategory, inventorySearch]);

  // Handle merma register
  const submitMermaForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mermaInsumoId || mermaCantidad <= 0) {
      toast.warning("Complete todos los campos requeridos");
      return;
    }

    const insSelected = insumos.find(i => i.id_insumo === mermaInsumoId);
    if (!insSelected) return;

    if (insSelected.stock_actual < mermaCantidad) {
      toast.error(`Stock insuficiente: solo hay ${insSelected.stock_actual}${insSelected.unidad_medida} disponibles`);
      return;
    }

    onRegistrarMerma(mermaInsumoId, mermaCantidad, mermaMotivo);
    addLog('merma_registrada', `Merma manual registrada: ${mermaCantidad}${insSelected.unidad_medida} de ${insSelected.nombre} por motivo de ${mermaMotivo}`);
    
    // Append to local movements timeline
    const movId = `MOV-${Math.floor(Math.random() * 900) + 100}`;
    setMovimientosLocales(prev => [
      { id: movId, insumo: insSelected.nombre, cantidad: `${mermaCantidad} ${insSelected.unidad_medida}`, operacion: 'Descarte/Merma', motivo: `Manual: ${mermaMotivo}`, fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs' },
      ...prev
    ]);

    // Reset form
    setMermaCantidad(0);
    setMermaInsumoId('');
    toast.success("Merma registrada correctamente");
  };

  // Process manual adjustments (plus/minus)
  const submitAjusteForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajusteInsumoId || ajusteCantidad <= 0) {
      toast.warning("Complete los datos del ajuste de stock");
      return;
    }

    const insSelected = insumos.find(i => i.id_insumo === ajusteInsumoId);
    if (!insSelected) return;

    if (ajusteOperacion === 'restar' && insSelected.stock_actual < ajusteCantidad) {
      toast.error("No puede restar más que el stock disponible");
      return;
    }

    // Adjust immediately via parent helper or local mermas
    if (ajusteOperacion === 'sumar') {
      onRestockInsumo(ajusteInsumoId, ajusteCantidad);
    } else {
      onRegistrarMerma(ajusteInsumoId, ajusteCantidad, 'otro');
    }

    addLog('sistema', `Inventario: Ajuste manual de stock de '${insSelected.nombre}'. Cantidad: ${ajusteOperacion === 'sumar' ? '+' : '-'}${ajusteCantidad}${insSelected.unidad_medida}. Motivo: ${ajusteMotivo}`);
    
    // Append to local movements timeline
    const movId = `MOV-${Math.floor(Math.random() * 900) + 100}`;
    setMovimientosLocales(prev => [
      { id: movId, insumo: insSelected.nombre, cantidad: `${ajusteCantidad} ${insSelected.unidad_medida}`, operacion: ajusteOperacion === 'sumar' ? 'Abastecimiento' : 'Descarte/Merma', motivo: `Ajuste manual: ${ajusteMotivo}`, fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs' },
      ...prev
    ]);

    setAjusteCantidad(0);
    setAjusteInsumoId('');
    toast.success("Ajuste de stock aplicado correctamente");
  };

  // Submit Simulated Purchase Order to supplier
  const handleIngresarCompraProveedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compraInsumoId || compraCantidad <= 0) {
      toast.warning("Seleccione el insumo y cantidad para la compra");
      return;
    }

    const insSelected = insumos.find(i => i.id_insumo === compraInsumoId);
    if (!insSelected) return;

    // Standardize mock units price
    const calculatedCost = compraCantidad * (insSelected.unidad_medida === 'g' ? 12 : (insSelected.unidad_medida === 'ml' ? 9 : 8500));

    // Increase stock immediately
    onRestockInsumo(compraInsumoId, compraCantidad);
    addLog('sistema', `COMPRAS: Compra recibida de Proveedor [${selectedProveedor}]. +${compraCantidad}${insSelected.unidad_medida} de "${insSelected.nombre}" inyectados.`);

    // Add to simulated purchase list
    const ocId = `OC-${Math.floor(Math.random() * 300) + 2400}`;
    const newOC = {
      id: ocId,
      proveedor: selectedProveedor,
      insumo: insSelected.nombre,
      cantidad: `${compraCantidad} ${insSelected.unidad_medida}`,
      costo: calculatedCost,
      fecha: new Date().toLocaleDateString('es-AR'),
      estado: 'Entregado ✓'
    };

    setComprasHistorial(prev => [newOC, ...prev]);

    // Add to stock movements
    const movId = `MOV-${Math.floor(Math.random() * 900) + 100}`;
    setMovimientosLocales(prev => [
      { id: movId, insumo: insSelected.nombre, cantidad: `${compraCantidad} ${insSelected.unidad_medida}`, operacion: 'Abastecimiento', motivo: `Distribuidor: ${ocId}`, fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs' },
      ...prev
    ]);

    // Reset Form
    setCompraCantidad(10);
    toast.success(`Orden de compra enviada a ${selectedProveedor}. Stock acreditado.`);
  };

  // Recipe specs for the selected dish
  const selectedProduct = useMemo(() => {
    return productosMenu.find(p => p.id_producto === selectedEscandalloDishId) || null;
  }, [selectedEscandalloDishId, productosMenu]);

  const selectedProductIngredients = useMemo(() => {
    return recetas.filter(r => r.id_producto === selectedEscandalloDishId).map(recipe => {
      const ins = insumos.find(i => i.id_insumo === recipe.id_insumo);
      return {
        ...recipe,
        nombre_insumo: ins ? ins.nombre : 'Insumo desconocido',
        unidad_medida: ins ? ins.unidad_medida : 'u',
        stock_actual: ins ? ins.stock_actual : 0,
        stock_minimo: ins ? ins.stock_minimo : 0,
      };
    });
  }, [selectedEscandalloDishId, recetas, insumos]);

  // Calculate maximum portion yield based on current inventory
  const maxYieldPortions = useMemo(() => {
    if (selectedProductIngredients.length === 0) return 0;
    let limit = 999;
    selectedProductIngredients.forEach(ing => {
      if (ing.cantidad_a_descontar > 0) {
        const yieldForIng = Math.floor(ing.stock_actual / ing.cantidad_a_descontar);
        if (yieldForIng < limit) {
          limit = yieldForIng;
        }
      }
    });
    return limit === 999 ? 0 : limit;
  }, [selectedProductIngredients]);

  // Generate downloadable stock log CSV
  const handleDescargarMovimientosCSV = () => {
    const csvRows = [
      ['HISTORIAL DE MOVIMIENTOS DE STOCK (AUDITORIA FISCAL)'],
      ['ID Transacción', 'Insumo / Deposito', 'Cantidad', 'Operación', 'Motivo del Movimiento', 'Timestamp Registrado'],
    ];

    movimientosLocales.forEach(m => {
      csvRows.push([
        m.id,
        m.insumo,
        m.cantidad,
        m.operacion,
        m.motivo,
        m.fecha
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(e => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Movimientos_Stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog('sistema', 'DIAGNOSTICO: Exportado reporte fiscal del historial de stock en CSV.');
    toast.success("Reporte CSV descargado correctamente");
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
      </div>

      {/* CORE WORKSPACE (Column Span 9) */}
      <div className="xl:col-span-9 space-y-6">

        {/* WORKSPACE A: DEPOSITO & STOCK LIST */}
        {activeSubTab === 'deposito' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* INVENTORY LIST TABLE (Lg Span 8) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar ingredientes..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl text-xs text-slate-755 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                  />
                </div>
                
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
                            <div className="text-[10px] text-slate-400 capitalize">{ins.categoria} • Min: {ins.stock_minimo}{ins.unidad_medida}</div>
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
                      <label className="text-[10px] font-bold text-slate-505 text-slate-500 uppercase font-sans">Insumo a Ajustar</label>
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Motivo del Descarte</label>
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
              <div className="mt-4 pt-4 border-t border-slate-55 border-slate-100">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Últimas pérdidas registradas</h5>
                {mermas.length === 0 ? (
                  <p className="text-[10px] italic text-slate-400">Ningún desperdicio registrado hoy.</p>
                ) : (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {mermas.slice(-3).reverse().map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-50 p-1.5 border border-slate-100 rounded-lg">
                        <span className="text-slate-650 font-sans line-clamp-1">-{m.cantidad} {m.unidad_medida} de {m.nombre_insumo}</span>
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
                            <div className="font-semibold text-slate-750 text-slate-700">
                              Simulado: <span className="font-bold font-mono text-slate-900">-{totalSimulatedReduction}{ing.unidad_medida}</span>
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

              <form onSubmit={handleIngresarCompraProveedor} className="space-y-3">
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Seleccionar Proveedor</label>
                  <select
                    className="w-full text-xs text-slate-700 bg-slate-50 p-2.5 border border-slate-150 rounded-lg"
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
                    className="w-full text-xs text-slate-700 bg-slate-50 p-2.5 border border-slate-150 rounded-lg"
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

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cantidad a Comprar</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-150 rounded-lg text-slate-800"
                      value={compraCantidad || ''}
                      onChange={(e) => setCompraCantidad(Math.max(1, parseFloat(e.target.value)))}
                      placeholder="Ej: 2000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-bold">
                      {insumos.find(i => i.id_insumo === compraInsumoId)?.unidad_medida}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Enviar Órden de Restock Digital
                </button>

              </form>

              {/* SUPPLIER LOG CONTACTS */}
              <div className="pt-2">
                <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Directorio de Contactos</h5>
                <div className="space-y-1.5">
                  {proveedores.map((p, idx) => (
                    <div key={idx} className="bg-slate-50 p-2 rounded-lg border text-[9px] text-slate-500 leading-snug">
                      <p className="font-bold text-slate-800">{p.nombre}</p>
                      <p>Email: {p.contacto} • Tel: {p.telefono}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Simulated Purchase Orders lists (Lg Span 7) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider font-sans">
                Historial de Compras de Bodega & Insumos
              </h4>

              <div className="border rounded-xl bg-slate-50/50 p-2 text-[11px] text-indigo-750 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                <span>Simulación de cadena de frío y recepción de remitos para restaurante en tiempo real.</span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto">
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
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
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
                        <td className="p-3 font-sans text-slate-550 text-slate-600">{m.motivo}</td>
                        <td className="p-3 text-slate-400 font-mono text-[10px]">{m.fecha}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

    </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
