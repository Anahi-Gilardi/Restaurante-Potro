/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { 
  User,
  Clock,
  RefreshCw,
  ShieldAlert,
  LogOut
} from 'lucide-react';

import { Mesa, Insumo, ProductoMenu, RecetaEscandallo, Pedido, Merma, EventoLog, Reserva, Usuario } from './types';
import { 
  INITIAL_USUARIOS,
  INITIAL_MESAS, 
  INITIAL_INSUMOS, 
  INITIAL_PRODUCTOS_MENU, 
  INITIAL_RECETAS_ESCANDALLO, 
  INITIAL_PEDIDOS 
} from './data/initialData';

// Static imports (small, used on every render or at login)
import ErrorBoundary from './components/ErrorBoundary';
import { useToast, ToastContainer } from './components/ToastContainer';
import PythonStreamlitLogin from './components/PythonStreamlitLogin';
import ElPatronLogo from './components/ElPatronLogo';
import BottomNavigation from './components/BottomNavigation';
import RetryErrorWrapper from './components/RetryErrorWrapper';
import Skeleton from './components/Skeleton';

// Lazy-loaded modules (code-split, loaded on demand)
const HomeMenuModule = lazy(() => import('./components/HomeMenuModule'));
const MozoTerminal = lazy(() => import('./components/MozoTerminal'));
const KitchenMonitor = lazy(() => import('./components/KitchenMonitor'));
const InventoryModule = lazy(() => import('./components/InventoryModule'));
const BusinessIntelligence = lazy(() => import('./components/BusinessIntelligence'));
const CajaModule = lazy(() => import('./components/CajaModule'));
const SistemaModule = lazy(() => import('./components/SistemaModule'));
const PanelDashboard = lazy(() => import('./components/PanelDashboard'));
const UsuariosModule = lazy(() => import('./components/UsuariosModule'));
const MenuModule = lazy(() => import('./components/MenuModule'));
const RecetasModule = lazy(() => import('./components/RecetasModule'));
const MesasModule = lazy(() => import('./components/MesasModule'));
const ProveedoresModule = lazy(() => import('./components/ProveedoresModule'));
const PromocionesModule = lazy(() => import('./components/PromocionesModule'));
const ReservasModule = lazy(() => import('./components/ReservasModule'));
const FacturacionModule = lazy(() => import('./components/FacturacionModule'));
const BackupsModule = lazy(() => import('./components/BackupsModule'));
import type { BackupSnapshotData } from './services/backupsService';
import { usuariosService } from './services/usuariosService';
import { 
  getSupabaseClient,
  dbFetchMesas,
  dbFetchInsumos,
  dbFetchProductosMenu,
  dbFetchRecetas,
  dbFetchPedidos,
  dbSavePedidoComplex,
  dbUpsertMesas,
  dbUpsertInsumos,
  dbFetchMermas,
  dbUpsertMermas,
  dbRecordMovement
} from './supabase';
import { AppView, canAccessView, getAllowedViews } from './lib/permissions';

