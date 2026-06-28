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
  UserCheck,
  Mic,
  MicOff,
  Volume2,
  X
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
    } else if (
      sub.includes('blancos') || 
      name.includes('sauvignon blanc') || name.includes('sauvignon-blanc') || name.includes('sb') ||
      name.includes('chardonnay') || 
      name.includes('viognier') || 
      name.includes('torrontés') || name.includes('torrontes') || 
      name.includes('riesling') || 
      name.includes('gewurztraminer') || 
      name.includes('albariño')
    ) {
      macro = 'blancas';
    } else {
      macro = 'tintas';
    }
  } else if (p.categoria === 'Bebidas' || p.categoria === 'Bebidas con Alcohol' || p.categoria === 'Bebidas sin Alcohol') {
    const sub = (p.subcategoria || '').toLowerCase();
    if (sub.includes('whisky') || sub.includes('gin') || sub.includes('fernet') || sub.includes('aperitivos') || name.includes('macallan') || name.includes('gin') || name.includes('fernet') || name.includes('aperol') || name.includes('spritz')) {
      macro = 'destilados';
    }
  }

  if (macro === 'tintas') {
    // Malbec
    if (name.includes('malbec')) {
      varietales.push('Malbec');
    }

    // Cabernet Sauvignon
    if (name.includes('cabernet sauvignon') || name.includes('cab-sauv') || name.includes('cs')) {
      varietales.push('Cabernet Sauvignon');
    }

    // Cabernet Franc
    if (name.includes('cabernet franc') || name.includes('cf')) {
      varietales.push('Cabernet Franc');
    }

    // Merlot
    if (name.includes('merlot')) {
      varietales.push('Merlot');
    }

    // Pinot Noir
    if (name.includes('pinot noir') || name.includes('pinot')) {
      varietales.push('Pinot Noir');
    }

    // Red Blend
    if (name.includes('red blend') || name.includes('blend') || name.includes('gran reserva')) {
      varietales.push('Red Blend');
    }

    // Otros Varietales Tintos (Ancellotta, Tannat, Petit Verdot)
    if (
      name.includes('ancelotta') || 
      name.includes('tannat') || 
      name.includes('petit verdot') || 
      name.includes('ala colorada')
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

  // Voice Command States
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceCommandResult | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = React.useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta control por voz. Probá con Google Chrome.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'es-AR';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setVoiceText(transcript);
        const parsed = parseVoiceCommand(transcript, productosMenu);
        setVoiceResult(parsed);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        alert('No se pudo escuchar con claridad. Por favor reintentá.');
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleConfirmVoiceCommand = () => {
    if (!voiceResult) return;

    // 1. If mesa is detected, set it as selected
    if (voiceResult.mesa !== null) {
      if (voiceResult.mesa === 'delivery') {
        setSelectedMesaId(999);
      } else {
        const targetMesa = mesas.find(m => parseInt(m.numero_mesa, 10) === voiceResult.mesa);
        if (targetMesa) {
          setSelectedMesaId(targetMesa.id_mesa);
        } else {
          alert(`La Mesa ${voiceResult.mesa} no existe o no está activa.`);
        }
      }
    }

    // 2. Add items to cart
    setCart(prev => {
      const next = { ...prev };
      voiceResult.items.forEach(item => {
        const prodId = item.product.id_producto;
        next[prodId] = (next[prodId] || 0) + item.quantity;
      });
      return next;
    });

    setVoiceResult(null);
  };

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
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium font-sans">Mozo en Turno Activo</p>
              <h3 className="font-bold text-[#4A2D1B] dark:text-stone-105 font-sans tracking-tight">Terminal Registrada</h3>
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
                    : 'bg-stone-50 dark:bg-white/10 text-stone-700 dark:text-white border border-stone-200 dark:border-white/15 hover:bg-[#F5F1E9] dark:hover:bg-white/20'
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
            <h3 className="font-bold text-[#4A2D1B] dark:text-stone-105 font-sans tracking-tight flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-[#C8956A] dark:text-[#C8956A]" />
              Distribución de Mesas
            </h3>
            <span className="text-[11px] font-mono bg-[#4A2D1B]/10 dark:bg-amber-500/10 text-[#4A2D1B] dark:text-[#C8956A] px-2 py-0.5 rounded font-bold">
              {mesas.filter(m => m.estado === 'ocupada').length} Ocupadas
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {mesas.map(m => {
              const isSelected = m.id_mesa === selectedMesaId;
              const isOcupada = m.estado === 'ocupada';
              const isInCuenta = m.estado === 'esperando_cuenta';
              const isReservada = m.estado === 'reservada';

              // Determine visual theme according to exact state specs (El Patrón warm design system)
              let stateClasses = "border-stone-250 dark:border-[#C8956A]/10 bg-[#FAF7F0]/40 dark:bg-[#1A110B]/85 hover:bg-[#FAF7F0] dark:hover:bg-[#251B12]/80 text-stone-750 dark:text-stone-300 hover:border-[#C8956A]/30";
              let labelText = "Libre";

              if (isSelected) {
                stateClasses = "bg-[#4A2D1B] text-white border-[#C8956A] shadow-lg scale-[1.03] ring-4 ring-[#C8956A]/20 glow-gold";
                labelText = isOcupada ? "Ocupada (Sel)" : isInCuenta ? "En Cuenta" : isReservada ? "Reservada" : "Libre";
              } else if (isReservada) {
                stateClasses = "border-fuchsia-750/30 bg-fuchsia-750/10 text-fuchsia-800 dark:text-fuchsia-300 hover:bg-fuchsia-750/15";
                labelText = "Reservada";
              } else if (isInCuenta) {
                stateClasses = "border-[#E8B800]/40 bg-[#E8B800]/10 text-amber-800 dark:text-amber-400 hover:bg-[#E8B800]/15 glow-gold";
                labelText = "En Cuenta";
              } else if (isOcupada) {
                // Warm, rich red/terracotta for occupied tables to match El Patron
                stateClasses = "border-[#9B2226]/35 bg-[#9B2226]/10 text-[#9B2226] dark:text-red-400 hover:bg-[#9B2226]/15";
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
                      <Users className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#9B2226] dark:text-red-400'}`} />
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
            <div className="mt-4 pt-4 border-t border-stone-200/30 dark:border-white/10 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-[#4A2D1B] dark:text-[#C8956A]">{selectedMesa.numero_mesa}</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Estado: <span className={selectedMesa.estado === 'ocupada' ? 'text-[#9B2226] font-bold dark:text-red-400' : 'text-[#3A5A40] dark:text-[#22C55E]'}>
                      {selectedMesa.estado === 'ocupada' ? 'Ocupada / Con Pedido' : 'Libre para comandar'}
                    </span>
                  </p>
                </div>
                {selectedMesa.estado === 'libre' && (
                  <div className="flex items-center bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-white/10 rounded-lg p-1 gap-2">
                    <button 
                      onClick={() => setComensales(c => Math.max(1, c - 1))}
                      className="w-6 h-6 rounded bg-white dark:bg-white/10 border border-stone-200 dark:border-white/15 flex items-center justify-center text-stone-700 dark:text-stone-300 hover:bg-[#FAF7F0] dark:hover:bg-white/20 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold px-1 text-stone-850 dark:text-stone-105">{comensales}</span>
                    <button 
                      onClick={() => setComensales(c => c + 1)}
                      className="w-6 h-6 rounded bg-white dark:bg-white/10 border border-stone-200 dark:border-white/15 flex items-center justify-center text-stone-700 dark:text-stone-300 hover:bg-[#FAF7F0] dark:hover:bg-white/20 cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 mr-1">pax</span>
                  </div>
                )}
              </div>

              {/* ACTIVE ORDER CONTROLS (IF TABLE OCCUPIED) */}
              {activePedidoDeMesa ? (
                <div className="bg-stone-50 dark:bg-[#1E140E]/80 rounded-xl p-3 border border-stone-200 dark:border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Orden Activa #{activePedidoDeMesa.id_pedido}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      activePedidoDeMesa.estado_comanda === 'listo' 
                        ? 'bg-[#3A5A40]/10 text-[#3A5A40] dark:text-[#22C55E] animate-pulse'
                        : activePedidoDeMesa.estado_comanda === 'en_cocina'
                        ? 'bg-amber-500/10 text-amber-855 dark:text-[#E8B800]'
                        : 'bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-300'
                    }`}>
                      {activePedidoDeMesa.estado_comanda === 'en_cocina' ? 'En Fuego 🔥' : activePedidoDeMesa.estado_comanda}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {activePedidoDeMesa.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-stone-750 dark:text-stone-300 font-medium">
                        <span>{it.cantidad}x {it.nombre}</span>
                        <span className="font-mono text-stone-500 dark:text-stone-450">
                          ${(productosMenu.find(p => p.id_producto === it.id_producto)?.precio_venta || 0).toLocaleString('es-AR')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSplittingPedidoId(activePedidoDeMesa.id_pedido)}
                      className="flex-1 py-1 px-2.5 bg-[#FAF7F0] dark:bg-[#251B12]/60 border border-[#C8956A]/20 hover:bg-[#F5F1E9] dark:hover:bg-[#4A2D1B]/40 text-[#4A2D1B] dark:text-[#C8956A] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-[#4A2D1B] dark:text-[#C8956A]" />
                      Dividir Cuenta
                    </button>
                    <button
                      onClick={() => onFacturarMesa(activePedidoDeMesa.id_pedido)}
                      className="flex-1 py-1 px-2.5 bg-[#4A2D1B] dark:bg-[#C8956A] border border-transparent hover:bg-[#5d3a2e] dark:hover:bg-[#d8a478] text-[#FAF7F0] dark:text-[#4A2D1B] rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 transition-colors shadow-sm cursor-pointer"
                    >
                      Cobrar Mesa
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#4A2D1B] dark:text-[#C8956A] font-serif-rustic italic bg-[#FAF7F0]/60 dark:bg-[#1E140E]/80 border border-[#C8956A]/25 p-3 text-center rounded-xl shadow-inner">
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
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center w-full">
            <h3 className="font-extrabold text-xs text-[#4A2D1B] dark:text-[#C8956A] tracking-wider uppercase">Filtro de Categorías Premium</h3>
            <div className="relative w-full md:w-56 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#C8956A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar plato o bebida..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#4A2D1B]/5 dark:bg-[#1E140E]/50 border border-stone-200/80 dark:border-[#C8956A]/20 rounded-xl text-xs text-stone-750 dark:text-stone-200 placeholder-stone-450 focus:outline-none focus:ring-1 focus:ring-[#C8956A] focus:border-[#C8956A] transition-all"
                />
              </div>
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`px-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                  isListening 
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse' 
                    : 'bg-stone-50 dark:bg-white/5 text-stone-500 border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10 hover:text-stone-700'
                }`}
                style={{ minHeight: '34px' }}
                title={isListening ? "Detener dictado por voz" : "Dictar comanda por voz"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
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
              { id: 'Bebidas con Alcohol', label: 'Bebidas C/A 🍺' },
              { id: 'Bebidas sin Alcohol', label: 'Bebidas S/A 🥤' },
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
                      : 'text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50'
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
                        : 'bg-stone-100/50 dark:bg-[#1E140E]/80 text-stone-600 dark:text-stone-300 hover:bg-stone-100 hover:text-[#4A2D1B] dark:hover:bg-[#251B12] dark:hover:text-white border border-stone-200/60 dark:border-[#C8956A]/20'
                    }`}
                  >
                    {macro.label}
                  </button>
                ))}
              </div>

              {/* Varietals sub-menu for Tintas and Blancas */}
              {(selectedWineMacro === 'tintas' || selectedWineMacro === 'blancas') && (
                <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF7F0] dark:bg-[#1C140E] p-2 rounded-lg border border-stone-200 dark:border-[#C8956A]/10">
                  <span className="text-[11px] text-[#4A2D1B] dark:text-[#E8B800] font-black uppercase tracking-wider shrink-0 mr-1.5">Varietal:</span>
                  <button
                    onClick={() => setSelectedWineVarietal('todo')}
                    className={`py-1 px-3 text-[11px] font-bold rounded transition-all cursor-pointer ${
                      selectedWineVarietal === 'todo'
                        ? 'bg-amber-900/10 dark:bg-amber-500/10 text-[#4A2D1B] dark:text-[#C8956A] border border-amber-900/20 dark:border-amber-500/20'
                        : 'bg-transparent text-stone-650 dark:text-stone-300 hover:bg-stone-100 hover:text-stone-700 dark:hover:text-stone-100'
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
                      className={`py-1 px-3 text-[11px] font-bold rounded whitespace-nowrap transition-all cursor-pointer ${
                        selectedWineVarietal === varName
                          ? 'bg-[#4A2D1B] text-white shadow-sm'
                          : 'bg-transparent text-stone-650 dark:text-stone-300 hover:bg-stone-100 hover:text-stone-700 dark:hover:text-stone-100'
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
                    {p.categoria.toLowerCase().includes('bebida') ? (
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
                    <h4 className="font-extrabold text-stone-850 dark:text-white text-xs font-sans line-clamp-1 leading-snug group-hover:text-[#4A2D1B] dark:group-hover:text-[#E8B800] transition-colors">
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
                    className="w-8 h-8 rounded-full bg-[#4A2D1B] text-white hover:bg-[#C8956A] hover:text-[#4A2D1B] active:scale-90 transition-all duration-200 flex items-center justify-center font-bold shadow-md shadow-[#4A2D1B]/20 cursor-pointer border border-amber-950/10 shrink-0"
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
            <h3 className="font-bold text-[#4A2D1B] dark:text-stone-105 text-sm font-sans flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#C8956A]" />
              Nueva Comanda
            </h3>
            {selectedMesa && (
              <span className="bg-[#4A2D1B] text-[#FAF7F0] border border-[#C8956A]/30 font-sans text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-sm">
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
              <p className="text-stone-500 dark:text-stone-400 text-[10px] mt-1 max-w-[180px] font-serif-rustic italic">
                Marque una mesa disponible en el plano izquierdo para iniciar la comanda.
              </p>
            </div>
          ) : Object.keys(cart).length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4 bg-[#FAF7F0]/60 dark:bg-[#1E140E]/30 rounded-2xl border border-stone-200 dark:border-[#C8956A]/10 mt-4">
              <div className="w-12 h-12 bg-[#FAF7F0] dark:bg-[#4A2D1B]/55 text-[#C8956A] rounded-full flex items-center justify-center mb-3 shadow-inner border border-stone-200 dark:border-white/5">
                <Sparkles className="w-5 h-5 text-[#C8956A] dark:text-[#E8B800]" />
              </div>
              <h4 className="font-bold text-[#4A2D1B] dark:text-[#FAF7F0] text-xs">Comanda Vacía</h4>
              <p className="text-stone-550 dark:text-stone-400 text-[10px] mt-1 max-w-[180px] font-serif-rustic italic px-2 leading-relaxed">
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
                    <div key={prodId} className="flex justify-between items-center text-xs bg-stone-50 dark:bg-[#1E140E] p-2.5 rounded-xl border border-stone-200 dark:border-[#C8956A]/15 hover:border-[#C8956A]/45 transition-all">
                      <div className="flex-1 pr-1 font-sans">
                        <span className="font-bold text-[#4A2D1B] dark:text-[#FAF7F0] line-clamp-1">{p.nombre}</span>
                        <span className="text-[10px] text-stone-500 dark:text-stone-350 font-mono">${(p.precio_venta).toLocaleString('es-AR')} u.</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRemoveFromCart(prodId)}
                          className="w-5 h-5 bg-[#FAF7F0] dark:bg-[#251B12] text-stone-750 dark:text-stone-200 hover:bg-[#F5F1E9] dark:hover:bg-[#4A2D1B] rounded border border-stone-300 dark:border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-bold w-4 text-center dark:text-stone-100">{qty}</span>
                        <button
                          onClick={() => handleAddToCart(prodId)}
                          className="w-5 h-5 bg-[#FAF7F0] dark:bg-[#251B12] text-stone-750 dark:text-stone-200 hover:bg-[#F5F1E9] dark:hover:bg-[#4A2D1B] rounded border border-stone-300 dark:border-white/10 flex items-center justify-center transition-colors cursor-pointer"
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
                <label className="text-[10px] font-bold text-stone-600 dark:text-stone-350 uppercase tracking-wider flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-[#C8956A]" />
                  Observaciones de Comanda
                </label>
                <textarea
                  placeholder="Ej: Bife bien cocido, papas sin sal, agua a temperatura ambiente..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full text-xs bg-[#4A2D1B]/5 dark:bg-white/5 text-stone-850 dark:text-stone-200 p-2 border border-stone-200 dark:border-[#C8956A]/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C8956A] focus:border-[#C8956A] resize-none h-14"
                />
              </div>

              {/* FOOTER TOTAL & INJECT BTN */}
              <div className="pt-3 border-t border-stone-200/30 space-y-3">
                <div className="flex justify-between items-center text-sm font-sans font-semibold text-[#4A2D1B] dark:text-stone-300">
                  <span>Monto Total:</span>
                  <span className="font-mono font-black text-[#4A2D1B] dark:text-[#E8B800] text-base">
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
                    
                    <p className="text-[10px] text-stone-400 dark:text-stone-400 italic">
                      Tilde los platos que pagará este comensal de manera individual:
                    </p>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto border border-stone-200 dark:border-[#C8956A]/15 rounded-xl p-2 bg-[#FAF7F0] dark:bg-[#1C140E]">
                      {expandedItemsList.map(({ item, index, singlePrice }) => (
                        <label 
                          key={index}
                          className="flex items-center justify-between text-xs p-1.5 bg-stone-50 dark:bg-[#251B12] border border-stone-200 dark:border-white/10 rounded hover:bg-[#FAF7F0] dark:hover:bg-[#4A2D1B]/40 hover:border-[#C8956A]/30 cursor-pointer transition-all text-stone-750 dark:text-stone-200"
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
                      className="flex-1 py-2 text-xs bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/15 text-stone-650 dark:text-stone-205 font-bold rounded-xl cursor-pointer transition-colors"
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

      {/* Voice Command Confirmation Modal */}
      {voiceResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-105">
            <div className="bg-[#624A3E] text-white p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-amber-300 animate-bounce" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wider uppercase">Confirmar Comanda por Voz</h3>
                <p className="text-[10px] text-amber-200 font-medium">Revisá y confirmá los detalles interpretados</p>
              </div>
              <button 
                onClick={() => setVoiceResult(null)}
                className="ml-auto w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Transcribed Text */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-1">Texto Dictado</span>
                <p className="text-xs text-stone-650 italic">"{voiceText}"</p>
              </div>

              {/* Detected Mesa */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-stone-500">Mesa Detectada:</span>
                <span className="bg-stone-100 border border-stone-200 text-stone-700 font-extrabold text-xs px-3 py-1 rounded-xl">
                  {voiceResult.mesa !== null 
                    ? (voiceResult.mesa === 'delivery' ? 'Pedido Delivery' : `Mesa ${voiceResult.mesa}`) 
                    : selectedMesaId !== null 
                      ? (selectedMesaId === 999 ? 'Mesa Actual (DELIVERY)' : `Mesa Actual (${mesas.find(m => m.id_mesa === selectedMesaId)?.numero_mesa})`) 
                      : 'Ninguna (Se aplicará a mesa seleccionada)'}
                </span>
              </div>

              {/* Detected Items */}
              <div>
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-2">Platos Interpretados</span>
                {voiceResult.items.length === 0 ? (
                  <div className="text-center py-4 text-xs text-stone-400 italic">No se detectaron platos válidos en el dictado.</div>
                ) : (
                  <div className="space-y-2">
                    {voiceResult.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-stone-50 border border-stone-205 p-3 rounded-2xl">
                        <div className="min-w-0 pr-2 col-span-1">
                          <span className="text-xs font-bold text-stone-750 block truncate">{item.product.nombre}</span>
                          <span className="text-[10px] text-stone-450 block">${item.product.precio_venta} c/u</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            onClick={() => {
                              setVoiceResult(prev => {
                                if (!prev) return null;
                                const updatedItems = [...prev.items];
                                if (updatedItems[idx].quantity > 1) {
                                  updatedItems[idx].quantity -= 1;
                                } else {
                                  updatedItems.splice(idx, 1);
                                }
                                return { ...prev, items: updatedItems };
                              });
                            }}
                            className="w-7 h-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-550 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-stone-850 w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => {
                              setVoiceResult(prev => {
                                if (!prev) return null;
                                const updatedItems = [...prev.items];
                                updatedItems[idx].quantity += 1;
                                return { ...prev, items: updatedItems };
                              });
                            }}
                            className="w-7 h-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-550 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unrecognized items alert */}
              {voiceResult.unrecognized.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-3 rounded-2xl flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <div className="text-[10px] leading-relaxed">
                    <span className="font-bold block mb-0.5">Texto no reconocido:</span>
                    <p className="italic">"{voiceResult.unrecognized.join(', ')}"</p>
                    <p className="mt-1 text-stone-400">Verificá si el nombre del plato coincide exactamente con la carta.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50 flex gap-2.5 justify-end">
              <button
                onClick={() => setVoiceResult(null)}
                className="px-4 py-2 bg-stone-200 text-stone-650 rounded-xl text-xs font-extrabold hover:bg-stone-300 cursor-pointer transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={handleConfirmVoiceCommand}
                disabled={voiceResult.items.length === 0}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Confirmar y Cargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface VoiceCommandResult {
  mesa: number | 'delivery' | null;
  items: { product: ProductoMenu; quantity: number }[];
  unrecognized: string[];
}

export const parseVoiceCommand = (text: string, productosMenu: ProductoMenu[]): VoiceCommandResult => {
  const lower = text.toLowerCase();
  
  // 1. Detect table number or delivery
  let mesa: number | 'delivery' | null = null;
  if (lower.includes('delivery') || lower.includes('envio') || lower.includes('envió') || lower.includes('para llevar')) {
    mesa = 'delivery';
  } else {
    const mesaMatch = lower.match(/\b(?:mesa|tabla)\s*(\d{1,2})\b/) || lower.match(/\b(?:mesa|tabla)\s*(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/);
    if (mesaMatch) {
      const rawVal = mesaMatch[1] || mesaMatch[2] || '';
      if (/^\d+$/.test(rawVal)) {
        mesa = parseInt(rawVal, 10);
      } else {
        const wordsMap: Record<string, number> = {
          uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10
        };
        mesa = wordsMap[rawVal] || null;
      }
    }
  }

  // 2. Helper to normalize name for comparison (removes accents, plurals, special characters)
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/s\b/g, "")            // remove plural 's' at word boundaries
      .replace(/s$/g, "")             // remove trailing 's'
      .replace(/[^a-z0-9\s]/g, "")    // remove special chars
      .replace(/\s+/g, " ")           // collapse spaces
      .trim();
  };

  const numbersWordMap: Record<string, number> = {
    un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10
  };

  // Split sentence by connector words like "y", "," or "con"
  const segments = lower.split(/\b(?:y|,|con)\b/);
  const items: { product: ProductoMenu; quantity: number }[] = [];
  const unrecognized: string[] = [];

  segments.forEach(segment => {
    const cleanSegment = segment.trim();
    if (!cleanSegment || cleanSegment.startsWith('mesa') || cleanSegment.startsWith('tabla')) return;

    // Try to extract quantity at the beginning (only match numbers or known number words followed by a space)
    let qty = 1;
    const qtyMatch = cleanSegment.match(/^(\d+)\s+(.*)$/) || cleanSegment.match(/^(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(.*)$/i);
    let potentialProductName = cleanSegment;

    if (qtyMatch) {
      const potentialQty = qtyMatch[1].toLowerCase();
      const rest = qtyMatch[2];
      if (/^\d+$/.test(potentialQty)) {
        qty = parseInt(potentialQty, 10);
        potentialProductName = rest;
      } else if (numbersWordMap[potentialQty]) {
        qty = numbersWordMap[potentialQty];
        potentialProductName = rest;
      }
    }

    const cleanProdName = potentialProductName.trim();
    if (!cleanProdName) return;

    // Normalize target product query
    const targetNormalized = normalizeName(cleanProdName);
    if (!targetNormalized) return;

    // Search for best matching product
    let bestProduct: ProductoMenu | null = null;
    let maxMatchScore = 0;

    const segmentTokens = targetNormalized.split(/\s+/).filter(t => t.length > 1);

    productosMenu.forEach(p => {
      const pNormalized = normalizeName(p.nombre);
      
      // 1. Direct exact match (highest priority)
      if (pNormalized === targetNormalized) {
        bestProduct = p;
        maxMatchScore = 100;
        return;
      }
      
      // 2. Substring matching
      if (pNormalized.includes(targetNormalized) || targetNormalized.includes(pNormalized)) {
        const score = pNormalized.includes(targetNormalized) ? 90 : 85;
        if (score > maxMatchScore) {
          maxMatchScore = score;
          bestProduct = p;
        }
        return;
      }

      // 3. Token count matching (for partial dictations)
      const pTokens = pNormalized.split(/\s+/).filter(t => t.length > 1);
      let matchCount = 0;
      segmentTokens.forEach(t => {
        if (pNormalized.includes(t)) {
          matchCount++;
        }
      });

      if (pTokens.length > 0 && matchCount > 0) {
        const score = (matchCount / pTokens.length) * 80;
        if (score > maxMatchScore) {
          maxMatchScore = score;
          bestProduct = p;
        }
      }
    });

    if (bestProduct && maxMatchScore >= 35) {
      items.push({ product: bestProduct, quantity: qty });
    } else {
      unrecognized.push(cleanSegment);
    }
  });

  return { mesa, items, unrecognized };
};
