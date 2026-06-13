/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  User,
  Clock,
  RefreshCw,
  ShieldAlert
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
import HomeMenuModule from './components/HomeMenuModule';
import MozoTerminal from './components/MozoTerminal';
import KitchenMonitor from './components/KitchenMonitor';
import InventoryModule from './components/InventoryModule';
import BusinessIntelligence from './components/BusinessIntelligence';
import CajaModule from './components/CajaModule';
import ErrorBoundary from './components/ErrorBoundary';
import SistemaModule from './components/SistemaModule';
import PythonStreamlitLogin from './components/PythonStreamlitLogin';
import ElPatronLogo from './components/ElPatronLogo';
import PanelDashboard from './components/PanelDashboard';
import UsuariosModule from './components/UsuariosModule';
import MenuModule from './components/MenuModule';
import RecetasModule from './components/RecetasModule';
import MesasModule from './components/MesasModule';
import ProveedoresModule from './components/ProveedoresModule';
import PromocionesModule from './components/PromocionesModule';
import ReservasModule from './components/ReservasModule';
import FacturacionModule from './components/FacturacionModule';
import BackupsModule from './components/BackupsModule';
import { 
  getSupabaseClient,
  dbFetchMesas,
  dbFetchInsumos,
  dbFetchProductosMenu,
  dbFetchRecetas,
  dbSavePedidoComplex,
  dbUpsertMesas,
  dbUpsertInsumos,
  dbFetchMermas,
  dbRecordMovement
} from './supabase';

