/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Mesa, Insumo, ProductoMenu, RecetaEscandallo, Pedido, Merma, EventoLog, Reserva, Usuario } from './types';
import { 
  INITIAL_USUARIOS,
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
import { useToast, ToastContainer } from './components/ToastContainer';
import SistemaModule from './components/SistemaModule';
import PythonStreamlitLogin from './components/PythonStreamlitLogin';
import AppSidebar from './components/AppSidebar';
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
import { AppView, canAccessView, getAllowedViews, normalizeRole } from './lib/permissions';
import { APP_VIEW_META } from './lib/viewMeta';

const SESSION_STATUS_KEY = 'el_patron_session';
const SESSION_USER_KEY = 'el_patron_session_user';
const DEFAULT_ADMIN_NAME = INITIAL_USUARIOS.find(usuario => usuario.rol === 'administrador')?.nombre
  || INITIAL_USUARIOS[0].nombre;

export default function App() {
  const { toast, toasts, removeToast } = useToast();
  // --- Global Synced States ---
  const [isStreamlitLoggedIn, setIsStreamlitLoggedIn] = useState<boolean>(() => (
    typeof window !== 'undefined' && window.sessionStorage.getItem(SESSION_STATUS_KEY) === 'active'
  ));
  const [sessionOwnerName, setSessionOwnerName] = useState<string>(() => (
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem(SESSION_USER_KEY) || DEFAULT_ADMIN_NAME
      : DEFAULT_ADMIN_NAME
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
  const [activeMozo, setActiveMozo] = useState<string>(() => (
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem(SESSION_USER_KEY) || DEFAULT_ADMIN_NAME
      : DEFAULT_ADMIN_NAME
  ));
  const [activeView, setActiveView] = useState<AppView>('home');
  const activeUser = useMemo(
    () => usuarios.find(usuario => usuario.nombre === activeMozo && usuario.activo !== false)
      || usuarios.find(usuario => usuario.activo !== false)
      || INITIAL_USUARIOS[0],
    [usuarios, activeMozo]
  );
  const sessionUser = useMemo(
    () => usuarios.find(usuario => (
      usuario.nombre === sessionOwnerName && usuario.activo !== false
    )) || usuarios.find(usuario => usuario.activo !== false && usuario.rol === 'administrador')
      || activeUser,
    [usuarios, sessionOwnerName, activeUser]
  );
  const canManageOperators = normalizeRole(sessionUser.rol) === 'administrador';
  const allowedViews = useMemo(() => getAllowedViews(activeUser.rol), [activeUser.rol]);

  const applyAuthenticatedSession = useCallback((session: {
    user?: { user_metadata?: Record<string, unknown> };
  }) => {
    const metadata = session.user?.user_metadata;
    const requestedName = metadata?.nombre || metadata?.name;
    const requestedRole = metadata?.rol || metadata?.role;
    const operator = (
      typeof requestedName === 'string'
        ? usuarios.find(usuario => (
            usuario.activo !== false
            && usuario.nombre.toLowerCase() === requestedName.trim().toLowerCase()
          ))
        : undefined
    ) || (
      typeof requestedRole === 'string'
        ? usuarios.find(usuario => (
            usuario.activo !== false && usuario.rol === requestedRole
          ))
        : undefined
    ) || usuarios.find(usuario => usuario.activo !== false && usuario.rol === 'mozo')
      || usuarios.find(usuario => usuario.activo !== false && usuario.rol !== 'administrador')
      || usuarios.find(usuario => usuario.activo !== false);

    if (operator) {
      window.sessionStorage.setItem(SESSION_STATUS_KEY, 'active');
      window.sessionStorage.setItem(SESSION_USER_KEY, operator.nombre);
      setSessionOwnerName(operator.nombre);
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
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (session) applyAuthenticatedSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, [applyAuthenticatedSession]);

  // Simulation Clock state (operational minutes passed)
  const [minutosGlobal, setMinutosGlobal] = useState<number>(0);
  const [autoTimerRunning, setAutoTimerRunning] = useState<boolean>(false);


  // --- Handlers for Waiter View (Terminal Mozo) ---
  const handleCrearPedido = useCallback(async (newPedidoData: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo'; comensales?: number }) => {
    const previousPedidos = pedidos;
    const previousMesas = mesas;
    const previousInsumos = insumos;
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

    try {
      await Promise.all([
        dbSavePedidoComplex(newPedido),
        dbUpsertMesas(updatedMesas),
        ...(stockDescontado ? [
          dbUpsertInsumos(updatedInsumos),
          ...stockMovements.map(movement => dbRecordMovement(movement))
        ] : [])
      ]);
    } catch (error) {
      setPedidos(previousPedidos);
      setMesas(previousMesas);
      setInsumos(previousInsumos);
      addLog('sistema', `ROLLBACK: No se pudo sincronizar el pedido #${newId}. Se restauró la comanda local.`);
      throw error;
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
    window.sessionStorage.setItem(SESSION_STATUS_KEY, 'active');
    window.sessionStorage.setItem(SESSION_USER_KEY, operator.nombre);
    setSessionOwnerName(operator.nombre);
    setActiveMozo(operator.nombre);
    setActiveView('home');
    setIsStreamlitLoggedIn(true);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_STATUS_KEY);
    window.sessionStorage.removeItem(SESSION_USER_KEY);
    getSupabaseClient()?.auth.signOut().catch(() => undefined);
    setSessionOwnerName(DEFAULT_ADMIN_NAME);
    setActiveMozo(DEFAULT_ADMIN_NAME);
    setActiveView('home');
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

  if (!isStreamlitLoggedIn) {
    return <PythonStreamlitLogin onLoginSuccess={handleLoginSuccess} localUsers={usuarios} />;
  }

  const activeViewMeta = APP_VIEW_META[activeView];

  return (
    <>
    <div className="min-h-screen bg-[#F5F1E9] flex flex-col lg:flex-row font-sans text-slate-800 antialiased selection:bg-[#624A3E] selection:text-white">
      
      <AppSidebar
        activeView={activeView}
        activeUser={activeUser}
        activeMozo={activeMozo}
        allowedViews={allowedViews}
        autoTimerRunning={autoTimerRunning}
        canManageOperators={canManageOperators}
        permitirVentaSinStock={permitirVentaSinStock}
        usuarios={usuarios}
        getSimulatedTimeStr={getSimulatedTimeStr}
        onAdvanceTime={handleAdvanceTime}
        onLogout={handleLogout}
        onMozoChange={handleMozoChange}
        onNavigate={handleNavigate}
        onStockRuleChange={(enabled) => {
          setPermitirVentaSinStock(enabled);
          addLog('sistema', `REGLA DE NEGOCIO: Venta forzada sin stock ${enabled ? 'habilitada' : 'deshabilitada'}.`);
        }}
        onToggleAutoTimer={handleToggleAutoTimer}
      />

      {/* CORE ACTIVE MODULE AREA (RIGHT SIDE CONTENT PANE) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F5F1E9]">
        
        {/* TOP STATUS BAR ACCENTS */}
        <div className="bg-[#F5F1E9] border-b border-stone-200/80 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#624A3E] tracking-tight flex items-center gap-2">
              {activeViewMeta.title}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {activeViewMeta.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 bg-white border border-stone-200 px-2.5 py-1 rounded-xl font-medium flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              Sesión: {sessionUser.nombre} · Operador: {activeUser.nombre}
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
                usuarios={usuarios}
                allowedViews={allowedViews}
                canChangeUser={canManageOperators}
                activeMozo={activeMozo}
                onMozoChange={handleMozoChange}
                onNavigate={(view: AppView) => handleNavigate(view)}
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
                productosMenu={productosMenu}
                logs={logs}
                allowedViews={allowedViews}
                getSimulatedTimeStr={getSimulatedTimeStr}
                onNavigate={(view: AppView) => handleNavigate(view)}
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
                usuarios={canManageOperators ? usuarios : [activeUser]}
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
                pedidos={pedidos}
                precioMap={precioMap}
                logs={logs}
              />
            </div>
              </ErrorBoundary>
          )}

          {activeView === 'usuarios' && (
            <ErrorBoundary moduleName={'usuarios'}>
            <div key={activeView} className="animate-fadeIn">
              <UsuariosModule
                usuarios={usuarios}
                onUsuariosChange={setUsuarios}
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
                onProductosChange={setProductosMenu}
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
                onRecetasChange={setRecetas}
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
                  onMesasChange={setMesas}
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
                onEstadoChange={handleReservaEstadoChange}
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
                productosMenu={productosMenu}
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
    <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
