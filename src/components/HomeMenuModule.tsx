import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Smartphone, 
  ChefHat, 
  DollarSign, 
  UtensilsCrossed, 
  Scale, 
  Users, 
  Calendar, 
  Receipt, 
  Sliders, 
  Database,
  Clock,
  RefreshCw,
  User,
  ChevronRight,
  Bell,
  AlertTriangle,
  Truck,
  Percent,
  Flame,
  Activity,
  Award,
  Lightbulb
} from 'lucide-react';
import { Mesa, Pedido, Insumo, ProductoMenu, Usuario } from '../types';
import { AppView } from '../lib/permissions';
import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import ElPatronLogo from './ElPatronLogo';

interface HomeMenuModuleProps {
  activeRol: Usuario['rol'];
  mesas: Mesa[];
  pedidos: Pedido[];
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  usuarios: Usuario[];
  allowedViews: AppView[];
  canChangeUser: boolean;
  activeMozo: string;
  onMozoChange: (mozo: string) => void;
  onNavigate: (view: any) => void;
  getSimulatedTimeStr: () => string;
  autoTimerRunning: boolean;
  onToggleAutoTimer: () => void;
  onAdvanceTime: (mins: number) => void;
}

export default function HomeMenuModule({
  activeRol,
  mesas,
  pedidos,
  insumos,
  productosMenu,
  usuarios,
  allowedViews,
  canChangeUser,
  activeMozo,
  onMozoChange,
  onNavigate,
  getSimulatedTimeStr,
  autoTimerRunning,
  onToggleAutoTimer,
  onAdvanceTime
}: HomeMenuModuleProps) {
  
  // Mapa O(1) de precio_venta por id_producto
  const precioMap = useMemo(() => {
    const map = new Map<string, number>();
    productosMenu.forEach(p => map.set(p.id_producto, p.precio_venta));
    return map;
  }, [productosMenu]);

  // Facturación real desde pedidos cobrados
  const totalSales = useMemo(() => {
    return pedidos
      .filter(p => p.estado_comanda === 'entregado_cobrado')
      .reduce((acc, p) => {
        const subtotal = p.items.reduce((s, item) => {
          const precio = item.precio_unitario ?? precioMap.get(item.id_producto) ?? 0;
          return s + precio * item.cantidad;
        }, 0);
        return acc + subtotal;
      }, 0);
  }, [pedidos, precioMap]);

  const occupiedTables = mesas.filter(m => m.estado === 'ocupada').length;
  const pendingCooking = pedidos.filter(p => p.estado_comanda === 'pendiente' || p.estado_comanda === 'en_cocina').length;
  const lowStockCount = insumos.filter(i => i.stock_actual <= i.stock_minimo).length;

  // Supabase connection client state check
  const hasSupabase = !!tryGetActiveSupabaseClient();

  // Ticket Promedio
  const ticketCount = pedidos.filter(p => p.estado_comanda === 'entregado_cobrado').length;
  const averageTicket = ticketCount > 0 ? Math.round(totalSales / ticketCount) : 0;

  // Ordenar mesas numéricamente para el mapa
  const sortedMesas = useMemo(() => {
    return [...mesas].sort((a, b) => a.numero_mesa.localeCompare(b.numero_mesa, undefined, { numeric: true }));
  }, [mesas]);

  // Mapear qué mozo está asignado a cada mesa activa
  const mesaMozoMap = useMemo(() => {
    const map = new Map<string, string>();
    pedidos.forEach(p => {
      if (p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado') {
        map.set(String(p.id_mesa), p.mozo);
      }
    });
    return map;
  }, [pedidos]);

  // Progresión del Turno Circular SVG
  const shiftProgress = useMemo(() => {
    const timeStr = getSimulatedTimeStr();
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    const hours = match ? parseInt(match[1]) : 12;
    const minutes = match ? parseInt(match[2]) : 0;
    const totalMinutes = hours * 60 + minutes;

    // Turno Almuerzo: 12:00 (720m) a 16:00 (960m)
    // Turno Cena: 19:00 (1140m) a 24:00 (1440m)
    let label = 'Preparación ☕';
    let color = 'bg-stone-50 text-stone-755 dark:bg-stone-950 dark:text-stone-300 border-stone-200 dark:border-stone-850';
    let pct = 0;

    if (hours >= 12 && hours < 16) {
      label = 'Turno Almuerzo ☀️';
      color = 'bg-amber-50 text-amber-850 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/50';
      pct = ((totalMinutes - 720) / (960 - 720)) * 100;
    } else if (hours >= 19 && hours <= 23) {
      label = 'Turno Cena 🌙';
      color = 'bg-[#624A3E]/10 text-[#624A3E] border-[#624A3E]/30 dark:bg-stone-850 dark:text-[#C8956A] dark:border-stone-750';
      pct = ((totalMinutes - 1140) / (1440 - 1140)) * 100;
    } else {
      pct = ((totalMinutes - 480) / (720 - 480)) * 100; // prep mañana 8:00 a 12:00
    }

    pct = Math.max(0, Math.min(100, pct));
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return { label, color, pct, circumference, strokeDashoffset };
  }, [getSimulatedTimeStr]);

  // Leaderboard de Mozos Activos
  const mozoStats = useMemo(() => {
    const stats: Record<string, { activeTables: number; ordersServed: number }> = {};
    
    // Iniciar con mozos del sistema
    usuarios.forEach(u => {
      if (u.rol === 'mozo' || u.rol === 'administrador' || u.rol === 'superadmin') {
        stats[u.nombre] = { activeTables: 0, ordersServed: 0 };
      }
    });

    // Contar mesas activas por mozo asignado en pedidos activos
    pedidos.forEach(p => {
      if (p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado') {
        if (!stats[p.mozo]) {
          stats[p.mozo] = { activeTables: 0, ordersServed: 0 };
        }
        stats[p.mozo].activeTables++;
      }
      
      // Contar comanda servida
      if (p.mozo && stats[p.mozo]) {
        stats[p.mozo].ordersServed++;
      }
    });

    return Object.keys(stats)
      .map(name => ({
        name,
        activeTables: stats[name].activeTables,
        ordersServed: stats[name].ordersServed
      }))
      .filter(item => item.activeTables > 0 || item.ordersServed > 0)
      .sort((a, b) => b.activeTables - a.activeTables || b.ordersServed - a.ordersServed);
  }, [usuarios, pedidos]);

  // Live Alerts scanning
  const activeAlerts = useMemo(() => {
    const alerts: { text: string; action: any; type: 'warning' | 'info' | 'danger' }[] = [];
    
    const criticalInsumos = insumos.filter(i => i.stock_actual <= i.stock_minimo);
    if (criticalInsumos.length > 0) {
      alerts.push({
        text: `${criticalInsumos.length} insumos críticos bajo stock mínimo.`,
        action: 'inventario',
        type: 'danger'
      });
    }

    const waitingTables = mesas.filter(m => m.estado === 'esperando_cuenta');
    if (waitingTables.length > 0) {
      alerts.push({
        text: `${waitingTables.length} mesas solicitando la cuenta.`,
        action: 'caja',
        type: 'warning'
      });
    }

    const delayedCookings = pedidos.filter(p => (p.estado_comanda === 'pendiente' || p.estado_comanda === 'en_cocina') && p.minutos_transcurridos > 15);
    if (delayedCookings.length > 0) {
      alerts.push({
        text: `${delayedCookings.length} comandas demoradas en cocina (> 15m).`,
        action: 'cocina',
        type: 'danger'
      });
    }

    return alerts;
  }, [insumos, mesas, pedidos]);

  const menuItems = [
    {
      id: 'mozo',
      title: 'Mozo / Salón',
      description: 'Tomar pedidos en mesas, enviar comandas a cocina y gestionar consumos parciales.',
      icon: Smartphone,
      color: 'from-amber-600/10 to-amber-750/5 hover:border-amber-500 border-l-4 border-l-amber-600 dark:border-l-amber-550',
      iconColor: 'text-[#8C6239] dark:text-amber-400',
      badge: {
        text: 'Terminal Táctil',
        type: 'neutral'
      }
    },
    {
      id: 'cocina',
      title: 'Cocina',
      description: 'Monitor de preparación de platos en tiempo real y descuento automático de insumos.',
      icon: ChefHat,
      color: 'from-orange-500/10 to-orange-600/5 hover:border-orange-400 border-l-4 border-l-orange-500 dark:border-l-orange-450',
      iconColor: 'text-orange-700 dark:text-orange-400',
      badge: {
        text: pendingCooking > 0 ? `${pendingCooking} en preparación` : 'Sin pedidos',
        type: pendingCooking > 0 ? 'amber' : 'neutral'
      }
    },
    {
      id: 'caja',
      title: 'Caja',
      description: 'Control de cobros de mesas, división de cuentas de comensales y cierres de turno.',
      icon: DollarSign,
      color: 'from-emerald-500/10 to-emerald-600/5 hover:border-emerald-400 border-l-4 border-l-emerald-600 dark:border-l-emerald-500',
      iconColor: 'text-emerald-700 dark:text-emerald-400',
      badge: {
        text: 'Facturación Abierta',
        type: 'emerald'
      }
    },
    {
      id: 'menu',
      title: 'Menú',
      description: 'Crear y modificar la oferta culinaria, configurar precios públicos y categorías.',
      icon: UtensilsCrossed,
      color: 'from-stone-550/10 to-stone-600/5 hover:border-stone-400 border-l-4 border-l-stone-500 dark:border-l-stone-450',
      iconColor: 'text-stone-700 dark:text-stone-300',
      badge: {
        text: `${productosMenu.filter(p => p.activo).length} activos`,
        type: 'neutral'
      }
    },
    {
      id: 'usuarios',
      title: 'Usuarios',
      description: 'Administración de perfiles operativos: mozos, cocina y administradores.',
      icon: Users,
      color: 'from-teal-500/10 to-teal-650/5 hover:border-teal-400 border-l-4 border-l-teal-500 dark:border-l-teal-450',
      iconColor: 'text-teal-700 dark:text-teal-400',
      badge: {
        text: 'Personal',
        type: 'neutral'
      }
    },
    {
      id: 'recetas',
      title: 'Recetas / Escandallos',
      description: 'Vinculación de platos con insumos para descuento automático de stock por producción.',
      icon: Scale,
      color: 'from-cyan-500/10 to-cyan-600/5 hover:border-cyan-400 border-l-4 border-l-cyan-500 dark:border-l-cyan-450',
      iconColor: 'text-cyan-700 dark:text-cyan-400',
      badge: {
        text: 'Escandallo',
        type: 'neutral'
      }
    },
    {
      id: 'inventario',
      title: 'Inventario',
      description: 'Gestión de materias primas por porción/gramaje, mermas físicas y reabastecimiento.',
      icon: Scale,
      color: 'from-rose-500/10 to-rose-600/5 hover:border-rose-400 border-l-4 border-l-rose-500 dark:border-l-rose-450',
      iconColor: 'text-rose-700 dark:text-rose-400',
      badge: {
        text: lowStockCount > 1 ? `${lowStockCount} alertas` : 'Nivel óptimo',
        type: lowStockCount > 1 ? 'rose' : 'emerald'
      }
    },
    {
      id: 'mesas',
      title: 'Salón Comedor',
      description: 'Distribución física del salón comedor, ocupación de mesas y control de capacidad.',
      icon: Users,
      color: 'from-[#624A3E]/10 to-[#8C6239]/5 hover:border-[#624A3E] border-l-4 border-l-[#624A3E] dark:border-l-[#C8956A]',
      iconColor: 'text-[#624A3E] dark:text-[#C8956A]',
      badge: {
        text: `${occupiedTables} ocupadas`,
        type: occupiedTables > 0 ? 'amber' : 'neutral'
      }
    },
    {
      id: 'proveedores',
      title: 'Proveedores',
      description: 'Gestión de distribuidores, órdenes de compra y plazos de entrega.',
      icon: Truck,
      color: 'from-lime-500/10 to-lime-650/5 hover:border-lime-400 border-l-4 border-l-lime-500 dark:border-l-lime-450',
      iconColor: 'text-lime-700 dark:text-lime-400',
      badge: {
        text: 'Suministros',
        type: 'neutral'
      }
    },
    {
      id: 'promociones',
      title: 'Promociones',
      description: 'Configuración de ofertas: descuentos porcentuales, montos fijos y 2x1.',
      icon: Percent,
      color: 'from-pink-500/10 to-pink-650/5 hover:border-pink-400 border-l-4 border-l-pink-500 dark:border-l-pink-450',
      iconColor: 'text-pink-700 dark:text-pink-400',
      badge: {
        text: 'Campañas HH',
        type: 'neutral'
      }
    },
    {
      id: 'reservas',
      title: 'Reservas',
      description: 'Calendario de visitas planificadas, bloqueos preventivos de mesas y eventos.',
      icon: Calendar,
      color: 'from-amber-600/10 to-amber-700/5 hover:border-amber-500 border-l-4 border-l-amber-600 dark:border-l-amber-550',
      iconColor: 'text-amber-850 dark:text-amber-400',
      badge: {
        text: 'Agenda',
        type: 'amber'
      }
    },
    {
      id: 'facturacion',
      title: 'Facturación',
      description: 'Historial fiscal de facturas y tickets emitidos, con cálculo automático de IVA.',
      icon: Receipt,
      color: 'from-stone-500/10 to-stone-650/5 hover:border-stone-400 border-l-4 border-l-stone-500 dark:border-l-stone-450',
      iconColor: 'text-stone-750 dark:text-stone-300',
      badge: {
        text: 'F-ARCA',
        type: 'neutral'
      }
    },
    {
      id: 'sistema',
      title: 'Sistema / Configuración',
      description: 'Estado del motor secundario PostgreSQL, pings de red, adaptador local y logs.',
      icon: Sliders,
      color: 'from-indigo-500/10 to-indigo-650/5 hover:border-indigo-400 border-l-4 border-l-indigo-500 dark:border-l-indigo-450',
      iconColor: 'text-indigo-700 dark:text-indigo-400',
      badge: {
        text: 'Servicios OK',
        type: 'emerald'
      }
    },
    {
      id: 'backups',
      title: 'Backups',
      description: 'Generación de copias de seguridad (.JSON), restauración de checkpoints y borrados.',
      icon: Database,
      color: 'from-violet-500/10 to-violet-650/5 hover:border-violet-400 border-l-4 border-l-violet-500 dark:border-l-violet-450',
      iconColor: 'text-violet-700 dark:text-violet-400',
      badge: {
        text: 'Checkpoints',
        type: 'neutral'
      }
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-left" id="home-operational-menu">
      
      {/* 1. Impact Brand Header Block */}
      <div className="bg-gradient-to-br from-[#8C6239] via-[#B97F47] to-[#2E190E] rounded-3xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 border border-[#C8956A]/20">
        <div className="absolute right-[-25px] bottom-[-25px] opacity-10 rotate-12 scale-110 pointer-events-none">
          <ElPatronLogo className="w-64 h-64" variant="icon" color="#FFFDF8" />
        </div>
        
        <div className="w-24 h-24 md:w-28 md:h-28 bg-[#FFFDF8] rounded-full flex items-center justify-center p-1.5 shadow-lg border border-white/10 shrink-0 relative z-10">
          <ElPatronLogo className="w-full h-full object-contain rounded-full" variant="badge" color="#8C6239" />
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="bg-[#22C55E]/20 text-emerald-300 border border-[#22C55E]/30 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
            <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
            Servicio Activo
          </span>
        </div>

        <div className="flex-1 space-y-2.5 relative z-10 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#FFFDF8] font-sans">
            Bienvenido a El Patrón
          </h2>
          <p className="text-base md:text-lg text-[#FAF4EE]/90 font-medium leading-relaxed max-w-xl">
            Sistema integral de gestión gastronómica diseñado para el control operativo absoluto en cocina, salón, caja, facturación e inventario de alta precisión.
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
            <span className="bg-white/10 text-amber-250 text-[11px] px-3 py-1 rounded-full font-bold border border-white/5 font-mono">
              Estación Principal Terminal POS
            </span>
          </div>
        </div>
      </div>

      {/* Live Action Center - Notifications bell */}
      {activeAlerts.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-3xl p-5 max-w-7xl mx-auto space-y-3 shadow-md backdrop-blur-md">
          <h4 className="text-xs font-black text-amber-950 dark:text-amber-100 uppercase tracking-widest flex items-center gap-1.5 font-sans">
            <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
            Centro de Mensajes y Alertas en Vivo
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeAlerts.map((alert, idx) => (
              <div 
                key={idx} 
                onClick={() => onNavigate(alert.action)}
                className="p-3.5 rounded-2xl border flex justify-between items-center text-xs font-semibold cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all bg-white/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${alert.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
                  <span className="text-stone-800 dark:text-stone-200 leading-snug">{alert.text}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Top-Level Operational Context Row (Live stats + progress dial) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
        
        {/* Salon Capacity & Shift Widget (Span 3) */}
        <div className="lg:col-span-3 bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-850 shadow-xs flex flex-col justify-between min-h-[140px]">
          <div>
            <span className="text-[10px] font-black text-stone-400 dark:text-stone-550 uppercase tracking-widest block">Ocupación Salón</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-stone-900 dark:text-white font-mono">{occupiedTables}</span>
              <span className="text-xs font-bold text-stone-400">de {mesas.length} mesas</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-stone-105 dark:border-stone-800 flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-stone-500 dark:text-stone-400">Porcentaje ocupación:</span>
            <span className="text-sm font-black text-emerald-600 font-mono">{Math.round((occupiedTables / (mesas.length || 1)) * 100)}%</span>
          </div>
        </div>

        {/* Active operator / logged user (Span 3) */}
        <div className="lg:col-span-3 bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-850 shadow-xs flex flex-col justify-between min-h-[140px]">
          <div>
            <span className="text-[10px] font-black text-stone-400 dark:text-stone-555 uppercase tracking-widest block">Operador en Turno</span>
            <div className="flex items-center gap-2 mt-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#8C6239]/10 dark:bg-white/10 border border-stone-200 dark:border-white/15 flex items-center justify-center">
                <User className="w-4 h-4 text-stone-600 dark:text-stone-300" />
              </div>
              {canChangeUser ? (
                <select
                  value={activeMozo}
                  onChange={(e) => onMozoChange(e.target.value)}
                  className="text-sm bg-transparent border-0 font-extrabold text-stone-850 dark:text-stone-105 focus:outline-none focus:ring-0 p-0 cursor-pointer hover:text-[#624A3E] dark:hover:text-[#C8956A]"
                >
                  {usuarios.filter(u => u.activo !== false).map(u => (
                    <option key={u.id_usuario} value={u.nombre} className="dark:bg-[#1e130c] dark:text-stone-100">
                      {u.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-extrabold text-stone-850 dark:text-stone-100">{activeMozo}</span>
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-stone-105 dark:border-stone-800">
            <span className="text-[10.5px] font-bold text-stone-450 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> Sesión activa asegurada
            </span>
          </div>
        </div>

        {/* Reloj Operativo Circular SVG (Span 3) */}
        <div className="lg:col-span-3 bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-850 shadow-xs flex items-center gap-4 min-h-[140px]">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            {/* SVG Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                className="stroke-stone-100 dark:stroke-stone-800"
                strokeWidth="4.5"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                className="stroke-[#624A3E] dark:stroke-[#C8956A]"
                strokeWidth="4.5"
                fill="transparent"
                strokeDasharray={shiftProgress.circumference}
                strokeDashoffset={shiftProgress.strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <Clock className="w-4 h-4 text-stone-400 absolute" />
          </div>
          
          <div className="flex-1 space-y-1">
            <span className="text-[10px] font-black text-stone-400 dark:text-stone-555 uppercase tracking-widest block">Reloj Operacional</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-stone-900 dark:text-white font-mono">{getSimulatedTimeStr()}</span>
              <button
                onClick={onToggleAutoTimer}
                className="p-1 rounded-lg bg-stone-55 hover:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-850 text-stone-605 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoTimerRunning ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-lg border ${shiftProgress.color} inline-block`}>
              {shiftProgress.label}
            </span>
          </div>
        </div>

        {/* Turno en Cifras (Span 3) */}
        <div className="lg:col-span-3 bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-855 shadow-xs flex flex-col justify-between min-h-[140px]">
          <div>
            <span className="text-[10px] font-black text-stone-400 dark:text-stone-555 uppercase tracking-widest block">Turno en Cifras</span>
            
            <div className="flex justify-between items-center mt-3 text-xs font-semibold">
              <span className="text-stone-500">Caja Estimada:</span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">${totalSales.toLocaleString('es-AR')}</strong>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-stone-500">Ticket Promedio:</span>
              <strong className="text-stone-900 dark:text-stone-105 font-mono">${averageTicket.toLocaleString('es-AR')}</strong>
            </div>
          </div>
          
          <div className="border-t border-stone-105 dark:border-stone-800 pt-2 flex items-center justify-between text-[9px] font-black text-stone-450 uppercase">
            <span>Ticket Emitidos: {ticketCount}</span>
            <button onClick={() => onAdvanceTime(15)} className="text-[#624A3E] dark:text-[#C8956A] hover:underline cursor-pointer">+15 Min</button>
          </div>
        </div>

      </div>

      {/* MAPA VISUAL DEL SALÓN (IN LIVE MAP) */}
      <div className="max-w-7xl mx-auto bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-850 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-105 dark:border-stone-800 pb-3">
          <div>
            <h4 className="text-sm font-black text-stone-850 dark:text-white uppercase flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-orange-600 animate-pulse" />
              Mapa Visual del Salón (Monitoreo Rápido)
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">Haz clic en cualquier mesa ocupada para editar su comanda directamente.</p>
          </div>

          {/* Referencias */}
          <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase">
            <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Libre</span>
            <span className="flex items-center gap-1 text-rose-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Ocupada</span>
            <span className="flex items-center gap-1 text-amber-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" /> Cuenta</span>
          </div>
        </div>

        {/* Cuadrícula de Mesas */}
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-4 pt-2">
          {sortedMesas.map(m => {
            let tableStyle = 'bg-emerald-50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-350 dark:border-emerald-900/50';
            if (m.estado === 'ocupada') tableStyle = 'bg-rose-50 text-rose-800 border-rose-250 dark:bg-rose-955/20 dark:text-rose-355 dark:border-rose-900/50';
            else if (m.estado === 'esperando_cuenta') tableStyle = 'bg-amber-50 text-amber-800 border-amber-250 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/50 animate-pulse shadow-md shadow-amber-400/5';

            const mozoAsignado = mesaMozoMap.get(String(m.id_mesa));

            return (
              <button
                key={m.id_mesa}
                onClick={() => {
                  if (m.estado === 'ocupada' || m.estado === 'esperando_cuenta') {
                    onNavigate('mozo');
                  } else {
                    onNavigate('mesas');
                  }
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${tableStyle}`}
              >
                <span className="text-xs font-black uppercase tracking-tight">{m.numero_mesa}</span>
                <span className="text-[9px] font-semibold opacity-70 mt-0.5">{m.comensales ?? '?'} pax</span>
                {mozoAsignado && m.estado === 'ocupada' && (
                  <span className="text-[8px] font-black uppercase tracking-widest mt-1 bg-black/5 dark:bg-white/5 px-1 rounded truncate max-w-full">
                    👤 {mozoAsignado.split(' ')[0]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DOS COLUMNAS: LEADERBOARD DE MOZOS + ALERTAS GENERALES */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto">
        
        {/* LEADERBOARD (Span 6) */}
        <div className="md:col-span-6 bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-850 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-[#624A3E] dark:text-[#C8956A] uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            Desempeño de Mozos (Servicio Activo)
          </h4>
          
          <div className="space-y-3 pt-2">
            {mozoStats.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No hay comandas activas asignadas a ningún mozo actualmente.</p>
            ) : (
              mozoStats.map(mozo => (
                <div key={mozo.name} className="flex items-center justify-between text-xs border-b border-stone-105 dark:border-stone-800 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-850 text-[#624A3E] dark:text-[#C8956A] font-black flex items-center justify-center text-[10px]">
                      {mozo.name[0]}
                    </span>
                    <span className="font-extrabold text-stone-805 dark:text-stone-100">{mozo.name}</span>
                  </div>

                  <div className="flex items-center gap-3 font-semibold text-stone-600 dark:text-stone-300">
                    <span className="text-[10px] bg-stone-50 dark:bg-stone-950 px-2 py-0.5 rounded border border-stone-150 dark:border-stone-805">
                      {mozo.activeTables} mesas activas
                    </span>
                    <span className="text-[10px] bg-[#624A3E]/5 text-[#624A3E] dark:text-[#C8956A] px-2 py-0.5 rounded">
                      {mozo.ordersServed} comandas
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* WIDGET RAPIDOS Y SUGERENCIAS (Span 6) */}
        <div className="md:col-span-6 bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-850 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-stone-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Recomendaciones Operativas
          </h4>
          
          <div className="space-y-3 text-xs font-semibold leading-relaxed">
            <div className="p-3 bg-stone-50 dark:bg-stone-955 rounded-2xl border border-stone-150 dark:border-stone-805">
              <span className="text-[9.5px] font-black text-[#624A3E] dark:text-[#C8956A] uppercase block mb-1">💡 Control de Inventario Semanal</span>
              <p className="text-stone-600 dark:text-stone-400 font-medium">Revisa las alertas de stock mínimo antes del cierre de turno para coordinar los pedidos de materias primas con proveedores.</p>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-955 rounded-2xl border border-stone-150 dark:border-stone-855">
              <span className="text-[9.5px] font-black text-emerald-600 uppercase block mb-1">💡 Facturación Simplificada</span>
              <p className="text-stone-600 dark:text-stone-400 font-medium">Las mesas que soliciten su cuenta en el salón aparecerán automáticamente palpitando en el mapa de control superior.</p>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Elegantly designed modules dashboard grid (operational focus) */}
      <div className="max-w-7xl mx-auto px-0 md:px-0 space-y-6">
        <h3 className="text-xs font-black text-stone-400 dark:text-stone-555 uppercase tracking-widest mb-4">
          Módulos y Terminales de Operación
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.filter(item => allowedViews.includes(item.id as AppView)).map(item => {
            const Icon = item.icon;
            
            // Determine badge theme colors
            let badgeStyle = 'bg-stone-100 dark:bg-white/5 text-stone-650 dark:text-stone-400 border border-stone-250 dark:border-white/10';
            if (item.badge.type === 'emerald') badgeStyle = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-500/25';
            if (item.badge.type === 'amber') badgeStyle = 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-450 border border-amber-200 dark:border-amber-500/25 animate-pulse';
            if (item.badge.type === 'rose') badgeStyle = 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-450 border border-rose-200 dark:border-rose-500/25 animate-bounce';

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`group bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-850 transition-all text-left flex flex-col justify-between min-h-[170px] cursor-pointer hover:shadow-lg dark:hover:shadow-[#C8956A]/5 bg-gradient-to-br ${item.color} hover:scale-[1.01]`}
              >
                {/* Module Top Row */}
                <div className="w-full flex items-center justify-between gap-4">
                  <div className={`p-2.5 rounded-xl bg-white dark:bg-[#8C6239]/50 shadow-md border border-stone-200/50 dark:border-white/10 ${item.iconColor}`}>
                    <Icon className="w-6 h-6 shrink-0" />
                  </div>
                  
                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wide ${badgeStyle}`}>
                    {item.badge.text}
                  </span>
                </div>

                {/* Module description content */}
                <div className="space-y-1.5 pt-4">
                  <h4 className="font-extrabold text-lg text-stone-900 dark:text-stone-105 group-hover:text-[#624A3E] dark:group-hover:text-[#C8956A] transition-colors tracking-tight flex items-center gap-1">
                    <span>{item.title}</span>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors line-clamp-2 leading-relaxed font-sans">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
