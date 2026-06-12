/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed,
  ChefHat,
  Database,
  TrendingUp,
  Receipt,
  Terminal,
  User,
  Clock,
  Sparkles,
  RefreshCw,
  Layout,
  Sliders,
  ShieldCheck,
  Smartphone,
  Eye
} from 'lucide-react';

import { Mesa, Insumo, ProductoMenu, RecetaEscandallo, Pedido, Merma, EventoLog } from './types';
import { 
  INITIAL_MESAS, 
  INITIAL_INSUMOS, 
  INITIAL_PRODUCTOS_MENU, 
  INITIAL_RECETAS_ESCANDALLO, 
  INITIAL_PEDIDOS 
} from './data/initialData';

// Subcomponents matching the design
import MozoTerminal from './components/MozoTerminal';
import KitchenMonitor from './components/KitchenMonitor';
import InventoryModule from './components/InventoryModule';
import BusinessIntelligence from './components/BusinessIntelligence';
import SimulationControls from './components/SimulationControls';
import CajaModule from './components/CajaModule';
import SistemaModule from './components/SistemaModule';
import PythonStreamlitLogin from './components/PythonStreamlitLogin';

export default function App() {
  // --- Global Synced States ---
  const [isStreamlitLoggedIn, setIsStreamlitLoggedIn] = useState<boolean>(false);
  const [mesas, setMesas] = useState<Mesa[]>(INITIAL_MESAS);
  const [insumos, setInsumos] = useState<Insumo[]>(INITIAL_INSUMOS);
  const [productosMenu] = useState<ProductoMenu[]>(INITIAL_PRODUCTOS_MENU);
  const [recetas] = useState<RecetaEscandallo[]>(INITIAL_RECETAS_ESCANDALLO);
  const [pedidos, setPedidos] = useState<Pedido[]>(INITIAL_PEDIDOS);
  const [mermas, setMermas] = useState<Merma[]>([]);
  
  // Custom interactive log tracker for BI & audit
  const [logs, setLogs] = useState<EventoLog[]>([
    {
      id: 'init_log_1',
      tipo: 'sistema',
      mensaje: 'SISTEMA: Conexión establecida de forma segura. SQLite local cargada con éxito.',
      timestamp: new Date(Date.now() - 35 * 60 * 1000)
    },
    {
      id: 'init_log_2',
      tipo: 'sistema',
      mensaje: 'SISTEMA: Inicializando terminales para personal de Mozo, Cocina, Caja y Administrador.',
      timestamp: new Date(Date.now() - 34 * 60 * 1000)
    },
    {
      id: 'init_log_3',
      tipo: 'descuento_stock',
      mensaje: 'ESCANDALLO: Stock de materia prima cargado con 15 insumos controlados.',
      timestamp: new Date(Date.now() - 33 * 60 * 1000)
    }
  ]);

  // Terminal active configs & simulation states
  const [activeMozo, setActiveMozo] = useState<string>('Enzo');
  const [activeView, setActiveView] = useState<'mozo' | 'cocina' | 'inventario' | 'bi' | 'caja' | 'sistema'>('mozo');

  // Simulation Clock state (operational minutes passed)
  const [minutosGlobal, setMinutosGlobal] = useState<number>(0);
  const [autoTimerRunning, setAutoTimerRunning] = useState<boolean>(false);

  // Helper log registrar
  const addLog = (
    tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', 
    mensaje: string
  ) => {
    const newLogItem: EventoLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tipo,
      mensaje,
      timestamp: new Date()
    };
    setLogs(prev => [newLogItem, ...prev]);
  };

  // --- Handlers for Waiter View (Terminal Mozo) ---
  const handleCrearPedido = (newPedidoData: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo'; comensales?: number }) => {
    const newId = Math.floor(1000 + Math.random() * 9000);
    const newPedido: Pedido = {
      ...newPedidoData,
      id_pedido: newId,
      fecha_hora: new Date(),
      minutos_transcurridos: 0,
      origen: newPedidoData.origen || 'Mozo'
    };

    setPedidos(prev => [newPedido, ...prev]);

    // Update mesa occupied
    setMesas(prev => prev.map(m => m.id_mesa === newPedidoData.id_mesa ? { ...m, estado: 'ocupada', comensales: newPedidoData.comensales || 2 } : m));

    addLog('pedido_creado', `Mesa ${newPedidoData.numero_mesa} generó pedido #${newId} por ${newPedido.mozo}. Items: ${newPedidoData.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ')}`);
  };

  const handleMozoChange = (mozo: string) => {
    setActiveMozo(mozo);
    addLog('sistema', `SESIÓN: Acceso de personal actualizado por mozo: ${mozo}`);
  };

  // --- Handlers for Kitchen View (KDS) ---
  const handleCambiarEstadoPedido = (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => {
    setPedidos(prev => prev.map(p => {
      if (p.id_pedido === idPedido) {
        const updated = { ...p, estado_comanda: nuevoEstado };
        if (nuevoEstado === 'listo') {
          updated.segundos_en_listo = 0; // reset cooling timer
        }
        return updated;
      }
      return p;
    }));

    const pObj = pedidos.find(p => p.id_pedido === idPedido);
    const mStr = pObj ? ` para ${pObj.numero_mesa}` : '';
    addLog('comanda_estado', `COMANDA #${idPedido}${mStr}: Estado cambiado a ${nuevoEstado.toUpperCase()}`);

    // If order was delivered/paid via waiters, liberate the table
    if (nuevoEstado === 'entregado_cobrado' && pObj) {
      setMesas(prev => prev.map(m => m.id_mesa === pObj.id_mesa ? { ...m, estado: 'libre', comensales: undefined } : m));
    }
  };

  const handleProducirPedidoConEscandallo = (idPedido: number) => {
    const targetPedido = pedidos.find(p => p.id_pedido === idPedido);
    if (!targetPedido) return;

    let itemsDescontados: string[] = [];
    let alarmasBajoStock: string[] = [];

    setInsumos(prevInsumos => {
      const copy = prevInsumos.map(ins => ({ ...ins }));

      targetPedido.items.forEach(pItem => {
        // Multiplier is the quantity of plates requested
        const qtyPlates = pItem.cantidad;
        const matchingRecetas = recetas.filter(r => r.id_producto === pItem.id_producto);

        matchingRecetas.forEach(rec => {
          const insIdx = copy.findIndex(ins => ins.id_insumo === rec.id_insumo);
          if (insIdx !== -1) {
            const currentIns = copy[insIdx];
            const discountAmt = rec.cantidad_a_descontar * qtyPlates;
            const updatedStock = Math.max(0, currentIns.stock_actual - discountAmt);
            
            copy[insIdx].stock_actual = parseFloat(updatedStock.toFixed(2));
            itemsDescontados.push(`${currentIns.nombre} (-${discountAmt.toFixed(1)} ${currentIns.unidad_medida})`);

            if (updatedStock < currentIns.stock_minimo) {
              alarmasBajoStock.push(currentIns.nombre);
            }
          }
        });
      });

      return copy;
    });

    if (itemsDescontados.length > 0) {
      addLog('descuento_stock', `ESCANDALLO: Pedido #${idPedido} pasó a cocción. Descuento automático de: ${itemsDescontados.join(', ')}`);
    }

    alarmasBajoStock.forEach(nom => {
      addLog('alerta_stock', `CONTROL REPOSICIÓN: El insumo '${nom}' ha caído por debajo del stock de seguridad estipulado.`);
    });

    handleCambiarEstadoPedido(idPedido, 'en_cocina');
  };

  // --- Handlers for Cashier View (Caja & Cierre) ---
  const handleFacturarMesa = (idPedido: number) => {
    const target = pedidos.find(p => p.id_pedido === idPedido);
    if (!target) return;

    // Settle order state to delivered/paid
    setPedidos(prev => prev.map(p => p.id_pedido === idPedido ? { ...p, estado_comanda: 'entregado_cobrado' } : p));

    // Clear mesa state
    setMesas(prev => prev.map(m => m.id_mesa === target.id_mesa ? { ...m, estado: 'libre', comensales: undefined } : m));

    addLog('sistema', `CAJA: Facturación completa cobrada correctamente de la mesa ${target.numero_mesa} por Pedido #${idPedido}`);
  };

  // --- Handlers for Inventory View ---
  const handleRegistrarMerma = (idInsumo: string, cantidad: number, motivo: Merma['motivo']) => {
    const insObj = insumos.find(i => i.id_insumo === idInsumo);
    if (!insObj) return;

    const newMerma: Merma = {
      id_merma: `mrm_${Date.now()}`,
      id_insumo: idInsumo,
      nombre_insumo: insObj.nombre,
      cantidad,
      unidad_medida: insObj.unidad_medida,
      motivo,
      fecha: new Date()
    };

    setMermas(prev => [newMerma, ...prev]);

    // Subtract from active stock
    setInsumos(prev => prev.map(i => i.id_insumo === idInsumo ? {
      ...i,
      stock_actual: Math.max(0, parseFloat((i.stock_actual - cantidad).toFixed(2)))
    } : i));

    addLog('merma_registrada', `REGISTRO MERMA: ${cantidad} ${insObj.unidad_medida} de '${insObj.nombre}' registrado por motivo: ${motivo.toUpperCase()}`);
  };

  const handleRestockInsumo = (idInsumo: string, cantidad: number) => {
    setInsumos(prev => prev.map(i => i.id_insumo === idInsumo ? {
      ...i,
      stock_actual: parseFloat((i.stock_actual + cantidad).toFixed(2))
    } : i));

    const item = insumos.find(i => i.id_insumo === idInsumo);
    addLog('sistema', `REPOSICIÓN: Incremetado stock de '${item ? item.nombre : idInsumo}' en +${cantidad}`);
  };

  const handleRestockTodo = () => {
    setInsumos(prev => prev.map(i => {
      const restockAmt = i.unidad_medida === 'unidades' ? 10 : 3000;
      return {
        ...i,
        stock_actual: i.stock_actual + restockAmt
      };
    }));
    addLog('sistema', `REPOSICIÓN GENERAL: Abastecimiento global automático de todos los insumos y materias primas.`);
  };

  // --- Handlers for Simulation Controls ---
  const handleAdvanceTime = (mins: number) => {
    setMinutosGlobal(prev => prev + mins);

    // Age outstanding orders
    setPedidos(prev => prev.map(p => {
      if (p.estado_comanda !== 'entregado_cobrado') {
        const updated = {
          ...p,
          minutos_transcurridos: p.minutos_transcurridos + mins
        };
        // If the plate was ready, count the seconds/minutes in listo
        if (p.estado_comanda === 'listo') {
          updated.segundos_en_listo = (updated.segundos_en_listo || 0) + mins * 60;
        }
        return updated;
      }
      return p;
    }));

    addLog('sistema', `RELOJ: Reloj del restaurante adelantado en +${mins} minutos operacionales.`);
  };

  const handleToggleAutoTimer = () => {
    setAutoTimerRunning(prev => !prev);
    addLog('sistema', `RELOJ: Simulación en tiempo real ${!autoTimerRunning ? 'INICIADA' : 'DETENIDA'}`);
  };

  const handleInjectDeliveryOrder = (source: 'Rappi' | 'PedidosYa') => {
    const productsOptions = productosMenu.filter(p => p.activo);
    const itemMeal = productsOptions[Math.floor(Math.random() * Math.min(5, productsOptions.length))];
    const itemDrink = productsOptions[Math.min(productsOptions.length - 1, 6 + Math.floor(Math.random() * 3))];

    const newId = Math.floor(2000 + Math.random() * 8000);
    const newPedido: Pedido = {
      id_pedido: newId,
      id_mesa: 101, // delivery virtual code
      numero_mesa: `DELIVERY ${source === 'Rappi' ? 'RP' : 'PY'}`,
      mozo: `Integración API (${source})`,
      estado_comanda: 'pendiente',
      items: [
        { id_producto: itemMeal.id_producto, nombre: itemMeal.nombre, cantidad: 1, categoria: itemMeal.categoria },
        { id_producto: itemDrink.id_producto, nombre: itemDrink.nombre, cantidad: 2, categoria: itemDrink.categoria }
      ],
      fecha_hora: new Date(),
      minutos_transcurridos: 0,
      origen: source,
      observaciones: 'Despachar con cubiertos ecológicos. Cliente premium.'
    };

    setPedidos(prev => [newPedido, ...prev]);
    addLog('pedido_creado', `INTEGRACIÓN: Pedido online #${newId} detectado y cargado desde el puente webhook de ${source}`);
  };

  const handleResetAllData = () => {
    setMesas(INITIAL_MESAS);
    setInsumos(INITIAL_INSUMOS);
    setPedidos(INITIAL_PEDIDOS);
    setMermas([]);
    setMinutosGlobal(0);
    setAutoTimerRunning(false);
    setLogs([
      {
        id: `log_rst_${Date.now()}`,
        tipo: 'sistema',
        mensaje: 'SISTEMA: Demostración reiniciada a valores iniciales por defecto.',
        timestamp: new Date()
      }
    ]);
  };

  // Auto simulation ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (autoTimerRunning) {
      interval = setInterval(() => {
        setMinutosGlobal(prev => prev + 1);
        
        setPedidos(prevOrders => prevOrders.map(p => {
          if (p.estado_comanda !== 'entregado_cobrado') {
            const updated = {
              ...p,
              minutos_transcurridos: p.minutos_transcurridos + 1
            };
            if (p.estado_comanda === 'listo') {
              updated.segundos_en_listo = (updated.segundos_en_listo || 0) + 60;
            }
            return updated;
          }
          return p;
        }));
      }, 2000); // Every 2s equals 1 minute
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoTimerRunning]);

  // Simulated live clock formatter (start 20:30)
  const getSimulatedTimeStr = () => {
    const startHour = 20;
    const startMins = 30;
    const totalMinutes = startHour * 60 + startMins + minutosGlobal;
    const currentHour = Math.floor(totalMinutes / 60) % 24;
    const currentMins = totalMinutes % 60;
    return `${currentHour.toString().padStart(2, '0')}:${currentMins.toString().padStart(2, '0')} hs`;
  };

  // Live sidebar metrics calculation
  const occupiedTablesCount = mesas.filter(m => m.estado === 'ocupada').length;
  const activeOrdersCount = pedidos.filter(p => p.estado_comanda === 'pendiente' || p.estado_comanda === 'en_cocina').length;
  const readyToCollectCount = pedidos.filter(p => p.estado_comanda === 'listo').length;
  const lowStockCount = insumos.filter(i => i.stock_actual <= i.stock_minimo).length;

  if (!isStreamlitLoggedIn) {
    return <PythonStreamlitLogin onLoginSuccess={() => setIsStreamlitLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F1E9] flex flex-col lg:flex-row font-sans text-slate-800 antialiased selection:bg-[#624A3E] selection:text-white">
      
      {/* LEFT SIDE PANEL (PERSISTENT SIDEBAR) */}
      <aside className="w-full lg:w-80 bg-[#1E1E1E] text-[#E2E8F0] flex flex-col border-b lg:border-b-0 lg:border-r border-stone-850 shrink-0 z-40" id="sidebar-left-panel">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#624A3E] text-white flex items-center justify-center font-black text-xl tracking-tighter shadow-md shadow-[#624A3E]/30 border border-amber-900/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white tracking-tight">EL PATRÓN</span>
              </div>
              <p className="text-[10px] text-stone-400 font-semibold leading-none mt-0.5">Gestión Gastronómica Pro</p>
            </div>
          </div>
          <span className="bg-[#624A3E]/20 text-amber-200 text-[8px] border border-[#624A3E]/40 px-1.5 py-0.5 rounded font-bold font-mono">
            PYTHON v3.11
          </span>
        </div>

        {/* Real-time System Simulation Clock widget */}
        <div className="p-4 bg-stone-950/40 border-b border-stone-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-550" style={{ color: '#F59E0B' }} />
              Reloj del Restaurante
            </span>
            <span className={`h-2 w-2 rounded-full ${autoTimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-550'}`} style={{ backgroundColor: autoTimerRunning ? '#22C55E' : '#F59E0B' }} />
          </div>

          <div className="flex items-center justify-between bg-[#151515] border border-stone-800 p-2.5 rounded-xl">
            <div>
              <span className="text-[9px] text-stone-550 font-bold block leading-none text-stone-500">HORA DE SERVICIO</span>
              <strong className="text-lg font-black text-white font-mono tracking-tight">{getSimulatedTimeStr()}</strong>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleAutoTimer}
                title={autoTimerRunning ? 'Pausar Simulación Automática' : 'Iniciar Simulación en Tiempo Real'}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  autoTimerRunning 
                    ? 'bg-amber-900/60 text-amber-300 border border-amber-500/30 hover:bg-amber-800' 
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-900'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoTimerRunning ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => handleAdvanceTime(15)}
                title="Adelantar +15 Minutos"
                className="p-1 px-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white border border-stone-700 hover:bg-stone-700 text-[10px] font-bold cursor-pointer transition-all"
              >
                +15m
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Personnel login manager */}
        <div className="p-4 border-b border-stone-800 bg-stone-950/20">
          <div className="flex items-center gap-3 bg-stone-900/90 border border-stone-800 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-750 flex items-center justify-center text-stone-305">
              <User className="w-4 h-4 text-stone-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <span className="text-[9px] text-stone-500 block font-bold leading-none uppercase">Usuario en Consola</span>
              <select
                value={activeMozo}
                onChange={(e) => handleMozoChange(e.target.value)}
                className="text-xs bg-transparent border-none p-0 focus:outline-none font-extrabold text-white cursor-pointer w-full mt-0.5 focus:ring-0"
              >
                <option value="Enzo" className="bg-stone-950 text-stone-200">Enzo (Mozo Salón)</option>
                <option value="Micaela" className="bg-stone-950 text-stone-200">Micaela (Mozo Salón)</option>
                <option value="Damián" className="bg-stone-950 text-stone-200">Damián (Cocinero KDS)</option>
                <option value="Sofía" className="bg-stone-950 text-stone-200">Sofía (Administrador / Caja)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-role Navigation Panels */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-stone-500 tracking-wider uppercase pl-2">Módulos del Sistema</span>
            
            <nav className="space-y-1" id="sidebar-navigation">
              <button
                id="tab-mozo"
                onClick={() => setActiveView('mozo')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  activeView === 'mozo'
                    ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/30 font-extrabold border border-amber-900/10'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 shrink-0 font-medium" />
                  Terminal Mozo
                </span>
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                  activeView === 'mozo' ? 'bg-white/20 text-white' : 'bg-stone-800 text-stone-300'
                }`}>
                  {occupiedTablesCount}/{mesas.length} Mesas
                </span>
              </button>

              <button
                id="tab-cocina"
                onClick={() => setActiveView('cocina')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  activeView === 'cocina'
                    ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/30 font-extrabold border border-amber-900/10'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ChefHat className="w-4 h-4 shrink-0" />
                  Cocina KDS
                </span>
                {activeOrdersCount > 0 && (
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full animate-pulse-slow ${
                    activeView === 'cocina' ? 'bg-white text-[#624A3E]' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {activeOrdersCount} Activos
                  </span>
                )}
              </button>

              <button
                id="tab-caja"
                onClick={() => setActiveView('caja')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  activeView === 'caja'
                    ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/30 font-extrabold border border-amber-900/10'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4 shrink-0" />
                  Caja & Cobros
                </span>
                {readyToCollectCount > 0 && (
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    activeView === 'caja' ? 'bg-white text-[#624A3E]' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {readyToCollectCount} Listo
                  </span>
                )}
              </button>

              <button
                id="tab-inventario"
                onClick={() => setActiveView('inventario')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  activeView === 'inventario'
                    ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/30 font-extrabold border border-amber-900/10'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 shrink-0" />
                  Insumos & Receta
                </span>
                {lowStockCount > 0 && (
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    activeView === 'inventario' ? 'bg-white text-[#624A3E] font-medium' : 'bg-red-500/20 text-red-400 font-extrabold'
                  }`}>
                    {lowStockCount} Bajo
                  </span>
                )}
              </button>

              <button
                id="tab-bi"
                onClick={() => setActiveView('bi')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  activeView === 'bi'
                    ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/30 font-extrabold border border-amber-900/10'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  BI Reportes
                </span>
                <span className="text-[10px] font-mono text-stone-500 pl-1">{logs.length} logs</span>
              </button>

              <button
                id="tab-sistema"
                onClick={() => setActiveView('sistema')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  activeView === 'sistema'
                    ? 'bg-[#624A3E] text-white shadow-md shadow-[#624A3E]/30 font-extrabold border border-amber-900/10'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Terminal className="w-4 h-4 shrink-0" />
                  Config Sistema
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Integration Specs footer */}
        <div className="p-4 bg-stone-950 text-stone-400 text-[10px] border-t border-stone-800 space-y-1">
          <div className="flex items-center gap-1.5 text-stone-300 font-bold font-mono">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            SQLite + Supabase Bridge
          </div>
          <p className="opacity-75">Sesión local conectada de forma segura.</p>
        </div>
      </aside>

      {/* CORE ACTIVE MODULE AREA (RIGHT SIDE CONTENT PANE) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F5F1E9]">
        
        {/* TOP STATUS BAR ACCENTS */}
        <div className="bg-[#F5F1E9] border-b border-stone-200/80 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 capitalize tracking-tight flex items-center gap-2">
              {activeView === 'mozo' && <>📱 Terminal Interactiva de Mozos</>}
              {activeView === 'cocina' && <>🍳 Monitor de Cocina (KDS)</>}
              {activeView === 'caja' && <>💵 Control de Caja, Descuentos y Cierre</>}
              {activeView === 'inventario' && <>📦 Gestión de Insumos & Escandallos de Recetas</>}
              {activeView === 'bi' && <>📊 Analíticas Comerciales & Registro de Logs</>}
              {activeView === 'sistema' && <>💻 Consola de Configuración General</>}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeView === 'mozo' && 'Gestión táctil de ocupación de salón, comensales y envío asíncrono de comandas a cocina.'}
              {activeView === 'cocina' && 'Recepción en tiempo real, alertas de preparación con temporizador y descuento automático por receta.'}
              {activeView === 'caja' && 'Facturación completa, control de medios de pago, registros fiscales e historial impreso.'}
              {activeView === 'inventario' && 'Análisis pormenorizado de stock actual, recetas, mermas cargadas y reposiciones.'}
              {activeView === 'bi' && 'Visualizadores gráficos para toma de decisiones, facturación acumulada e historial.'}
              {activeView === 'sistema' && 'Estatus de base de datos Postgres/Supabase, variables de entorno y copias de seguridad.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 bg-white border border-stone-200 px-2.5 py-1 rounded-xl font-medium flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              Sesión: Damián & Sofia (Activos)
            </span>
          </div>
        </div>

        {/* MAIN SCROLLABLE CONTENT */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {/* SIMULATION BAR CONTROLLER */}
          <SimulationControls
            minutosGlobal={minutosGlobal}
            autoTimerRunning={autoTimerRunning}
            onAdvanceTime={handleAdvanceTime}
            onToggleAutoTimer={handleToggleAutoTimer}
            onInjectDeliveryOrder={handleInjectDeliveryOrder}
            onResetAllData={handleResetAllData}
          />

          {/* ACTIVE TAB RENDER TRIAGE */}
          {activeView === 'mozo' && (
            <div className="animate-fadeIn">
              <MozoTerminal
                mesas={mesas}
                insumos={insumos}
                productosMenu={productosMenu}
                recetas={recetas}
                activeMozo={activeMozo}
                onMozoChange={handleMozoChange}
                onCrearPedido={handleCrearPedido}
                pedidos={pedidos}
                onFacturarMesa={handleFacturarMesa}
                addLog={addLog}
              />
            </div>
          )}

          {activeView === 'cocina' && (
            <div className="animate-fadeIn">
              <KitchenMonitor
                pedidos={pedidos}
                onCambiarEstadoPedido={handleCambiarEstadoPedido}
                onProducirPedidoConEscandallo={handleProducirPedidoConEscandallo}
                minutosGlobal={minutosGlobal}
              />
            </div>
          )}

          {activeView === 'caja' && (
            <div className="animate-fadeIn">
              <CajaModule
                pedidos={pedidos}
                productosMenu={productosMenu}
                onFacturarMesa={handleFacturarMesa}
                onCambiarEstadoPedido={handleCambiarEstadoPedido}
                addLog={addLog}
              />
            </div>
          )}

          {activeView === 'inventario' && (
            <div className="animate-fadeIn">
              <InventoryModule
                insumos={insumos}
                productosMenu={productosMenu}
                recetas={recetas}
                mermas={mermas}
                onRegistrarMerma={handleRegistrarMerma}
                onRestockInsumo={handleRestockInsumo}
                onRestockTodo={handleRestockTodo}
                addLog={addLog}
              />
            </div>
          )}

          {activeView === 'bi' && (
            <div className="animate-fadeIn">
              <BusinessIntelligence
                productosMenu={productosMenu}
                logs={logs}
              />
            </div>
          )}

          {activeView === 'sistema' && (
            <div className="animate-fadeIn">
              <SistemaModule
                insumos={insumos}
                productosMenu={productosMenu}
                recetas={recetas}
                pedidos={pedidos}
                mesas={mesas}
                addLog={addLog}
              />
            </div>
          )}

        </div>

        {/* SYSTEM COAXIAL FOOTER */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-400 flex flex-col md:flex-row justify-between items-center gap-3">
          <p>© 2026 Restaurante Pro S.A. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 cursor-default">Condiciones Operativas</span>
            <span>•</span>
            <span className="hover:text-slate-600 cursor-default">Auditoría Habilitada</span>
            <span>•</span>
            <span className="hover:text-slate-600 cursor-default">Fidelidad de Escandallos</span>
          </div>
        </footer>

      </main>

    </div>
  );
}