export default function App() {
  const { toast, toasts, removeToast } = useToast();
  // --- Global Synced States ---
  const [isStreamlitLoggedIn, setIsStreamlitLoggedIn] = useState<boolean>(() => (
    typeof window !== 'undefined' && window.sessionStorage.getItem('el_patron_session') === 'active'
  ));
  const [permitirVentaSinStock, setPermitirVentaSinStock] = useState<boolean>(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>(INITIAL_USUARIOS);
  const [mesas, setMesas] = useState<Mesa[]>(INITIAL_MESAS);
  const [insumos, setInsumos] = useState<Insumo[]>(INITIAL_INSUMOS);
  const [productosMenu, setProductosMenu] = useState<ProductoMenu[]>(INITIAL_PRODUCTOS_MENU);
  const [recetas, setRecetas] = useState<RecetaEscandallo[]>(INITIAL_RECETAS_ESCANDALLO);
  const [pedidos, setPedidos] = useState<Pedido[]>(INITIAL_PEDIDOS);
  const [mermas, setMermas] = useState<Merma[]>([]);

  // Mapa O(1) de precio_venta para cálculos de ventas en toda la app
  const precioMap = useMemo(() => {
    const m = new Map<string, number>();
    productosMenu.forEach(p => m.set(p.id_producto, p.precio_venta));
    return m;
  }, [productosMenu]);

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
      try {
        const savedUsuarios = await usuariosService.list();
        if (savedUsuarios.length > 0) setUsuarios(savedUsuarios);
      } catch (err) {
        console.warn('Usuarios: no se pudo cargar la copia persistida.', err);
      }

      const client = getSupabaseClient();
      if (!client) return;
      try {
        const dbMesas = await dbFetchMesas();
        const dbInsumos = await dbFetchInsumos();
        const dbProducts = await dbFetchProductosMenu();
        const dbRecipes = await dbFetchRecetas();
        const dbPedidos = await dbFetchPedidos();
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
        if ((dbPedidos ?? []).length > 0) {
          setPedidos(dbPedidos ?? []);
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
    pedidos?: Pedido[];
    mermas?: Merma[];
  }) => {
    if (newData.mesas) setMesas(newData.mesas);
    if (newData.insumos) setInsumos(newData.insumos);
    if (newData.productosMenu) setProductosMenu(newData.productosMenu);
    if (newData.recetas) setRecetas(newData.recetas);
    if (newData.pedidos) setPedidos(newData.pedidos);
    if (newData.mermas) setMermas(newData.mermas);
  };

  
  // Custom interactive log tracker for BI & audit

  // Terminal active configs & simulation states
  const [activeMozo, setActiveMozo] = useState<string>('Sofía');
  const [activeView, setActiveView] = useState<AppView>('home');
  const activeUser = useMemo(
    () => usuarios.find(usuario => usuario.nombre === activeMozo && usuario.activo !== false)
      || usuarios.find(usuario => usuario.activo !== false)
      || INITIAL_USUARIOS[0],
    [usuarios, activeMozo]
  );
  const allowedViews = useMemo(() => getAllowedViews(activeUser.rol), [activeUser.rol]);

  const applyAuthenticatedSession = useCallback((session: {
    user?: { user_metadata?: Record<string, unknown> };
  }) => {
    const metadata = session.user?.user_metadata;
    const requestedName = metadata?.nombre || metadata?.name;
    const operator = (
      typeof requestedName === 'string'
        ? usuarios.find(usuario => (
            usuario.activo !== false
            && usuario.nombre.toLowerCase() === requestedName.trim().toLowerCase()
          ))
        : undefined
    ) || usuarios.find(usuario => usuario.activo !== false && usuario.rol === 'mozo')
      || usuarios.find(usuario => usuario.activo !== false && usuario.rol !== 'administrador')
      || usuarios.find(usuario => usuario.activo !== false);

    if (operator) {
      setActiveMozo(operator.nombre);
      setActiveView('home');
      setIsStreamlitLoggedIn(true);
    }
  }, [usuarios]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    client.auth.getSession().then(({ data }) => {
      if (data.session) applyAuthenticatedSession(data.session);
    }).catch(err => console.error('Auth session error:', err));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (session) applyAuthenticatedSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, [applyAuthenticatedSession]);

  // Simulation Clock state (operational minutes passed)
  const [minutosGlobal, setMinutosGlobal] = useState<number>(0);
  const [autoTimerRunning, setAutoTimerRunning] = useState<boolean>(false);


  // --- Handlers for Waiter View (Terminal Mozo) ---
  const handleCrearPedido = useCallback((newPedidoData: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo'; comensales?: number }) => {
    const newId = Math.max(1000, ...pedidos.map(p => p.id_pedido)) + 1;
    let itemsDescontados: string[] = [];
    let alarmasBajoStock: string[] = [];
    const stockMovements: Array<{
      id_insumo: string;
      tipo_movimiento: 'salida_comanda';
      cantidad: number;
      stock_anterior: number;
      stock_nuevo: number;
    }> = [];

    const updatedInsumos = insumos.map(ins => ({ ...ins }));

    newPedidoData.items.forEach(pItem => {
      const qtyPlates = pItem.cantidad;
      const matchingRecetas = recetas.filter(r => r.id_producto === pItem.id_producto);

      matchingRecetas.forEach(rec => {
        const insIdx = updatedInsumos.findIndex(ins => ins.id_insumo === rec.id_insumo);
        if (insIdx === -1) return;

        const currentIns = updatedInsumos[insIdx];
        const discountAmt = parseFloat((rec.cantidad_a_descontar * qtyPlates).toFixed(2));
        const stockAnterior = currentIns.stock_actual;
        const updatedStock = parseFloat((Math.max(permitirVentaSinStock ? -999999 : 0, stockAnterior - discountAmt)).toFixed(2));

        updatedInsumos[insIdx].stock_actual = updatedStock;
        itemsDescontados.push(`${currentIns.nombre} (-${discountAmt} ${currentIns.unidad_medida})`);

        stockMovements.push({
          id_insumo: currentIns.id_insumo,
          tipo_movimiento: 'salida_comanda',
          cantidad: discountAmt,
          stock_anterior: stockAnterior,
          stock_nuevo: updatedStock
        });

        if (updatedStock <= currentIns.stock_minimo) {
          alarmasBajoStock.push(`${currentIns.nombre} (Stock actual: ${updatedStock}${currentIns.unidad_medida})`);
        }
      });
    });

    const stockDescontado = itemsDescontados.length > 0;
    const newPedido: Pedido = {
      ...newPedidoData,
      id_pedido: newId,
      fecha_hora: new Date(),
      minutos_transcurridos: 0,
      origen: newPedidoData.origen || 'Mozo',
      stock_descontado: stockDescontado,
      fecha_descuento_stock: stockDescontado ? new Date() : undefined
    };

    setPedidos(prev => [newPedido, ...prev]);

    // Update mesa occupied
    const updatedMesas = mesas.map(m => m.id_mesa === newPedidoData.id_mesa ? { ...m, estado: 'ocupada' as const, comensales: newPedidoData.comensales || 2 } : m);
    setMesas(updatedMesas);

    addLog('pedido_creado', `Mesa ${newPedidoData.numero_mesa} generó pedido #${newId} por ${newPedido.mozo}. Items: ${newPedidoData.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ')}`);

    if (itemsDescontados.length > 0) {
      setInsumos(updatedInsumos);
      addLog('descuento_stock', `ESCANDALLO (AL MANDAR COMANDA): Pedido #${newId} enviado a cocina. Insumos descontados: ${itemsDescontados.join(', ')}`);
    }

    alarmasBajoStock.forEach(nom => {
      addLog('alerta_stock', `CONTROL REPOSICIÓN: El insumo '${nom}' ha caído por debajo del stock de seguridad.`);
    });

    // Sync state mutations to Supabase in background
    dbSavePedidoComplex(newPedido);
    dbUpsertMesas(updatedMesas);

    if (stockDescontado) {
      stockMovements.forEach(movement => dbRecordMovement(movement).catch(console.error));
      dbUpsertInsumos(updatedInsumos);
    }
  }, [pedidos, insumos, recetas, addLog, mesas, permitirVentaSinStock, setMesas, setInsumos, setPedidos]);

  const handleMozoChange = (mozo: string) => {
    const nextUser = usuarios.find(usuario => usuario.nombre === mozo && usuario.activo !== false);
    if (!nextUser) {
      toast.error('El usuario seleccionado no está disponible.');
      return;
    }
    setActiveMozo(mozo);
    if (!canAccessView(nextUser.rol, activeView)) {
      setActiveView('home');
    }
    addLog('sistema', `SESIÓN: Usuario operativo actualizado a ${mozo} (${nextUser.rol}).`);
  };

  const handleNavigate = (view: AppView) => {
    if (!canAccessView(activeUser.rol, view)) {
      toast.warning(`El rol ${activeUser.rol} no tiene permiso para abrir este módulo.`);
      setActiveView('home');
      return;
    }
    setActiveView(view);
  };

  const handleLoginSuccess = (operatorName?: string) => {
    const isDemoLogin = operatorName === undefined;
    const requestedOperator = !isDemoLogin
      ? usuarios.find(usuario => (
          usuario.activo !== false
          && usuario.nombre.toLowerCase() === operatorName.trim().toLowerCase()
        ))
      : undefined;
    const operator = requestedOperator
      || (isDemoLogin
        ? usuarios.find(usuario => usuario.activo !== false && usuario.rol === 'administrador')
        : usuarios.find(usuario => usuario.activo !== false && usuario.rol === 'mozo'))
      || usuarios.find(usuario => usuario.activo !== false && usuario.rol !== 'administrador')
      || usuarios.find(usuario => usuario.activo !== false);

    if (!operator) {
      toast.error('No hay usuarios activos disponibles para iniciar sesión.');
      return;
    }

    window.sessionStorage.setItem('el_patron_session', 'active');
    setActiveMozo(operator.nombre);
    setActiveView('home');

    // Show loading screen and preload critical chunks before rendering the app
    setPostLoginLoading(true);

    // Preload the initial module chunks that will be needed immediately
    const chunksToPreload = [
      import('./components/HomeMenuModule'),
      import('./components/PanelDashboard'),
      import('./components/BottomNavigation'),
    ];

    Promise.allSettled(chunksToPreload).finally(() => {
      // Small extra delay to ensure smooth transition
      setTimeout(() => {
        setPostLoginLoading(false);
        setIsStreamlitLoggedIn(true);
      }, 300);
    });
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem('el_patron_session');
    getSupabaseClient()?.auth.signOut().catch(() => undefined);
    setIsStreamlitLoggedIn(false);
  };

  // --- Handlers for Kitchen View ---
  const handleCambiarEstadoPedido = (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => {
    let updatedPedido: Pedido | null = null;
    let errorMsg = '';

    const pObj = pedidos.find(p => p.id_pedido === idPedido);

    // If changing to 'en_cocina' (production), run escandallo and subtract stock if not discounted yet
    if (nuevoEstado === 'en_cocina' && pObj) {
      // 1. Validate empty orders or orders without products
      if (!pObj.items || pObj.items.length === 0) {
        toast.error("Error: No se puede enviar a cocina un pedido vacío (sin productos).");
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
          toast.error(`No es posible iniciar cocción: ${errorMsg}`);
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
  const handleFacturarMesa = useCallback((idPedido: number) => {
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
  }, [pedidos, mesas, addLog]);

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
    dbUpsertMermas([newMerma, ...mermas]);
    dbRecordMovement({
      id_insumo: idInsumo,
      tipo_movimiento: 'salida_merma',
      cantidad,
      stock_anterior: insObj.stock_actual,
      stock_nuevo: Math.max(0, parseFloat((insObj.stock_actual - cantidad).toFixed(2)))
    }).catch(console.error);
  };

  const handleRestockInsumo = useCallback((idInsumo: string, cantidad: number) => {
    const item = insumos.find(i => i.id_insumo === idInsumo);
    const updatedInsumos = insumos.map(i => i.id_insumo === idInsumo ? {
      ...i,
      stock_actual: parseFloat((i.stock_actual + cantidad).toFixed(2))
    } : i);
    setInsumos(updatedInsumos);

    addLog('sistema', `REPOSICIÓN: Incremetado stock de '${item ? item.nombre : idInsumo}' en +${cantidad}`);

    // Sync inventory write
    dbUpsertInsumos(updatedInsumos);
    if (item) {
      dbRecordMovement({
        id_insumo: idInsumo,
        tipo_movimiento: 'entrada',
        cantidad,
        stock_anterior: item.stock_actual,
        stock_nuevo: parseFloat((item.stock_actual + cantidad).toFixed(2))
      }).catch(console.error);
    }
  }, [insumos, addLog]);

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

  const handleReservaEstadoChange = useCallback((reserva: Reserva, estado: Reserva['estado']) => {
    if (!reserva.id_mesa) return;

    const hasActiveOrder = pedidos.some(pedido => (
      pedido.id_mesa === reserva.id_mesa
      && pedido.estado_comanda !== 'entregado_cobrado'
      && pedido.estado_comanda !== 'cancelado'
    ));

    const updatedMesas = mesas.map(mesa => {
      if (mesa.id_mesa !== reserva.id_mesa) return mesa;
      if (estado === 'sentada') {
        return { ...mesa, estado: 'ocupada' as const, comensales: reserva.pax };
      }
      if (!hasActiveOrder && (estado === 'cancelada' || estado === 'completada')) {
        return { ...mesa, estado: 'libre' as const, comensales: undefined };
      }
      return mesa;
    });

    setMesas(updatedMesas);
    dbUpsertMesas(updatedMesas);
  }, [mesas, pedidos]);

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

  const handleRestoreBackupData = (snapshot: BackupSnapshotData) => {
    setUsuarios(snapshot.usuarios);
    setMesas(snapshot.mesas);
    setInsumos(snapshot.insumos);
    setProductosMenu(snapshot.productosMenu);
    setRecetas(snapshot.recetas);
    setPedidos(snapshot.pedidos);
    setMermas(snapshot.mermas);
    setLogs(snapshot.logs);
    setMinutosGlobal(0);
    setAutoTimerRunning(false);
  };

  useEffect(() => {
    if (!usuarios.some(usuario => usuario.nombre === activeMozo && usuario.activo !== false)) {
      setActiveMozo(activeUser.nombre);
    }
  }, [usuarios, activeMozo, activeUser.nombre]);

  useEffect(() => {
    if (!canAccessView(activeUser.rol, activeView)) {
      setActiveView('home');
    }
  }, [activeUser.rol, activeView]);

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

  // MUST declare all hooks before conditional returns (React Rules of Hooks)
  const [postLoginLoading, setPostLoginLoading] = useState(false);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAppReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
          event.reason?.message?.includes('Loading chunk')) {
        setChunkError('Un módulo no pudo cargarse. Puede deberse a una actualización reciente.');
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  if (!isStreamlitLoggedIn && !postLoginLoading) {
    return <PythonStreamlitLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // Post-login loading: preload chunks before rendering
  if (postLoginLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1E9] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-[#624A3E] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-stone-700">Cargando módulos...</p>
            <p className="text-[11px] text-stone-400 font-medium">Preparando la aplicación</p>
          </div>
        </div>
      </div>
    );
  }

  if (chunkError) {
    return (
      <div className="min-h-screen bg-[#F5F1E9] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center space-y-4 shadow-xl border border-stone-200">
          <p className="text-4xl">🔄</p>
          <h2 className="text-lg font-black text-stone-800">Actualización disponible</h2>
          <p className="text-sm text-stone-500">{chunkError}</p>
          <button onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#624A3E] hover:bg-[#503C32] text-white font-extrabold rounded-xl text-sm transition-all cursor-pointer">
            Recargar y actualizar
          </button>
        </div>
      </div>
    );
  }

  // Initial loading state while first lazy module loads
  if (!appReady) {
    return (
      <div className="min-h-screen bg-[#F5F1E9] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#624A3E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-stone-500">Iniciando El Patrón...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[#F5F1E9] flex flex-col lg:flex-row font-sans text-stone-800 antialiased selection:bg-[#624A3E] selection:text-white">
      
      {/* Collapse toggle button for desktop */}
      <button
        onClick={() => setSidebarExpanded(!sidebarExpanded)}
        className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 w-5 h-10 bg-[#A67550] hover:bg-[#8E5E38] text-white rounded-r-lg items-center justify-center cursor-pointer transition-all border border-[#7A4A28]/40 border-l-0"
        style={{ left: sidebarExpanded ? '16rem' : '4rem' }}
        title={sidebarExpanded ? 'Colapsar menú' : 'Expandir menú'}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={`transition-transform duration-300 ${sidebarExpanded ? '' : 'rotate-180'}`}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* LEFT SIDE PANEL — Solo desktop, oculta en móvil */}
      <aside className={`
        hidden lg:flex flex-col
        ${sidebarExpanded ? 'w-64' : 'w-16'}
        bg-[#C8956A]
        text-[#3B1F10]/90 border-r border-[#A67550]/40 shrink-0
        transition-all duration-300 ease-in-out
        shadow-xl shadow-black/15
      `} id="sidebar-left-panel">
        
        {/* Brand Header */}
        <div className="border-b border-[#A67550]/30 flex items-center justify-between min-h-[56px] px-3">
          {sidebarExpanded ? (
            <div className="flex items-center gap-2.5 py-2.5">
              <div className="w-9 h-9 bg-white/80 rounded-lg flex items-center justify-center shadow-sm border border-[#A67550]/40 p-0.5 overflow-hidden shrink-0">
                <ElPatronLogo className="w-8 h-8 object-contain rounded" variant="icon" color="#4A2D1B" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-sm text-[#3B1F10] drop-shadow block leading-tight">El Patrón</span>
                <span className="text-[7px] uppercase font-bold text-[#3B1F10]/50 tracking-wider block leading-tight">Gestión Gastro</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center py-2.5">
              <div className="w-8 h-8 bg-white/70 rounded-lg flex items-center justify-center shadow-sm border border-[#A67550]/40 p-0.5 overflow-hidden">
                <ElPatronLogo className="w-7 h-7 object-contain rounded" variant="icon" color="#4A2D1B" />
              </div>
            </div>
          )}
        </div>

        {/* Clock widget */}
        {sidebarExpanded && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-[#B07A48]/30 border border-[#A67550]/30 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] uppercase font-bold text-[#3B1F10]/60 tracking-wider font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#3B1F10]/50" />
              Reloj
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${autoTimerRunning ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`} />
          </div>
          <div className="flex items-center justify-between">
            <strong className="text-sm font-black text-[#3B1F10] font-mono tracking-tight">{getSimulatedTimeStr()}</strong>
            <div className="flex items-center gap-1">
              <button onClick={handleToggleAutoTimer}
                className={`p-1 rounded-lg transition-all duration-200 cursor-pointer ${autoTimerRunning ? 'bg-amber-600/20 text-amber-800' : 'bg-emerald-600/20 text-emerald-800'}`}>
                <RefreshCw className={`w-3 h-3 ${autoTimerRunning ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => handleAdvanceTime(15)}
                className="px-1.5 py-1 rounded-lg bg-[#3B1F10]/10 text-[#3B1F10]/70 hover:text-[#3B1F10] border border-[#A67550]/30 text-[9px] font-bold cursor-pointer transition-all duration-200">
                +15m
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Venta sin stock */}
        {sidebarExpanded && activeUser.rol === 'administrador' && (
        <div className="mx-3 mt-2 mb-1">
          <label className="flex items-center justify-between px-3 py-2 bg-[#B07A48]/25 border border-[#A67550]/30 rounded-xl cursor-pointer hover:bg-[#B07A48]/40 transition-all duration-200 select-none">
            <span className="text-[11px] font-bold text-[#3B1F10]/80">
              {permitirVentaSinStock ? '✓ Forzar Ventas' : 'Bloquear sin stock'}
            </span>
            <input type="checkbox" checked={permitirVentaSinStock}
              onChange={(e) => { setPermitirVentaSinStock(e.target.checked);
                addLog('sistema', `REGLA: Venta forzada sin stock ${e.target.checked ? 'HABILITADA' : 'DESHABILITADA'}`);
              }}
              className="rounded border-[#A67550]/60 text-[#624A3E] focus:ring-[#624A3E] w-4 h-4 bg-white/50 cursor-pointer" />
          </label>
        </div>
        )}

        {/* Usuario activo */}
        <div className="mx-3 mt-2 mb-1">
          <div className={`flex items-center gap-2.5 px-3 py-2 bg-[#B07A48]/25 border border-[#A67550]/30 rounded-xl ${sidebarExpanded ? '' : 'justify-center'}`}>
            <div className="w-7 h-7 rounded-full bg-white/40 border border-[#A67550]/40 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-[#3B1F10]/70" />
            </div>
            {sidebarExpanded && (
              <div className="flex-1 text-left min-w-0">
                <span className="text-[7px] text-[#3B1F10]/50 block font-bold leading-none uppercase tracking-wider">Usuario</span>
                {activeUser.rol === 'administrador' ? (
                  <select value={activeMozo} onChange={(e) => handleMozoChange(e.target.value)}
                    className="text-[11px] bg-transparent border-none p-0 focus:outline-none font-extrabold text-[#3B1F10] cursor-pointer w-full mt-0.5 focus:ring-0">
                    {usuarios.filter(usuario => usuario.activo !== false).map(usuario => (
                      <option key={usuario.id_usuario} value={usuario.nombre} className="bg-[#C8956A] text-[#3B1F10]">{usuario.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[11px] font-extrabold text-[#3B1F10] mt-0.5 block">{activeUser.nombre}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Panels */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scroll-passive">
          <nav className="space-y-0.5" id="sidebar-navigation">
            {[
              { id: 'home', label: 'Inicio', icon: '🏠' },
              { id: 'panel', label: 'Panel', icon: '📊' },
              { id: 'mozo', label: 'Mozo', icon: '📱' },
              { id: 'cocina', label: 'Cocina', icon: '🍳' },
              { id: 'caja', label: 'Caja', icon: '💵' },
              { id: 'reportes', label: 'Reportes', icon: '📈' },
              { id: 'usuarios', label: 'Usuarios', icon: '👥' },
              { id: 'menu', label: 'Menú', icon: '📋' },
              { id: 'recetas', label: 'Recetas', icon: '📝' },
              { id: 'mesas', label: 'Mesas', icon: '🪑' },
              { id: 'inventario', label: 'Inventario', icon: '📦' },
              { id: 'proveedores', label: 'Proveedores', icon: '🚚' },
              { id: 'promociones', label: 'Promos', icon: '🏷️' },
              { id: 'reservas', label: 'Reservas', icon: '📅' },
              { id: 'facturacion', label: 'Facturación', icon: '🧾' },
              { id: 'sistema', label: 'Sistema', icon: '⚙️' },
              { id: 'backups', label: 'Backups', icon: '💾' }
            ].filter(item => allowedViews.includes(item.id as AppView)).map(item => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  onClick={() => handleNavigate(item.id as AppView)}
                  className={`
                    w-full flex items-center gap-3 transition-all duration-200 cursor-pointer
                    ${sidebarExpanded ? 'mx-1 px-3 py-2 rounded-xl' : 'justify-center py-2.5 rounded-lg'}
                    ${isActive
                      ? 'bg-[#4A2D1B] text-white shadow-sm border border-[#3B1F10]/30'
                      : 'text-[#3B1F10]/65 hover:text-[#3B1F10] hover:bg-[#B07A48]/35 border border-transparent'
                    }
                  `}
                  title={!sidebarExpanded ? item.label : undefined}
                >
                  <span className="text-base shrink-0 leading-none">{item.icon}</span>
                  {sidebarExpanded && (
                    <span className={`text-[12px] font-bold tracking-wide leading-none ${isActive ? 'text-white' : 'text-[#3B1F10]/70'}`}>
                      {item.label}
                    </span>
                  )}
                  {sidebarExpanded && isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm shadow-amber-400/50 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Cerrar sesión — separado del menú de navegación */}
        <div className={`px-2 pb-2 border-t border-[#A67550]/40 pt-2`}>
          {sidebarExpanded && (
            <p className="text-[8px] uppercase font-bold text-[#3B1F10]/40 tracking-wider px-3 mb-1">Sesión</p>
          )}
          <button
            onClick={() => setIsStreamlitLoggedIn(false)}
            className={`
              w-full flex items-center gap-3 transition-all duration-200 cursor-pointer
              ${sidebarExpanded ? 'mx-1 px-3 py-2 rounded-xl' : 'justify-center py-2.5 rounded-lg'}
              text-[#7B2D12] hover:bg-[#7B2D12]/15 hover:text-[#5C1E0A] border border-transparent hover:border-[#7B2D12]/20
            `}
            title={!sidebarExpanded ? 'Cerrar sesión' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarExpanded && (
              <span className="text-[12px] font-bold tracking-wide leading-none">Cerrar sesión</span>
            )}
          </button>
        </div>

        {/* Version badge */}
        <div className={`px-4 py-2 border-t border-[#A67550]/30 ${sidebarExpanded ? '' : 'flex justify-center'}`}>
          <span className="text-[8px] text-[#3B1F10]/30 font-mono tracking-wider">
            {sidebarExpanded ? 'El Patrón Pro · v1.2.0' : 'v1'}
          </span>
        </div>
      </aside>

      {/* CORE ACTIVE MODULE AREA (RIGHT SIDE CONTENT PANE) */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#F5F1E9]">
        
        {/* TOP STATUS BAR ACCENTS */}
        <div className="bg-[#F5F1E9] border-b border-stone-200/80 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#624A3E] capitalize tracking-tight flex items-center gap-2">
              {activeView === 'home' && <>🍽️ Menú Principal & Centro Operativo</>}
              {activeView === 'panel' && <>📊 Panel de Control y Resumen de Turno</>}
              {activeView === 'mozo' && <>📱 Terminal Interactiva de Mozos</>}
              {activeView === 'cocina' && <>🍳 Cocina</>}
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
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto max-w-7xl w-full mx-auto bottom-nav-spacer lg:pb-6 min-h-[60vh]">
          
          {/* ACTIVE TAB RENDER TRIAGE */}
          {activeView === 'home' && (
            <ErrorBoundary moduleName={'home'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><Skeleton className="!h-64 w-full" count={3} /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <HomeMenuModule
                mesas={mesas}
                pedidos={pedidos}
                insumos={insumos}
                productosMenu={productosMenu}
                usuarios={usuarios}
                allowedViews={allowedViews}
                canChangeUser={activeUser.rol === 'administrador'}
                activeMozo={activeMozo}
                onMozoChange={handleMozoChange}
                onNavigate={(view: AppView) => handleNavigate(view)}
                getSimulatedTimeStr={getSimulatedTimeStr}
                autoTimerRunning={autoTimerRunning}
                onToggleAutoTimer={handleToggleAutoTimer}
                onAdvanceTime={handleAdvanceTime}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'panel' && (
            <ErrorBoundary moduleName={'panel'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><Skeleton className="!h-48 w-full" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <PanelDashboard
                mesas={mesas}
                pedidos={pedidos}
                insumos={insumos}
                productosMenu={productosMenu}
                logs={logs}
                allowedViews={allowedViews}
                getSimulatedTimeStr={getSimulatedTimeStr}
                onNavigate={(view: AppView) => handleNavigate(view)}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'mozo' && (
            <ErrorBoundary moduleName={'mozo'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <MozoTerminal
                mesas={mesas}
                insumos={insumos}
                productosMenu={productosMenu}
                recetas={recetas}
                usuarios={activeUser.rol === 'administrador' ? usuarios : [activeUser]}
                activeMozo={activeMozo}
                onMozoChange={handleMozoChange}
                onCrearPedido={handleCrearPedido}
                pedidos={pedidos}
                onFacturarMesa={handleFacturarMesa}
                addLog={addLog}
                permitirVentaSinStock={permitirVentaSinStock}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'cocina' && (
            <ErrorBoundary moduleName={'cocina'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <KitchenMonitor
                pedidos={pedidos}
                onCambiarEstadoPedido={handleCambiarEstadoPedido}
                onProducirPedidoConEscandallo={handleProducirPedidoConEscandallo}
                minutosGlobal={minutosGlobal}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'caja' && (
            <ErrorBoundary moduleName={'caja'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <CajaModule
                pedidos={pedidos}
                productosMenu={productosMenu}
                onFacturarMesa={handleFacturarMesa}
                onCambiarEstadoPedido={handleCambiarEstadoPedido}
                addLog={addLog}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'reportes' && (
            <ErrorBoundary moduleName={'reportes'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <BusinessIntelligence
                productosMenu={productosMenu}
                pedidos={pedidos}
                precioMap={precioMap}
                logs={logs}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'usuarios' && (
            <ErrorBoundary moduleName={'usuarios'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <UsuariosModule
                usuarios={usuarios}
                onUsuariosChange={setUsuarios}
                addLog={addLog}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'menu' && (
            <ErrorBoundary moduleName={'menu'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <MenuModule
                productosMenu={productosMenu}
                onProductosChange={setProductosMenu}
                addLog={addLog}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'recetas' && (
            <ErrorBoundary moduleName={'recetas'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <RecetasModule
                recetas={recetas}
                productosMenu={productosMenu}
                insumos={insumos}
                onRecetasChange={setRecetas}
                addLog={addLog}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'mesas' && (
            <ErrorBoundary moduleName={'mesas'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
                <MesasModule
                  mesas={mesas}
                  onMesasChange={setMesas}
                  addLog={addLog}
                />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'inventario' && (
            <ErrorBoundary moduleName={'inventario'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
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
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'proveedores' && (
            <ErrorBoundary moduleName={'proveedores'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <ProveedoresModule
                addLog={addLog}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'promociones' && (
            <ErrorBoundary moduleName={'promociones'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <PromocionesModule
                addLog={addLog}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'reservas' && (
            <ErrorBoundary moduleName={'reservas'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <ReservasModule
                mesas={mesas}
                onEstadoChange={handleReservaEstadoChange}
                addLog={addLog}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'facturacion' && (
            <ErrorBoundary moduleName={'facturacion'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <FacturacionModule
                pedidos={pedidos}
                productosMenu={productosMenu}
                addLog={addLog}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'sistema' && (
            <ErrorBoundary moduleName={'sistema'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
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
              </Suspense></RetryErrorWrapper></ErrorBoundary>
          )}

          {activeView === 'backups' && (
            <ErrorBoundary moduleName={'backups'}>
            <RetryErrorWrapper>
            <Suspense fallback={<div className="p-8"><div className="h-48 bg-stone-100 rounded-2xl animate-pulse" /></div>}>
            <div key={activeView} className="animate-fadeIn">
              <BackupsModule
                operationalData={{
                  usuarios,
                  mesas,
                  insumos,
                  productosMenu,
                  recetas,
                  pedidos,
                  mermas,
                  logs
                }}
                onRestoreData={handleRestoreBackupData}
                addLog={addLog}
              />
            </div>
              </Suspense></RetryErrorWrapper></ErrorBoundary>
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
    <ToastContainer toasts={toasts} removeToast={removeToast} />
    <BottomNavigation activeView={activeView} allowedViews={allowedViews} onNavigate={handleNavigate} />
    </>
  );
}
