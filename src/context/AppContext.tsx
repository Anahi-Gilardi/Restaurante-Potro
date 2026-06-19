/**
 * context/AppContext.tsx
 *
 * Contextos React divididos por dominio para evitar el estado monolítico en App.tsx.
 * Cada contexto encapsula su propio estado y los handlers que lo modifican,
 * reduciendo re-renders innecesarios y facilitando el testing unitario.
 *
 * Dominios:
 *   - PedidosContext  → pedidos activos, creación, cambio de estado, facturación
 *   - InventarioContext → insumos, mermas, restock
 *   - SalonContext    → mesas, mozos
 *   - MenuContext     → productos del menú, recetas/escandallos
 *   - LogsContext     → registro de eventos de auditoría
 *
 * Uso:
 *   Envolver <App> con <AppProviders> en main.tsx.
 *   En cada componente usar el hook correspondiente:
 *     const { pedidos, handleCrearPedido } = usePedidos();
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
    ReactNode,
} from 'react';
import {
    Mesa,
    Insumo,
    ProductoMenu,
    RecetaEscandallo,
    Pedido,
    Merma,
    EventoLog,
} from '../types';
import {
    INITIAL_MESAS,
    INITIAL_INSUMOS,
    INITIAL_PRODUCTOS_MENU,
    INITIAL_RECETAS_ESCANDALLO,
    INITIAL_PEDIDOS,
} from '../data/initialData';
import { createClientPedidoId } from '../lib/pedidoIds';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// =============================================================================
// 1. LogsContext
// =============================================================================

interface LogsContextValue {
    logs: EventoLog[];
    addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

const LogsContext = createContext<LogsContextValue | null>(null);

export function LogsProvider({ children }: { children: ReactNode }) {
    const [logs, setLogs] = useState<EventoLog[]>([]);

  const addLog = useCallback((tipo: EventoLog['tipo'], mensaje: string) => {
        const entry: EventoLog = {
                id: makeId(),
                tipo,
                mensaje,
                timestamp: new Date(),
        };
        setLogs(prev => [entry, ...prev].slice(0, 500)); // máx 500 entradas
  }, []);

  return (
        <LogsContext.Provider value={{ logs, addLog }}>
          {children}
        </LogsContext.Provider>
      );
}

export function useLogs() {
    const ctx = useContext(LogsContext);
    if (!ctx) throw new Error('useLogs debe usarse dentro de <LogsProvider>');
    return ctx;
}

// =============================================================================
// 2. MenuContext
// =============================================================================

interface MenuContextValue {
    productosMenu: ProductoMenu[];
    recetas: RecetaEscandallo[];
    setProductosMenu: React.Dispatch<React.SetStateAction<ProductoMenu[]>>;
    setRecetas: React.Dispatch<React.SetStateAction<RecetaEscandallo[]>>;
    /** Mapa O(1) de id_producto → precio_venta */
  precioMap: Map<string, number>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
    const [productosMenu, setProductosMenu] = useState<ProductoMenu[]>(INITIAL_PRODUCTOS_MENU);
    const [recetas, setRecetas] = useState<RecetaEscandallo[]>(INITIAL_RECETAS_ESCANDALLO);

  const precioMap = useMemo(() => {
        const m = new Map<string, number>();
        productosMenu.forEach(p => m.set(p.id_producto, p.precio_venta));
        return m;
  }, [productosMenu]);

  return (
        <MenuContext.Provider value={{ productosMenu, recetas, setProductosMenu, setRecetas, precioMap }}>
          {children}
        </MenuContext.Provider>
      );
}

export function useMenu() {
    const ctx = useContext(MenuContext);
    if (!ctx) throw new Error('useMenu debe usarse dentro de <MenuProvider>');
    return ctx;
}

// =============================================================================
// 3. SalonContext (Mesas)
// =============================================================================

interface SalonContextValue {
    mesas: Mesa[];
    setMesas: React.Dispatch<React.SetStateAction<Mesa[]>>;
    activeMozo: string;
    setActiveMozo: React.Dispatch<React.SetStateAction<string>>;
}

const SalonContext = createContext<SalonContextValue | null>(null);

export function SalonProvider({ children }: { children: ReactNode }) {
    const [mesas, setMesas] = useState<Mesa[]>(INITIAL_MESAS);
    const [activeMozo, setActiveMozo] = useState<string>('Sofía'); // Sincronizado con App.tsx

  return (
        <SalonContext.Provider value={{ mesas, setMesas, activeMozo, setActiveMozo }}>
          {children}
        </SalonContext.Provider>
      );
}

export function useSalon() {
    const ctx = useContext(SalonContext);
    if (!ctx) throw new Error('useSalon debe usarse dentro de <SalonProvider>');
    return ctx;
}

// =============================================================================
// 4. InventarioContext
// =============================================================================

interface InventarioContextValue {
    insumos: Insumo[];
    mermas: Merma[];
    setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
    handleRegistrarMerma: (idInsumo: string, cantidad: number, motivo: Merma['motivo']) => void;
    handleRestockInsumo: (idInsumo: string, cantidad: number) => void;
    handleRestockTodo: () => void;
    /** Descuenta stock de insumos según las recetas de escandallo para un pedido */
  handleDescontarStockPorEscandallo: (items: Pedido['items'], recetas: RecetaEscandallo[]) => void;
}

