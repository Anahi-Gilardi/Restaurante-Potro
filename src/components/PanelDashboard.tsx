import React, { useMemo } from 'react';
import {
    DollarSign,
    Users,
    ChefHat,
    AlertTriangle,
    TrendingUp,
    Clock,
    Smartphone,
    Receipt,
    ArrowRight,
    Utensils,
    Package,
} from 'lucide-react';
import { Mesa, Pedido, Insumo, EventoLog, ProductoMenu } from '../types';
import { AppView } from '../lib/permissions';

interface PanelDashboardProps {
    mesas: Mesa[];
    pedidos: Pedido[];
    insumos: Insumo[];
    productosMenu: ProductoMenu[];
    logs: EventoLog[];
    allowedViews: AppView[];
    onNavigate: (view: any) => void;
    getSimulatedTimeStr: () => string;
}

export default function PanelDashboard({
    mesas,
    pedidos,
    insumos,
    productosMenu,
    logs,
    allowedViews,
    onNavigate,
    getSimulatedTimeStr
}: PanelDashboardProps) {

  // Mapa de precio_venta por id_producto para lookups O(1)
  const precioMap = useMemo(() => {
        const map = new Map<string, number>();
        productosMenu.forEach(p => map.set(p.id_producto, p.precio_venta));
        return map;
  }, [productosMenu]);

  // Calcula el subtotal de un pedido usando precios reales del menu
  const calcularTotalPedido = (pedido: Pedido): number => {
        return pedido.items.reduce((sum, item) => {
                // Prioridad: precio snapshot en el item → precio actual del menu → 0
                                         const precio = item.precio_unitario ?? precioMap.get(item.id_producto) ?? 0;
                return sum + precio * item.cantidad;
        }, 0);
  };

  // KPI: Facturación real del turno (solo pedidos cobrados)
  const pedidosCobrados = useMemo(
        () => pedidos.filter(p => p.estado_comanda === 'entregado_cobrado'),
        [pedidos]
      );
    const totalSales = useMemo(
          () => pedidosCobrados.reduce((acc, p) => acc + calcularTotalPedido(p), 0),
          [pedidosCobrados, precioMap]
        );

  // KPI: ticket promedio
  const ticketPromedio = pedidosCobrados.length > 0
      ? Math.round(totalSales / pedidosCobrados.length)
        : 0;

  // KPI: mesas
  const activeTables   = mesas.filter(m => m.estado === 'ocupada').length;
    const esperandoCuenta = mesas.filter(m => m.estado === 'esperando_cuenta').length;

  // KPI: cocina
  const pendingOrders = pedidos.filter(
        p => p.estado_comanda === 'pendiente' || p.estado_comanda === 'en_cocina'
      ).length;
    const readyOrders = pedidos.filter(p => p.estado_comanda === 'listo').length;

  // KPI: stock crítico
  const criticalItems = insumos.filter(i => i.stock_actual <= i.stock_minimo).length;

  // Tiempo promedio de despacho real (pedidos cobrados con métrica disponible)
  const pedidosConTiempo = pedidosCobrados.filter(
        p => typeof p.tiempo_despacho_minutos === 'number' && p.tiempo_despacho_minutos > 0
      );
    const tiempoPromedio = pedidosConTiempo.length > 0
      ? (pedidosConTiempo.reduce((s, p) => s + (p.tiempo_despacho_minutos ?? 0), 0) / pedidosConTiempo.length).toFixed(1)
          : null;

  return (
        <div className="space-y-6">
        
          {/* ── KPI ROW ─────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
                {/* Facturación */}
                      <div id="kpi-ventas" className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
                                <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                                                          Facturación del Turno
                                            </span>
                                            <h3 className="text-2xl font-black text-stone-900 font-mono">
                                                          ${totalSales.toLocaleString('es-AR')}
                                            </h3>
                                            <span className="text-[10px] text-emerald-600 font-semibold">
                                              {pedidosCobrados.length} pedido{pedidosCobrados.length !== 1 ? 's' : ''} cobrado{pedidosCobrados.length !== 1 ? 's' : ''}&nbsp;·&nbsp;
                                                          Ticket prom. ${ticketPromedio.toLocaleString('es-AR')}
                                            </span>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                            <DollarSign className="w-5 h-5" />
                                </div>
                      </div>
              
                {/* Mesas */}
                      <div id="kpi-mesas" className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
                                <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Mesas Ocupadas</span>
                                            <h3 className="text-2xl font-black text-stone-900 font-mono">
                                              {activeTables}{' '}
                                                          <span className="text-xs text-stone-500 font-normal">/ {mesas.length}</span>
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                          <div className="w-24 bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                                                          <div
                                                                                              className="bg-[#624A3E] h-1.5 rounded-full transition-all"
                                                                                              style={{ width: `${mesas.length ? (activeTables / mesas.length) * 100 : 0}%` }}
                                                                                            />
                                                          </div>
                                              {esperandoCuenta > 0 && (
                          <span className="text-[10px] text-amber-600 font-semibold">
                            {esperandoCuenta} esperando cuenta
                          </span>
                                                          )}
                                            </div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-[#624A3E]/10 border border-[#624A3E]/20 flex items-center justify-center text-[#624A3E]">
                                            <Users className="w-5 h-5" />
                                </div>
                      </div>
              
                {/* Cocina */}
                      <div id="kpi-cocina" className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
                                <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Cocina Activa</span>
                                            <h3 className="text-2xl font-black text-stone-900 font-mono">
                                              {pendingOrders}{' '}
                                                          <span className="text-xs text-stone-500 font-normal">en proceso</span>
                                            </h3>
                                            <div className="flex items-center gap-2">
                                              {readyOrders > 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold animate-pulse">
                            {readyOrders} listo{readyOrders !== 1 ? 's' : ''} p/ entregar
                          </span>
                                                          )}
                                              {readyOrders === 0 && (
                          <span className="text-[10px] text-amber-600 font-semibold animate-pulse">
                                            Cocina activa
                          </span>
                                                          )}
                                            </div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                                            <ChefHat className="w-5 h-5" />
                                </div>
                      </div>
              
                {/* Stock crítico */}
                      <div id="kpi-alertas" className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
                                <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                                                          Alertas Stock
                                            </span>
                                            <h3 className="text-2xl font-black text-stone-900 font-mono">
                                              {criticalItems}{' '}
                                                          <span className="text-xs text-stone-500 font-normal">insumos</span>
                                            </h3>
                                            <span className="text-[10px] font-semibold" style={{ color: criticalItems > 0 ? '#EF4444' : '#22C55E' }}>
                                              {criticalItems > 0 ? 'Requiere atención urgente' : 'Abastecimiento óptimo'}
                                            </span>
                                </div>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                      criticalItems > 0
                        ? 'bg-red-50 border-red-100 text-red-500 animate-pulse'
                        : 'bg-stone-50 border-stone-100 text-stone-400'
        }`}>
                                            <AlertTriangle className="w-5 h-5" />
                                </div>
                      </div>
              </div>
        
          {/* ── SEGUNDA FILA ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
                {/* Accesos rápidos */}
                      <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                                <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider">Accesos Rápidos del Turno</h4>
                                <div className="grid grid-cols-1 gap-2.5">
                                  {[
          { view: 'mozo', icon: <Smartphone className="w-4 h-4" />, label: 'Terminal Mozo', desc: 'Tomar pedidos y mesas' },
          { view: 'cocina', icon: <ChefHat className="w-4 h-4" />, label: 'Cocina', desc: 'Cocina y semáforo de comandas' },
          { view: 'caja', icon: <Receipt className="w-4 h-4" />, label: 'Módulo Caja', desc: 'Cobros y cierre de turno' },
          { view: 'inventario', icon: <Package className="w-4 h-4" />, label: 'Inventario', desc: 'Stock y mermas' },
                      ].filter(({ view }) => allowedViews.includes(view as AppView)).map(({ view, icon, label, desc }) => (
                                      <button
                                                        key={view}
                                                        onClick={() => onNavigate(view)}
                                                        className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:bg-[#F5F1E9] transition-all text-left group cursor-pointer"
                                                      >
                                                      <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-[#624A3E]/10 text-[#624A3E] flex items-center justify-center">
                                                                          {icon}
                                                                        </div>
                                                                        <div>
                                                                                            <span className="text-xs font-bold text-stone-800 block">{label}</span>
                                                                                            <span className="text-[10px] text-stone-400 block">{desc}</span>
                                                                        </div>
                                                      </div>
                                                      <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-[#624A3E] transition-colors" />
                                      </button>
                                    ))}
                                </div>
                      </div>
              
                {/* Pedidos activos */}
                      <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                                <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider">Pedidos Activos</h4>
                                            <button
                                                            onClick={() => onNavigate('cocina')}
                                                            className="text-[10px] text-[#624A3E] font-bold hover:underline"
                                                          >
                                                          Ver Cocina →
                                            </button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {pedidos
                                                  .filter(p => p.estado_comanda !== 'entregado_cobrado')
                                                  .slice(0, 8)
                                                  .map(p => {
                                                                    const total = calcularTotalPedido(p);
                                                                    const estadoColor: Record<string, string> = {
                                                                                        pendiente:        'bg-yellow-100 text-yellow-700',
                                                                                        en_cocina:        'bg-orange-100 text-orange-700',
                                                                                        listo:            'bg-emerald-100 text-emerald-700',
                                                                    };
                                                                    return (
                                                                                        <div key={p.id_pedido} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                                                                                                            <div>
                                                                                                                                  <span className="text-xs font-bold text-stone-800">{p.numero_mesa}</span>
                                                                                                                                  <span className="text-[10px] text-stone-400 ml-2">{p.mozo}</span>
                                                                                                              </div>
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${estadoColor[p.estado_comanda] ?? 'bg-stone-100 text-stone-500'}`}>
                                                                                                                                    {p.estado_comanda.replace('_', ' ')}
                                                                                                                                    </span>
                                                                                                                                  <span className="text-[10px] font-mono text-stone-600">${total.toLocaleString('es-AR')}</span>
                                                                                                              </div>
                                                                                          </div>
                                                                                      );
                                                  })}
                                  {pedidos.filter(p => p.estado_comanda !== 'entregado_cobrado').length === 0 && (
                        <p className="text-[11px] text-stone-400 text-center py-6">Sin pedidos activos</p>
                                            )}
                                </div>
                      </div>
              
                {/* Log de eventos + tiempo promedio */}
                      <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                                <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider">Actividad Reciente</h4>
                                  {tiempoPromedio && (
                        <div className="flex items-center gap-1 bg-stone-50 border border-stone-100 rounded-lg px-2 py-1">
                                        <Clock className="w-3 h-3 text-stone-400" />
                                        <span className="text-[10px] font-mono font-bold text-stone-600">{tiempoPromedio} min prom.</span>
                        </div>
                                            )}
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {[...logs]
                                                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                                  .slice(0, 12)
                                                  .map(log => {
                                                                    const iconColor: Record<string, string> = {
                                                                                        pedido_creado:    'text-blue-500',
                                                                                        descuento_stock:  'text-amber-500',
                                                                                        alerta_stock:     'text-red-500',
                                                                                        comanda_estado:   'text-emerald-500',
                                                                                        merma_registrada: 'text-orange-500',
                                                                                        sistema:          'text-stone-400',
                                                                    };
                                                                    return (
                                                                                        <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-stone-50 last:border-0">
                                                                                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${iconColor[log.tipo]?.replace('text-', 'bg-') ?? 'bg-stone-300'}`} />
                                                                                                            <div className="min-w-0">
                                                                                                                                  <p className="text-[10px] text-stone-700 leading-tight truncate">{log.mensaje}</p>
                                                                                                                                  <p className="text-[9px] text-stone-400">
                                                                                                                                    {new Date(log.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                                                                                                    </p>
                                                                                                              </div>
                                                                                          </div>
                                                                                      );
                                                  })}
                                  {logs.length === 0 && (
                        <p className="text-[11px] text-stone-400 text-center py-6">Sin actividad registrada</p>
                                            )}
                                </div>
                      </div>
              </div>
        </div>
      );
}
