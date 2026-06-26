import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Plus, 
  Minus, 
  ShoppingBag, 
  AlertTriangle, 
  CheckCircle, 
  Bookmark, 
  Search, 
  Sparkles, 
  Coffee, 
  Pizza, 
  UtensilsCrossed, 
  Wine, 
  DollarSign, 
  Receipt,
  UserCheck
} from 'lucide-react';
import { Mesa, Insumo, ProductoMenu, RecetaEscandallo, Pedido, PedidoItem } from '../types';

interface WineMapping {
  macro: 'tintas' | 'blancas' | 'champagne' | 'destilados' | null;
  varietales: string[];
}

function getWineMapping(p: ProductoMenu): WineMapping {
  const name = p.nombre.toLowerCase();
  const desc = (p.descripcion || '').toLowerCase();

  let macro: WineMapping['macro'] = null;
  const varietales: string[] = [];

  // Categorize based on category, subcategory or name
  if (p.categoria === 'Bodega') {
    const sub = (p.subcategoria || '').toLowerCase();
    if (sub.includes('espumantes') || sub.includes('champagne') || name.includes('champagne') || name.includes('chandon') || name.includes('baron b') || name.includes('aluda') || name.includes('rosé') || name.includes('brut')) {
      macro = 'champagne';
    } else if (sub.includes('blancos') || name.includes('sauvignon') || name.includes('chardonnay') || name.includes('viognier') || name.includes('torrontés') || name.includes('torrontes') || name.includes('riesling') || name.includes('gewurztraminer') || name.includes('albariño')) {
      macro = 'blancas';
    } else {
      macro = 'tintas';
    }
  } else if (p.categoria === 'Bebidas') {
    const sub = (p.subcategoria || '').toLowerCase();
    if (sub.includes('whisky') || sub.includes('gin') || sub.includes('fernet') || sub.includes('aperitivos') || name.includes('macallan') || name.includes('gin') || name.includes('fernet') || name.includes('aperol') || name.includes('spritz')) {
      macro = 'destilados';
    }
  }

  if (macro === 'tintas') {
    // Malbec
    if (
      name.includes('trumpeter malbec') || name.includes('trumpeter (botella)') || name.includes('trumpeter (copa)') ||
      name.includes('encuentro malbec') ||
      name.includes('rutini') ||
      name.includes('escorihuela') ||
      name.includes('capítulo 2') || name.includes('ruca malén') ||
      name.includes('st felicien') || name.includes('saint felicien') ||
      name.includes('nicasia') ||
      name.includes('padrillo') ||
      name.includes('d.v. catena') || name.includes('dv catena') ||
      name.includes('enemigo') ||
      name.includes('tikal') || name.includes('tical') ||
      name.includes('angélica zapata') || name.includes('angelica zapata') ||
      name.includes('argentino') ||
      name.includes('luca') ||
      name.includes('perdices') ||
      name.includes('don juan') ||
      name.includes('exploración') || name.includes('exploracion') ||
      name.includes('alae') ||
      name.includes('portillo') ||
      name.includes('pyros') ||
      name.includes('numina') ||
      name.includes('primus')
    ) {
      varietales.push('Malbec');
    }

    // Cabernet Sauvignon
    if (
      name.includes('escorihuela') ||
      name.includes('capítulo 2') || name.includes('ruca malén') ||
      name.includes('st felicien') || name.includes('saint felicien') ||
      name.includes('d.v. catena') || name.includes('dv catena') ||
      name.includes('angélica zapata') || name.includes('angelica zapata') ||
      name.includes('perdices') ||
      name.includes('exploración') || name.includes('exploracion') ||
      name.includes('encuentro cs') || name.includes('padrillo cs')
    ) {
      varietales.push('Cabernet Sauvignon');
    }

    // Red Blend
    if (
      name.includes('trumpeter red blend') || name.includes('alamos') || name.includes('nicasia red blend') || name.includes('nicasia blend') || name.includes('eg gran reserva') || name.includes('gran reserva red blend')
    ) {
      varietales.push('Red Blend');
    }

    // Cabernet Franc
    if (
      name.includes('rutini') ||
      name.includes('pequeñas producciones') || name.includes('pequenas prod') ||
      name.includes('enemigo') ||
      name.includes('ala colorada') ||
      name.includes('numina')
    ) {
      varietales.push('Cabernet Franc');
    }

    // Merlot
    if (
      name.includes('rutini') ||
      name.includes('angélica zapata') || name.includes('angelica zapata')
    ) {
      varietales.push('Merlot');
    }

    // Pinot Noir
    if (
      name.includes('escorihuela') ||
      name.includes('padrillo') ||
      name.includes('d.v. catena') || name.includes('dv catena') ||
      name.includes('perdices') ||
      name.includes('luca pinot') ||
      name.includes('numina')
    ) {
      varietales.push('Pinot Noir');
    }

    // Otros Varietales Tintos
    if (
      name.includes('ala colorada') || name.includes('ancelotta') || name.includes('tannat') || name.includes('petit verdot')
    ) {
      varietales.push('Otros Varietales Tintos');
    }
  }

  if (macro === 'blancas') {
    // Chardonnay
    if (
      name.includes('trumpeter doux') || name.includes('doux') ||
      name.includes('escorihuela') ||
      name.includes('st felicien') || name.includes('saint felicien') ||
      name.includes('angélica zapata') || name.includes('angelica zapata') ||
      name.includes('luca') ||
      name.includes('perdices reserva chardonnay') || name.includes('perdices chardonnay') || name.includes('perdices reserva') ||
      name.includes('exploración') || name.includes('exploracion') ||
      name.includes('salentein reserva chardonnay') || name.includes('reserva chardonnay')
    ) {
      varietales.push('Chardonnay');
    }

    // Sauvignon Blanc
    if (
      name.includes('escorihuela') ||
      name.includes('st felicien sauvignon') || name.includes('saint felicien sauvignon') ||
      name.includes('perdices sauvignon') || name.includes('perdices sb') ||
      name.includes('portillo sauvignon') || name.includes('portillo sb') ||
      name.includes('reserva sauvignon') ||
      name.includes('pyros sauvignon') || name.includes('pyros sb') ||
      name.includes('ala viognier')
    ) {
      varietales.push('Sauvignon Blanc');
    }

    // Torrontés
    if (name.includes('torrontés') || name.includes('torrontes')) {
      varietales.push('Torrontés');
    }

    // Riesling
    if (name.includes('riesling')) {
      varietales.push('Riesling');
    }

    // Gewurztraminer
    if (name.includes('gewurztraminer') || name.includes('gewürz')) {
      varietales.push('Gewurztraminer');
    }

    // Albariño
    if (name.includes('albariño') || name.includes('albarino')) {
      varietales.push('Albariño');
    }
  }

  if (macro === 'champagne') {
    if (name.includes('baron b')) {
      varietales.push('Baron B');
    } else if (name.includes('aluda') || name.includes('alyda')) {
      varietales.push('Alyda');
    } else if (name.includes('encuentro')) {
      varietales.push('Encuentro');
    } else if (name.includes('salentein')) {
      varietales.push('Salentein');
    } else if (name.includes('chandon')) {
      varietales.push('Chandon');
    }
  }

  if (macro === 'destilados') {
    if (name.includes('whisky') || name.includes('macallan')) {
      varietales.push('Whisky');
    } else if (name.includes('gin') || name.includes('heráclito') || name.includes('heraclito')) {
      varietales.push('Gin');
    } else if (name.includes('fernet') || name.includes('branca')) {
      varietales.push('Fernet');
    } else if (name.includes('aperol') || name.includes('spritz') || name.includes('aperitivo')) {
      varietales.push('Aperitivos');
    }
  }

  return { macro, varietales };
}