const InventarioContext = createContext<InventarioContextValue | null>(null);

export function InventarioProvider({ children }: { children: ReactNode }) {
    const [insumos, setInsumos] = useState<Insumo[]>(INITIAL_INSUMOS);
    const [mermas, setMermas] = useState<Merma[]>([]);
    const { addLog } = useLogs();

  const handleRegistrarMerma = useCallback(
        (idInsumo: string, cantidad: number, motivo: Merma['motivo']) => {
                const insumo = insumos.find(i => i.id_insumo === idInsumo);
                if (!insumo) return;

          const nueva: Merma = {
                    id_merma: makeId(),
                    id_insumo: idInsumo,
                    nombre_insumo: insumo.nombre,
                    cantidad,
                    unidad_medida: insumo.unidad_medida,
                    motivo,
                    fecha: new Date(),
                    costo_perdida: cantidad * (insumo.costo_unitario ?? 0)
          };

          setMermas(prev => [nueva, ...prev]);
                setInsumos(prev =>
                          prev.map(i =>
                                      i.id_insumo === idInsumo
                                               ? { ...i, stock_actual: Math.max(0, i.stock_actual - cantidad) }
                                        : i
                                           )
                                 );
                addLog('merma_registrada', `Merma: ${cantidad}${insumo.unidad_medida} de ${insumo.nombre} (${motivo})`);
        },
        [insumos, addLog]
      );

  const handleRestockInsumo = useCallback((idInsumo: string, cantidad: number) => {
        setInsumos(prev =>
                prev.map(i =>
                          i.id_insumo === idInsumo ? { ...i, stock_actual: i.stock_actual + cantidad } : i
                               )
                       );
  }, []);

  const handleRestockTodo = useCallback(() => {
        setInsumos(prev => INITIAL_INSUMOS.map(ini => {
                const actual = prev.find(i => i.id_insumo === ini.id_insumo);
                return actual ? { ...actual, stock_actual: ini.stock_actual } : ini;
        }));
        addLog('sistema', 'Restock total de insumos ejecutado.');
  }, [addLog]);

  const handleDescontarStockPorEscandallo = useCallback(
        (items: Pedido['items'], recetas: RecetaEscandallo[]) => {
                setInsumos(prev => {
                          const next = [...prev];
                          items.forEach(item => {
                                      const recetasDelItem = recetas.filter(r => r.id_producto === item.id_producto);
                                      recetasDelItem.forEach(r => {
                                                    const idx = next.findIndex(i => i.id_insumo === r.id_insumo);
                                                    if (idx !== -1) {
                                                                    const descuento = r.cantidad_a_descontar * item.cantidad;
                                                                    next[idx] = {
                                                                                      ...next[idx],
                                                                                      stock_actual: Math.max(0, next[idx].stock_actual - descuento),
                                                                    };
                                                                    if (next[idx].stock_actual <= next[idx].stock_minimo) {
                                                                                      addLog('alerta_stock', `Stock bajo: ${next[idx].nombre} (${next[idx].stock_actual}${next[idx].unidad_medida})`);
                                                                    }
                                                    }
                                      });
                          });
                          return next;
                });
        },
        [addLog]
      );

  return (
        <InventarioContext.Provider
                value={{
                          insumos,
                          mermas,
                          setInsumos,
                          handleRegistrarMerma,
                          handleRestockInsumo,
                          handleRestockTodo,
                          handleDescontarStockPorEscandallo,
                }}
              >
          {children}
        </InventarioContext.Provider>
      );
}

export function useInventario() {
    const ctx = useContext(InventarioContext);
    if (!ctx) throw new Error('useInventario debe usarse dentro de <InventarioProvider>');
    return ctx;
}

// =============================================================================
// 5. PedidosContext
// =============================================================================

