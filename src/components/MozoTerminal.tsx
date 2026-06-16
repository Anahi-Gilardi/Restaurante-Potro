import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  UtensilsCrossed, 
  Wine, 
  Receipt,
  UserCheck,
  MoreVertical,
  Loader2,
  Power,
  Unlock,
  FileText,
  X
} from 'lucide-react';
import { Mesa, Insumo, ProductoMenu, RecetaEscandallo, Pedido, PedidoItem, Usuario } from '../types';
import { useMozoMesasRealtime } from '../hooks/useMozoMesasRealtime';
import { useMozoTerminal } from '../hooks/useMozoTerminal';
import { normalizeRole } from '../lib/permissions';
import { menuService } from '../services/menuService';
import { mesasService } from '../services/mesasService';
import { useToast, ToastContainer } from './ToastContainer';

interface MozoTerminalProps {
  mesas: Mesa[];
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  usuarios: Usuario[];
  activeMozo: string;
  onMozoChange: (mozo: string) => void;
  onCrearPedido: (pedido: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo'; comensales?: number }) => void | Promise<void>;
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
  usuarios,
  activeMozo,
  onMozoChange,
  onCrearPedido,
  pedidos,
  onFacturarMesa,
  addLog,
  permitirVentaSinStock = false
}: MozoTerminalProps) {
  const { toast, toasts, removeToast } = useToast();
  const [liveMesas, setLiveMesas] = useMozoMesasRealtime(mesas);
  const [openProductSettingsId, setOpenProductSettingsId] = useState<string | null>(null);
  const [productOverrides, setProductOverrides] = useState<Record<string, { precio_venta?: number; paused?: boolean }>>({});
  const [reservedSheetMesa, setReservedSheetMesa] = useState<Mesa | null>(null);
  const [releaseLoadingMesaId, setReleaseLoadingMesaId] = useState<number | null>(null);

  // Bill splitting state
  const [splittingPedidoId, setSplittingPedidoId] = useState<number | null>(null);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [splitItemsChecked, setSplitItemsChecked] = useState<{ [itemIdx: number]: boolean }>({});

  const canEditProducts = useMemo(() => {
    return usuarios.some(usuario => usuario.nombre === activeMozo && normalizeRole(usuario.rol) === 'administrador');
  }, [activeMozo, usuarios]);

  const effectiveProducts = useMemo(() => {
    return productosMenu.map(producto => {
      const override = productOverrides[producto.id_producto];
      return {
        ...producto,
        precio_venta: override?.precio_venta ?? producto.precio_venta,
      };
    });
  }, [productOverrides, productosMenu]);

  const {
    selectedMesaId,
    setSelectedMesaId,
    comensales,
    setComensales,
    searchQuery,
    setSearchQuery,
    selectedCategoria,
    setSelectedCategoria,
    cart,
    observaciones,
    setObservaciones,
    selectedMesa,
    activePedidoDeMesa,
    filteredProducts,
    getSimulatedStockRemaining,
    addToCart,
    removeFromCart,
    clearCart,
    checkoutCart,
    totalCartValue,
    isSubmitting,
    canAddQuantity,
  } = useMozoTerminal({
    mesas: liveMesas,
    insumos,
    productosMenu: effectiveProducts,
    recetas,
    pedidos,
    activeMozo,
    permitirVentaSinStock,
    toast,
    addLog,
    onCrearPedido,
  });

  const persistProductPrice = (productoId: string, precioVenta: number) => {
    if (!Number.isFinite(precioVenta) || precioVenta < 0) return;
    void menuService.update(productoId, { precio_venta: precioVenta }).catch(() => {
      toast.warning('El precio quedó aplicado en esta sesión, pero no pudo sincronizarse con Supabase.');
    });
  };

  const toggleProductAvailability = (producto: ProductoMenu, paused: boolean) => {
    setProductOverrides(prev => ({
      ...prev,
      [producto.id_producto]: {
        ...prev[producto.id_producto],
        paused,
      },
    }));

    void menuService.update(producto.id_producto, { activo: !paused }).catch(() => {
      toast.warning('La disponibilidad cambió localmente, pero no pudo sincronizarse.');
    });
  };

  const handleReleaseMesa = async (mesa: Mesa) => {
    if (releaseLoadingMesaId !== null) return;

    const previousMesas = liveMesas;
    const releasedMesa: Mesa = {
      ...mesa,
      estado: 'libre',
      comensales: undefined,
      reserva_cliente: undefined,
      reserva_hora: undefined,
      ocupada_desde: undefined,
    };

    setReleaseLoadingMesaId(mesa.id_mesa);
    setLiveMesas(prev => prev.map(item => (item.id_mesa === mesa.id_mesa ? releasedMesa : item)));
    setSelectedMesaId(mesa.id_mesa);
    setReservedSheetMesa(null);

    try {
      // La tabla actual usa id_mesa y no tiene reserva_id; este update evita enviar columnas inexistentes.
      await mesasService.update(mesa.id_mesa, { estado: 'libre', comensales: undefined });
      toast.success(`${mesa.numero_mesa} quedó libre para comandar.`, 2600);
      addLog('sistema', `MESAS: ${mesa.numero_mesa} liberada desde Terminal de Mozos. Reserva removida.`);
    } catch (error) {
      setLiveMesas(previousMesas);
      setSelectedMesaId(null);
      toast.error('No se pudo liberar la mesa. Se restauró la reserva para evitar inconsistencias.');
      addLog('sistema', `ERROR MESAS: No se pudo liberar ${mesa.numero_mesa}: ${error instanceof Error ? error.message : 'error desconocido'}`);
    } finally {
      setReleaseLoadingMesaId(null);
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-2rem)] lg:overflow-hidden" id="mozo-terminal-container">
      {/* LEFT COLUMN: Mesa Grid and active waiter selector */}
      <div className="lg:col-span-3 space-y-4 lg:overflow-y-auto min-h-0 pr-1">
        
        {/* Active Waiter Picker */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
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
            {usuarios.filter(usuario => usuario.activo !== false && normalizeRole(usuario.rol) !== 'cocina').map(usuario => (
              <button
                key={usuario.id_usuario}
                onClick={() => onMozoChange(usuario.nombre)}
                className={`py-2 px-3 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
                  activeMozo === usuario.nombre
                    ? 'bg-[#624A3E] text-white shadow-sm scale-[1.02] border border-[#5d3a2e]' 
                    : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-[#F5F1E9]'
                }`}
              >
                {usuario.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Mesas Selector Grid */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 font-sans tracking-tight flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-slate-500" />
              Distribución de Mesas
            </h3>
            <span className="text-[11px] font-mono bg-slate-50 text-slate-500 px-2 py-0.5 rounded">
              {liveMesas.filter(m => m.estado === 'ocupada').length} Ocupadas
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {liveMesas.map(m => {
              const isSelected = m.id_mesa === selectedMesaId;
              const isOcupada = m.estado === 'ocupada';
              const isInCuenta = m.estado === 'esperando_cuenta';
              const isReservada = m.estado === 'reservada';
              const isReleasing = releaseLoadingMesaId === m.id_mesa;

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
                <div
                  key={m.id_mesa}
                  id={`mesa-btn-${m.id_mesa}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isReservada) {
                      setReservedSheetMesa(m);
                      return;
                    }
                    setSelectedMesaId(m.id_mesa);
                    // Prepopulate comensales if occupied
                    if (m.estado === 'ocupada' && m.comensales) {
                      setComensales(m.comensales);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    if (isReservada) {
                      setReservedSheetMesa(m);
                      return;
                    }
                    setSelectedMesaId(m.id_mesa);
                    if (m.estado === 'ocupada' && m.comensales) {
                      setComensales(m.comensales);
                    }
                  }}
                  className={`p-2.5 rounded-xl flex flex-col justify-between items-center transition-all aspect-square border cursor-pointer relative active:scale-95 ${stateClasses} ${isReleasing ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  {isReleasing && (
                    <span className="absolute inset-0 rounded-xl bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-[#624A3E]" />
                    </span>
                  )}
                  {m.estado !== 'libre' && (
                    <button
                      type="button"
                      disabled={isReleasing}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleReleaseMesa(m);
                      }}
                      className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/80 bg-white/95 text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                      title={`Liberar ${m.numero_mesa}`}
                      aria-label={`Liberar ${m.numero_mesa}`}
                    >
                      {isReleasing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                    </button>
                  )}
                  <span className="text-xs font-black font-sans">{m.numero_mesa}</span>
                  {isOcupada ? (
                    <div className="flex items-center gap-0.5 mt-2">
                      <Users className={`w-3 h-3 ${isSelected ? 'text-amber-205 text-white' : 'text-[#2563a0]'}`} />
                      <span className="text-[10px] font-bold">{m.comensales || 0}</span>
                    </div>
                  ) : isInCuenta ? (
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#c47f1a]">Salar</span>
                  ) : isReservada ? (
                    <span className={`text-[8px] uppercase tracking-wider font-extrabold ${isSelected ? 'text-white/70' : 'text-[#6d3f9e]'}`}>
                      Gestionar
                    </span>
                  ) : (
                    <span className={`text-[8px] uppercase tracking-wider font-semibold opacity-80 ${isSelected ? 'text-white/60' : ''}`}>{labelText}</span>
                  )}
                </div>
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

              {selectedMesa.estado !== 'libre' && (
                <button
                  type="button"
                  disabled={releaseLoadingMesaId === selectedMesa.id_mesa}
                  onClick={() => void handleReleaseMesa(selectedMesa)}
                  className="w-full rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {releaseLoadingMesaId === selectedMesa.id_mesa ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5" />
                  )}
                  Liberar mesa ahora
                </button>
              )}

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
                          ${(effectiveProducts.find(p => p.id_producto === it.id_producto)?.precio_venta || 0).toLocaleString('es-AR')}
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
      <div className="lg:col-span-6 bg-white/40 rounded-2xl p-4 overflow-y-auto min-h-0 space-y-4 border border-white/60 shadow-sm">
         {/* Search and Filters */}
        <div className="bg-white/90 rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
          {filteredProducts.map(p => {
            const stockRemaining = getSimulatedStockRemaining(p);
            const isPaused = productOverrides[p.id_producto]?.paused === true;
            const isOutOfStock = isPaused || stockRemaining <= 0;
            const isLowStock = !isPaused && stockRemaining > 0 && stockRemaining <= 3;
            const currentInCart = cart[p.id_producto] || 0;

            return (
              <div
                key={p.id_producto}
                onClick={() => !isOutOfStock && !isSubmitting && addToCart(p.id_producto, 1)}
                className={`group cursor-pointer rounded-2xl bg-white border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 relative ${
                  isOutOfStock 
                    ? 'opacity-70 border-rose-100 bg-stone-50'
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

                  {canEditProducts && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenProductSettingsId(openProductSettingsId === p.id_producto ? null : p.id_producto);
                      }}
                      className="absolute left-2 bottom-2 w-8 h-8 rounded-xl bg-white/95 text-stone-700 border border-stone-200 shadow-sm backdrop-blur hover:bg-stone-50 active:scale-95 transition-all flex items-center justify-center"
                      aria-label={`Configurar ${p.nombre}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}

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
                  <AnimatePresence>
                    {canEditProducts && openProductSettingsId === p.id_producto && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -6 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        onClick={(event) => event.stopPropagation()}
                        className="absolute right-2 top-12 z-20 w-56 rounded-2xl border border-stone-200 bg-white p-3 shadow-xl shadow-stone-900/15"
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">Ajuste rápido</p>
                        <label className="mt-3 block text-[11px] font-bold text-stone-600">
                          Precio de venta
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={p.precio_venta}
                            onChange={(event) => {
                              const nextPrice = Number(event.target.value);
                              setProductOverrides(prev => ({
                                ...prev,
                                [p.id_producto]: {
                                  ...prev[p.id_producto],
                                  precio_venta: Number.isFinite(nextPrice) ? nextPrice : 0,
                                },
                              }));
                            }}
                            onBlur={(event) => persistProductPrice(p.id_producto, Number(event.target.value))}
                            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-black text-stone-900 outline-none transition focus:border-[#624A3E] focus:ring-2 focus:ring-[#624A3E]/20"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => toggleProductAvailability(p, !isPaused)}
                          className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-black transition-all active:scale-95 ${
                            isPaused
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <span>{isPaused ? 'Sin stock pausado' : 'Disponible para venta'}</span>
                          <Power className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                      if (!isOutOfStock && !isSubmitting) addToCart(p.id_producto, 1);
                    }}
                    disabled={isSubmitting || isOutOfStock || !canAddQuantity(p.id_producto, 1)}
                    className="w-8 h-8 rounded-full bg-[#624A3E] text-white hover:bg-[#503C32] active:scale-95 transition-all duration-150 flex items-center justify-center font-bold shadow-md shadow-[#624A3E]/20 cursor-pointer border border-amber-950/10 shrink-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
                    title="Añadir a comanda"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {[2, 3].map(quantity => (
                    <button
                      key={quantity}
                      type="button"
                      disabled={isSubmitting || isOutOfStock || !canAddQuantity(p.id_producto, quantity)}
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(p.id_producto, quantity);
                      }}
                      className="h-8 min-w-8 rounded-full border border-[#624A3E]/20 bg-[#624A3E]/10 px-2 text-[11px] font-black text-[#624A3E] transition-all hover:bg-[#624A3E] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
                      title={`Añadir ${quantity} unidades`}
                    >
                      +{quantity}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Comanda Cart Summary */}
      <div className="lg:col-span-3 min-h-0">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col lg:h-full min-h-[520px] lg:min-h-0 sticky top-6">
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
                  const p = effectiveProducts.find(item => item.id_producto === prodId)!;
                  return (
                    <div key={prodId} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex-1 pr-1 font-sans">
                        <span className="font-bold text-slate-800 line-clamp-1">{p.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono">${(p.precio_venta).toLocaleString('es-AR')} u.</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={isSubmitting}
                          onClick={() => removeFromCart(prodId)}
                          className="w-5 h-5 bg-white hover:bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-600 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-bold w-4 text-center">{qty}</span>
                        <button
                          disabled={isSubmitting || !canAddQuantity(prodId, 1)}
                          onClick={() => addToCart(prodId, 1)}
                          className="w-5 h-5 bg-white hover:bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-600 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  type="button"
                  disabled={isSubmitting}
                  onClick={clearCart}
                  className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all duration-100 cursor-pointer border border-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Vaciar Carrito
                </button>

                <button
                  onClick={checkoutCart}
                  disabled={isSubmitting || Object.keys(cart).length === 0}
                  className="w-full py-2.5 px-4 bg-[#624A3E] hover:bg-[#503C32] active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-[#624A3E]/20 transition-all duration-100 cursor-pointer border border-amber-950/10 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
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
                const prod = effectiveProducts.find(pr => pr.id_producto === item.id_producto);
                return sum + (prod ? prod.precio_venta * item.cantidad : 0);
              }, 0);

              // Expand items list by their quantity for itemized selection
              const expandedItemsList: { item: PedidoItem; index: number; singlePrice: number }[] = [];
              let curIdx = 0;
              p.items.forEach(it => {
                const prod = effectiveProducts.find(pr => pr.id_producto === it.id_producto);
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
    <AnimatePresence>
      {reservedSheetMesa && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setReservedSheetMesa(null)}
        >
          <motion.div
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-5 shadow-2xl shadow-slate-950/25"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
                  Reservada
                </span>
                <h3 className="mt-2 text-lg font-black text-stone-950">{reservedSheetMesa.numero_mesa}</h3>
                <p className="text-xs text-stone-500">
                  Esta mesa tiene una reserva activa. Liberala para comandar de inmediato.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReservedSheetMesa(null)}
                className="rounded-full border border-stone-200 bg-stone-50 p-2 text-stone-500 transition hover:bg-stone-100 active:scale-95"
                aria-label="Cerrar opciones de reserva"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-500">
                <FileText className="h-4 w-4 text-violet-500" />
                Ver Observaciones
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="font-bold text-stone-400">Cliente</dt>
                  <dd className="mt-0.5 font-black text-stone-800">{reservedSheetMesa.reserva_cliente || 'Sin cliente cargado'}</dd>
                </div>
                <div>
                  <dt className="font-bold text-stone-400">Horario</dt>
                  <dd className="mt-0.5 font-black text-stone-800">{reservedSheetMesa.reserva_hora || 'Sin hora'}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={releaseLoadingMesaId === reservedSheetMesa.id_mesa}
                onClick={() => void handleReleaseMesa(reservedSheetMesa)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#624A3E] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#624A3E]/20 transition hover:bg-[#503C32] active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
              >
                {releaseLoadingMesaId === reservedSheetMesa.id_mesa ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
                Liberar Mesa / Quitar Reserva
              </button>
              <button
                type="button"
                onClick={() => setReservedSheetMesa(null)}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-black text-stone-600 transition hover:bg-stone-50 active:scale-95"
              >
                Mantener Reserva
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