interface MozoTerminalProps {
  mesas: Mesa[];
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  activeMozo: string;
  onMozoChange: (mozo: string) => void;
  onCrearPedido: (pedido: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo' }) => void;
  pedidos: Pedido[];
  onFacturarMesa: (idPedido: number) => void;
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'sistema', mensaje: string) => void;
  permitirVentaSinStock?: boolean;
}

export default function MozoTerminal({
  mesas,
  insumos,
  productosMenu,
  recetas,
  activeMozo,
  onMozoChange,
  onCrearPedido,
  pedidos,
  onFacturarMesa,
  addLog,
  permitirVentaSinStock = false
}: MozoTerminalProps) {
  // Waiter selections
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
  const [comensales, setComensales] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todo');
  
  // Bodega hierarchy states
  const [selectedWineMacro, setSelectedWineMacro] = useState<'tintas' | 'blancas' | 'champagne' | 'destilados' | 'todo'>('todo');
  const [selectedWineVarietal, setSelectedWineVarietal] = useState<string>('todo');
  
  // Current order cart
  const [cart, setCart] = useState<{ [id_producto: string]: number }>({});
  const [observaciones, setObservaciones] = useState('');

  // Bill splitting state
  const [splittingPedidoId, setSplittingPedidoId] = useState<number | null>(null);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [splitItemsChecked, setSplitItemsChecked] = useState<{ [itemIdx: number]: boolean }>({});

  const selectedMesa = useMemo(() => {
    return mesas.find(m => m.id_mesa === selectedMesaId) || null;
  }, [selectedMesaId, mesas]);

  // Find active order of the selected table if any (to split or pay)
  const activePedidoDeMesa = useMemo(() => {
    if (!selectedMesaId) return null;
    return pedidos.find(p => p.id_mesa === selectedMesaId && p.estado_comanda !== 'entregado_cobrado') || null;
  }, [selectedMesaId, pedidos]);

  // Filter products by category and search (with hierarchical wine/beverage browsing)
  const filteredProducts = useMemo(() => {
    return productosMenu.filter(p => {
      // 1. General category match
      let matchCat = false;
      if (selectedCategoria === 'todo') {
        matchCat = true;
      } else if (selectedCategoria === 'Bodega') {
        const mapping = getWineMapping(p);
        matchCat = p.categoria === 'Bodega' || mapping.macro === 'destilados';
      } else {
        matchCat = p.categoria === selectedCategoria;
      }

      // 2. Text Search match
      const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchCat || !matchSearch) return false;

      // 3. Hierarchical Wine/Bodega filter
      if (selectedCategoria === 'Bodega') {
        const mapping = getWineMapping(p);
        
        // Macro category filter
        if (selectedWineMacro !== 'todo' && mapping.macro !== selectedWineMacro) {
          return false;
        }

        // Varietal filter
        if (selectedWineVarietal !== 'todo' && !mapping.varietales.includes(selectedWineVarietal)) {
          return false;
        }
      }

      return p.activo;
    });
  }, [productosMenu, selectedCategoria, searchQuery, selectedWineMacro, selectedWineVarietal]);

  // Helper: check how much of an insumo would be required by the current cart
  const calculateCartInsumoRequirements = (tempCart: { [id_producto: string]: number }) => {
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
  };

  // Helper: evaluate if adding 1 unit of a product breaches current stock
  const evaluateStockAdd = (productoId: string): { allowed: boolean; warning?: string; isCritical: boolean } => {
    const nextCart = { ...cart, [productoId]: (cart[productoId] || 0) + 1 };
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
            warning: `¡BLOQUEDADO! Sin material suficiente de: "${insumo.nombre}". Se requiere ${reqAmount}${insumo.unidad_medida} y el stock actual es de ${insumo.stock_actual}${insumo.unidad_medida}.` 
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
  };

  // Quick check of remaining simulated capacity for UI tags
  const getSimulatedStockRemaining = (prod: ProductoMenu) => {
    // Find recipes associated to this product
    const productRecipes = recetas.filter(r => r.id_producto === prod.id_producto);
    let maxPlatesSimulated = 999;

    productRecipes.forEach(rec => {
      const insumo = insumos.find(i => i.id_insumo === rec.id_insumo);
      if (insumo) {
        const remainingForThis = Math.floor(insumo.stock_actual / rec.cantidad_a_descontar);
        if (remainingForThis < maxPlatesSimulated) {
          maxPlatesSimulated = remainingForThis;
        }
      }
    });

    return maxPlatesSimulated === 999 ? 0 : maxPlatesSimulated;
  };

  // Cart operations
  const handleAddToCart = (productoId: string) => {
    if (!selectedMesaId) {
      alert("Por favor seleccione primero una mesa.");
      return;
    }
    const evalResult = evaluateStockAdd(productoId);
    if (!evalResult.allowed) {
      addLog('alerta_stock', `Cancelado intento de pedido: ${evalResult.warning}`);
      return;
    }
    
    setCart(prev => ({
      ...prev,
      [productoId]: (prev[productoId] || 0) + 1
    }));
  };

  const handleRemoveFromCart = (productoId: string) => {
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

  const checkoutCart = () => {
    if (!selectedMesaId) return;
    if (Object.keys(cart).length === 0) return;

    // Double check stock at moment of checkout
    const requirements = calculateCartInsumoRequirements(cart);
    for (const [insumoId, reqAmount] of Object.entries(requirements)) {
      const insumo = insumos.find(i => i.id_insumo === insumoId);
      if (insumo && insumo.stock_actual < reqAmount) {
        alert(`No es posible procesar la orden. Se agotó un insumo clave: ${insumo.nombre}`);
        return;
      }
    }

    // Build items list
    const items: PedidoItem[] = Object.entries(cart).map(([prodId, qty]) => {
      const p = productosMenu.find(item => item.id_producto === prodId)!;
      return {
        id_producto: prodId,
        nombre: p.nombre,
        cantidad: Number(qty),
        categoria: p.categoria
      };
    });

    onCrearPedido({
      id_mesa: selectedMesaId,
      numero_mesa: selectedMesa ? selectedMesa.numero_mesa : `Mesa ${selectedMesaId}`,
      mozo: activeMozo,
      estado_comanda: 'pendiente',
      items,
      observaciones: observaciones.trim() || undefined,
    });

    // Reset layout
    setCart({});
    setObservaciones('');
    addLog('pedido_creado', `Mozo ${activeMozo} inyectó pedido para ${selectedMesa?.numero_mesa} con ${items.length} platos.`);
  };

  // Calculating totals
  const totalCartValue = useMemo(() => {
    return Object.entries(cart).reduce((total, [prodId, qty]) => {
      const p = productosMenu.find(item => item.id_producto === prodId);
      return total + (p ? p.precio_venta * Number(qty) : 0);
    }, 0);
  }, [cart, productosMenu]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="mozo-terminal-container">
      {/* LEFT COLUMN: Mesa Grid and active waiter selector */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Active Waiter Picker */}
        <div className="glass-panel rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-stone-400 font-medium font-sans">Mozo en Turno Activo</p>
              <h3 className="font-bold text-slate-800 dark:text-stone-100 font-sans tracking-tight">Terminal Registrada</h3>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['Enzo', 'Micaela', 'Sofía'].map(mozoName => (
              <button
                key={mozoName}
                onClick={() => onMozoChange(mozoName)}
                className={`py-2 px-3 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
                  activeMozo === mozoName 
                    ? 'bg-[#4A2D1B] text-white shadow-md border border-[#C8956A]/30 glow-gold scale-[1.02]' 
                    : 'bg-stone-50 dark:bg-white/5 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-white/10 hover:bg-[#F5F1E9] dark:hover:bg-white/10'
                }`}
              >
                {mozoName}
              </button>
            ))}
          </div>
        </div>

        {/* Mesas Selector Grid */}
        <div className="glass-panel rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 dark:text-stone-105 font-sans tracking-tight flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-slate-550 text-stone-400" />
              Distribución de Mesas
            </h3>
            <span className="text-[11px] font-mono bg-[#4A2D1B]/10 dark:bg-white/10 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded">
              {mesas.filter(m => m.estado === 'ocupada').length} Ocupadas
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {mesas.map(m => {
              const isSelected = m.id_mesa === selectedMesaId;
              const isOcupada = m.estado === 'ocupada';
              const isInCuenta = m.estado === 'esperando_cuenta';
              const isReservada = m.estado === 'reservada';

              // Determine visual theme according to exact state specs
              let stateClasses = "border-stone-200/80 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-stone-50 dark:hover:bg-white/10 text-stone-700 dark:text-stone-350";
              let labelText = "Libre";

              if (isSelected) {
                stateClasses = "bg-[#4A2D1B] text-white border-[#C8956A]/50 shadow-lg scale-[1.03] ring-4 ring-[#C8956A]/20 glow-gold";
                labelText = isOcupada ? "Ocupada (Sel)" : isInCuenta ? "En Cuenta" : isReservada ? "Reservada" : "Libre";
              } else if (isReservada) {
                stateClasses = "border-purple-500/35 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15";
                labelText = "Reservada";
              } else if (isInCuenta) {
                stateClasses = "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 glow-gold";
                labelText = "En Cuenta";
              } else if (isOcupada) {
                stateClasses = "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15";
                labelText = "Ocupada";
              }

              return (
                <button
                  key={m.id_mesa}
                  id={`mesa-btn-${m.id_mesa}`}
                  onClick={() => {
                    setSelectedMesaId(m.id_mesa);
                    // Prepopulate comensales if occupied
                    if (m.estado === 'ocupada' && m.comensales) {
                      setComensales(m.comensales);
                    }
                  }}
                  className={`p-2.5 rounded-xl flex flex-col justify-between items-center transition-all aspect-square border cursor-pointer ${stateClasses}`}
                >
                  <span className="text-xs font-black font-sans">{m.numero_mesa}</span>
                  {isOcupada ? (
                    <div className="flex items-center gap-0.5 mt-2">
                      <Users className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                      <span className="text-[10px] font-bold">{m.comensales || 0}</span>
                    </div>
                  ) : isInCuenta ? (
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400">Salar</span>
                  ) : (
                    <span className={`text-[8px] uppercase tracking-wider font-semibold opacity-80 ${isSelected ? 'text-white/60' : ''}`}>{labelText}</span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedMesa && (
            <div className="mt-4 pt-4 border-t border-slate-50 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{selectedMesa.numero_mesa}</h4>
                  <p className="text-xs text-slate-400">
                    Estado: <span className={selectedMesa.estado === 'ocupada' ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                      {selectedMesa.estado === 'ocupada' ? 'Ocupada / Con Pedido' : 'Libre para comandar'}
                    </span>
                  </p>
                </div>
                {selectedMesa.estado === 'libre' && (
                  <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg p-1 gap-2">
                    <button 
                      onClick={() => setComensales(c => Math.max(1, c - 1))}
                      className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold px-1">{comensales}</span>
                    <button 
                      onClick={() => setComensales(c => c + 1)}
                      className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-slate-400 mr-1">pax</span>
                  </div>
                )}
              </div>

              {/* ACTIVE ORDER CONTROLS (IF TABLE OCCUPIED) */}
              {activePedidoDeMesa ? (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Orden Activa #{activePedidoDeMesa.id_pedido}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      activePedidoDeMesa.estado_comanda === 'listo' 
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : activePedidoDeMesa.estado_comanda === 'en_cocina'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {activePedidoDeMesa.estado_comanda === 'en_cocina' ? 'En Fuego 🔥' : activePedidoDeMesa.estado_comanda}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {activePedidoDeMesa.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-600">
                        <span>{it.cantidad}x {it.nombre}</span>
                        <span className="font-mono text-slate-400 font-medium">
                          ${(productosMenu.find(p => p.id_producto === it.id_producto)?.precio_venta || 0).toLocaleString('es-AR')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSplittingPedidoId(activePedidoDeMesa.id_pedido)}
                      className="flex-1 py-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5 text-slate-500" />
                      Dividir Cuenta
                    </button>
                    <button
                      onClick={() => onFacturarMesa(activePedidoDeMesa.id_pedido)}
                      className="flex-1 py-1 px-2.5 bg-slate-900 border border-slate-9 border-transparent hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      Cobrar Mesa
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-amber-50/50 border border-amber-100/30 p-2 text-center rounded-lg">
                  🍳 Mesa lista para recibir comandas. Agrega ítems a la canasta de la derecha.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTRAL COLUMN: Product Catalog */}
      <div className="lg:col-span-5 space-y-4">
        <div className="glass-panel rounded-3xl p-5 shadow-sm space-y-3.5">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
            <h3 className="font-extrabold text-xs text-[#4A2D1B] dark:text-[#C8956A] tracking-wider uppercase">Filtro de Categorías Premium</h3>
            <div className="relative w-full md:w-56">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar plato o bebida..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#4A2D1B]/5 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 rounded-xl text-xs text-stone-700 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4A2D1B] focus:border-[#4A2D1B] transition-all"
              />
            </div>
          </div>

          <div className="flex gap-1.5 w-full overflow-x-auto py-1 scrollbar-thin scroll-smooth border-t border-stone-200/30 pt-3">
            {[
              { id: 'todo', label: 'Todos 🍽️' },
              { id: 'Entradas', label: 'Entradas 🥗' },
              { id: 'Pastas', label: 'Pastas 🍝' },
              { id: 'Carnes', label: 'Carnes 🥩' },
              { id: 'Pescados', label: 'Pescados 🐟' },
              { id: 'Comidas Criollas', label: 'Criollas 🥧' },
              { id: 'Postres', label: 'Postres 🍰' },
              { id: 'Bebidas', label: 'Bebidas 🥤' },
              { id: 'Bodega', label: 'Bodega 🍷' }
            ].map(cat => {
              const isActive = selectedCategoria === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoria(cat.id);
                    if (cat.id !== 'Bodega') {
                      setSelectedWineMacro('todo');
                      setSelectedWineVarietal('todo');
                    }
                  }}
                  className={`relative py-1.5 px-3 text-xs font-extrabold rounded-lg whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 z-10 ${
                    isActive 
                      ? 'text-white font-black' 
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryIndicator"
                      className="absolute inset-0 bg-[#4A2D1B] rounded-lg -z-10 shadow-md border border-[#C8956A]/20"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* HIERARCHICAL BODEGA/WINE BROWSER */}
          {selectedCategoria === 'Bodega' && (
            <div className="space-y-2.5 pt-3 border-t border-stone-250/30 transition-all duration-300">
              {/* Macro categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'todo', label: 'Todo Bodega 🍷' },
                  { id: 'tintas', label: 'Bodegas Tintas 🍷' },
                  { id: 'blancas', label: 'Bodegas Blancas 🥂' },
                  { id: 'champagne', label: 'Champagne & Espumantes 🍾' },
                  { id: 'destilados', label: 'Destilados & Aperitivos 🥃' }
                ].map(macro => (
                  <button
                    key={macro.id}
                    onClick={() => {
                      setSelectedWineMacro(macro.id as any);
                      setSelectedWineVarietal('todo');
                    }}
                    className={`py-1 px-2.5 text-[10px] md:text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                      selectedWineMacro === macro.id
                        ? 'bg-[#4A2D1B] text-white shadow-sm'
                        : 'bg-stone-50 dark:bg-white/5 text-stone-500 dark:text-stone-400 hover:bg-stone-100 hover:text-stone-850 dark:hover:bg-white/10 border border-stone-200/60 dark:border-white/10'
                    }`}
                  >
                    {macro.label}
                  </button>
                ))}
              </div>

              {/* Varietals sub-menu for Tintas and Blancas */}
              {(selectedWineMacro === 'tintas' || selectedWineMacro === 'blancas') && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap bg-stone-50/50 dark:bg-stone-900/40 p-1.5 rounded-lg border border-stone-100/80 dark:border-white/5">
                  <span className="text-[9px] text-[#4A2D1B] dark:text-[#C8956A] font-black uppercase tracking-wider shrink-0 mr-1">Varietal:</span>
                  <button
                    onClick={() => setSelectedWineVarietal('todo')}
                    className={`py-0.5 px-2.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                      selectedWineVarietal === 'todo'
                        ? 'bg-amber-900/10 dark:bg-amber-500/10 text-[#4A2D1B] dark:text-[#C8956A] border border-amber-900/20 dark:border-amber-500/20'
                        : 'bg-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                    }`}
                  >
                    Todos
                  </button>
                  {(selectedWineMacro === 'tintas'
                    ? ['Malbec', 'Cabernet Sauvignon', 'Red Blend', 'Cabernet Franc', 'Merlot', 'Pinot Noir', 'Otros Varietales Tintos']
                    : ['Chardonnay', 'Sauvignon Blanc', 'Torrontés', 'Riesling', 'Gewurztraminer', 'Albariño']
                  ).map(varName => (
                    <button
                      key={varName}
                      onClick={() => setSelectedWineVarietal(varName)}
                      className={`py-0.5 px-2.5 text-[9px] font-black rounded whitespace-nowrap transition-all cursor-pointer ${
                        selectedWineVarietal === varName
                          ? 'bg-[#4A2D1B] text-white shadow-sm'
                          : 'bg-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                      }`}
                    >
                      {varName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
          {filteredProducts.map(p => {
            const stockRemaining = getSimulatedStockRemaining(p);
            const isOutOfStock = stockRemaining <= 0;
            const isLowStock = stockRemaining > 0 && stockRemaining <= 3;
            const currentInCart = cart[p.id_producto] || 0;

            return (
              <motion.div
                key={p.id_producto}
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => !isOutOfStock && handleAddToCart(p.id_producto)}
                className={`group cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 relative border ${
                  isOutOfStock 
                    ? 'opacity-60 border-rose-100 pointer-events-none bg-stone-50 dark:bg-stone-900/40' 
                    : currentInCart > 0 
                      ? 'border-[#4A2D1B] bg-[#4A2D1B]/5 dark:bg-white/5 ring-1 ring-[#C8956A]/20' 
                      : 'glass-panel border-stone-200/80 dark:border-white/10'
                }`}
                style={{ contentVisibility: 'auto' }}
              >
                {/* Product Image */}
                <div className="h-28 w-full bg-stone-50 dark:bg-stone-900/60 relative overflow-hidden">
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Category icon badge */}
                  <div className="absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md bg-white/90 shadow-sm border border-stone-100">
                    {p.categoria === 'bebidas' ? (
                      <Wine className="w-3.5 h-3.5 text-[#4A2D1B]" />
                    ) : (
                      <UtensilsCrossed className="w-3.5 h-3.5 text-[#4A2D1B]" />
                    )}
                  </div>

                  {/* Stock Tag Alert */}
                  {isOutOfStock ? (
                    <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center text-center p-2">
                      <span className="bg-[#EF4444] text-white text-[10px] uppercase font-extrabold tracking-wider px-2 py-1 rounded-md shadow flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-white" />
                        Sin Stock (Fórmulas 0)
                      </span>
                    </div>
                  ) : isLowStock ? (
                    <div className="absolute top-2 right-2">
                      <span className="bg-[#F97316] text-white text-[9px] font-extrabold px-2 py-0.5 rounded shadow">
                        Bajo stock: {stockRemaining}u
                      </span>
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2">
                      <span className="bg-[#22C55E] text-white text-[9px] font-extrabold px-2 py-0.5 rounded shadow">
                        Disp: {stockRemaining}u
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3 flex justify-between items-center bg-white dark:bg-[#4A2D1B]/40">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-stone-850 dark:text-stone-150 text-xs font-sans line-clamp-1 leading-snug group-hover:text-[#4A2D1B] dark:group-hover:text-[#C8956A] transition-colors">
                      {p.nombre}
                    </h4>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-stone-900 dark:text-stone-100 font-mono text-xs font-black">
                        ${p.precio_venta.toLocaleString('es-AR')}
                      </span>
                      {currentInCart > 0 && (
                        <span className="bg-[#4A2D1B] text-white rounded-full px-1.5 py-0.1 text-[9px] font-black font-mono">
                          {currentInCart} en bolsa
                        </span>
                      )}
                    </div>
                  </div>

                  {/* elastic sum button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOutOfStock) handleAddToCart(p.id_producto);
                    }}
                    className="w-8 h-8 rounded-full bg-[#4A2D1B] text-white hover:bg-[#5d3a2e] active:scale-90 transition-all duration-150 flex items-center justify-center font-bold shadow-md shadow-[#4A2D1B]/20 cursor-pointer border border-amber-950/10 shrink-0"
                    title="Añadir a comanda"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Comanda Cart Summary */}
      <div className="lg:col-span-3">
        <div className="glass-panel rounded-3xl p-5 shadow-sm flex flex-col h-[520px] sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/30">
            <h3 className="font-bold text-slate-800 dark:text-stone-105 text-sm font-sans flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-stone-500" />
              Nueva Comanda
            </h3>
            {selectedMesa && (
              <span className="bg-[#4A2D1B] text-white border border-[#C8956A]/20 font-sans text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-sm">
                {selectedMesa.numero_mesa}
              </span>
            )}
          </div>

          {!selectedMesaId ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
              <div className="w-12 h-12 bg-stone-100 dark:bg-white/5 text-stone-400 dark:text-stone-500 rounded-full flex items-center justify-center mb-3">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-700 dark:text-stone-300 text-xs">Seleccione Mesa</h4>
              <p className="text-stone-400 dark:text-stone-500 text-[10px] mt-1 max-w-[180px]">
                Marque una mesa disponible en el plano izquierdo para iniciar la comanda.
              </p>
            </div>
          ) : Object.keys(cart).length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-700 dark:text-stone-300 text-xs">Comanda Vacía</h4>
              <p className="text-stone-400 dark:text-stone-500 text-[10px] mt-1 max-w-[180px]">
                Toque los platos de la carta central para cargarlos a la mesa de forma interactiva.
              </p>
            </div>
          ) : (
            <>
              {/* CART ITEMS LIST */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                {Object.entries(cart).map(([prodId, qty]) => {
                  const p = productosMenu.find(item => item.id_producto === prodId)!;
                  return (
                    <div key={prodId} className="flex justify-between items-center text-xs bg-[#4A2D1B]/5 dark:bg-white/5 p-2 rounded-xl border border-stone-200/50 dark:border-white/10 hover:border-[#C8956A]/20 transition-all">
                      <div className="flex-1 pr-1 font-sans">
                        <span className="font-bold text-stone-850 dark:text-stone-150 line-clamp-1">{p.nombre}</span>
                        <span className="text-[10px] text-stone-400 font-mono">${(p.precio_venta).toLocaleString('es-AR')} u.</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRemoveFromCart(prodId)}
                          className="w-5 h-5 bg-white dark:bg-[#4A2D1B]/80 text-stone-700 dark:text-stone-205 hover:bg-slate-100 dark:hover:bg-[#4A2D1B] rounded border border-slate-200 dark:border-white/15 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-bold w-4 text-center dark:text-stone-100">{qty}</span>
                        <button
                          onClick={() => handleAddToCart(prodId)}
                          className="w-5 h-5 bg-white dark:bg-[#4A2D1B]/80 text-stone-700 dark:text-stone-205 hover:bg-slate-100 dark:hover:bg-[#4A2D1B] rounded border border-slate-200 dark:border-white/15 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* OBSERVATIONS INPUT */}
              <div className="mt-2 space-y-1.5 pb-3">
                <label className="text-[10px] font-bold text-slate-500 dark:text-stone-450 uppercase tracking-wider flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-slate-400" />
                  Observaciones de Comanda
                </label>
                <textarea
                  placeholder="Ej: Bife bien cocido, papas sin sal, agua a temperatura ambiente..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full text-xs bg-[#4A2D1B]/5 dark:bg-white/5 text-stone-800 dark:text-stone-200 p-2 border border-stone-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4A2D1B] focus:border-[#4A2D1B] resize-none h-14"
                />
              </div>

              {/* FOOTER TOTAL & INJECT BTN */}
              <div className="pt-3 border-t border-stone-200/30 space-y-3">
                <div className="flex justify-between items-center text-sm font-sans font-medium text-stone-700 dark:text-stone-300">
                  <span>Monto Total:</span>
                  <span className="font-mono font-extrabold text-stone-900 dark:text-stone-100 text-base">
                    ${totalCartValue.toLocaleString('es-AR')}
                  </span>
                </div>

                <button
                  onClick={checkoutCart}
                  className="w-full py-2.5 px-4 btn-premium-primary text-xs font-black flex items-center justify-center gap-2 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-350" />
                  Enviar a Cocina (Nuevo Pedido) 🚀
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* BILL SPLITTING MODAL (MODO DIVISION DE CUENTAS) */}
      {splittingPedidoId !== null && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="glass-panel rounded-3xl p-6 shadow-2xl max-w-md w-full border border-[#C8956A]/20">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-sans tracking-tight flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Divisor de Cuentas Gastronómico
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-0.5">
                  Mesa {pedidos.find(p => p.id_pedido === splittingPedidoId)?.numero_mesa} • Orden #{splittingPedidoId}
                </p>
              </div>
              <button
                onClick={() => {
                  setSplittingPedidoId(null);
                  setSplitItemsChecked({});
                }}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-205 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const p = pedidos.find(o => o.id_pedido === splittingPedidoId);
              if (!p) return null;

              const orderTotal = p.items.reduce((sum, item) => {
                const prod = productosMenu.find(pr => pr.id_producto === item.id_producto);
                return sum + (prod ? prod.precio_venta * item.cantidad : 0);
              }, 0);

              // Expand items list by their quantity for itemized selection
              const expandedItemsList: { item: PedidoItem; index: number; singlePrice: number }[] = [];
              let curIdx = 0;
              p.items.forEach(it => {
                const prod = productosMenu.find(pr => pr.id_producto === it.id_producto);
                const sPrice = prod ? prod.precio_venta : 0;
                for (let i = 0; i < it.cantidad; i++) {
                  expandedItemsList.push({ item: it, index: curIdx++, singlePrice: sPrice });
                }
              });

              // Selected items total
              const itemizedTotal = Object.entries(splitItemsChecked).reduce((total, [idxStr, checked]) => {
                if (!checked) return total;
                const idx = parseInt(idxStr);
                return total + (expandedItemsList[idx]?.singlePrice || 0);
              }, 0);

              return (
                <div className="space-y-4">
                  {/* Option A: Equitative Split */}
                  <div className="bg-[#4A2D1B]/5 dark:bg-white/5 p-3 rounded-xl border border-stone-200/50 dark:border-white/10">
                    <h4 className="text-xs font-bold text-[#4A2D1B] dark:text-[#C8956A] mb-2 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-stone-500" />
                      A. División Equitativa (Por Comensales)
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-white dark:bg-[#4A2D1B]/80 border border-stone-200 dark:border-white/10 rounded-lg p-1.5 gap-2.5">
                        <button 
                          onClick={() => setSplitCount(c => Math.max(2, c - 1))}
                          className="w-5 h-5 rounded bg-stone-100 dark:bg-stone-850 text-stone-650 dark:text-stone-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold font-mono text-stone-850 dark:text-stone-100">{splitCount}</span>
                        <button 
                          onClick={() => setSplitCount(c => c + 1)}
                          className="w-5 h-5 rounded bg-stone-100 dark:bg-stone-850 text-stone-650 dark:text-stone-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-stone-400">personas</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#4A2D1B] dark:text-stone-400 font-medium">Equivale a:</p>
                        <p className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                          ${(orderTotal / splitCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })} c/u
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option B: Split by Select/Chair consumption */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#4A2D1B] dark:text-[#C8956A] flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-stone-500" />
                      B. Desglose Específico (Silla / Consumo Unitario)
                    </h4>
                    
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 italic">
                      Tilde los platos que pagará este comensal de manera individual:
                    </p>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto border border-stone-200/50 dark:border-white/10 rounded-xl p-2 bg-stone-50 dark:bg-stone-900/40">
                      {expandedItemsList.map(({ item, index, singlePrice }) => (
                        <label 
                          key={index}
                          className="flex items-center justify-between text-xs p-1.5 bg-white dark:bg-[#4A2D1B]/40 border border-stone-100 dark:border-white/5 rounded hover:bg-stone-50 dark:hover:bg-[#4A2D1B]/60 hover:border-stone-250 dark:hover:border-[#C8956A]/20 cursor-pointer transition-all text-stone-750 dark:text-stone-200"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!splitItemsChecked[index]}
                              onChange={(e) => {
                                setSplitItemsChecked(prev => ({
                                  ...prev,
                                  [index]: e.target.checked
                                }));
                              }}
                              className="rounded border-stone-300 dark:border-white/20 text-[#4A2D1B] dark:text-[#C8956A] focus:ring-[#4A2D1B] w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="font-semibold text-stone-850 dark:text-stone-100">{item.nombre}</span>
                          </div>
                          <span className="font-mono text-[11px] text-stone-600 dark:text-stone-300 font-bold">${singlePrice.toLocaleString('es-AR')}</span>
                        </label>
                      ))}
                    </div>

                    {itemizedTotal > 0 && (
                      <div className="flex justify-between items-center bg-[#4A2D1B] text-[#FAF7F0] border border-[#C8956A]/20 rounded-xl p-3.5 shadow-md">
                        <div>
                          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Pago Seleccionado</span>
                          <h4 className="font-mono font-extrabold text-sm">${itemizedTotal.toLocaleString('es-AR')}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Sobrante Total</span>
                          <p className="font-mono text-[11px] font-semibold">${(orderTotal - itemizedTotal).toLocaleString('es-AR')}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Facturar Botonera */}
                  <div className="pt-3 border-t border-stone-200/30 flex gap-2">
                    <button
                      onClick={() => {
                        setSplittingPedidoId(null);
                        setSplitItemsChecked({});
                      }}
                      className="flex-1 py-2 text-xs bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/15 text-stone-650 dark:text-stone-350 font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      onClick={() => {
                        const amntToPay = itemizedTotal > 0 ? itemizedTotal : orderTotal;
                        alert(`Se procesó el cobro de $${amntToPay.toLocaleString('es-AR')} para ${p.numero_mesa}.`);
                        
                        // If fully paid or equal split, complete it
                        if (itemizedTotal === 0 || itemizedTotal === orderTotal) {
                          onFacturarMesa(p.id_pedido);
                        } else {
                          // partial pay, we log it
                          addLog('sistema', `Mesa ${p.numero_mesa}: Cobro parcial de $${itemizedTotal.toLocaleString('es-AR')} recibido.`);
                        }
                        setSplittingPedidoId(null);
                        setSplitItemsChecked({});
                      }}
                      className="flex-1 py-2 text-xs bg-[#4A2D1B] hover:bg-[#5d3a2e] text-[#FAF7F0] border border-[#C8956A]/20 font-bold rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Cobrar ${ (itemizedTotal > 0 ? itemizedTotal : orderTotal).toLocaleString('es-AR') }
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