interface PedidosContextValue {
    pedidos: Pedido[];
    setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    handleCrearPedido: (
          data: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo'; idempotency_key?: string }
        ) => void | Promise<void>;
    handleCambiarEstadoPedido: (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => void;
    handleFacturarMesa: (idPedido: number) => void;
}

const PedidosContext = createContext<PedidosContextValue | null>(null);

export function PedidosProvider({ children }: { children: ReactNode }) {
    const [pedidos, setPedidos] = useState<Pedido[]>(INITIAL_PEDIDOS);
    const { addLog } = useLogs();
    const { setMesas } = useSalon();
    const { handleDescontarStockPorEscandallo } = useInventario();
    const { recetas } = useMenu();
  
    const handleCrearPedido = useCallback(
          (data: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo'; comensales?: number; idempotency_key?: string }) => {
                  if (data.idempotency_key && pedidos.some(p => p.idempotency_key === data.idempotency_key)) return;

                  // CONTROL DE SESIÓN POR MESA: buscar si existe un pedido activo para esa mesa
                  const activePedido = pedidos.find(p => p.id_mesa === data.id_mesa && p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado');

                  if (activePedido) {
                      setPedidos(prev =>
                          prev.map(p => {
                              if (p.id_pedido === activePedido.id_pedido) {
                                  // AGREGAR EN LUGAR DE DUPLICAR
                                  const updatedItems = p.items.map(it => ({ ...it }));
                                  data.items.forEach(newItem => {
                                      const existingItem = updatedItems.find(it => it.id_producto === newItem.id_producto);
                                      if (existingItem) {
                                          existingItem.cantidad += newItem.cantidad;
                                      } else {
                                          updatedItems.push({ ...newItem });
                                      }
                                  });
                                  return {
                                      ...p,
                                      items: updatedItems,
                                      estado_comanda: 'pendiente', // Vuelve a pendiente para que cocina lo prepare
                                      observaciones: data.observaciones ? (p.observaciones ? `${p.observaciones} | ${data.observaciones}` : data.observaciones) : p.observaciones,
                                  };
                              }
                              return p;
                          })
                      );
                      handleDescontarStockPorEscandallo(data.items, recetas);
                      addLog('pedido_creado', `Pedido #${activePedido.id_pedido} actualizado para mesa ${activePedido.numero_mesa} con nuevos ítems`);
                      return;
                  }

                  const newId = createClientPedidoId(pedidos.map((p: Pedido) => p.id_pedido));
                  const nuevo: Pedido = {
                            ...data,
                            id_pedido: newId,
                            fecha_hora: new Date(),
                            minutos_transcurridos: 0,
                            origen: data.origen ?? 'Mozo',
                  };
            
                  setPedidos(prev => {
                            if (nuevo.idempotency_key && prev.some(p => p.idempotency_key === nuevo.idempotency_key)) return prev;
                            const safeId = prev.some(p => p.id_pedido === nuevo.id_pedido)
                                      ? createClientPedidoId(prev.map((p: Pedido) => p.id_pedido))
                                      : nuevo.id_pedido;
                            return [{ ...nuevo, id_pedido: safeId }, ...prev];
                  });
                  setMesas(prev =>
                            prev.map(m =>
                                        m.id_mesa === nuevo.id_mesa ? { ...m, estado: 'ocupada', comensales: data.comensales } : m
                                      )
                          );
                  handleDescontarStockPorEscandallo(nuevo.items, recetas);
                  addLog('pedido_creado', `Pedido #${newId} creado para ${nuevo.numero_mesa} (mozo: ${nuevo.mozo})`);
          },
          [pedidos, addLog, setMesas, handleDescontarStockPorEscandallo, recetas]
        );
  
    const handleCambiarEstadoPedido = useCallback(
          (idPedido: number, nuevoEstado: Pedido['estado_comanda']) => {
                  setPedidos(prev =>
                            prev.map(p =>
                                        p.id_pedido === idPedido
                                          ? {
                                                            ...p,
                                                            estado_comanda: nuevoEstado,
                                                            segundos_en_listo: nuevoEstado === 'listo' ? 0 : p.segundos_en_listo,
                                          }
                                          : p
                                      )
                          );
                  addLog('comanda_estado', `Pedido #${idPedido} → ${nuevoEstado}`);
          },
          [addLog]
        );
  
    const handleFacturarMesa = useCallback(
          (idPedido: number) => {
                  const pedido = pedidos.find(p => p.id_pedido === idPedido);
                  if (!pedido) return;
             
                  setPedidos(prev =>
                            prev.map(p =>
                                        (p.id_mesa === pedido.id_mesa && p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado')
                                           ? { ...p, estado_comanda: 'entregado_cobrado' }
                                           : p
                                      )
                          );
                  setMesas(prev =>
                            prev.map(m =>
                                        m.id_mesa === pedido.id_mesa ? { ...m, estado: 'libre', comensales: undefined } : m
                                      )
                          );
                  addLog('sistema', `Mesa ${pedido.numero_mesa} facturada y liberada (pedido #${idPedido} y comandas asociadas)`);
          },
          [pedidos, addLog, setMesas]
        );
  
    return (
          <PedidosContext.Provider
                  value={{ pedidos, setPedidos, handleCrearPedido, handleCambiarEstadoPedido, handleFacturarMesa }}
                >
            {children}
          </PedidosContext.Provider>
        );
}

export function usePedidos() {
    const ctx = useContext(PedidosContext);
    if (!ctx) throw new Error('usePedidos debe usarse dentro de <PedidosProvider>');
    return ctx;
}

// =============================================================================
// Proveedor raíz — envuelve toda la app
// =============================================================================

/**
 * <AppProviders> debe usarse en main.tsx para envolver <App>:
  *
   *   root.render(
    *     <AppProviders>
     *       <App />
      *     </AppProviders>
       *   );
        */
export function AppProviders({ children }: { children: ReactNode }) {
    return (
          <LogsProvider>
                <MenuProvider>
                        <SalonProvider>
                                  <InventarioProvider>
                                              <PedidosProvider>
                                                {children}
                                              </PedidosProvider>
                                  </InventarioProvider>
                        </SalonProvider>
                </MenuProvider>
          </LogsProvider>
        );
}
