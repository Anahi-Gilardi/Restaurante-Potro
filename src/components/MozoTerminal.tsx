import React, { useState, useMemo } from 'react';
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
import { useToast, ToastContainer } from './ToastContainer';

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
  const { toast, toasts, removeToast } = useToast();
  // Waiter selections
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
  const [comensales, setComensales] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todo');
  
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

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return productosMenu.filter(p => {
      const matchCat = selectedCategoria === 'todo' || p.categoria === selectedCategoria;
      const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      return p.activo && matchCat && matchSearch;
    });
  }, [productosMenu, selectedCategoria, searchQuery]);

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
      toast.error("Por favor seleccione primero una mesa.");
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
        toast.error(`No es posible procesar la orden. Se agotó un insumo clave: ${insumo.nombre}`);
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
    <>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="mozo-terminal-container">
      {/* LEFT COLUMN: Mesa Grid and active waiter selector */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Active Waiter Picker */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium font-sans">Mozo en Turno Activo</p>
              <h3 className="font-bold text-slate-800 font-sans tracking-tight">Terminal Registrada</h3>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['Enzo', 'Micaela', 'Sofía'].map(mozoName => (
              <button
                key={mozoName}
                onClick={() => onMozoChange(mozoName)}
                className={`py-2 px-3 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
                  activeMozo === mozoName 
                    ? 'bg-[#624A3E] text-white shadow-sm scale-[1.02] border border-[#5d3a2e]' 
                    : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-[#F5F1E9]'
                }`}
              >
                {mozoName}
              </button>
            ))}
          </div>
        </div>

        {/* Mesas Selector Grid */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 font-sans tracking-tight flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-slate-500" />
              Distribución de Mesas
            </h3>
            <span className="text-[11px] font-mono bg-slate-50 text-slate-500 px-2 py-0.5 rounded">
              {mesas.filter(m => m.estado === 'ocupada').length} Ocupadas
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {mesas.map(m => {
              const isSelected = m.id_mesa === selectedMesaId;
              const isOcupada = m.estado === 'ocupada';
              const isInCuenta = m.estado === 'esperando_cuenta';
              const isReservada = m.id_mesa === 3; // Mesa 3 is reserved for dinner per instructions

              // Determine visual theme according to exact state specs
              let stateClasses = "border-stone-200 bg-white hover:bg-stone-50 text-stone-700";
              let labelText = "Libre";

              if (isSelected) {
                stateClasses = "bg-[#624A3E] text-white border-[#5d3a2e] shadow-md shadow-[#624A3E]/30 scale-[1.03] ring-4 ring-[#624A3E]/20";
                labelText = isOcupada ? "Ocupada (Sel)" : isInCuenta ? "En Cuenta" : isReservada ? "Reservada" : "Libre";
              } else if (isReservada) {
                stateClasses = "border-[#6d3f9e] bg-[#6d3f9e]/5 text-[#6d3f9e] hover:bg-[#6d3f9e]/10";
                labelText = "Reservada";
              } else if (isInCuenta) {
                stateClasses = "border-[#c47f1a] bg-[#c47f1a]/5 text-[#c47f1a] hover:bg-[#c47f1a]/10";
                labelText = "En Cuenta";
              } else if (isOcupada) {
                stateClasses = "border-[#2563a0] bg-[#2563a0]/5 text-[#2563a0] hover:bg-[#2563a0]/10";
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
                      <Users className={`w-3 h-3 ${isSelected ? 'text-amber-205 text-white' : 'text-[#2563a0]'}`} />
                      <span className="text-[10px] font-bold">{m.comensales || 0}</span>
                    </div>
                  ) : isInCuenta ? (
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#c47f1a]">Salar</span>
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
         {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-4 border border-stone-105 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
            <h3 className="font-extrabold text-xs text-[#624A3E] tracking-wider uppercase">Filtro de Categorías Premium</h3>
            <div className="relative w-full md:w-56">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar plato o bebida..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#624A3E] focus:border-[#624A3E] transition-all"
              />
            </div>
          </div>

          <div className="flex gap-1.5 w-full overflow-x-auto py-1 scrollbar-thin scroll-smooth border-t border-stone-100 pt-3">
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
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(cat.id)}
                className={`py-1.5 px-3 text-xs font-extrabold rounded-lg whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 ${
                  selectedCategoria === cat.id 
                    ? 'bg-[#624A3E] text-white shadow-sm ring-1 ring-amber-900/10' 
                    : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-[#F5F1E9] hover:text-stone-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
          {filteredProducts.map(p => {
            const stockRemaining = getSimulatedStockRemaining(p);
            const isOutOfStock = stockRemaining <= 0;
            const isLowStock = stockRemaining > 0 && stockRemaining <= 3;
            const currentInCart = cart[p.id_producto] || 0;

            return (
              <div
                key={p.id_producto}
                onClick={() => !isOutOfStock && handleAddToCart(p.id_producto)}
                className={`group cursor-pointer rounded-2xl bg-white border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 relative ${
                  isOutOfStock 
                    ? 'opacity-60 border-rose-100 pointer-events-none bg-stone-50' 
                    : currentInCart > 0 
                      ? 'border-[#624A3E] bg-[#F5F1E9]/40 ring-1 ring-[#624A3E]/20' 
                      : 'border-stone-200/80 hover:-translate-y-1'
                }`}
                style={{ contentVisibility: 'auto' }}
              >
                {/* Product Image */}
                <div className="h-28 w-full bg-stone-50 relative overflow-hidden">
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Category icon badge */}
                  <div className="absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md bg-white/90 shadow-sm border border-stone-100">
                    {p.categoria === 'bebidas' ? (
                      <Wine className="w-3.5 h-3.5 text-[#624A3E]" />
                    ) : (
                      <UtensilsCrossed className="w-3.5 h-3.5 text-[#624A3E]" />
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
                <div className="p-3 flex justify-between items-center bg-white">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-stone-850 text-xs font-sans line-clamp-1 leading-snug group-hover:text-[#624A3E] transition-colors">
                      {p.nombre}
                    </h4>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-stone-900 font-mono text-xs font-black">
                        ${p.precio_venta.toLocaleString('es-AR')}
                      </span>
                      {currentInCart > 0 && (
                        <span className="bg-[#624A3E] text-white rounded-full px-1.5 py-0.1 text-[9px] font-black font-mono">
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
                    className="w-8 h-8 rounded-full bg-[#624A3E] text-white hover:bg-[#503C32] active:scale-90 transition-all duration-150 flex items-center justify-center font-bold shadow-md shadow-[#624A3E]/20 cursor-pointer border border-amber-950/10 shrink-0"
                    title="Añadir a comanda"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Comanda Cart Summary */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col h-[520px] sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm font-sans flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-slate-500" />
              Nueva Comanda
            </h3>
            {selectedMesa && (
              <span className="bg-slate-900 text-white font-sans text-[10px] font-extrabold px-2 py-0.5 rounded">
                {selectedMesa.numero_mesa}
              </span>
            )}
          </div>

          {!selectedMesaId ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-3">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-700 text-xs">Seleccione Mesa</h4>
              <p className="text-slate-400 text-[10px] mt-1 max-w-[180px]">
                Marque una mesa disponible en el plano izquierdo para iniciar la comanda.
              </p>
            </div>
          ) : Object.keys(cart).length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-700 text-xs">Comanda Vacía</h4>
              <p className="text-slate-400 text-[10px] mt-1 max-w-[180px]">
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
                    <div key={prodId} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex-1 pr-1 font-sans">
                        <span className="font-bold text-slate-800 line-clamp-1">{p.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono">${(p.precio_venta).toLocaleString('es-AR')} u.</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRemoveFromCart(prodId)}
                          className="w-5 h-5 bg-white hover:bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-bold w-4 text-center">{qty}</span>
                        <button
                          onClick={() => handleAddToCart(prodId)}
                          className="w-5 h-5 bg-white hover:bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-slate-400" />
                  Observaciones de Comanda
                </label>
                <textarea
                  placeholder="Ej: Bife bien cocido, papas sin sal, agua a temperatura ambiente..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full text-xs text-slate-700 p-2 border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-950 resize-none h-14"
                />
              </div>

              {/* FOOTER TOTAL & INJECT BTN */}
              <div className="pt-3 border-t border-slate-150 space-y-3">
                <div className="flex justify-between items-center text-sm font-sans font-medium text-slate-700">
                  <span>Monto Total:</span>
                  <span className="font-mono font-extrabold text-slate-900 text-base">
                    ${totalCartValue.toLocaleString('es-AR')}
                  </span>
                </div>

                <button
                  onClick={checkoutCart}
                  className="w-full py-2.5 px-4 bg-[#624A3E] hover:bg-[#503C32] active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-[#624A3E]/20 transition-all duration-100 cursor-pointer border border-amber-950/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Enviar a Cocina (Nuevo Pedido) 🚀
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* BILL SPLITTING MODAL (MODO DIVISION DE CUENTAS) */}
      {splittingPedidoId !== null && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-sans tracking-tight flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  Divisor de Cuentas Gastronómico
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Mesa {pedidos.find(p => p.id_pedido === splittingPedidoId)?.numero_mesa} • Orden #{splittingPedidoId}
                </p>
              </div>
              <button
                onClick={() => {
                  setSplittingPedidoId(null);
                  setSplitItemsChecked({});
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
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
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      A. División Equitativa (Por Comensales)
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1.5 gap-2.5">
                        <button 
                          onClick={() => setSplitCount(c => Math.max(2, c - 1))}
                          className="w-5 h-5 rounded bg-slate-50 flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold font-mono">{splitCount}</span>
                        <button 
                          onClick={() => setSplitCount(c => c + 1)}
                          className="w-5 h-5 rounded bg-slate-50 flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-slate-400">personas</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-medium">Equivale a:</p>
                        <p className="text-sm font-extrabold font-mono text-emerald-700">
                          ${(orderTotal / splitCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })} c/u
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option B: Split by Select/Chair consumption */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-slate-500" />
                      B. Desglose Específico (Silla / Consumo Unitario)
                    </h4>
                    
                    <p className="text-[10px] text-slate-400 italic">
                      Tilde los platos que pagará este comensal de manera individual:
                    </p>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50">
                      {expandedItemsList.map(({ item, index, singlePrice }) => (
                        <label 
                          key={index}
                          className="flex items-center justify-between text-xs p-1.5 bg-white border border-slate-100 rounded hover:bg-slate-50 hover:border-slate-200 cursor-pointer transition-all"
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
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-950 w-3.5 h-3.5"
                            />
                            <span className="font-medium text-slate-700">{item.nombre}</span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-600 font-bold">${singlePrice.toLocaleString('es-AR')}</span>
                        </label>
                      ))}
                    </div>

                    {itemizedTotal > 0 && (
                      <div className="flex justify-between items-center bg-slate-900 text-white rounded-xl p-3">
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
                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => {
                        setSplittingPedidoId(null);
                        setSplitItemsChecked({});
                      }}
                      className="flex-1 py-2 text-xs bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 font-medium"
                    >
                      Volver
                    </button>
                    <button
                      onClick={() => {
                        const amntToPay = itemizedTotal > 0 ? itemizedTotal : orderTotal;
                        toast.success(`Se procesó el cobro de ${amntToPay.toLocaleString('es-AR')} para ${p.numero_mesa}.`);
                        
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
                      className="flex-1 py-2 text-xs bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-xl shadow flex items-center justify-center gap-1.5"
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
    <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
