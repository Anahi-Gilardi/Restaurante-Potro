import { useState, useMemo, useEffect } from 'react';
import { useToast } from '../../../components/ToastContainer';
import { Insumo, ProductoMenu, RecetaEscandallo, Merma } from '../../../types';
import { insumosService } from '../../../services/insumosService';

export function getInsumoDeposito(insumo: Insumo): string {
  switch (insumo.categoria) {
    case 'frescos':
      return insumo.nombre.toLowerCase().includes('carne') || insumo.nombre.toLowerCase().includes('ojo') || insumo.nombre.toLowerCase().includes('bife')
        ? 'Cámara Frigorífica'
        : 'Cámara de Frescos';
    case 'bodega':
      return 'Bodega y Cava';
    case 'secos':
      return 'Almacén de Secos';
    default:
      return 'Depósito General';
  }
}

interface UseInventoryProps {
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  mermas: Merma[];
  onRegistrarMerma: (idInsumo: string, cantidad: number, motivo: Merma['motivo']) => void;
  onRestockInsumo: (idInsumo: string, cantidad: number) => void;
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', mensaje: string) => void;
}

export function useInventory({
  insumos,
  productosMenu,
  recetas,
  mermas,
  onRegistrarMerma,
  onRestockInsumo,
  addLog
}: UseInventoryProps) {
  const { toast } = useToast();

  // Local toggles
  const [activeSubTab, setActiveSubTab] = useState<'deposito' | 'escandallo' | 'compras' | 'movimientos' | 'precios'>('deposito');
  const [filterCategory, setFilterCategory] = useState<'todo' | 'bodega' | 'frescos' | 'secos'>('todo');
  const [filterDeposito, setFilterDeposito] = useState<string>('todos');
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

  // Real purchase orders states
  const [selectedProveedor, setSelectedProveedor] = useState<string>('Distribuidora Alvear S.A. (Bebidas)');
  const [compraInsumoId, setCompraInsumoId] = useState<string>('ins_vin_malbec');
  const [compraCantidad, setCompraCantidad] = useState<number>(10);
  const [compraCostoUnitarioInput, setCompraCostoUnitarioInput] = useState<string>('');
  const [purchaseCart, setPurchaseCart] = useState<{ id_insumo: string; cantidad: number; costo_unitario: number }[]>([]);
  const [comprasHistorial, setComprasHistorial] = useState([
    { id: 'OC-2512', proveedor: 'Frigorífico Pampeano Premium', insumo: 'Corte de Carne Vacuna (Bife)', cantidad: '15000g', costo: 180000, fecha: '04/06/2026', estado: 'Entregado ✓' },
    { id: 'OC-2513', proveedor: 'Distribuidora Alvear S.A. (Bebidas)', insumo: 'Vino Rutini Cabernet 750ml', cantidad: '12 uds', costo: 156000, fecha: '05/06/2026', estado: 'Entregado ✓' },
  ]);

  // Price history state
  const [costHistory, setCostHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Sync cost input based on selected insumo
  useEffect(() => {
    const selected = insumos.find(i => i.id_insumo === compraInsumoId);
    if (selected) {
      setCompraCostoUnitarioInput(String(selected.costo_unitario ?? 0));
    }
  }, [compraInsumoId, insumos]);

  // Load cost history
  const loadCostHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await insumosService.getHistory();
      setCostHistory(history);
    } catch (err) {
      console.error('Error loading price history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'precios') {
      loadCostHistory();
    }
  }, [activeSubTab]);

  // List of real movements fetched from database
  const [movimientosLocales, setMovimientosLocales] = useState<any[]>([]);

  const loadMovements = async () => {
    try {
      const data = await insumosService.listMovements();
      const formatted = data.map((m, idx) => {
        const ins = insumos.find(i => i.id_insumo === m.id_insumo);
        let rawDate = new Date(m.fecha);
        if (isNaN(rawDate.getTime())) rawDate = new Date();
        const timeStr = rawDate.toLocaleDateString('es-AR') + ' ' + rawDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs';
        
        const sign = m.tipo_movimiento.startsWith('salida') ? '-' : '+';
        const qtyStr = `${sign}${m.cantidad} ${ins?.unidad_medida ?? ''}`;

        let opLabel = 'Descuento';
        if (m.tipo_movimiento === 'entrada') opLabel = 'Abastecimiento';
        else if (m.tipo_movimiento === 'salida_merma') opLabel = 'Descarte/Merma';
        else if (m.tipo_movimiento === 'ajuste') opLabel = m.stock_nuevo > m.stock_anterior ? 'Abastecimiento' : 'Descarte/Merma';

        return {
          id: m.id_movimiento ? m.id_movimiento.replace('mov_', 'MOV-').slice(0, 10).toUpperCase() : `MOV-${100 + idx}`,
          insumo: ins ? ins.nombre : (m.nombre_insumo || m.id_insumo),
          cantidad: qtyStr,
          operacion: opLabel,
          motivo: m.motivo || (m.tipo_movimiento === 'entrada' ? 'Ingreso de compra' : (m.tipo_movimiento === 'salida_merma' ? 'Merma registrada' : 'Consumo comanda')),
          fecha: timeStr
        };
      });
      setMovimientosLocales(formatted);
    } catch (e) {
      console.error('Error loading inventory movements:', e);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'movimientos') {
      loadMovements();
    }
  }, [activeSubTab, insumos]);

  // Filtered insumos
  const filteredInsumos = useMemo(() => {
    return insumos.filter(ins => {
      const matchCat = filterCategory === 'todo' || ins.categoria === filterCategory;
      const dep = getInsumoDeposito(ins);
      const matchDep = filterDeposito === 'todos' || dep === filterDeposito;
      const matchSearch = ins.nombre.toLowerCase().includes(inventorySearch.toLowerCase());
      return matchCat && matchDep && matchSearch;
    });
  }, [insumos, filterCategory, filterDeposito, inventorySearch]);

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

  // Add item to purchase cart
  const handleAddToPurchaseCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!compraInsumoId || compraCantidad <= 0) {
      toast.warning("Seleccione el insumo y cantidad para la compra");
      return;
    }

    const insSelected = insumos.find(i => i.id_insumo === compraInsumoId);
    if (!insSelected) return;

    const parsedCost = parseFloat(compraCostoUnitarioInput);
    if (isNaN(parsedCost) || parsedCost <= 0) {
      toast.error("Ingrese un costo unitario de compra válido.");
      return;
    }

    const existingIdx = purchaseCart.findIndex(c => c.id_insumo === compraInsumoId);
    if (existingIdx > -1) {
      const updatedCart = [...purchaseCart];
      updatedCart[existingIdx].cantidad += compraCantidad;
      updatedCart[existingIdx].costo_unitario = parsedCost;
      setPurchaseCart(updatedCart);
    } else {
      setPurchaseCart(prev => [...prev, {
        id_insumo: compraInsumoId,
        cantidad: compraCantidad,
        costo_unitario: parsedCost
      }]);
    }

    toast.success(`"${insSelected.nombre}" agregado al carrito de compras.`);
    setCompraCantidad(10);
  };

  // Remove item from purchase cart
  const handleRemoveFromPurchaseCart = (index: number) => {
    setPurchaseCart(prev => prev.filter((_, idx) => idx !== index));
    toast.info("Ingrediente removido del carrito.");
  };

  // Suggest orders based on stock deficit
  const handleSuggestMissingStock = () => {
    const underStock = insumos.filter(i => i.stock_actual < i.stock_minimo);
    if (underStock.length === 0) {
      toast.info("No hay insumos bajo el stock mínimo en este momento.");
      return;
    }

    const suggestedItems = underStock.map(ins => {
      // Order enough to satisfy the minimum plus 50% safety margin
      const target = ins.stock_minimo * 1.5;
      const needed = Math.max(1, Math.ceil(target - ins.stock_actual));
      return {
        id_insumo: ins.id_insumo,
        cantidad: needed,
        costo_unitario: ins.costo_unitario ?? 100
      };
    });

    setPurchaseCart(suggestedItems);
    toast.success(`Se sugirieron ${suggestedItems.length} insumos con stock faltante.`);
  };

  // Process all purchase order items
  const handleConfirmPurchaseOrder = async () => {
    if (purchaseCart.length === 0) {
      toast.warning("El carrito de compras está vacío.");
      return;
    }

    try {
      const ocId = `OC-${Math.floor(Math.random() * 300) + 2400}`;
      let totalPurchaseCost = 0;

      for (const item of purchaseCart) {
        const ins = insumos.find(i => i.id_insumo === item.id_insumo);
        if (!ins) continue;

        const itemCost = item.cantidad * item.costo_unitario;
        totalPurchaseCost += itemCost;

        // 1. Update stock in local state/database
        onRestockInsumo(item.id_insumo, item.cantidad);

        // 2. Update unit price to current purchasing price
        await insumosService.update(item.id_insumo, { costo_unitario: item.costo_unitario });

        // 3. Log stock movement
        const stockNuevo = ins.stock_actual + item.cantidad;
        await insumosService.recordMovement({
          id_insumo: item.id_insumo,
          tipo_movimiento: 'entrada',
          stock_anterior: ins.stock_actual,
          stock_nuevo: stockNuevo,
          cantidad: item.cantidad
        });

        // 4. Log text log
        addLog('sistema', `COMPRAS: Recibido de [${selectedProveedor}]. +${item.cantidad}${ins.unidad_medida} de "${ins.nombre}" inyectados.`);

        // 5. Append to local movements timeline
        const movId = `MOV-${Math.floor(Math.random() * 900) + 100}`;
        setMovimientosLocales(prev => [
          {
            id: movId,
            insumo: ins.nombre,
            cantidad: `${item.cantidad} ${ins.unidad_medida}`,
            operacion: 'Abastecimiento',
            motivo: `Orden de Compra: ${ocId}`,
            fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs'
          },
          ...prev
        ]);
      }

      // Add to historical purchase orders list
      const summaryInsumosNames = purchaseCart.map(c => insumos.find(i => i.id_insumo === c.id_insumo)?.nombre || c.id_insumo).join(', ');
      const newOC = {
        id: ocId,
        proveedor: selectedProveedor,
        insumo: summaryInsumosNames.length > 30 ? summaryInsumosNames.slice(0, 30) + '...' : summaryInsumosNames,
        cantidad: `${purchaseCart.length} ítems`,
        costo: totalPurchaseCost,
        fecha: new Date().toLocaleDateString('es-AR'),
        estado: 'Entregado ✓'
      };
      setComprasHistorial(prev => [newOC, ...prev]);

      // Reset cart
      setPurchaseCart([]);
      toast.success(`Orden de compra ${ocId} procesada con éxito. Stock ingresado.`);
    } catch (err: any) {
      toast.error('Error al procesar la orden de compra: ' + err.message);
    }
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
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }

    addLog('sistema', 'DIAGNOSTICO: Exportado reporte fiscal del historial de stock en CSV.');
    toast.success("Reporte CSV descargado correctamente");
  };

  return {
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
    setCostHistory,
    isLoadingHistory,
    setIsLoadingHistory,
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
  };
}
