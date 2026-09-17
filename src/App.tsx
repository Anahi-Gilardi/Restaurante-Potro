/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { 
  User,
  Clock,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed
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
import { hasSameSupabaseConfig, tryGetActiveSupabaseClient } from './lib/supabaseClient';
import DiagnosticsTester from './components/DiagnosticsTester';
import RestaurantCover from './components/RestaurantCover';


import type { BackupSnapshotData } from './services/backupsService';
import { getAllMenuImages } from './lib/imageStorage';
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
const ProveedoresModule = lazy(() => import('./components/ProveedoresModule'));
const PromocionesModule = lazy(() => import('./components/PromocionesModule'));
const ReservasModule = lazy(() => import('./components/ReservasModule'));
const FacturacionModule = lazy(() => import('./components/FacturacionModule'));
const BackupsModule = lazy(() => import('./components/BackupsModule'));
const ClientesModule = lazy(() => import('./components/ClientesModule'));
import { 
  getSupabaseClient,
  resetSupabaseInstance,
  dbFetchMesas,
  dbFetchInsumos,
  dbFetchProductosMenu,
  dbFetchRecetas,
  dbFetchPedidos,
  dbUpsertMesas,
  dbUpsertInsumos,
  dbFetchMermas,
  dbUpsertMermas,
  dbRecordMovement,
  dbFetchUsuarios,
  getSupabaseConfig,
  dbInsertLog
} from './supabase';
import { AppView, canAccessView, getAllowedViews, COCINA_MODULE_ENABLED } from './lib/permissions';
import { createClientPedidoId } from './lib/pedidoIds';
import { argentinaDateIso } from './lib/argentinaDate';
import { canMergePedidoItems, resolvePedidoItemUnitPrice } from './lib/orderPricing';
import { cajaService } from './services/cajaService';
import { reservasService } from './services/reservasService';
import { stockEngine } from './services/stock/stockEngine';
import { orderTransactionService } from './services/orderTransactionService';
import { resolveSessionOperator } from './lib/sessionOperator';
import { isSameTable, doesOrderBelongToTable } from './lib/tableOrders';
import { uniteTablesInList, separateTablesInList, formatUnitedTableName } from './lib/tableUnions';
import { preloadGoogleSheetsCache, sheetFetchAllTables, sheetUpsertRow } from './lib/googleSheetsClient';

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
  const [showCover, setShowCover] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('el_patron_session') !== 'active';
  });
  const [hasSupabaseSession, setHasSupabaseSession] = useState<boolean>(() => (
    typeof window !== 'undefined' &&
    window.localStorage.getItem('el_patron_session') === 'active' &&
    window.localStorage.getItem('el_patron_session_mode') === 'supabase'
  ));
  const [isDemoSession, setIsDemoSession] = useState<boolean>(() => (
    typeof window !== 'undefined' && window.localStorage.getItem('el_patron_session_mode') === 'demo'
  ));
  const [permitirVentaSinStock, setPermitirVentaSinStock] = useState<boolean>(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>(INITIAL_USUARIOS);
  // No mostramos datos de demostracion mientras llega Supabase: daban la
  // impresion de que mesas y comandas reales se borraban segundos despues.
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [productosMenu, setProductosMenu] = useState<ProductoMenu[]>([]);
  const [recetas, setRecetas] = useState<RecetaEscandallo[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mermas, setMermas] = useState<Merma[]>([]);
  const [operationalDataStatus, setOperationalDataStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [operationalDataError, setOperationalDataError] = useState('');

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
  const [logs, setLogs] = useState<EventoLog[]>([]);
  const addLog = useCallback(
    (
      tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', 
      mensaje: string,
      metadata: Pick<EventoLog, 'terminal' | 'entidad_id' | 'estado_anterior' | 'estado_nuevo' | 'duracion_segundos'> = {},
    ) => {
      const newLogItem: EventoLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        tipo,
        mensaje,
        timestamp: new Date(),
        ...metadata,
      };
      setLogs(prev => [newLogItem, ...prev]);
      void dbInsertLog(newLogItem);
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

  // 1. Config loading & Google Sheets Warmup effect (runs once on mount)
  useEffect(() => {
    preloadGoogleSheetsCache();
    getAllMenuImages().catch(() => {});
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/supabase-config');
        const contentType = response.headers.get('content-type') ?? '';
        if (!response.ok || !contentType.includes('application/json')) return;

        const data = await response.json();
        if (data.SUPABASE_URL && data.SUPABASE_ANON_KEY) {
          const current = getSupabaseConfig();
          const next = { url: String(data.SUPABASE_URL), key: String(data.SUPABASE_ANON_KEY) };
          if (!hasSameSupabaseConfig(current, next)) {
            localStorage.setItem('el_patron_supabase_url', data.SUPABASE_URL);
            localStorage.setItem('el_patron_supabase_anon_key', data.SUPABASE_ANON_KEY);
            resetSupabaseInstance(); // This triggers supabase-client-reset event
          }
        }
      } catch (configErr) {
        console.warn('Could not fetch Supabase config from API:', configErr);
      }
    };
    loadConfig();
  }, []);

  // Refs para sincronización de mesas y comandas en tiempo real
  const activeChannelRef = useRef<any>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const cobradoOrderIdsSetRef = useRef<Set<number>>(new Set());

  // Liberación simultánea de mesa y comanda en memoria (0ms)
  const applyMesaLiberada = useCallback((payload: { id_mesa?: any; numero_mesa?: string; orderIds?: number[] }) => {
    if (!payload) return;
    const { id_mesa, numero_mesa, orderIds = [] } = payload;
    
    orderIds.forEach(id => cobradoOrderIdsSetRef.current.add(id));

    // 1. Inmediatamente marcar comandas de esta mesa como entregado_cobrado
    setPedidos(prev => prev.map(p => {
      const matchOrder = orderIds.includes(p.id_pedido);
      const matchTable = isSameTable(p, { id_mesa, numero_mesa });
      if (matchOrder || matchTable) {
        cobradoOrderIdsSetRef.current.add(p.id_pedido);
        return { ...p, estado_comanda: 'entregado_cobrado' as const };
      }
      return p;
    }));

    // 2. Inmediatamente liberar la mesa y mesas unidas/hijas
    setMesas(prev => {
      const targetMesa = prev.find(m =>
        (id_mesa !== undefined && id_mesa !== null && m.id_mesa !== undefined && m.id_mesa !== null && String(m.id_mesa) === String(id_mesa)) ||
        (numero_mesa && String(m.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim() === String(numero_mesa).toLowerCase().replace(/mesa\s+/gi, '').trim())
      );
      const updated = prev.map(m => {
        const matchId = (id_mesa !== undefined && id_mesa !== null && m.id_mesa !== undefined && m.id_mesa !== null && String(m.id_mesa) === String(id_mesa));
        const norm1 = String(m.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
        const norm2 = numero_mesa ? String(numero_mesa).toLowerCase().replace(/mesa\s+/gi, '').trim() : '';
        const matchNum = norm1 !== '' && norm2 !== '' && norm1 === norm2;
        const isPartChild = id_mesa !== undefined && id_mesa !== null && m.parent_id !== undefined && m.parent_id !== null && String(m.parent_id) === String(id_mesa);
        const isPartUnited = Boolean(targetMesa?.mesas_unidas && targetMesa.mesas_unidas.includes(m.id_mesa));
        return (matchId || matchNum || isPartChild || isPartUnited) ? { ...m, estado: 'libre' as const, comensales: undefined } : m;
      });

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('el_patron_sheet_cache_mesas', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, []);

  // Sincronización entre pestañas locales mediante BroadcastChannel y eventos
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('el_patron_table_sync');
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (!event.data) return;
          if (event.data.type === 'mesa_liberada' && event.data.payload) {
            applyMesaLiberada(event.data.payload);
          } else if (event.data.type === 'pedido_creado' && event.data.payload?.pedido) {
            const { pedido, id_mesa } = event.data.payload;
            setPedidos(prev => {
              if (prev.some(p => p.id_pedido === pedido.id_pedido)) {
                return prev.map(p => p.id_pedido === pedido.id_pedido ? pedido : p);
              }
              return [pedido, ...prev];
            });
            if (id_mesa) {
              setMesas(prev => prev.map(m => String(m.id_mesa) === String(id_mesa) ? { ...m, estado: 'ocupada' as const } : m));
            }
          } else if (event.data.type === 'caja_abierta' && event.data.payload) {
            cajaService.safeStorage.setItem('el_patron_caja_activa', JSON.stringify(event.data.payload));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('el_patron_caja_abierta', { detail: event.data.payload }));
            }
          } else if (event.data.type === 'caja_cerrada') {
            cajaService.safeStorage.removeItem('el_patron_caja_activa');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('el_patron_caja_cerrada', { detail: event.data.payload }));
            }
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    const handleLocalMesaLiberada = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        applyMesaLiberada(customEvent.detail);
      }
    };
    window.addEventListener('el_patron_mesa_liberada', handleLocalMesaLiberada);

    return () => {
      window.removeEventListener('el_patron_mesa_liberada', handleLocalMesaLiberada);
      if (bc) {
        try { bc.close(); } catch {}
        broadcastChannelRef.current = null;
      }
    };
  }, [applyMesaLiberada]);

  // 2. Data load and Realtime sync effect (runs on mount and whenever connection parameters update)
  useEffect(() => {
    if (showCover || !isStreamlitLoggedIn || !hasSupabaseSession || isDemoSession) return;

    let active = true;
    let channel: any = null;
    const client = getSupabaseClient();
    setOperationalDataStatus('loading');
    setOperationalDataError('');

    const loadData = async () => {
      try {
        const [
          savedUsuarios,
          dbMesas,
          fetchedInsumos,
          fetchedProducts,
          fetchedRecipes,
          dbPedidos,
          dbMermas,
        ] = await Promise.all([
          dbFetchUsuarios(),
          dbFetchMesas(),
          dbFetchInsumos(),
          dbFetchProductosMenu(),
          dbFetchRecetas(),
          dbFetchPedidos(),
          dbFetchMermas(),
        ]);

        let dbInsumos = fetchedInsumos;
        let dbProducts = fetchedProducts;
        let dbRecipes = fetchedRecipes;

        if (!active) return;

        if (savedUsuarios && savedUsuarios.length > 0) {
          setUsuarios(savedUsuarios);
        }
        setMesas(dbMesas ?? []);
        setInsumos(dbInsumos ?? []);
        setProductosMenu(dbProducts ?? []);
        setRecetas(dbRecipes ?? []);
        setPedidos(dbPedidos ?? []);
        setMermas(dbMermas ?? []);
        setOperationalDataStatus('ready');
        addLog('sistema', 'SISTEMA: Datos operativos listos.');

        // Sincronización silenciosa en segundo plano con Google Sheets (sin bloquear la interfaz)
        sheetFetchAllTables(true).then(async () => {
          if (!active) return;
          try {
            const [refreshMesas, refreshPedidos, refreshMenu, refreshUsuarios] = await Promise.all([
              dbFetchMesas(true),
              dbFetchPedidos(),
              dbFetchProductosMenu(),
              dbFetchUsuarios(),
            ]);
            if (active && refreshMesas) setMesas(refreshMesas);
            if (active && refreshPedidos) setPedidos(refreshPedidos);
            if (active && refreshMenu) setProductosMenu(refreshMenu);
            if (active && refreshUsuarios && refreshUsuarios.length > 0) setUsuarios(refreshUsuarios);
          } catch {
            // Silencioso en background
          }
        }).catch(() => undefined);
      } catch (err) {
        console.warn('Carga de datos operativos resiliente:', err);
        if (active) {
          setMesas(prev => prev.length > 0 ? prev : INITIAL_MESAS);
          setInsumos(prev => prev.length > 0 ? prev : INITIAL_INSUMOS);
          setProductosMenu(prev => prev.length > 0 ? prev : INITIAL_PRODUCTOS_MENU);
          setRecetas(prev => prev.length > 0 ? prev : INITIAL_RECETAS_ESCANDALLO);
          setOperationalDataStatus('ready');
        }
      }
    };

    loadData();

    if (client) {
      const activeChannel = client.channel('realtime_pedidos_app');
      channel = activeChannel;
      activeChannelRef.current = activeChannel;

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
          const refreshed = await dbFetchPedidos(true);
          if (refreshed !== null && active) {
            const cobradoIds = cobradoOrderIdsSetRef.current;
            setPedidos(refreshed.map(p => cobradoIds.has(p.id_pedido) ? { ...p, estado_comanda: 'entregado_cobrado' as const } : p));
          }
        } catch (err) {
          console.warn('Realtime fetch for pedidos failed:', err);
        }
      };

      const fetchAndSetMesas = async () => {
        try {
          const refreshed = await dbFetchMesas(true);
          if (refreshed !== null && active) {
            setMesas(refreshed);
          }
        } catch (err) {
          console.warn('Realtime fetch for mesas failed:', err);
        }
      };

      const debouncedFetchPedidos = debounce(fetchAndSetPedidos, 400);
      const debouncedFetchMesas = debounce(fetchAndSetMesas, 400);

      activeChannel
        .on('broadcast', { event: 'mesa_liberada' }, ({ payload }: any) => {
          if (active && payload) {
            applyMesaLiberada(payload);
          }
        })
        .on('broadcast', { event: 'pedido_creado' }, ({ payload }: any) => {
          if (active && payload?.pedido) {
            setPedidos(prev => {
              if (prev.some(p => p.id_pedido === payload.pedido.id_pedido)) {
                return prev.map(p => p.id_pedido === payload.pedido.id_pedido ? payload.pedido : p);
              }
              return [payload.pedido, ...prev];
            });
            if (payload.id_mesa) {
              setMesas(prev => prev.map(m => String(m.id_mesa) === String(payload.id_mesa) ? { ...m, estado: 'ocupada' as const } : m));
            }
          }
        })
        .on('broadcast', { event: 'caja_abierta' }, ({ payload }: any) => {
          if (payload) {
            cajaService.safeStorage.setItem('el_patron_caja_activa', JSON.stringify(payload));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('el_patron_caja_abierta', { detail: payload }));
            }
          }
        })
        .on('broadcast', { event: 'caja_cerrada' }, ({ payload }: any) => {
          cajaService.safeStorage.removeItem('el_patron_caja_activa');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('el_patron_caja_cerrada', { detail: payload }));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_cabecera' }, () => {
          debouncedFetchPedidos();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_detalle' }, () => {
          debouncedFetchPedidos();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, async () => {
          debouncedFetchMesas();
          debouncedFetchPedidos();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Realtime subscription connected successfully.');
          }
        });
    }

    const handleSheetDataUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ table?: string }>;
      if (!customEvent.detail || customEvent.detail.table === 'mesas') {
        dbFetchMesas(true).then(refreshedMesas => {
          if (refreshedMesas !== null && active) {
            setMesas(refreshedMesas);
          }
        }).catch(() => undefined);
      }
    };
    const handleSheetsSyncCompleted = () => {
      dbFetchMesas(true).then(refreshedMesas => {
        if (refreshedMesas !== null && active) {
          setMesas(refreshedMesas);
        }
      }).catch(() => undefined);
      dbFetchPedidos(true).then(refreshedPedidos => {
        if (refreshedPedidos !== null && active) {
          const cobradoIds = cobradoOrderIdsSetRef.current;
          setPedidos(refreshedPedidos.map(p => cobradoIds.has(p.id_pedido) ? { ...p, estado_comanda: 'entregado_cobrado' as const } : p));
        }
      }).catch(() => undefined);
    };

    window.addEventListener('el_patron_sheet_data_updated', handleSheetDataUpdated);
    window.addEventListener('el_patron_sheets_sync_completed', handleSheetsSyncCompleted);

    // Sincronización al volver a enfocar la pantalla o cambiar de pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        dbFetchMesas(true).then(m => m && setMesas(m)).catch(() => {});
        dbFetchPedidos(true).then(p => {
          if (p) {
            const cobradoIds = cobradoOrderIdsSetRef.current;
            setPedidos(p.map(order => cobradoIds.has(order.id_pedido) ? { ...order, estado_comanda: 'entregado_cobrado' as const } : order));
          }
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat cada 6 segundos para reconciliar mesas y comandas silenciosamente
    const heartbeatTimer = setInterval(() => {
      if (!active || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
      dbFetchMesas(true).then(m => m && setMesas(m)).catch(() => {});
      dbFetchPedidos(true).then(p => {
        if (p) {
          const cobradoIds = cobradoOrderIdsSetRef.current;
          setPedidos(p.map(order => cobradoIds.has(order.id_pedido) ? { ...order, estado_comanda: 'entregado_cobrado' as const } : order));
        }
      }).catch(() => {});
    }, 6000);

    return () => {
      active = false;
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('el_patron_sheet_data_updated', handleSheetDataUpdated);
      window.removeEventListener('el_patron_sheets_sync_completed', handleSheetsSyncCompleted);
      if (client && channel) {
        client.removeChannel(channel).catch((err: any) => {
          console.warn('Failed to remove channel cleanly:', err);
        });
        activeChannelRef.current = null;
      }
    };
  }, [supabaseTrigger, showCover, isStreamlitLoggedIn, hasSupabaseSession, isDemoSession, addLog, applyMesaLiberada]);

  useEffect(() => {
    if (showCover || !isStreamlitLoggedIn || !isDemoSession) return;

    setUsuarios(INITIAL_USUARIOS.map(user => ({ ...user })));
    setMesas(INITIAL_MESAS.map(mesa => ({ ...mesa })));
    setInsumos(INITIAL_INSUMOS.map(insumo => ({ ...insumo })));
    dbFetchProductosMenu().then(menu => {
      if (menu && menu.length > 0) {
        setProductosMenu(menu);
      } else {
        setProductosMenu(INITIAL_PRODUCTOS_MENU.map(product => ({ ...product })));
      }
    }).catch(() => {
      setProductosMenu(INITIAL_PRODUCTOS_MENU.map(product => ({ ...product })));
    });
    setRecetas(INITIAL_RECETAS_ESCANDALLO.map(recipe => ({ ...recipe })));
    setPedidos(INITIAL_PEDIDOS.map(pedido => ({
      ...pedido,
      items: pedido.items.map(item => ({ ...item })),
    })));
    setMermas([]);
    setOperationalDataError('');
    setOperationalDataStatus('ready');
  }, [showCover, isStreamlitLoggedIn, isDemoSession]);

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
  const [activeMozo, setActiveMozo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('el_patron_active_mozo');
      if (saved) return saved;
    }
    return 'Sofía';
  });
  const [activeView, setActiveView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('el_patron_active_view') as AppView;
      if (saved) return saved;
    }
    return 'home';
  });
  const activeUser = useMemo(() => {
    const fromList = usuarios.find(usuario => usuario.nombre === activeMozo && usuario.activo !== false);
    if (fromList) return fromList;
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('el_patron_active_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.nombre) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return usuarios.find(usuario => usuario.activo !== false) || INITIAL_USUARIOS[0];
  }, [usuarios, activeMozo]);

  const allowedViews = useMemo(() => {
    return getAllowedViews(activeUser.rol);
  }, [activeUser.rol]);

  const applyAuthenticatedSession = useCallback((session: {
    user?: {
      id?: string;
      email?: string | null;
      user_metadata?: Record<string, unknown>;
    };
  }) => {
    const linkedOperator = resolveSessionOperator(usuarios, session.user);
    setActiveMozo(currentOperator => {
      const operator = linkedOperator
        ?? resolveSessionOperator(usuarios, session.user, currentOperator);
      return operator?.nombre ?? currentOperator;
    });
    // Los eventos INITIAL_SESSION/TOKEN_REFRESHED no deben cambiar la vista ni
    // degradar permisos. El formulario de login ya valido el perfil operativo.
    if (linkedOperator) setIsStreamlitLoggedIn(true);
  }, [usuarios]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    client.auth.getSession().then(({ data }) => {
      const isLocalSheetSession = typeof window !== 'undefined' &&
        window.localStorage.getItem('el_patron_session') === 'active' &&
        window.localStorage.getItem('el_patron_session_mode') === 'supabase';
      if (isLocalSheetSession && !data.session) {
        setHasSupabaseSession(true);
      } else {
        setHasSupabaseSession(Boolean(data.session));
      }
      if (data.session) applyAuthenticatedSession(data.session);
    }).catch(err => console.error('Auth session error:', err));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      const isLocalSheetSession = typeof window !== 'undefined' &&
        window.localStorage.getItem('el_patron_session') === 'active' &&
        window.localStorage.getItem('el_patron_session_mode') === 'supabase';
      if (isLocalSheetSession && !session) {
        setHasSupabaseSession(true);
      } else {
        setHasSupabaseSession(Boolean(session));
      }
      if (session) applyAuthenticatedSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, [applyAuthenticatedSession, supabaseTrigger]);

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
      if (!isDemoSession) {
        try {
          await orderTransactionService.saveOrder(
            existingByKey,
            newPedidoData.comensales || 2,
            permitirVentaSinStock
          );
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'No se pudo sincronizar la comanda.');
          return false;
        }
      }
      addLog('sistema', `PEDIDOS: Reintento sincronizado por idempotencia (${newPedidoData.idempotency_key}).`);
      return true;
    }

    const existingActivePedido = pedidos.find(p => {
      const match = isSameTable(p, newPedidoData) && 
        p.estado_comanda === 'pendiente';
      return match;
    });

    // Validar items con el motor de stock
    try {
      newPedidoData.items.forEach(item => stockEngine.validatePedidoItem(item));
    } catch (validationErr: any) {
      toast.error(validationErr.message);
      return false;
    }

    let updatedInsumos = insumos;
    let stockDescontado = false;
    let itemsDescontados: string[] = [];
    let alarmasBajoStock: string[] = [];

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
      } catch (err: any) {
        toast.error(`No es posible crear pedido: ${err.message}`);
        return false;
      }
    }

    let finalPedido: Pedido;

    if (existingActivePedido) {
      const updatedItems = [...existingActivePedido.items];
      newPedidoData.items.forEach(newItem => {
        const existingItemIdx = updatedItems.findIndex(it => canMergePedidoItems(it, newItem, productosMenu));
        if (existingItemIdx > -1) {
          updatedItems[existingItemIdx] = {
            ...updatedItems[existingItemIdx],
            cantidad: updatedItems[existingItemIdx].cantidad + newItem.cantidad,
            precio_unitario: resolvePedidoItemUnitPrice(updatedItems[existingItemIdx], productosMenu),
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
        idempotency_key: newPedidoData.idempotency_key || existingActivePedido.idempotency_key,
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

    // Difusión simultánea a caja y otros dispositivos
    const broadcastPayload = {
      pedido: finalPedido,
      id_mesa: newPedidoData.id_mesa,
      numero_mesa: newPedidoData.numero_mesa
    };

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: 'pedido_creado', payload: broadcastPayload });
      } catch {}
    }

    if (activeChannelRef.current) {
      try {
        activeChannelRef.current.send({
          type: 'broadcast',
          event: 'pedido_creado',
          payload: broadcastPayload
        }).catch?.(() => undefined);
      } catch {}
    }

    if (itemsDescontados.length > 0) {
      setInsumos(updatedInsumos);
      addLog('descuento_stock', `ESCANDALLO (AL MANDAR COMANDA): Pedido #${finalPedido.id_pedido} enviado a cocina. Insumos descontados: ${itemsDescontados.join(', ')}`);
    }

    alarmasBajoStock.forEach(nom => {
      addLog('alerta_stock', `CONTROL REPOSICIÓN: El insumo '${nom}' ha caído por debajo del stock de seguridad.`);
    });

    if (!isDemoSession) {
      try {
        await orderTransactionService.saveOrder(
          finalPedido,
          newPedidoData.comensales || 2,
          permitirVentaSinStock
        );
      } catch (error) {
        const [remotePedidos, remoteMesas, remoteInsumos] = await Promise.all([
          dbFetchPedidos(),
          dbFetchMesas(),
          dbFetchInsumos()
        ]).catch(() => [pedidos, mesas, insumos] as const);
        setPedidos(remotePedidos);
        setMesas(remoteMesas);
        setInsumos(remoteInsumos);
        toast.error(error instanceof Error ? error.message : 'No se pudo confirmar la comanda.');
        return false;
      }
    }
    return true;
  }, [pedidos, insumos, recetas, productosMenu, addLog, mesas, permitirVentaSinStock, setMesas, setInsumos, setPedidos, activeMozo, isDemoSession, toast]);

  const handleMozoChange = (mozo: string) => {
    const nextUser = usuarios.find(usuario => usuario.nombre === mozo && usuario.activo !== false);
    if (!nextUser) {
      toast.error('El usuario seleccionado no está disponible.');
      return;
    }
    setActiveMozo(mozo);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('el_patron_active_mozo', mozo);
      window.localStorage.setItem('el_patron_active_user', JSON.stringify(nextUser));
    }
    addLog('sistema', `SESIÓN: Usuario operativo actualizado a ${mozo} (${nextUser.rol}).`);
  };

  // NUEVO: Validación estricta en el método de navegación
  const handleNavigate = (view: AppView) => {
    if (!canAccessView(activeUser.rol, view)) {
      toast.warning(`El rol ${activeUser.rol} no tiene permiso para abrir este módulo.`);
      setActiveView('home');
      if (typeof window !== 'undefined') window.localStorage.setItem('el_patron_active_view', 'home');
      setIsSidebarCollapsed(true);
      return;
    }
    setActiveView(view);
    if (typeof window !== 'undefined') window.localStorage.setItem('el_patron_active_view', view);
    setIsSidebarCollapsed(true);
  };

  const handleLoginSuccess = (user: Usuario, mode: 'demo' | 'supabase') => {
    window.localStorage.setItem('el_patron_session', 'active');
    window.localStorage.setItem('el_patron_session_mode', mode);
    window.localStorage.setItem('el_patron_active_mozo', user.nombre);
    window.localStorage.setItem('el_patron_active_user', JSON.stringify(user));
    window.localStorage.setItem('el_patron_active_view', 'home');
    setIsDemoSession(mode === 'demo');
    if (mode === 'supabase') {
      setHasSupabaseSession(true);
    }
    setActiveMozo(user.nombre);
    setActiveView('home');
    setOperationalDataStatus('loading');
    setOperationalDataError('');

    setPostLoginLoading(true);

    const chunksToPreload = [
      import('./components/HomeMenuModule'),
    ];

    Promise.allSettled(chunksToPreload).finally(() => {
      setTimeout(() => {
        setPostLoginLoading(false);
        setIsStreamlitLoggedIn(true);
      }, 50);
    });
  };

  const handleLogout = () => {
    window.localStorage.removeItem('el_patron_session');
    window.localStorage.removeItem('el_patron_session_mode');
    window.localStorage.removeItem('el_patron_active_mozo');
    window.localStorage.removeItem('el_patron_active_user');
    window.localStorage.removeItem('el_patron_active_view');
    getSupabaseClient()?.auth.signOut().catch(() => undefined);
    setOperationalDataStatus('idle');
    setHasSupabaseSession(false);
    setIsDemoSession(false);
    setIsStreamlitLoggedIn(false);
    setShowCover(false);
  };

  const handleLogoClickToLogin = () => {
    window.localStorage.removeItem('el_patron_session');
    window.localStorage.removeItem('el_patron_session_mode');
    window.localStorage.removeItem('el_patron_active_mozo');
    window.localStorage.removeItem('el_patron_active_user');
    window.localStorage.removeItem('el_patron_active_view');
    getSupabaseClient()?.auth.signOut().catch(() => undefined);
    setOperationalDataStatus('idle');
    setHasSupabaseSession(false);
    setIsDemoSession(false);
    setIsStreamlitLoggedIn(false);
    setShowCover(false);
  };

  // --- Handlers for Kitchen View ---
  const handleCambiarEstadoPedido = async (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => {
    const pObj = pedidos.find(p => p.id_pedido === idPedido);
    if (!pObj) return;

    if (!isDemoSession) {
      if (nuevoEstado === 'en_cocina' && (!pObj.items || pObj.items.length === 0)) {
        toast.error('No se puede enviar a cocina un pedido vacío.');
        return;
      }
      try {
        await orderTransactionService.transitionOrder(idPedido, nuevoEstado, permitirVentaSinStock);
        const [remotePedidos, remoteMesas, remoteInsumos] = await Promise.all([
          dbFetchPedidos(),
          dbFetchMesas(),
          dbFetchInsumos()
        ]);
        setPedidos(remotePedidos);
        setMesas(remoteMesas);
        setInsumos(remoteInsumos);
        addLog(
          'comanda_estado',
          `COMANDA #${idPedido} para ${pObj.numero_mesa}: Estado cambiado a ${nuevoEstado.toUpperCase()}`,
          {
            terminal: 'KDS',
            entidad_id: String(idPedido),
            estado_anterior: pObj.estado_comanda,
            estado_nuevo: nuevoEstado,
            duracion_segundos: Math.max(0, pObj.minutos_transcurridos * 60)
          }
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado de la comanda.');
      }
      return;
    }

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
          if (result.itemsDescontados.length > 0) {
            addLog('descuento_stock', `ESCANDALLO: Pedido #${idPedido} cambió a EN_COCINA. Descuento automático de: ${result.itemsDescontados.join(', ')}`);
          }
          result.alarmasBajoStock.forEach(alertStr => {
            addLog('alerta_stock', `CRÍTICO REPOSICIÓN: El insumo '${alertStr}' cayó por debajo del stock mínimo estipulado.`);
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
          if (result.itemsReversados.length > 0) {
            addLog('descuento_stock', `REVERSO ESCANDALLO: Pedido #${idPedido} CANCELADO. Reintegro automático de: ${result.itemsReversados.join(', ')}`);
          }
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
        return updated;
      }
      return p;
    }));

    const mStr = pObj ? ` para ${pObj.numero_mesa}` : '';
    addLog(
      'comanda_estado',
      `COMANDA #${idPedido}${mStr}: Estado cambiado a ${nuevoEstado.toUpperCase()}`,
      {
        terminal: 'KDS',
        entidad_id: String(idPedido),
        estado_anterior: pObj?.estado_comanda,
        estado_nuevo: nuevoEstado,
        duracion_segundos: pObj ? Math.max(0, pObj.minutos_transcurridos * 60) : undefined,
      },
    );

    if ((nuevoEstado === 'entregado_cobrado' || nuevoEstado === 'cancelado') && pObj) {
      const updatedMesas = mesas.map(m => m.id_mesa === pObj.id_mesa ? { ...m, estado: 'libre' as const, comensales: undefined } : m);
      setMesas(updatedMesas);
    }
  };

  const handleProducirPedidoConEscandallo = (idPedido: number) => {
    handleCambiarEstadoPedido(idPedido, 'listo');
  };

  // --- Handlers for Cashier View (Caja & Cierre) ---
  const handleFacturarMesa = useCallback(async (idPedido: number, alreadyUpdatedInCaja: boolean = false) => {
    let target = pedidos.find(p => p.id_pedido === idPedido);
    if (!target) {
      target = pedidos.find(p => p.id_mesa === idPedido && p.estado_comanda !== 'entregado_cobrado');
    }
    if (!target) return;

    const ordersToBill = pedidos.filter(p => 
      isSameTable(p, target) && 
      p.estado_comanda !== 'entregado_cobrado' && 
      p.estado_comanda !== 'cancelado'
    );

    const orderIds = ordersToBill.map(o => o.id_pedido);
    if (!orderIds.includes(target.id_pedido)) {
      orderIds.push(target.id_pedido);
    }

    const payload = {
      id_mesa: target.id_mesa,
      numero_mesa: target.numero_mesa,
      orderIds
    };

    // 1. APLICAR LOCALMENTE DE FORMA INMEDIATA (0ms)
    applyMesaLiberada(payload);

    // 2. TRANSMITIR INMEDIATAMENTE POR BROADCASTCHANNEL (otra pestaña en el mismo navegador/equipo)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: 'mesa_liberada', payload });
      } catch (bcErr) {
        console.warn('BroadcastChannel sync error:', bcErr);
      }
    }

    // 3. TRANSMITIR INMEDIATAMENTE POR SUPABASE REALTIME (dispositivos mozos, celulares, tablets)
    if (activeChannelRef.current) {
      try {
        activeChannelRef.current.send({
          type: 'broadcast',
          event: 'mesa_liberada',
          payload
        }).catch?.(() => undefined);
      } catch (rtErr) {
        console.warn('Supabase Realtime broadcast error:', rtErr);
      }
    }

    // 4. DISPARAR EVENTO LOCAL EN VENTANA
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('el_patron_mesa_liberada', { detail: payload }));
    }

    const targetMesa = mesas.find(m => 
      (m.id_mesa !== undefined && m.id_mesa !== null && target.id_mesa !== undefined && target.id_mesa !== null && String(m.id_mesa) === String(target.id_mesa)) ||
      (String(m.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim() === String(target.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim())
    );

    const affectedMesas = mesas.filter(m => {
      const matchId = (m.id_mesa !== undefined && m.id_mesa !== null && target.id_mesa !== undefined && target.id_mesa !== null && String(m.id_mesa) === String(target.id_mesa));
      const norm1 = String(m.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
      const norm2 = String(target.numero_mesa || '').toLowerCase().replace(/mesa\s+/gi, '').trim();
      const matchNum = norm1 !== '' && norm2 !== '' && norm1 === norm2;
      const isPartChild = m.parent_id !== undefined && m.parent_id !== null && String(m.parent_id) === String(target.id_mesa);
      const isPartUnited = Boolean(targetMesa?.mesas_unidas && targetMesa.mesas_unidas.includes(m.id_mesa));
      return matchId || matchNum || isPartChild || isPartUnited;
    }).map(m => ({ ...m, estado: 'libre' as const, comensales: undefined }));

    // Persistencia remota asíncrona en segundo plano (0ms de latencia en la pantalla)
    (async () => {
      if (!isDemoSession) {
        try {
          await orderTransactionService.closeOrders(orderIds, permitirVentaSinStock);
        } catch (error) {
          console.warn('Supabase closeOrders omitido por permisos/red:', error);
        }
      }

      try {
        await dbUpsertMesas(affectedMesas);
      } catch (err) {
        console.warn('Error sincronizando mesa cobrada con Supabase:', err);
      }

      // Persistir comandas cerradas en Google Sheets
      for (const order of ordersToBill) {
        try {
          await sheetUpsertRow('pedidos_cabecera', {
            id_pedido: order.id_pedido,
            id_mesa: order.id_mesa,
            numero_mesa: order.numero_mesa,
            mozo: order.mozo,
            estado_comanda: 'entregado_cobrado',
            items: JSON.stringify(order.items || [])
          });
        } catch (err) {
          console.warn(`Error al actualizar comanda #${order.id_pedido} en Google Sheets:`, err);
        }
      }
    })();

    addLog('sistema', `CAJA: Facturación completa cobrada correctamente de la mesa ${target.numero_mesa} por Pedido(s) #${orderIds.join(', #')}`);

    // Completar automáticamente la reserva asociada para el día de hoy
    const today = argentinaDateIso();
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

      const nroTicket = `T-${Date.now().toString().slice(-6)}`;
      const facturaId = `fac_${Date.now()}_${idPedido}`;
      
      sheetUpsertRow('facturas', {
        id_factura: facturaId,
        id_pedido: target.id_pedido,
        numero_factura: nroTicket,
        total: totalPedido,
        tipo_comprobante: 'Ticket Consumo',
        metodo_pago: 'Efectivo',
        cuit_cliente: '',
        cliente_nombre: 'Consumidor Final',
        fecha_emision: new Date().toISOString(),
        fiscal_status: 'authorized'
      }).catch(err => console.warn('Error registrando factura en Google Sheets:', err));

      sheetUpsertRow('pagos', {
        id_pago: `pag_${Date.now()}_${idPedido}`,
        id_factura: facturaId,
        monto: totalPedido,
        metodo: 'efectivo',
        fecha: new Date().toISOString()
      }).catch(err => console.warn('Error registrando pago en Google Sheets:', err));

      sheetUpsertRow('caja_ledger', {
        id_ledger: `caj_${Date.now()}_${idPedido}`,
        concepto: `Cobro Mesa ${target.numero_mesa}`,
        monto: totalPedido,
        tipo: 'ingreso_venta',
        fecha: new Date().toISOString()
      }).catch(err => console.warn('Error registrando ledger en Google Sheets:', err));
    }
  }, [pedidos, mesas, productosMenu, addLog, isDemoSession, permitirVentaSinStock, applyMesaLiberada]);

  // --- Handlers para Unión y Desunión de Mesas ---
  const handleUnirMesas = useCallback(async (idMesa1: number | number[], idMesa2?: number | number[]) => {
    const rawIds: number[] = [];
    if (Array.isArray(idMesa1)) {
      rawIds.push(...idMesa1);
    } else if (typeof idMesa1 === 'number') {
      rawIds.push(idMesa1);
    }
    if (Array.isArray(idMesa2)) {
      rawIds.push(...idMesa2);
    } else if (typeof idMesa2 === 'number') {
      rawIds.push(idMesa2);
    }

    const uniqueIds = Array.from(new Set(rawIds));
    if (uniqueIds.length < 2) return;

    const tablesToUnite = uniqueIds.map(id => mesas.find(m => m.id_mesa === id)).filter((m): m is Mesa => Boolean(m));
    if (tablesToUnite.length < 2) return;

    const nextMesas = uniteTablesInList(tablesToUnite, mesas);
    setMesas(nextMesas);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('el_patron_sheet_cache_mesas', JSON.stringify(nextMesas));
      } catch {}
    }

    const affectedIds = new Set<number>();
    tablesToUnite.forEach(t => {
      affectedIds.add(t.id_mesa);
      if (t.mesas_unidas) t.mesas_unidas.forEach(id => affectedIds.add(id));
      if (t.parent_id) affectedIds.add(t.parent_id);
    });

    try {
      const changedMesas = nextMesas.filter(m => affectedIds.has(m.id_mesa));
      await dbUpsertMesas(changedMesas);
    } catch (err) {
      console.warn('Error sincronizando mesas unidas con Google Sheets:', err);
    }

    const names = tablesToUnite.map(m => m.numero_mesa);
    const combinedName = formatUnitedTableName(names);
    addLog('sistema', `MESAS: ${names.join(', ')} unidas. Identificador: ${combinedName}`);
  }, [mesas, addLog]);

  const handleDesunirMesas = useCallback(async (idMesa: number) => {
    const target = mesas.find(m => m.id_mesa === idMesa);
    if (!target) return;
    const affectedIds = new Set<number>([target.id_mesa]);
    if (target.parent_id) affectedIds.add(target.parent_id);
    if (target.mesas_unidas) target.mesas_unidas.forEach(id => affectedIds.add(id));
    mesas.forEach(m => {
      if (m.parent_id === target.id_mesa || (target.parent_id && m.parent_id === target.parent_id)) {
        affectedIds.add(m.id_mesa);
      }
    });

    const nextMesas = separateTablesInList(target, mesas);
    setMesas(nextMesas);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('el_patron_sheet_cache_mesas', JSON.stringify(nextMesas));
      } catch {}
    }
    try {
      const changedMesas = nextMesas.filter(m => affectedIds.has(m.id_mesa));
      await dbUpsertMesas(changedMesas);
    } catch (err) {
      console.warn('Error sincronizando mesas desunidas con Google Sheets:', err);
    }
    addLog('sistema', `MESAS: Mesas desunidas para ${target.numero_mesa}. Vuelven a operar de forma individual.`);
  }, [mesas, addLog]);

  const handleLiberarMesa = useCallback(async (idMesa: number) => {
    const target = mesas.find(m => m.id_mesa === idMesa);
    if (!target) return;

    // 1. Cancelar cualquier comanda activa asociada a la mesa
    const relatedOrders = pedidos.filter(p =>
      doesOrderBelongToTable(p, target) &&
      p.estado_comanda !== 'entregado_cobrado' &&
      p.estado_comanda !== 'cancelado'
    );

    if (relatedOrders.length > 0) {
      const orderIds = relatedOrders.map(o => o.id_pedido);
      setPedidos(prev => prev.map(p => orderIds.includes(p.id_pedido) ? { ...p, estado_comanda: 'cancelado' } : p));
    }

    // 2. Desunir si formaba parte de una unión y marcar como libre
    const affectedIds = new Set<number>([idMesa]);
    if (target.parent_id) affectedIds.add(target.parent_id);
    if (target.mesas_unidas) target.mesas_unidas.forEach(id => affectedIds.add(id));
    mesas.forEach(m => {
      if (m.parent_id === target.id_mesa || (target.parent_id && m.parent_id === target.parent_id)) {
        affectedIds.add(m.id_mesa);
      }
    });

    const nextMesas = separateTablesInList(target, mesas).map(m => {
      if (m.id_mesa === idMesa || m.parent_id === idMesa || (target.mesas_unidas && target.mesas_unidas.includes(m.id_mesa))) {
        return {
          ...m,
          estado: 'libre' as const,
          comensales: undefined,
          mesas_unidas: undefined,
          parent_id: undefined,
          ocupada_desde: undefined
        };
      }
      return m;
    });

    setMesas(nextMesas);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('el_patron_sheet_cache_mesas', JSON.stringify(nextMesas));
      } catch {}
    }

    try {
      const changedMesas = nextMesas.filter(m => affectedIds.has(m.id_mesa));
      await dbUpsertMesas(changedMesas);
    } catch (err) {
      console.warn('Error sincronizando mesa liberada con Google Sheets:', err);
    }

    addLog('sistema', `MESAS: ${target.numero_mesa} liberada manualmente. Estado cambiado a libre.`);
  }, [mesas, pedidos, addLog]);

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
    const affectedMesa = updatedMesas.find(m => m.id_mesa === reserva.id_mesa);
    if (affectedMesa) {
      dbUpsertMesas([affectedMesa]);
    }
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
    // Los usuarios continúan vinculados a Supabase Auth y no se reemplazan
    // con perfiles históricos provenientes de un archivo JSON.
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
      setIsSidebarCollapsed(true);
    }
  }, [activeView, allowedViews]);

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
            const hasSession = typeof window !== 'undefined' && window.localStorage.getItem('el_patron_session') === 'active';
            if (!hasSession) {
              window.localStorage.removeItem('el_patron_session');
              window.localStorage.removeItem('el_patron_session_mode');
              setIsDemoSession(false);
              setIsStreamlitLoggedIn(false);
            }
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

  if (operationalDataStatus !== 'ready' || postLoginLoading) {
    const hasLoadError = operationalDataStatus === 'error';
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#F4EBDD] flex items-center justify-center p-6 text-stone-800">
          <div className="w-full max-w-md rounded-3xl border border-[#8C6239]/20 bg-white/90 p-8 text-center shadow-xl">
            <ElPatronLogo className="w-24 h-24 mx-auto mb-5" variant="badge" color="#8C6239" />
            <h1 className="text-xl font-black text-[#4A3428]">El Patron</h1>
            {hasLoadError ? (
              <>
                <p className="mt-3 text-sm font-bold text-rose-700">No pudimos cargar los datos del restaurante.</p>
                <p className="mt-2 text-xs text-stone-600">{operationalDataError}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOperationalDataStatus('loading');
                      setOperationalDataError('');
                      setSupabaseTrigger(previous => previous + 1);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6F4E37] px-4 py-3 text-sm font-bold text-white"
                  >
                    <RefreshCw className="h-4 w-4" /> Reintentar
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-bold text-stone-700"
                  >
                    Cerrar sesion
                  </button>
                </div>
              </>
            ) : (
              <div className="py-2 flex flex-col items-center">
                {/* Animación Culinaria de Cocina */}
                <div className="relative mx-auto my-3 flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#8C6239]/10 animate-ping opacity-60" />
                  <div className="relative z-10 flex flex-col items-center">
                    {/* Olas de Vapor Animadas */}
                    <div className="flex gap-1.5 mb-1.5">
                      <span className="w-1.5 h-4 bg-[#8C6239] rounded-full animate-bounce [animation-delay:-0.3s] opacity-75" />
                      <span className="w-1.5 h-5 bg-[#6F4E37] rounded-full animate-bounce [animation-delay:-0.15s] opacity-90" />
                      <span className="w-1.5 h-4 bg-[#8C6239] rounded-full animate-bounce opacity-75" />
                    </div>
                    {/* Utensilios de Cocina */}
                    <div className="p-3 bg-[#F4EBDD] rounded-2xl border border-[#8C6239]/30 text-[#6F4E37] shadow-inner">
                      <UtensilsCrossed className="h-7 w-7 animate-pulse" />
                    </div>
                  </div>
                </div>

                <h2 className="mt-2 text-base font-black tracking-tight text-[#4A3428]">Preparando la cocina y el salón...</h2>
                <p className="mt-1.5 text-xs font-semibold text-stone-500 max-w-xs mx-auto">Sincronizando mesas, comandas, menú e inventario para abrir el servicio.</p>
              </div>
            )}
          </div>
        </div>
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
            { id: 'mesas', label: 'Mesas', icon: '🪑' },
            { id: 'proveedores', label: 'Proveedores', icon: '🚚' },
            { id: 'promociones', label: 'Promociones', icon: '🏷️' },
            { id: 'reservas', label: 'Reservas', icon: '📅' },
            { id: 'facturacion', label: 'Facturación', icon: '🧾' },
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
                onUnirMesas={handleUnirMesas}
                onDesunirMesas={handleDesunirMesas}
                onLiberarMesa={handleLiberarMesa}
                addLog={addLog}
                permitirVentaSinStock={permitirVentaSinStock}
              />
            )}
            {activeView === 'cocina' && COCINA_MODULE_ENABLED && (
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
              <CajaModule
                mesas={mesas}
                pedidos={pedidos}
                productosMenu={productosMenu}
                activeUser={activeUser}
                onFacturarMesa={handleFacturarMesa}
                onCambiarEstadoPedido={handleCambiarEstadoPedido}
                onOpenFacturacion={() => handleNavigate('facturacion')}
                addLog={addLog}
              />
            )}
            {activeView === 'usuarios' && (
              <UsuariosModule usuarios={usuarios} onUsuariosChange={setUsuarios} addLog={addLog} activeUser={activeUser} onActiveUserChange={setActiveMozo} />
            )}
            {activeView === 'menu' && (
              <MenuModule productosMenu={productosMenu} onProductosChange={setProductosMenu} recetas={recetas} insumos={insumos} addLog={addLog} />
            )}
            {activeView === 'mesas' && (
              <MesasModule
                mesas={mesas}
                onMesasChange={setMesas}
                addLog={addLog}
                persistenceEnabled={!isDemoSession}
              />
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
