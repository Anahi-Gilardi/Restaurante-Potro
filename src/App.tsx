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
  const getSimulatedTimeStr = useCallback(() => {
    const h = String(Math.floor((minutosGlobal + 720) / 60) % 24).padStart(2, '0');
    const m = String((minutosGlobal + 720) % 60).padStart(2, '0');
    return `${h}:${m} hs`;
  }, [minutosGlobal]);

  const [postLoginLoading, setPostLoginLoading] = useState<boolean>(false);

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
    window.sessionStorage.setItem('el_patron_session', 'active');
    setActiveMozo(user.nombre);
    setActiveView('home');

    setPostLoginLoading(true);

    const chunksToPreload = [
      import('./components/HomeMenuModule'),
      import('./components/PanelDashboard'),
    ];

    Promise.allSettled(chunksToPreload).finally(() => {
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

    if (nuevoEstado === 'en_cocina' && pObj) {
      if (!pObj.items || pObj.items.length === 0) {
        toast.error("Error: No se puede enviar a cocina un pedido vacío (sin productos).");
        addLog('sistema', `RECHAZADO: Intento de enviar a cocina el pedido vacío #${idPedido}`);
        return;
      }

      if (pObj.stock_descontado) {
        console.log(`[Escandallo] El pedido #${idPedido} ya tiene stock descontado.`);
      } else {
        let canDeduct = true;
        let itemsDescontados: string[] = [];
        let alarmasBajoStock: string[] = [];

        if (!permitirVentaSinStock) {
          for (const item of pObj.items) {
            const qtyPlates = item.cantidad;
            const matchingRecetas = recetas.filter(r => r.id_producto === item.id_producto);

            if (matchingRecetas.length === 0) {
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
          return;
        }

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

        pObj.stock_descontado = true;
        pObj.fecha_descuento_stock = new Date();

        if (itemsDescontados.length > 0) {
          addLog('descuento_stock', `ESCANDALLO: Pedido #${idPedido} cambió a EN_COCINA. Descuento automático de: ${itemsDescontados.join(', ')}`);
        }

        alarmasBajoStock.forEach(alertStr => {
          addLog('alerta_stock', `CRÍTICO REPOSICIÓN: El insumo '${alertStr}' cayó por debajo del stock mínimo estipulado.`);
        });

        setTimeout(() => {
          if (updatedInsumos.length > 0) {
            dbUpsertInsumos(updatedInsumos);
          }
        }, 50);
      }
    }

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

    setPedidos(prev => prev.map(p => {
      if (p.id_pedido === idPedido) {
        const updated = { ...p, estado_comanda: nuevoEstado };
        if (nuevoEstado === 'listo') {
          updated.segundos_en_listo = 0;
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
        dbSavePedidoComplex(updatedPedido);
      } else if (pObj) {
        dbSavePedidoComplex({ ...pObj, estado_comanda: nuevoEstado });
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
  const handleFacturarMesa = useCallback((idPedido: number) => {
    const target = pedidos.find(p => p.id_pedido === idPedido);
    if (!target) return;

    setPedidos(prev => prev.map(p => p.id_pedido === idPedido ? { ...p, estado_comanda: 'entregado_cobrado' } : p));

    const updatedMesas = mesas.map(m => m.id_mesa === target.id_mesa ? { ...m, estado: 'libre' as const, comensales: undefined } : m);
    setMesas(updatedMesas);

    addLog('sistema', `CAJA: Facturación completa cobrada correctamente de la mesa ${target.numero_mesa} por Pedido #${idPedido}`);

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

  if (!isStreamlitLoggedIn) {
    return (
      <ErrorBoundary>
        <PythonStreamlitLogin onLoginSuccess={handleLoginSuccess} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased selection:bg-amber-500/30 selection:text-amber-200">
        {/* Navbar */}
        <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavigate('home')}>
            <ElPatronLogo className="w-8 h-8 text-amber-500 animate-pulse" />
            <div>
              <h1 className="text-lg font-black tracking-wider text-amber-500 font-mono">EL PATRÓN</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">Restobar ERP v4.2.0-Prod</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Reloj Simulación */}
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center space-x-2 shadow-inner text-xs font-mono">
              <Clock className={`w-3.5 h-3.5 ${autoTimerRunning ? 'text-emerald-400 animate-spin' : 'text-slate-500'}`} style={{ animationDuration: '4s' }} />
              <span className="text-slate-300">Día 1:</span>
              <span className="text-amber-400 font-bold">
                {String(Math.floor((minutosGlobal + 720) / 60) % 24).padStart(2, '0')}:
                {String((minutosGlobal + 720) % 60).padStart(2, '0')} hs
              </span>
            </div>

            {/* Operador Activo */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-2 md:px-3 py-1 rounded-lg">
              <User className="w-3.5 h-3.5 text-amber-500" />
              <select
                value={activeMozo}
                onChange={(e) => handleMozoChange(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {usuarios.filter(u => u.activo !== false).map(u => (
                  <option key={u.id_usuario || u.nombre} value={u.nombre} className="bg-slate-900 text-slate-200">
                    {u.nombre} ({u.rol})
                  </option>
                ))}
              </select>
            </div>

            {/* Salir */}
            <button
              onClick={handleLogout}
              className="p-1.5 bg-red-950/40 hover:bg-red-900/40 border border-red-900/50 text-red-400 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Rendered Module */}
        <main className="flex-1 overflow-x-hidden p-3 md:p-6 pb-24 max-w-7xl mx-auto w-full transition-all duration-300">
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          
          <RetryErrorWrapper>
            <Suspense fallback={<Skeleton lines={6} />}>
              {activeView === 'home' && (
                <HomeMenuModule 
                  mesas={mesas}
                  pedidos={pedidos}
                  insumos={insumos}
                  productosMenu={productosMenu}
                  usuarios={usuarios}
                  allowedViews={allowedViews}
                  canChangeUser={true}
                  activeMozo={activeMozo}
                  onMozoChange={handleMozoChange}
                  onNavigate={handleNavigate}
                  getSimulatedTimeStr={getSimulatedTimeStr}
                  autoTimerRunning={autoTimerRunning}
                  onToggleAutoTimer={handleToggleAutoTimer}
                  onAdvanceTime={handleAdvanceTime}
                />
              )}
              {(activeView === 'terminal_mozo' || activeView === 'mozo') && (
                <MozoTerminal 
                  activeMozo={activeMozo} 
                  mesas={mesas} 
                  productosMenu={productosMenu} 
                  pedidos={pedidos} 
                  onCreatePedido={handleCrearPedido} 
                  onCancelPedido={(id) => handleCambiarEstadoPedido(id, 'cancelado')}
                />
              )}
              {(activeView === 'monitor_cocina' || activeView === 'cocina') && (
                <KitchenMonitor 
                  pedidos={pedidos} 
                  recetas={recetas}
                  insumos={insumos}
                  onCambiarEstado={handleCambiarEstadoPedido}
                  onProducirConEscandallo={handleProducirPedidoConEscandallo}
                />
              )}
              {activeView === 'caja' && (
                <CajaModule 
                  pedidos={pedidos} 
                  mesas={mesas} 
                  onFacturarMesa={handleFacturarMesa} 
                />
              )}
              {activeView === 'inventario' && (
                <InventoryModule 
                  insumos={insumos} 
                  mermas={mermas}
                  onRegistrarMerma={handleRegistrarMerma}
                  onRestockInsumo={handleRestockInsumo}
                  onRestockTodo={handleRestockTodo}
                />
              )}
              {(activeView === 'bi' || activeView === 'reportes') && (
                <BusinessIntelligence 
                  pedidos={pedidos} 
                  insumos={insumos} 
                  mermas={mermas} 
                  logs={logs}
                  precioMap={precioMap}
                />
              )}
              {(activeView === 'dashboard' || activeView === 'panel') && (
                <PanelDashboard 
                  pedidos={pedidos} 
                  insumos={insumos} 
                  mesas={mesas} 
                  precioMap={precioMap}
                  onNavigate={handleNavigate}
                />
              )}
              {activeView === 'usuarios' && (
                <UsuariosModule 
                  usuarios={usuarios} 
                  setUsuarios={setUsuarios} 
                />
              )}
              {activeView === 'menu' && (
                <MenuModule 
                  productosMenu={productosMenu} 
                  setProductosMenu={setProductosMenu} 
                />
              )}
              {activeView === 'recetas' && (
                <RecetasModule 
                  recetas={recetas} 
                  setRecetas={setRecetas} 
                  productosMenu={productosMenu} 
                  insumos={insumos} 
                />
              )}
              {activeView === 'mesas' && (
                <MesasModule 
                  mesas={mesas} 
                  setMesas={setMesas} 
                />
              )}
              {activeView === 'proveedores' && (
                <ProveedoresModule />
              )}
              {activeView === 'promociones' && (
                <PromocionesModule productosMenu={productosMenu} />
              )}
              {activeView === 'reservas' && (
                <ReservasModule 
                  mesas={mesas} 
                  onEstadoChange={handleReservaEstadoChange} 
                />
              )}
              {activeView === 'facturacion' && (
                <FacturacionModule pedidos={pedidos} precioMap={precioMap} />
              )}
              
              {/* Rutas Protegidas: solo superadmin */}
              {activeView === 'sistema' && activeUser.rol === 'superadmin' && (
                <SistemaModule 
                  permitirVentaSinStock={permitirVentaSinStock}
                  setPermitirVentaSinStock={setPermitirVentaSinStock}
                  autoTimerRunning={autoTimerRunning}
                  onToggleAutoTimer={handleToggleAutoTimer}
                  onAdvanceTime={handleAdvanceTime}
                  onResetAllData={handleResetAllData}
                  onSyncCompletion={handleSupabaseSync}
                />
              )}
              {activeView === 'backups' && activeUser.rol === 'superadmin' && (
                <BackupsModule 
                  currentAppState={{
                    usuarios, mesas, insumos, productosMenu, recetas, pedidos, mermas, logs
                  }}
                  onRestoreBackup={handleRestoreBackupData}
                />
              )}
            </Suspense>
          </RetryErrorWrapper>
        </main>

        {/* Bottom Navigation Menu */}
        <BottomNavigation activeView={activeView} onNavigate={handleNavigate} allowedViews={allowedViews} />
      </div>
    </ErrorBoundary>
  );
}