export default function App() {
  // --- Global Synced States ---
  const [isStreamlitLoggedIn, setIsStreamlitLoggedIn] = useState<boolean>(false);
  const [permitirVentaSinStock, setPermitirVentaSinStock] = useState<boolean>(false);
  const [mesas, setMesas] = useState<Mesa[]>(INITIAL_MESAS);
  const [insumos, setInsumos] = useState<Insumo[]>(INITIAL_INSUMOS);
  const [productosMenu, setProductosMenu] = useState<ProductoMenu[]>(INITIAL_PRODUCTOS_MENU);
  const [recetas, setRecetas] = useState<RecetaEscandallo[]>(INITIAL_RECETAS_ESCANDALLO);
  const [pedidos, setPedidos] = useState<Pedido[]>(INITIAL_PEDIDOS);
  const [mermas, setMermas] = useState<Merma[]>([]);

  // Helper log registrar
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
  const addLog = useCallback(
    (
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
    },
    []
  );

  // Auto-sync effect on mount
  useEffect(() => {
    const autoLoadSupabase = async () => {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        const dbMesas = await dbFetchMesas();
        const dbInsumos = await dbFetchInsumos();
        const dbProducts = await dbFetchProductosMenu();
        const dbRecipes = await dbFetchRecetas();
        const dbMermas = await dbFetchMermas();

        if ((dbMesas ?? []).length > 0) {
          setMesas((dbMesas ?? []).map(m => ({
            id_mesa: m.id_mesa,
            numero_mesa: m.numero_mesa,
            estado: m.estado || 'libre',
            comensales: m.comensales || undefined
          })));
        }
        if ((dbInsumos ?? []).length > 0) {
          setInsumos(dbInsumos ?? []);
        }
        if ((dbProducts ?? []).length > 0) {
          setProductosMenu(dbProducts ?? []);
        }
        if ((dbRecipes ?? []).length > 0) {
          setRecetas(dbRecipes ?? []);
        }
        if ((dbMermas ?? []).length > 0) {
          setMermas(dbMermas ?? []);
        }
        addLog('sistema', 'SUPABASE: Auto-sincronización exitosa en el arranque de la aplicación.');
      } catch (err) {
        console.warn('Supabase: Falló auto-sync en el arranque. Usando datos SQLite locales.', err);
      }
    };
    autoLoadSupabase();
  }, [addLog]);

  // Sync completion callback handed to settings
  const handleSupabaseSync = (newData: {
    mesas?: Mesa[];
    insumos?: Insumo[];
    productosMenu?: ProductoMenu[];
    recetas?: RecetaEscandallo[];
    mermas?: Merma[];
  }) => {
    if (newData.mesas) setMesas(newData.mesas);
    if (newData.insumos) setInsumos(newData.insumos);
    if (newData.productosMenu) setProductosMenu(newData.productosMenu);
    if (newData.recetas) setRecetas(newData.recetas);
    if (newData.mermas) setMermas(newData.mermas);
  };

  
  // Custom interactive log tracker for BI & audit

  // Terminal active configs & simulation states
  const [activeMozo, setActiveMozo] = useState<string>('Enzo');
  const [activeView, setActiveView] = useState<
    'home' | 'panel' | 'mozo' | 'cocina' | 'caja' | 'reportes' | 'usuarios' | 'menu' | 'recetas' | 'mesas' | 'inventario' | 'proveedores' | 'promociones' | 'reservas' | 'facturacion' | 'sistema' | 'backups'
  >('home');

  // Simulation Clock state (operational minutes passed)
  const [minutosGlobal, setMinutosGlobal] = useState<number>(0);
  const [autoTimerRunning, setAutoTimerRunning] = useState<boolean>(false);


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
    const updatedMesas = mesas.map(m => m.id_mesa === newPedidoData.id_mesa ? { ...m, estado: 'ocupada' as const, comensales: newPedidoData.comensales || 2 } : m);
    setMesas(updatedMesas);

    addLog('pedido_creado', `Mesa ${newPedidoData.numero_mesa} generó pedido #${newId} por ${newPedido.mozo}. Items: ${newPedidoData.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ')}`);

    // --- DESCUENTO INMEDIATO DE INSUMOS (AUTO-ESCANDALLO) ---
    let itemsDescontados: string[] = [];
    let alarmasBajoStock: string[] = [];
    let updatedInsumos: Insumo[] = [];

    setInsumos(prevInsumos => {
      const copy = prevInsumos.map(ins => ({ ...ins }));

      newPedido.items.forEach(pItem => {
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

      updatedInsumos = copy;
      return copy;
    });

    if (itemsDescontados.length > 0) {
      addLog('descuento_stock', `ESCANDALLO (AL MANDAR COMANDA): Pedido #${newId} enviado a cocina. Insumos descontados: ${itemsDescontados.join(', ')}`);
    }

    alarmasBajoStock.forEach(nom => {
      addLog('alerta_stock', `CONTROL REPOSICIÓN: El insumo '${nom}' ha caído por debajo del stock de seguridad.`);
    });

    // Sync state mutations to Supabase in background
    dbSavePedidoComplex(newPedido);
    dbUpsertMesas(updatedMesas);

    // Sync stocks to Supabase
    setTimeout(() => {
      if (updatedInsumos.length > 0) {
        dbUpsertInsumos(updatedInsumos);
      }
    }, 50);
  };

  const handleMozoChange = (mozo: string) => {
    setActiveMozo(mozo);
    addLog('sistema', `SESIÓN: Acceso de personal actualizado por mozo: ${mozo}`);
  };

  // --- Handlers for Kitchen View (KDS) ---
  const handleCambiarEstadoPedido = (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => {
    let updatedPedido: Pedido | null = null;
    let errorMsg = '';

    const pObj = pedidos.find(p => p.id_pedido === idPedido);

    // If changing to 'en_cocina' (production), run escandallo and subtract stock if not discounted yet
    if (nuevoEstado === 'en_cocina' && pObj) {
      // 1. Validate empty orders or orders without products
      if (!pObj.items || pObj.items.length === 0) {
        alert("Error: No se puede enviar a cocina un pedido vacío (sin productos).");
        addLog('sistema', `RECHAZADO: Intento de enviar a cocina el pedido vacío #${idPedido}`);
        return;
      }

      // 2. Prevent double stock deduction
      if (pObj.stock_descontado) {
        console.log(`[Escandallo] El pedido #${idPedido} ya tiene stock descontado.`);
      } else {
        let canDeduct = true;
        let itemsDescontados: string[] = [];
        let alarmasBajoStock: string[] = [];

        // Validate insufficient stock BEFORE proceeding if ALLOW VENTA WITHOUT STOCK is false
        if (!permitirVentaSinStock) {
          for (const item of pObj.items) {
            const qtyPlates = item.cantidad;
            const matchingRecetas = recetas.filter(r => r.id_producto === item.id_producto);

            if (matchingRecetas.length === 0) {
              // Warn about missing recipe, but do not break the order
              addLog('sistema', `ADVERTENCIA RECETA: El producto '${item.nombre}' no tiene receta asociada.`);
              continue;
            }

            for (const rec of matchingRecetas) {
              const insumo = insumos.find(i => i.id_insumo === rec.id_insumo);
              if (!insumo) {
                addLog('sistema', `ADVERTENCIA RECETA: No existe el insumo con ID '${rec.id_insumo}' solicitado por receta.`);
                continue;
              }
              const requiredAmt = rec.cantidad_a_descontar * qtyPlates;
              if (insumo.stock_actual < requiredAmt) {
                canDeduct = false;
                errorMsg = `Insumo crítico agotado para '${insumo.nombre}' (Disponible: ${insumo.stock_actual}${insumo.unidad_medida}, Requerido: ${requiredAmt}${insumo.unidad_medida}).`;
                break;
              }
            }
            if (!canDeduct) break;
          }
        }

        if (!canDeduct) {
          alert(`No es posible iniciar cocción: ${errorMsg}`);
          addLog('alerta_stock', `RECHAZADO FUEGO: Pedido #${idPedido} bloqueado por falta de stock. ${errorMsg}`);
          return; // STOP!
        }

        // Apply deduction to ingredients
        let updatedInsumos: Insumo[] = [];
        setInsumos(prevInsumos => {
          const copy = prevInsumos.map(ins => ({ ...ins }));

          pObj.items.forEach(item => {
            const qtyPlates = item.cantidad;
            const matchingRecetas = recetas.filter(r => r.id_producto === item.id_producto);

            matchingRecetas.forEach(rec => {
              const insIdx = copy.findIndex(ins => ins.id_insumo === rec.id_insumo);
              if (insIdx !== -1) {
                const currentIns = copy[insIdx];
                const discountAmt = parseFloat((rec.cantidad_a_descontar * qtyPlates).toFixed(2));
                const stockAnterior = currentIns.stock_actual;
                const updatedStock = parseFloat((Math.max(permitirVentaSinStock ? -999999 : 0, stockAnterior - discountAmt)).toFixed(2));

                copy[insIdx].stock_actual = updatedStock;
                itemsDescontados.push(`${currentIns.nombre} (-${discountAmt} ${currentIns.unidad_medida})`);

                if (updatedStock <= currentIns.stock_minimo) {
                  alarmasBajoStock.push(`${currentIns.nombre} (Stock actual: ${updatedStock}${currentIns.unidad_medida})`);
                }

                // Record inventory movement securely
                dbRecordMovement({
                  id_insumo: currentIns.id_insumo,
                  tipo_movimiento: 'salida_comanda',
                  cantidad: discountAmt,
                  stock_anterior: stockAnterior,
                  stock_nuevo: updatedStock
                }).catch(console.error);
              } else {
                addLog('sistema', `ADVERTENCIA: No existe insumo '${rec.id_insumo}' solicitado por la receta.`);
              }
            });
          });

          updatedInsumos = copy;
          return copy;
        });

        // Mutate local temporary model flags
        pObj.stock_descontado = true;
        pObj.fecha_descuento_stock = new Date();

        if (itemsDescontados.length > 0) {
          addLog('descuento_stock', `ESCANDALLO: Pedido #${idPedido} cambió a EN_COCINA. Descuento automático de: ${itemsDescontados.join(', ')}`);
        }

        alarmasBajoStock.forEach(alertStr => {
          addLog('alerta_stock', `CRÍTICO REPOSICIÓN: El insumo '${alertStr}' cayó por debajo del stock mínimo estipulado.`);
        });

        // Write through stocks to database
        setTimeout(() => {
          if (updatedInsumos.length > 0) {
            dbUpsertInsumos(updatedInsumos);
          }
        }, 50);
      }
    }

    // If order is canceled, let's reverse stock deduction if it has already been discounted
    if (nuevoEstado === 'cancelado' && pObj) {
      if (pObj.stock_descontado) {
        let itemsReversados: string[] = [];
        let updatedInsumos: Insumo[] = [];

        setInsumos(prevInsumos => {
          const copy = prevInsumos.map(ins => ({ ...ins }));

          pObj.items.forEach(pItem => {
            const qtyPlates = pItem.cantidad;
            const matchingRecetas = recetas.filter(r => r.id_producto === pItem.id_producto);

            matchingRecetas.forEach(rec => {
              const insIdx = copy.findIndex(ins => ins.id_insumo === rec.id_insumo);
              if (insIdx !== -1) {
                const currentIns = copy[insIdx];
                const restoreAmt = parseFloat((rec.cantidad_a_descontar * qtyPlates).toFixed(2));
                const stockAnterior = currentIns.stock_actual;
                const updatedStock = parseFloat((stockAnterior + restoreAmt).toFixed(2));

                copy[insIdx].stock_actual = updatedStock;
                itemsReversados.push(`${currentIns.nombre} (+${restoreAmt} ${currentIns.unidad_medida})`);

                // Record reversal inventory movement
                dbRecordMovement({
                  id_insumo: currentIns.id_insumo,
                  tipo_movimiento: 'entrada',
                  cantidad: restoreAmt,
                  stock_anterior: stockAnterior,
                  stock_nuevo: updatedStock
                }).catch(console.error);
              }
            });
          });

          updatedInsumos = copy;
          return copy;
        });

        pObj.stock_descontado = false;
        pObj.fecha_descuento_stock = undefined;

        if (itemsReversados.length > 0) {
          addLog('descuento_stock', `REVERSO ESCANDALLO: Pedido #${idPedido} CANCELADO. Reintegro automático de: ${itemsReversados.join(', ')}`);
        }

        setTimeout(() => {
          if (updatedInsumos.length > 0) {
            dbUpsertInsumos(updatedInsumos);
          }
        }, 50);
      } else {
        addLog('sistema', `CANCELACIÓN: Pedido #${idPedido} cancelado sin descuento de stock previo.`);
      }
    }

    // Proceed to standard states update
    setPedidos(prev => prev.map(p => {
      if (p.id_pedido === idPedido) {
        const updated = { ...p, estado_comanda: nuevoEstado };
        if (nuevoEstado === 'listo') {
          updated.segundos_en_listo = 0; // reset cooling timer
        }
        updatedPedido = updated;
        return updated;
      }
      return p;
    }));

    const mStr = pObj ? ` para ${pObj.numero_mesa}` : '';
    addLog('comanda_estado', `COMANDA #${idPedido}${mStr}: Estado cambiado a ${nuevoEstado.toUpperCase()}`);

    // Dynamic write-through
    setTimeout(() => {
      if (updatedPedido) {
        dbSavePedidoComplex(updatedPedido);
      } else if (pObj) {
        dbSavePedidoComplex({ ...pObj, estado_comanda: nuevoEstado });
      }
    }, 50);

    // If order was delivered/paid or canceled, liberate the table
    if ((nuevoEstado === 'entregado_cobrado' || nuevoEstado === 'cancelado') && pObj) {
      const updatedMesas = mesas.map(m => m.id_mesa === pObj.id_mesa ? { ...m, estado: 'libre' as const, comensales: undefined } : m);
      setMesas(updatedMesas);
      dbUpsertMesas(updatedMesas);
    }
  };

  const handleProducirPedidoConEscandallo = (idPedido: number) => {
    // When marking as finished, transition to 'listo'
    handleCambiarEstadoPedido(idPedido, 'listo');
  };

  // --- Handlers for Cashier View (Caja & Cierre) ---
  const handleFacturarMesa = (idPedido: number) => {
    const target = pedidos.find(p => p.id_pedido === idPedido);
    if (!target) return;

    // Settle order state to delivered/paid
    setPedidos(prev => prev.map(p => p.id_pedido === idPedido ? { ...p, estado_comanda: 'entregado_cobrado' } : p));

    // Clear mesa state
    const updatedMesas = mesas.map(m => m.id_mesa === target.id_mesa ? { ...m, estado: 'libre' as const, comensales: undefined } : m);
    setMesas(updatedMesas);

    addLog('sistema', `CAJA: Facturación completa cobrada correctamente de la mesa ${target.numero_mesa} por Pedido #${idPedido}`);

    // Supabase pushes
    dbSavePedidoComplex({ ...target, estado_comanda: 'entregado_cobrado' });
    dbUpsertMesas(updatedMesas);
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
    const updatedInsumos = insumos.map(i => i.id_insumo === idInsumo ? {
      ...i,
      stock_actual: Math.max(0, parseFloat((i.stock_actual - cantidad).toFixed(2)))
    } : i);
    setInsumos(updatedInsumos);

    addLog('merma_registrada', `REGISTRO MERMA: ${cantidad} ${insObj.unidad_medida} de '${insObj.nombre}' registrado por motivo: ${motivo.toUpperCase()}`);

    // Sync inventory reduction
    dbUpsertInsumos(updatedInsumos);
  };

  const handleRestockInsumo = (idInsumo: string, cantidad: number) => {
    const updatedInsumos = insumos.map(i => i.id_insumo === idInsumo ? {
      ...i,
      stock_actual: parseFloat((i.stock_actual + cantidad).toFixed(2))
    } : i);
    setInsumos(updatedInsumos);

    const item = insumos.find(i => i.id_insumo === idInsumo);
    addLog('sistema', `REPOSICIÓN: Incremetado stock de '${item ? item.nombre : idInsumo}' en +${cantidad}`);

    // Sync inventory write
    dbUpsertInsumos(updatedInsumos);
  };

  const handleRestockTodo = () => {
    const updatedInsumos = insumos.map(i => {
      const restockAmt = i.unidad_medida === 'unidades' ? 10 : 3000;
      return {
        ...i,
        stock_actual: i.stock_actual + restockAmt
      };
    });
    setInsumos(updatedInsumos);
    addLog('sistema', `REPOSICIÓN GENERAL: Abastecimiento global automático de todos los insumos y materias primas.`);

    // Sync bulk inventory
    dbUpsertInsumos(updatedInsumos);
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

  if (!isStreamlitLoggedIn) {
    return <PythonStreamlitLogin onLoginSuccess={() => setIsStreamlitLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F1E9] flex flex-col lg:flex-row font-sans text-slate-800 antialiased selection:bg-[#624A3E] selection:text-white">
      
      {/* LEFT SIDE PANEL (PERSISTENT SIDEBAR) */}
      <aside className="w-full lg:w-80 bg-[#1E1E1E] text-[#E2E8F0] flex flex-col border-b lg:border-b-0 lg:border-r border-stone-850 shrink-0 z-40" id="sidebar-left-panel">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FAF4EE] rounded-xl flex items-center justify-center shadow-md border border-stone-850 p-0.5 overflow-hidden shrink-0">
              <ElPatronLogo className="w-11 h-11 object-contain rounded-lg" variant="icon" color="#4A2D1B" />
            </div>
            <div className="min-w-0">
              <span className="font-sans font-extrabold text-base text-white tracking-tight block">El Patrón</span>
              <span className="text-[9px] uppercase font-bold text-[#FAF4EE]/70 tracking-wider block mt-0.5 leading-none">Gestión Gastronómica Pro</span>
            </div>
          </div>
          <span className="bg-[#4A2D1B]/35 text-amber-200 text-[8px] border border-stone-800 px-1.5 py-1 rounded font-bold font-mono shrink-0">
            v1.2.0
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

        {/* Business Rule: Venta sin stock */}
        <div className="p-4 bg-stone-950/30 border-b border-stone-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-[#F97316]" />
              Fórmula sin Stock
            </span>
            <span className="text-[10px] text-stone-500 font-bold font-mono">RESTRICCIÓN</span>
          </div>
          <label className="flex items-center justify-between bg-[#151515] border border-stone-800 p-2.5 rounded-xl cursor-pointer hover:bg-[#252525] transition-all select-none">
            <div className="min-w-0 pr-2">
              <span className="text-[9px] text-stone-500 font-bold block leading-none">VENTA PARMITIDA</span>
              <span className="text-xs font-semibold text-white tracking-tight truncate block mt-0.5">
                {permitirVentaSinStock ? 'Forzar Ventas Habilitada' : 'Bloquear sin ingred.'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={permitirVentaSinStock}
              onChange={(e) => {
                setPermitirVentaSinStock(e.target.checked);
                addLog('sistema', `REGLA DE NEGOCIO: Venta forzada sin stock ${e.target.checked ? 'HABILITADA (se admiten negativos)' : 'DESHABILITADA (bloqueo automático)'}`);
              }}
              className="rounded border-stone-700 text-[#624A3E] focus:ring-[#624A3E] w-4 h-4 bg-stone-800 cursor-pointer"
            />
          </label>
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
            <span className="text-[10px] font-black text-stone-500 tracking-wider uppercase pl-2 mb-2 block">Módulos del Sistema</span>
            
            <nav className="space-y-2" id="sidebar-navigation">
              {[
                { id: 'home', label: 'Menú Principal 🍽️' },
                { id: 'panel', label: 'Panel General' },
                { id: 'mozo', label: 'Mozo / Salón' },
                { id: 'cocina', label: 'Cocina KDS' },
                { id: 'caja', label: 'Caja' },
                { id: 'reportes', label: 'Reportes / BI' },
                { id: 'usuarios', label: 'Usuarios' },
                { id: 'menu', label: 'Menú' },
                { id: 'recetas', label: 'Recetas / Escandallos' },
                { id: 'mesas', label: 'Mesas' },
                { id: 'inventario', label: 'Inventario' },
                { id: 'proveedores', label: 'Proveedores' },
                { id: 'promociones', label: 'Promociones' },
                { id: 'reservas', label: 'Reservas' },
                { id: 'facturacion', label: 'Facturación' },
                { id: 'sistema', label: 'Sistema' },
                { id: 'backups', label: 'Backups' }
              ].map(item => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`tab-${item.id}`}
                    onClick={() => setActiveView(item.id as any)}
                    className={`w-full py-3.5 text-center text-xs font-black rounded-lg tracking-wider border block transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#4D3227] text-white border-stone-800/10 font-bold shadow-md shadow-black/20'
                        : 'bg-[#181816]/75 hover:bg-[#25231F] text-stone-300 hover:text-white border-stone-850/60'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
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
            <h1 className="text-xl font-extrabold text-[#624A3E] capitalize tracking-tight flex items-center gap-2">
              {activeView === 'home' && <>🍽️ Menú Principal & Centro Operativo</>}
              {activeView === 'panel' && <>📊 Panel de Control y Resumen de Turno</>}
              {activeView === 'mozo' && <>📱 Terminal Interactiva de Mozos</>}
              {activeView === 'cocina' && <>🍳 Monitor de Cocina (KDS)</>}
              {activeView === 'caja' && <>💵 Control de Caja y Cierres</>}
              {activeView === 'reportes' && <>📈 Analíticas de Desempeño & BI</>}
              {activeView === 'usuarios' && <>👥 Personal y Usuarios de Turno</>}
              {activeView === 'menu' && <>📖 Menú y Carta Gastronómica</>}
              {activeView === 'recetas' && <>⚖️ Control de Escandallos y Recetas</>}
              {activeView === 'mesas' && <>🪑 Distribución de Mesas en Salón</>}
              {activeView === 'inventario' && <>📦 Gestión de Insumos & Recetas</>}
              {activeView === 'proveedores' && <>🚚 Proveedores e Integraciones</>}
              {activeView === 'promociones' && <>🏷️ Campañas de Promociones</>}
              {activeView === 'reservas' && <>📅 Agenda de Reservas de Hoy</>}
              {activeView === 'facturacion' && <>🧾 Archivo Tributario de Facturas</>}
              {activeView === 'sistema' && <>💻 Consola de Configuración General</>}
              {activeView === 'backups' && <>🗄️ Copias de Seguridad (Backup)</>}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {activeView === 'home' && 'Bienvenido a El Patrón Pro. Ingrese rápidamente a cualquier sección o terminal.'}
              {activeView === 'panel' && 'Métricas macro, alertas críticas y bitácora operativa en tiempo real.'}
              {activeView === 'mozo' && 'Gestión táctil de ocupación de salón, comensales y envío asíncrono de comandas a cocina.'}
              {activeView === 'cocina' && 'Recepción en tiempo real, alertas de preparación con temporizador y descuento automático por receta.'}
              {activeView === 'caja' && 'Facturación completa, control de medios de pago, registros fiscales e historial impreso.'}
              {activeView === 'reportes' && 'Visualizadores gráficos para toma de decisiones, facturación acumulada e historial.'}
              {activeView === 'usuarios' && 'Roles, perfiles del personal y trazabilidad en el salón.'}
              {activeView === 'menu' && 'Configuración de oferta comercial, precios públicos y estatus en carta.'}
              {activeView === 'recetas' && 'Asociación de ingredientes crudos y cálculo automático de rendimiento y márgenes.'}
              {activeView === 'mesas' && 'Visualización interactiva, asignación de mesas y control de capacidad.'}
              {activeView === 'inventario' && 'Análisis pormenorizado de stock actual, recetas, mermas cargadas y reposiciones.'}
              {activeView === 'proveedores' && 'Contactos comerciales, plazos de entrega y reabastecimiento programado.'}
              {activeView === 'promociones' && 'Incentivos de ventas, descuentos happy hour y combos especiales.'}
              {activeView === 'reservas' && 'Planificación de visitas, comensales reservados y asignación de mesas.'}
              {activeView === 'facturacion' && 'Historial de facturas comprobantes de venta, control de IVA y notas de crédito.'}
              {activeView === 'sistema' && 'Estatus de base de datos Postgres/Supabase, variables de entorno y copias de seguridad.'}
              {activeView === 'backups' && 'Respaldo íntegro de la base de datos, descargas JSON y restauración de checkpoints.'}
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
          
          {/* ACTIVE TAB RENDER TRIAGE */}
          {activeView === 'home' && (
            <ErrorBoundary moduleName={'home'}>
            <div key={activeView} className="animate-fadeIn">
              <HomeMenuModule
                mesas={mesas}
                pedidos={pedidos}
                insumos={insumos}
                productosMenu={productosMenu}
                activeMozo={activeMozo}
                onMozoChange={handleMozoChange}
                onNavigate={(view: any) => setActiveView(view)}
                getSimulatedTimeStr={getSimulatedTimeStr}
                autoTimerRunning={autoTimerRunning}
                onToggleAutoTimer={handleToggleAutoTimer}
                onAdvanceTime={handleAdvanceTime}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'panel' && (
            <ErrorBoundary moduleName={'panel'}>
            <div key={activeView} className="animate-fadeIn">
              <PanelDashboard
                mesas={mesas}
                pedidos={pedidos}
                insumos={insumos}
                logs={logs}
                getSimulatedTimeStr={getSimulatedTimeStr}
                onNavigate={(view: any) => setActiveView(view)}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'mozo' && (
            <ErrorBoundary moduleName={'mozo'}>
            <div key={activeView} className="animate-fadeIn">
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
                permitirVentaSinStock={permitirVentaSinStock}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'cocina' && (
            <ErrorBoundary moduleName={'cocina'}>
            <div key={activeView} className="animate-fadeIn">
              <KitchenMonitor
                pedidos={pedidos}
                onCambiarEstadoPedido={handleCambiarEstadoPedido}
                onProducirPedidoConEscandallo={handleProducirPedidoConEscandallo}
                minutosGlobal={minutosGlobal}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'caja' && (
            <ErrorBoundary moduleName={'caja'}>
            <div key={activeView} className="animate-fadeIn">
              <CajaModule
                pedidos={pedidos}
                productosMenu={productosMenu}
                onFacturarMesa={handleFacturarMesa}
                onCambiarEstadoPedido={handleCambiarEstadoPedido}
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'reportes' && (
            <ErrorBoundary moduleName={'reportes'}>
            <div key={activeView} className="animate-fadeIn">
              <BusinessIntelligence
                productosMenu={productosMenu}
                logs={logs}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'usuarios' && (
            <ErrorBoundary moduleName={'usuarios'}>
            <div key={activeView} className="animate-fadeIn">
              <UsuariosModule
                logs={logs}
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'menu' && (
            <ErrorBoundary moduleName={'menu'}>
            <div key={activeView} className="animate-fadeIn">
              <MenuModule
                productosMenu={productosMenu}
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'recetas' && (
            <ErrorBoundary moduleName={'recetas'}>
            <div key={activeView} className="animate-fadeIn">
              <RecetasModule
                recetas={recetas}
                productosMenu={productosMenu}
                insumos={insumos}
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'mesas' && (
            <ErrorBoundary moduleName={'mesas'}>
            <div key={activeView} className="animate-fadeIn">
              <MesasModule
                mesas={mesas}
                onSubmitPedido={handleCrearPedido}
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'inventario' && (
            <ErrorBoundary moduleName={'inventario'}>
            <div key={activeView} className="animate-fadeIn">
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
              </ErrorBoundary>
          )}

          {activeView === 'proveedores' && (
            <ErrorBoundary moduleName={'proveedores'}>
            <div key={activeView} className="animate-fadeIn">
              <ProveedoresModule
                onRestockTodo={handleRestockTodo}
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'promociones' && (
            <ErrorBoundary moduleName={'promociones'}>
            <div key={activeView} className="animate-fadeIn">
              <PromocionesModule
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'reservas' && (
            <ErrorBoundary moduleName={'reservas'}>
            <div key={activeView} className="animate-fadeIn">
              <ReservasModule
                mesas={mesas}
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'facturacion' && (
            <ErrorBoundary moduleName={'facturacion'}>
            <div key={activeView} className="animate-fadeIn">
              <FacturacionModule
                pedidos={pedidos}
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'sistema' && (
            <ErrorBoundary moduleName={'sistema'}>
            <div key={activeView} className="animate-fadeIn">
              <SistemaModule
                insumos={insumos}
                productosMenu={productosMenu}
                recetas={recetas}
                pedidos={pedidos}
                mesas={mesas}
                addLog={addLog}
                onSyncComplete={handleSupabaseSync}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'backups' && (
            <ErrorBoundary moduleName={'backups'}>
            <div key={activeView} className="animate-fadeIn">
              <BackupsModule
                onResetAllData={handleResetAllData}
                addLog={addLog}
              />
            </div>
              </ErrorBoundary>
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