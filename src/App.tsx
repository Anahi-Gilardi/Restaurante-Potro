/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { 
  User,
  Clock,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight
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
import MobileNav from './components/MobileNav';
import RetryErrorWrapper from './components/RetryErrorWrapper';
import RecetasErrorBoundary from './components/RecetasErrorBoundary';
import Skeleton from './components/Skeleton';
import { tryGetActiveSupabaseClient } from './lib/supabaseClient';
import DiagnosticsTester from './components/DiagnosticsTester';
import RestaurantCover from './components/RestaurantCover';


import type { BackupSnapshotData } from './services/backupsService';
// Lazy-loaded modules (code-split, loaded on demand)
const HomeMenuModule = lazy(() => import('./components/HomeMenuModule'));
const MozoTerminal = lazy(() => import('./components/MozoTerminal'));
const KitchenMonitor = lazy(() => import('./components/KitchenMonitor'));
const InventoryModule = lazy(() => import('./components/InventoryModule'));
const CajaModule = lazy(() => import('./components/CajaModule'));
const SistemaModule = lazy(() => import('./components/SistemaModule'));
const UsuariosModule = lazy(() => import('./components/UsuariosModule'));
const MenuModule = lazy(() => import('./components/MenuModule'));
const RecetasModule = lazy(() => import('./components/RecetasModule'));
const MesasModule = lazy(() => import('./components/MesasModule'));
const MesasProto1 = lazy(() => import('./components/MesasProto1'));
const ProveedoresModule = lazy(() => import('./components/ProveedoresModule'));
const PromocionesModule = lazy(() => import('./components/PromocionesModule'));
const ReservasModule = lazy(() => import('./components/ReservasModule'));
const FacturacionModule = lazy(() => import('./components/FacturacionModule'));
const BackupsModule = lazy(() => import('./components/BackupsModule'));
const BusinessIntelligence = lazy(() => import('./components/BusinessIntelligence'));
const ClientesModule = lazy(() => import('./components/ClientesModule'));
import { 
  getSupabaseClient,
  resetSupabaseInstance,
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
  dbRecordMovement,
  dbFetchUsuarios,
  dbUpsertProductosMenu,
  dbUpsertRecetas
} from './supabase';
import { AppView, canAccessView, getAllowedViews } from './lib/permissions';
import { createClientPedidoId } from './lib/pedidoIds';
import { cajaService } from './services/cajaService';
import { reservasService } from './services/reservasService';
import { stockEngine } from './services/stock/stockEngine';

function isSameTable(p1: { id_mesa?: any; numero_mesa?: string }, p2: { id_mesa?: any; numero_mesa?: string }): boolean {
  const isP1Delivery = String(p1.numero_mesa || '').toUpperCase().startsWith('DELIVERY');
  const isP2Delivery = String(p2.numero_mesa || '').toUpperCase().startsWith('DELIVERY');
  
  if (isP1Delivery || isP2Delivery) {
    const norm1 = String(p1.numero_mesa || '').toLowerCase().trim();
    const norm2 = String(p2.numero_mesa || '').toLowerCase().trim();
    return norm1 !== '' && norm1 === norm2;
  }

  if (p1.id_mesa !== undefined && p1.id_mesa !== null && p2.id_mesa !== undefined && p2.id_mesa !== null) {
    if (String(p1.id_mesa) === String(p2.id_mesa)) return true;
  }
  const norm1 = String(p1.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
  const norm2 = String(p2.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
  return norm1 !== '' && norm1 === norm2;
}

export default function App() {
  const { toast, toasts, removeToast } = useToast();

  // System theme detection disabled to prevent automatic dark mode from altering the design.
  // The app now uses a unified warm beige/light brown theme.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // --- Global Synced States ---
  const [isStreamlitLoggedIn, setIsStreamlitLoggedIn] = useState<boolean>(() => (
    typeof window !== 'undefined' && window.localStorage.getItem('el_patron_session') === 'active'
  ));
  const [showCover, setShowCover] = useState<boolean>(true);
  const [permitirVentaSinStock, setPermitirVentaSinStock] = useState<boolean>(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>(INITIAL_USUARIOS);
  const [mesas, setMesas] = useState<Mesa[]>(INITIAL_MESAS);
  const [insumos, setInsumos] = useState<Insumo[]>(INITIAL_INSUMOS);
  const [productosMenu, setProductosMenu] = useState<ProductoMenu[]>(INITIAL_PRODUCTOS_MENU);
  const [recetas, setRecetas] = useState<RecetaEscandallo[]>(INITIAL_RECETAS_ESCANDALLO);
  const [pedidos, setPedidos] = useState<Pedido[]>(INITIAL_PEDIDOS);
 const [mermas, setMermas] = useState<Merma[]>([]);

  const [postLoginLoading, setPostLoginLoading] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);


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

  const [supabaseTrigger, setSupabaseTrigger] = useState<number>(0);

  // Listen for Supabase client resets to trigger data re-sync
  useEffect(() => {
    const handleReset = () => {
      setSupabaseTrigger(prev => prev + 1);
    };
    window.addEventListener('supabase-client-reset', handleReset);
    return () => {
      window.removeEventListener('supabase-client-reset', handleReset);
    };
  }, []);

  // 1. Config loading effect (runs once on mount)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/supabase-config');
        const data = await response.json();
        if (data.SUPABASE_URL && data.SUPABASE_ANON_KEY) {
          const currentUrl = localStorage.getItem('SUPABASE_URL');
          const currentKey = localStorage.getItem('SUPABASE_ANON_KEY');
          if (currentUrl !== data.SUPABASE_URL || currentKey !== data.SUPABASE_ANON_KEY) {
            localStorage.setItem('SUPABASE_URL', data.SUPABASE_URL);
            localStorage.setItem('SUPABASE_ANON_KEY', data.SUPABASE_ANON_KEY);
            resetSupabaseInstance(); // This triggers supabase-client-reset event
          }
        }
      } catch (configErr) {
        console.warn('Could not fetch Supabase config from API:', configErr);
      }
    };
    loadConfig();
  }, []);

  // 2. Data load and Realtime sync effect (runs on mount and whenever connection parameters update)
  useEffect(() => {
    let active = true;
    let channel: any = null;
    const client = getSupabaseClient();

    const loadData = async () => {
      try {
        const savedUsuarios = await dbFetchUsuarios();
        if (savedUsuarios && savedUsuarios.length > 0 && active) {
          setUsuarios(savedUsuarios);
        }
      } catch (err) {
        console.warn('Usuarios: no se pudo cargar la copia persistida.', err);
      }

      if (!client) return;

      try {
        const dbMesas = await dbFetchMesas();
        let dbInsumos = await dbFetchInsumos();
        let dbProducts = await dbFetchProductosMenu();
        let dbRecipes = await dbFetchRecetas();
        const dbPedidos = await dbFetchPedidos();
        const dbMermas = await dbFetchMermas();

        if (!active) return;

        // Auto-seed new Coca-Cola line if they are missing in the Supabase database
        if (dbProducts && dbProducts.length > 0) {
          const hasCocaCola = dbProducts.some(p => p.id_producto === 'prod_coca_cola_original');
          if (!hasCocaCola) {
            const cocaColaProducts = INITIAL_PRODUCTOS_MENU.filter(p => 
              p.id_producto.startsWith('prod_coca_cola') || 
              p.id_producto.startsWith('prod_sprite') || 
              p.id_producto.startsWith('prod_fanta')
            );
            if (cocaColaProducts.length > 0) {
              await dbUpsertProductosMenu(cocaColaProducts);
              
              const relatedInsumos = INITIAL_INSUMOS.filter(i => 
                i.id_insumo.startsWith('ins_beb_coca_cola') || 
                i.id_insumo.startsWith('ins_beb_sprite') || 
                i.id_insumo.startsWith('ins_beb_fanta')
              );
              if (relatedInsumos.length > 0) {
                await dbUpsertInsumos(relatedInsumos);
              }
              
              const relatedRecipes = INITIAL_RECETAS_ESCANDALLO.filter(r => 
                r.id_producto.startsWith('prod_coca_cola') || 
                r.id_producto.startsWith('prod_sprite') || 
                r.id_producto.startsWith('prod_fanta')
              );
              if (relatedRecipes.length > 0) {
                await dbUpsertRecetas(relatedRecipes);
              }
              
              // Refetch updated data from Supabase
              dbProducts = await dbFetchProductosMenu();
              dbInsumos = await dbFetchInsumos();
              dbRecipes = await dbFetchRecetas();
            }
          }
        }

        if (!active) return;

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
        addLog('sistema', 'SUPABASE: Auto-sincronización exitosa con servidor Supabase.');
      } catch (err) {
        console.warn('Supabase: Falló auto-sync en el arranque. Usando datos SQLite locales.', err);
      }
    };

    loadData();

    if (client) {
      const activeChannel = client.channel('realtime_pedidos_app');
      channel = activeChannel;

      // Simple debounce function to prevent multiple rapid database requests
      const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
        let timeoutId: any = null;
        return (...args: Parameters<T>) => {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), delay);
        };
      };

      const fetchAndSetPedidos = async () => {
        try {
          const refreshed = await dbFetchPedidos();
          if (refreshed && active) {
            setPedidos(refreshed);
          }
        } catch (err) {
          console.warn('Realtime fetch for pedidos failed:', err);
        }
      };

      const debouncedFetchPedidos = debounce(fetchAndSetPedidos, 400);

      activeChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_cabecera' }, () => {
          debouncedFetchPedidos();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_detalle' }, () => {
          debouncedFetchPedidos();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, async () => {
          try {
            const refreshed = await dbFetchMesas();
            if (refreshed && active) {
              setMesas(refreshed);
            }
          } catch (err) {
            console.warn('Realtime fetch for mesas failed:', err);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Realtime subscription connected successfully.');
          }
        });
    }

    return () => {
      active = false;
      if (client && channel) {
        client.removeChannel(channel).catch((err: any) => {
          console.warn('Failed to remove channel cleanly:', err);
        });
      }
    };
  }, [supabaseTrigger]);

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

  // Terminal active configs & simulation states
  const [activeMozo, setActiveMozo] = useState<string>('Sofía');
  const [activeView, setActiveView] = useState<AppView>('home');
  const activeUser = useMemo(
    () => usuarios.find(usuario => usuario.nombre === activeMozo && usuario.activo !== false)
      || usuarios.find(usuario => usuario.activo !== false)
      || INITIAL_USUARIOS[0],
    [usuarios, activeMozo]
  );

  const allowedViews = useMemo(() => {
    return getAllowedViews(activeUser.rol);
  }, [activeUser.rol]);

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

  // CORRECCIÓN TDZ: getSimulatedTimeStr DEBE estar DESPUÉS de minutosGlobal
  const getSimulatedTimeStr = useCallback(() => {
    const h = String(Math.floor((minutosGlobal + 720) / 60) % 24).padStart(2, '0');
    const m = String((minutosGlobal + 720) % 60).padStart(2, '0');
    return `${h}:${m} hs`;
  }, [minutosGlobal]);


  // --- Handlers for Waiter View (Terminal Mozo) ---
  const handleCrearPedido = useCallback(async (newPedidoData: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo'; comensales?: number; idempotency_key?: string }) => {
    const existingByKey = newPedidoData.idempotency_key
      ? pedidos.find(p => p.idempotency_key === newPedidoData.idempotency_key)
      : undefined;
    if (existingByKey) {
      await dbSavePedidoComplex(existingByKey);
      addLog('sistema', `PEDIDOS: Reintento sincronizado por idempotencia (${newPedidoData.idempotency_key}).`);
      return;
    }

    console.log('[DEBUG] handleCrearPedido called with:', newPedidoData);
    const existingActivePedido = pedidos.find(p => {
      const match = isSameTable(p, newPedidoData) && 
        p.estado_comanda !== 'entregado_cobrado' && 
        p.estado_comanda !== 'cancelado';
      console.log(`[DEBUG] Comparing order #${p.id_pedido} (mesa: ${p.numero_mesa}, id_mesa: ${p.id_mesa}, estado: ${p.estado_comanda}) with new order. Match: ${match}`);
      return match;
    });

    // Validar items con el motor de stock
    try {
      newPedidoData.items.forEach(item => stockEngine.validatePedidoItem(item));
    } catch (validationErr: any) {
      toast.error(validationErr.message);
      return;
    }

    let updatedInsumos = insumos;
    let stockDescontado = false;
    let itemsDescontados: string[] = [];
    let alarmasBajoStock: string[] = [];
    const stockMovements: any[] = [];

    const isAdvancedState = ['en_cocina', 'listo', 'entregado', 'entregado_cobrado'].includes(newPedidoData.estado_comanda || 'pendiente');

    if (isAdvancedState) {
      try {
        const dummyPedido: Pedido = {
          id_pedido: 0,
          ...newPedidoData,
          origen: newPedidoData.origen || 'Mozo',
          items: newPedidoData.items,
          fecha_hora: new Date(),
          minutos_transcurridos: 0,
          estado_comanda: newPedidoData.estado_comanda || 'pendiente'
        };
        const stockResult = stockEngine.deductStockForPedido(
          dummyPedido,
          insumos,
          recetas,
          permitirVentaSinStock
        );
        updatedInsumos = stockResult.updatedInsumos;
        stockDescontado = stockResult.itemsDescontados.length > 0;
        itemsDescontados = stockResult.itemsDescontados;
        alarmasBajoStock = stockResult.alarmasBajoStock;
        stockResult.stockMovements.forEach(m => stockMovements.push(m));
      } catch (err: any) {
        toast.error(`No es posible crear pedido: ${err.message}`);
        return;
      }
    }

    let finalPedido: Pedido;

    if (existingActivePedido) {
      const updatedItems = [...existingActivePedido.items];
      newPedidoData.items.forEach(newItem => {
        const existingItemIdx = updatedItems.findIndex(it => it.id_producto === newItem.id_producto && (it.estado === 'pendiente' || !it.estado));
        if (existingItemIdx > -1) {
          updatedItems[existingItemIdx] = {
            ...updatedItems[existingItemIdx],
            cantidad: updatedItems[existingItemIdx].cantidad + newItem.cantidad,
            estado: 'pendiente'
          };
        } else {
          updatedItems.push({ ...newItem, estado: 'pendiente' });
        }
      });

      const mergedObs = [existingActivePedido.observaciones, newPedidoData.observaciones]
        .map(o => o?.trim())
        .filter(Boolean)
        .join(' | ');

      finalPedido = {
        ...existingActivePedido,
        items: updatedItems,
        observaciones: mergedObs || undefined,
        estado_comanda: 'pendiente',
        stock_descontado: existingActivePedido.stock_descontado || stockDescontado,
        fecha_descuento_stock: existingActivePedido.fecha_descuento_stock || (stockDescontado ? new Date() : undefined)
      };

      setPedidos(prev => prev.map(p => p.id_pedido === existingActivePedido.id_pedido ? finalPedido : p));
      addLog('pedido_creado', `Mesa ${newPedidoData.numero_mesa} agregó a su pedido #${existingActivePedido.id_pedido} por ${newPedidoData.mozo || activeMozo}. Nuevos items: ${newPedidoData.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ')}`);
    } else {
      const newId = createClientPedidoId(pedidos.map(p => p.id_pedido));
      finalPedido = {
        ...newPedidoData,
        id_pedido: newId,
        fecha_hora: new Date(),
        minutos_transcurridos: 0,
        origen: newPedidoData.origen || 'Mozo',
        stock_descontado: stockDescontado,
        fecha_descuento_stock: stockDescontado ? new Date() : undefined
      };

      setPedidos(prev => {
        const safeId = prev.some(p => p.id_pedido === finalPedido.id_pedido)
          ? createClientPedidoId(prev.map(p => p.id_pedido))
          : finalPedido.id_pedido;
        return [{ ...finalPedido, id_pedido: safeId }, ...prev];
      });
      addLog('pedido_creado', `Mesa ${newPedidoData.numero_mesa} generó pedido #${finalPedido.id_pedido} por ${finalPedido.mozo}. Items: ${newPedidoData.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ')}`);
    }

    const updatedMesas = mesas.map(m => String(m.id_mesa) === String(newPedidoData.id_mesa) ? { ...m, estado: 'ocupada' as const, comensales: newPedidoData.comensales || 2 } : m);
    setMesas(updatedMesas);

    if (itemsDescontados.length > 0) {
      setInsumos(updatedInsumos);
      addLog('descuento_stock', `ESCANDALLO (AL MANDAR COMANDA): Pedido #${finalPedido.id_pedido} enviado a cocina. Insumos descontados: ${itemsDescontados.join(', ')}`);
    }

    alarmasBajoStock.forEach(nom => {
      addLog('alerta_stock', `CONTROL REPOSICIÓN: El insumo '${nom}' ha caído por debajo del stock de seguridad.`);
    });

    if (existingActivePedido) {
      import('./services/pedidosService').then(({ pedidosService }) => {
        pedidosService.agregarItemsAComandaExistente(existingActivePedido.id_pedido, newPedidoData.items).catch(err => {
          console.warn('Background save for order accumulation failed:', err);
        });
      });
    } else {
      dbSavePedidoComplex(finalPedido).catch(err => {
        console.warn('Background save for new order failed:', err);
      });
    }

    dbUpsertMesas(updatedMesas).catch(err => {
      console.warn('Background save for mesas failed:', err);
    });

    if (stockDescontado) {
      stockMovements.forEach(movement => dbRecordMovement(movement).catch(console.error));
      dbUpsertInsumos(updatedInsumos).catch(err => {
        console.warn('Background save for insumos failed:', err);
      });
    }
  }, [pedidos, insumos, recetas, addLog, mesas, permitirVentaSinStock, setMesas, setInsumos, setPedidos, activeMozo]);

  const handleMozoChange = (mozo: string) => {
    const nextUser = usuarios.find(usuario => usuario.nombre === mozo && usuario.activo !== false);
    if (!nextUser) {
      toast.error('El usuario seleccionado no está disponible.');
      return;
    }
    setActiveMozo(mozo);
    if (!allowedViews.includes(activeView)) {
      setActiveView('home');
    }
    addLog('sistema', `SESIÓN: Usuario operativo actualizado a ${mozo} (${nextUser.rol}).`);
  };

  // NUEVO: Validación estricta en el método de navegación
  const handleNavigate = (view: AppView) => {
    if (!canAccessView(activeUser.rol, view)) {
      toast.warning(`El rol ${activeUser.rol} no tiene permiso para abrir este módulo.`);
      setActiveView('home');
      return;
    }
    setActiveView(view);
  };

  const handleLoginSuccess = (user: Usuario) => {
    window.localStorage.setItem('el_patron_session', 'active');
    setActiveMozo(user.nombre);
    setActiveView('home');

    setPostLoginLoading(true);

    const chunksToPreload = [
      import('./components/HomeMenuModule'),
    ];

    Promise.allSettled(chunksToPreload).finally(() => {
      setTimeout(() => {
        setPostLoginLoading(false);
        setIsStreamlitLoggedIn(true);
      }, 300);
    });
  };

  const handleLogout = () => {
    window.localStorage.removeItem('el_patron_session');
    getSupabaseClient()?.auth.signOut().catch(() => undefined);
    setIsStreamlitLoggedIn(false);
    setShowCover(false);
  };

  const handleLogoClickToLogin = () => {
    window.localStorage.removeItem('el_patron_session');
    getSupabaseClient()?.auth.signOut().catch(() => undefined);
    setIsStreamlitLoggedIn(false);
    setShowCover(false);
  };

  // --- Handlers for Kitchen View ---
  const handleCambiarEstadoPedido = (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => {
    let updatedPedido: Pedido | null = null;
    let errorMsg = '';

    const pObj = pedidos.find(p => p.id_pedido === idPedido);

    if (nuevoEstado === 'en_cocina' && pObj) {
      if (!pObj.items || pObj.items.length === 0) {
        toast.error("Error: No se puede enviar a cocina un pedido vacío (sin productos).");
        addLog('sistema', `RECHAZADO: Intento de enviar a cocina el pedido vacío #${idPedido}`);
        return;
      }

      if (pObj.stock_descontado) {
        console.log(`[Escandallo] El pedido #${idPedido} ya tiene stock descontado.`);
      } else {
        try {
          const result = stockEngine.deductStockForPedido(
            pObj,
            insumos,
            recetas,
            permitirVentaSinStock
          );
          
          setInsumos(result.updatedInsumos);
          dbUpsertInsumos(result.updatedInsumos);
          
          if (result.itemsDescontados.length > 0) {
            addLog('descuento_stock', `ESCANDALLO: Pedido #${idPedido} cambió a EN_COCINA. Descuento automático de: ${result.itemsDescontados.join(', ')}`);
          }
          result.alarmasBajoStock.forEach(alertStr => {
            addLog('alerta_stock', `CRÍTICO REPOSICIÓN: El insumo '${alertStr}' cayó por debajo del stock mínimo estipulado.`);
          });
          result.stockMovements.forEach(m => {
            dbRecordMovement(m).catch(console.error);
          });
        } catch (err: any) {
          toast.error(`No es posible iniciar cocción: ${err.message}`);
          addLog('alerta_stock', `RECHAZADO FUEGO: Pedido #${idPedido} bloqueado por falta de stock. ${err.message}`);
          return;
        }
      }
    }

    if (nuevoEstado === 'cancelado' && pObj) {
      if (pObj.stock_descontado) {
        try {
          const result = stockEngine.reverseStockForPedido(
            pObj,
            insumos,
            recetas
          );
          
          setInsumos(result.updatedInsumos);
          dbUpsertInsumos(result.updatedInsumos);
          
          if (result.itemsReversados.length > 0) {
            addLog('descuento_stock', `REVERSO ESCANDALLO: Pedido #${idPedido} CANCELADO. Reintegro automático de: ${result.itemsReversados.join(', ')}`);
          }
          result.stockMovements.forEach(m => {
            dbRecordMovement(m).catch(console.error);
          });
        } catch (err: any) {
          console.error('Failed to reverse stock:', err);
        }
      } else {
        addLog('sistema', `CANCELACIÓN: Pedido #${idPedido} cancelado sin descuento de stock previo.`);
      }
    }

    setPedidos(prev => prev.map(p => {
      if (p.id_pedido === idPedido) {
        const updatedItems = p.items.map(it => {
          const itemEstado = it.estado ?? 'pendiente';
          let nextEstado = itemEstado;
          if (nuevoEstado === 'en_cocina' && itemEstado === 'pendiente') {
            nextEstado = 'en_cocina';
          } else if (nuevoEstado === 'listo' && (itemEstado === 'pendiente' || itemEstado === 'en_cocina')) {
            nextEstado = 'listo';
          } else if ((nuevoEstado === 'entregado' || nuevoEstado === 'entregado_cobrado') && (itemEstado === 'pendiente' || itemEstado === 'en_cocina' || itemEstado === 'listo')) {
            nextEstado = 'entregado';
          } else if (nuevoEstado === 'cancelado') {
            nextEstado = 'cancelado';
          }
          return { ...it, estado: nextEstado };
        });
        const updated: Pedido = { ...p, estado_comanda: nuevoEstado, items: updatedItems };
        if (nuevoEstado === 'en_cocina') {
          updated.fecha_inicio_cocina = new Date();
          if (!p.stock_descontado) {
            updated.stock_descontado = true;
            updated.fecha_descuento_stock = new Date();
          }
        }
        if (nuevoEstado === 'listo') {
          updated.segundos_en_listo = 0;
          updated.fecha_listo = new Date();
          if (p.fecha_inicio_cocina) {
            const diffMs = new Date(updated.fecha_listo).getTime() - new Date(p.fecha_inicio_cocina).getTime();
            updated.tiempo_despacho_minutos = Math.max(1, Math.round(diffMs / 60000));
          }
        }
        if (nuevoEstado === 'cancelado') {
          updated.stock_descontado = false;
          updated.fecha_descuento_stock = undefined;
        }
        updatedPedido = updated;
        return updated;
      }
      return p;
    }));

    const mStr = pObj ? ` para ${pObj.numero_mesa}` : '';
    addLog('comanda_estado', `COMANDA #${idPedido}${mStr}: Estado cambiado a ${nuevoEstado.toUpperCase()}`);

    setTimeout(() => {
      if (updatedPedido) {
        dbSavePedidoComplex(updatedPedido).catch(err => {
          console.warn('dbSavePedidoComplex async error:', err);
        });
      } else if (pObj) {
        dbSavePedidoComplex({ ...pObj, estado_comanda: nuevoEstado }).catch(err => {
          console.warn('dbSavePedidoComplex async error:', err);
        });
      }
    }, 50);

    if ((nuevoEstado === 'entregado_cobrado' || nuevoEstado === 'cancelado') && pObj) {
      const updatedMesas = mesas.map(m => m.id_mesa === pObj.id_mesa ? { ...m, estado: 'libre' as const, comensales: undefined } : m);
      setMesas(updatedMesas);
      dbUpsertMesas(updatedMesas);
    }
  };

  const handleProducirPedidoConEscandallo = (idPedido: number) => {
    handleCambiarEstadoPedido(idPedido, 'listo');
  };

  // --- Handlers for Cashier View (Caja & Cierre) ---
  const handleFacturarMesa = useCallback((idPedido: number, alreadyUpdatedInCaja: boolean = false) => {
    const target = pedidos.find(p => p.id_pedido === idPedido);
    if (!target) return;

    const ordersToBill = pedidos.filter(p => 
      isSameTable(p, target) && 
      p.estado_comanda !== 'entregado_cobrado' && 
      p.estado_comanda !== 'cancelado'
    );

    const orderIds = ordersToBill.map(o => o.id_pedido);

    setPedidos(prev => prev.map(p => orderIds.includes(p.id_pedido) ? { ...p, estado_comanda: 'entregado_cobrado' } : p));

    const updatedMesas = mesas.map(m => {
      const matchId = (m.id_mesa !== undefined && m.id_mesa !== null && target.id_mesa !== undefined && target.id_mesa !== null && String(m.id_mesa) === String(target.id_mesa));
      const norm1 = String(m.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
      const norm2 = String(target.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
      const matchNum = norm1 !== '' && norm1 === norm2;
      return (matchId || matchNum) ? { ...m, estado: 'libre' as const, comensales: undefined } : m;
    });
    setMesas(updatedMesas);

    addLog('sistema', `CAJA: Facturación completa cobrada correctamente de la mesa ${target.numero_mesa} por Pedido(s) #${orderIds.join(', #')}`);

    ordersToBill.forEach(order => {
      dbSavePedidoComplex({ ...order, estado_comanda: 'entregado_cobrado' });
    });
    dbUpsertMesas(updatedMesas);

    // Completar automáticamente la reserva asociada para el día de hoy
    const today = new Date().toISOString().split('T')[0];
    reservasService.listByFecha(today).then(todayReservas => {
      const matchRes = todayReservas.find(r => {
        const matchId = (r.id_mesa !== undefined && r.id_mesa !== null && target.id_mesa !== undefined && target.id_mesa !== null && String(r.id_mesa) === String(target.id_mesa));
        const norm1 = String(r.nombre_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
        const norm2 = String(target.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
        const matchNum = norm1 !== '' && norm1 === norm2;
        return (matchId || matchNum) && (r.estado === 'sentada' || r.estado === 'confirmada');
      });
      if (matchRes) {
        reservasService.update(matchRes.id_reserva, { estado: 'completada' }).then(() => {
          addLog('sistema', `RESERVA: Completada automáticamente para Mesa ${target.numero_mesa} al cobrar la comanda.`);
        }).catch(err => {
          console.error('Error updating reservation to completada:', err);
        });
      }
    }).catch(err => {
      console.error('Error listing today reservations:', err);
    });

    if (!alreadyUpdatedInCaja) {
      const totalPedido = ordersToBill.reduce((sum, order) => {
        const orderSum = (order.items || []).reduce((itemSum, item) => {
          const pm = productosMenu.find(pr => pr.id_producto === item.id_producto);
          const price = item.precio_unitario ?? pm?.precio_venta ?? 0;
          return itemSum + (price * item.cantidad);
        }, 0);
        return sum + orderSum;
      }, 0);

      cajaService.updateSales(totalPedido, { efectivo: totalPedido }).catch(err => {
        console.error('Error updating sales in cajaService during direct billing:', err);
      });
    }
  }, [pedidos, mesas, productosMenu, addLog]);

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

    const updatedInsumos = insumos.map(i => i.id_insumo === idInsumo ? {
      ...i,
      stock_actual: Math.max(0, parseFloat((i.stock_actual - cantidad).toFixed(2)))
    } : i);
    setInsumos(updatedInsumos);

    addLog('merma_registrada', `REGISTRO MERMA: ${cantidad} ${insObj.unidad_medida} de '${insObj.nombre}' registrado por motivo: ${motivo.toUpperCase()}`);

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



  const handleReservaEstadoChange = useCallback((reserva: Reserva, estado: Reserva['estado']) => {
    if (!reserva.id_mesa) return;

    const hasActiveOrder = pedidos.some(pedido => (
      pedido.id_mesa === reserva.id_mesa
      && pedido.estado_comanda !== 'entregado_cobrado'
      && pedido.estado_comanda !== 'cancelado'
    ));

    const updatedMesas = mesas.map(mesa => {
      if (mesa.id_mesa !== reserva.id_mesa) return mesa;
      if (estado === 'confirmada') {
        return { ...mesa, estado: 'reservada' as const, comensales: reserva.pax };
      }
      if (estado === 'sentada') {
        return { ...mesa, estado: 'ocupada' as const, comensales: reserva.pax };
      }
      if (!hasActiveOrder && (estado === 'cancelada' || estado === 'completada' || estado === 'pendiente')) {
        return { ...mesa, estado: 'libre' as const, comensales: undefined };
      }
      return mesa;
    });

    setMesas(updatedMesas);
    dbUpsertMesas(updatedMesas);
    addLog('sistema', `RESERVA: Mesa ${reserva.id_mesa} cambio a estado '${estado}'.`);
  }, [mesas, pedidos, addLog]);

  // --- Handlers for Simulation Controls ---
  const handleAdvanceTime = (mins: number) => {
    setMinutosGlobal(prev => prev + mins);

    setPedidos(prev => prev.map(p => {
      if (p.estado_comanda !== 'entregado_cobrado') {
        const updated = {
          ...p,
          minutos_transcurridos: p.minutos_transcurridos + mins
        };
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

  // NUEVO: Validación de efecto secundario para rebotar al inicio si hereda vista prohibida
  useEffect(() => {
    if (!allowedViews.includes(activeView)) {
      setActiveView('home');
    }
  }, [activeUser.rol, activeView, allowedViews]);

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
      }, 2000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [autoTimerRunning]);

  if (showCover) {
    return (
      <ErrorBoundary>
        <RestaurantCover 
          onEnterSystem={() => {
            window.localStorage.removeItem('el_patron_session');
            setIsStreamlitLoggedIn(false);
            setShowCover(false);
          }} 
        />
      </ErrorBoundary>
    );
  }

  if (!isStreamlitLoggedIn) {
    return (
      <ErrorBoundary>
        <PythonStreamlitLogin onLoginSuccess={handleLoginSuccess} onBackToCover={() => setShowCover(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="h-screen overflow-hidden bg-premium-dark flex font-sans text-stone-800 dark:text-[#FAF7F0] antialiased selection:bg-[#624A3E] selection:text-white">

      {/* MOBILE/TABLET HEADER + DRAWER / RAIL */}
      <MobileNav
        activeView={activeView}
        allowedViews={allowedViews}
        activeUser={activeUser}
        activeMozo={activeMozo}
        usuarios={usuarios}
        autoTimerRunning={autoTimerRunning}
        getSimulatedTimeStr={getSimulatedTimeStr}
        onNavigate={handleNavigate}
        onMozoChange={handleMozoChange}
        onLogout={handleLogout}
        onLogoClick={handleLogoClickToLogin}
        onToggleAutoTimer={handleToggleAutoTimer}
        onAdvanceTime={handleAdvanceTime}
      />

      {/* LEFT SIDE PANEL - Desktop/Tablet sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen z-50 hidden lg:flex flex-col bg-[#8C6239] text-stone-900 border-r border-black/10 shadow-2xl backdrop-blur-md transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
        id="sidebar-left-panel"
      >
        {/* Logo */}
        <div 
          onClick={handleLogoClickToLogin}
          className={`flex items-center border-b border-black/10 ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-5 cursor-pointer hover:bg-black/5 transition-colors select-none`}
          title="Cerrar Sesión / Ir al Login"
        >
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg border border-[#C8956A]/30 p-0.5 overflow-hidden shrink-0 relative">
            <ElPatronLogo className="w-8 h-8 object-contain rounded" variant="icon" color="#8C6239" />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
              tryGetActiveSupabaseClient() !== null ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`} />
          </div>
          {!isSidebarCollapsed && (
            <div className="ml-3 min-w-0">
              <span className="font-extrabold text-sm text-stone-950 block leading-tight tracking-wide font-sans">El Patrón</span>
              <span className="text-[7px] uppercase font-black text-stone-700 tracking-wider block leading-tight mt-0.5">
                {tryGetActiveSupabaseClient() !== null ? '🟢 Supabase Cloud' : '🟡 Modo Local'}
              </span>
            </div>
          )}
        </div>


        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-1 px-2">
          {[
            { id: 'home', label: 'Inicio', icon: '🏠' },
            { id: 'mozo', label: 'Mozo', icon: '📱' },
            { id: 'cocina', label: 'Cocina', icon: '🍳' },
            { id: 'caja', label: 'Caja', icon: '💵' },
            { id: 'menu', label: 'Menú', icon: '📖' },
            { id: 'recetas', label: 'Recetas', icon: '⚖️' },
            { id: 'mesas', label: 'Mesas', icon: '🪑' },
            { id: 'inventario', label: 'Inventario', icon: '📦' },
            { id: 'proveedores', label: 'Proveedores', icon: '🚚' },
            { id: 'promociones', label: 'Promociones', icon: '🏷️' },
            { id: 'reservas', label: 'Reservas', icon: '📅' },
            { id: 'facturacion', label: 'Facturación', icon: '🧾' },
            { id: 'clientes', label: 'Clientes', icon: '👥' },
            { id: 'analytics', label: 'Métricas / BI', icon: '📊' },
            { id: 'usuarios', label: 'Usuarios', icon: '👥' },
            { id: 'sistema', label: 'Sistema', icon: '💻' },
            { id: 'backups', label: 'Backups', icon: '🗄️' },
          ].filter(item => (allowedViews || []).includes(item.id as AppView)).map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                title={isSidebarCollapsed ? item.label : ''}
                onClick={() => handleNavigate(item.id as AppView)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-start'
                } ${
                  isActive
                    ? 'bg-[#1A110B] text-[#8C6239] font-bold shadow-lg shadow-black/10 scale-[1.01]'
                    : 'text-stone-900 hover:text-stone-950 hover:bg-black/5'
                }`}
              >
                <span className="text-base shrink-0 leading-none">{item.icon}</span>
                {!isSidebarCollapsed && (
                  <span className="text-xs whitespace-nowrap truncate">{item.label}</span>
                )}
                {!isSidebarCollapsed && isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#8C6239] shrink-0 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-black/10 p-3 space-y-2">
          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? 'Cerrar sesión' : ''}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-900/10 text-rose-900 hover:text-rose-950 transition-colors cursor-pointer ${
              isSidebarCollapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0 text-rose-800" />
            {!isSidebarCollapsed && <span className="text-xs font-semibold">Cerrar sesión</span>}
          </button>

          <button
            onClick={() => setIsSidebarCollapsed(c => !c)}
            title={isSidebarCollapsed ? 'Expandir' : 'Colapsar'}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-black/5 text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 overflow-x-hidden overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6 pb-24 pt-16 lg:pt-4 max-w-[1600px] mx-auto w-full transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        <RetryErrorWrapper>
          <Suspense fallback={<Skeleton count={6} />}>
            {activeView === 'home' && activeUser && (
              <HomeMenuModule 
                activeRol={activeUser.rol}
                mesas={mesas} pedidos={pedidos} insumos={insumos}
                productosMenu={productosMenu} usuarios={usuarios}
                allowedViews={allowedViews} canChangeUser={true}
                activeMozo={activeMozo} onMozoChange={setActiveMozo}
                onNavigate={handleNavigate}
                getSimulatedTimeStr={getSimulatedTimeStr}
                autoTimerRunning={autoTimerRunning}
                onToggleAutoTimer={handleToggleAutoTimer}
                onAdvanceTime={handleAdvanceTime}
              />
            )}
            {activeView === 'mozo' && (
              <MozoTerminal 
                activeMozo={activeMozo}
                mesas={mesas}
                insumos={insumos}
                productosMenu={productosMenu}
                recetas={recetas}
                pedidos={pedidos}
                onMozoChange={setActiveMozo}
                onCrearPedido={handleCrearPedido}
                onFacturarMesa={handleFacturarMesa}
                addLog={addLog}
              />
            )}
            {activeView === 'cocina' && (
              <KitchenMonitor 
                pedidos={pedidos}
                onCambiarEstadoPedido={handleCambiarEstadoPedido}
                onProducirPedidoConEscandallo={handleProducirPedidoConEscandallo}
                minutosGlobal={minutosGlobal}
                productosMenu={productosMenu}
                recetas={recetas}
                insumos={insumos}
              />
            )}
            {activeView === 'caja' && (
              <CajaModule pedidos={pedidos} productosMenu={productosMenu} onFacturarMesa={handleFacturarMesa} onCambiarEstadoPedido={handleCambiarEstadoPedido} addLog={addLog} />
            )}
            {activeView === 'inventario' && (
              <InventoryModule insumos={insumos} productosMenu={productosMenu} recetas={recetas} mermas={mermas}
                onRegistrarMerma={handleRegistrarMerma}
                onRestockInsumo={handleRestockInsumo}
                addLog={addLog}
              />
            )}
            {activeView === 'usuarios' && (
              <UsuariosModule usuarios={usuarios} onUsuariosChange={setUsuarios} addLog={addLog} activeUser={activeUser} onActiveUserChange={setActiveMozo} />
            )}
            {activeView === 'menu' && (
              <MenuModule productosMenu={productosMenu} onProductosChange={setProductosMenu} recetas={recetas} insumos={insumos} addLog={addLog} />
            )}
            {activeView === 'recetas' && (
              <RecetasErrorBoundary>
                <RecetasModule recetas={recetas} onRecetasChange={setRecetas} productosMenu={productosMenu} onProductosChange={setProductosMenu} insumos={insumos} addLog={addLog} />
              </RecetasErrorBoundary>
            )}
            {activeView === 'mesas' && (
              <MesasProto1 mesas={mesas} onMesasChange={setMesas} addLog={addLog} />
            )}
            {activeView === 'proveedores' && <ProveedoresModule addLog={addLog} />}
            {activeView === 'promociones' && <PromocionesModule addLog={addLog} />}
            {activeView === 'reservas' && (
              <ReservasModule mesas={mesas} onEstadoChange={handleReservaEstadoChange} addLog={addLog} />
            )}
            {activeView === 'facturacion' && (
              <FacturacionModule pedidos={pedidos} productosMenu={productosMenu} addLog={addLog} />
            )}
            {activeView === 'sistema' && (
              <SistemaModule 
                insumos={insumos}
                productosMenu={productosMenu}
                recetas={recetas}
                pedidos={pedidos}
                mesas={mesas}
                addLog={addLog}
                onSyncComplete={handleSupabaseSync}
              />
            )}
            {activeView === 'backups' && (
              <BackupsModule 
                operationalData={{ usuarios, mesas, insumos, productosMenu, recetas, pedidos, mermas, logs }}
                onRestoreData={handleRestoreBackupData}
                addLog={addLog}
              />
            )}
            {activeView === 'analytics' && (
              <BusinessIntelligence 
                productosMenu={productosMenu} 
                logs={logs} 
                pedidos={pedidos} 
                recetas={recetas} 
                insumos={insumos} 
              />
            )}
            {activeView === 'clientes' && (
              <ClientesModule 
                addLog={addLog} 
              />
            )}
          </Suspense>
        </RetryErrorWrapper>
      </main>

      {showDiagnostics && (
        <DiagnosticsTester onClose={() => setShowDiagnostics(false)} />
      )}

      <BottomNavigation activeView={activeView} onNavigate={handleNavigate} allowedViews={allowedViews} />
    </div>
    </ErrorBoundary>
  );
}
