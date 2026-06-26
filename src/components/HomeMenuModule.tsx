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
  Cloud,
  CloudOff,
  ChevronRight,
  Bell,
  CheckCircle,
  AlertTriangle,
  Truck,
  Percent,
  ExternalLink
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
    const m = new Map<string, number>();
    productosMenu.forEach(p => m.set(p.id_producto, p.precio_venta));
    return m;
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

  // Operational Shift detection
  const shiftInfo = useMemo(() => {
    const timeStr = getSimulatedTimeStr();
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    const hour = match ? parseInt(match[1]) : 12;

    if (hour >= 12 && hour < 16) {
      return { label: 'Servicio de Almuerzo ☀️', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    } else if (hour >= 19 && hour <= 23) {
      return { label: 'Servicio de Cena 🌙', color: 'bg-[#624A3E]/20 text-[#624A3E] border-[#624A3E]/30' };
    } else {
      return { label: 'Preparación de Turno ☕', color: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
  }, [getSimulatedTimeStr]);

  // Live Alerts scanning
  const activeAlerts = useMemo(() => {
    const alerts: { text: string; action: any; type: 'warning' | 'info' | 'danger' }[] = [];
    
    // 1. Low stock ingredients
    const criticalInsumos = insumos.filter(i => i.stock_actual <= i.stock_minimo);
    if (criticalInsumos.length > 0) {
      alerts.push({
        text: `${criticalInsumos.length} insumos críticos bajo stock mínimo.`,
        action: 'inventario',
        type: 'danger'
      });
    }

    // 2. Tables waiting for bill
    const waitingTables = mesas.filter(m => m.estado === 'esperando_cuenta');
    if (waitingTables.length > 0) {
      alerts.push({
        text: `${waitingTables.length} mesas solicitando la cuenta.`,
        action: 'caja',
        type: 'warning'
      });
    }

    // 3. Cooking delays
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

  // Menu items list
  const menuItems = [

    {
      id: 'mozo',
      title: 'Mozo / Salón',
      description: 'Tomar pedidos en mesas, enviar comandas a cocina y gestionar consumos parciales.',
      icon: Smartphone,
      color: 'from-amber-600/10 to-amber-700/5 hover:border-amber-500',
      iconColor: 'text-[#8C6239]',
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
      color: 'from-orange-500/10 to-orange-600/5 hover:border-orange-400',
      iconColor: 'text-orange-700',
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
      color: 'from-emerald-500/10 to-emerald-600/5 hover:border-emerald-400',
      iconColor: 'text-emerald-700',
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
      color: 'from-stone-500/10 to-stone-600/5 hover:border-stone-400',
      iconColor: 'text-stone-700',
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
      color: 'from-teal-500/10 to-teal-600/5 hover:border-teal-400',
      iconColor: 'text-teal-700',
      badge: {
        text: `${usuarios.length} registrados`,
        type: 'neutral'
      }
    },
    {
      id: 'recetas',
      title: 'Recetas / Escandallos',
      description: 'Vinculación de platos con insumos para descuento automático de stock por producción.',
      icon: Scale,
      color: 'from-cyan-500/10 to-cyan-600/5 hover:border-cyan-400',
      iconColor: 'text-cyan-700',
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
      color: 'from-rose-500/10 to-rose-600/5 hover:border-rose-400',
      iconColor: 'text-rose-700',
      badge: {
        text: lowStockCount > 1 ? `${lowStockCount} alertas stock` : 'Nivel óptimo',
        type: lowStockCount > 1 ? 'rose' : 'emerald'
      }
    },
    {
      id: 'mesas',
      title: 'Mesas',
      description: 'Distribución física del salón comedor, ocupación de mesas y control de capacidad.',
      icon: Users,
      color: 'from-[#624A3E]/10 to-[#4D3227]/5 hover:border-[#624A3E]',
      iconColor: 'text-[#624A3E]',
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
      color: 'from-lime-500/10 to-lime-600/5 hover:border-lime-400',
      iconColor: 'text-lime-700',
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
      color: 'from-pink-500/10 to-pink-600/5 hover:border-pink-400',
      iconColor: 'text-pink-700',
      badge: {
        text: 'Marketing',
        type: 'neutral'
      }
    },
    {
      id: 'reservas',
      title: 'Reservas',
      description: 'Calendario de visitas planificadas, bloqueos preventivos de mesas y eventos.',
      icon: Calendar,
      color: 'from-amber-600/10 to-amber-700/5 hover:border-amber-500',
      iconColor: 'text-amber-800',
      badge: {
        text: 'Agenda de hoy',
        type: 'amber'
      }
    },
    {
      id: 'facturacion',
      title: 'Facturación',
      description: 'Historial fiscal de facturas y tickets emitidos, con cálculo automático de IVA.',
      icon: Receipt,
      color: 'from-stone-500/10 to-stone-600/5 hover:border-stone-400',
      iconColor: 'text-stone-700',
      badge: {
        text: 'Control fiscal',
        type: 'neutral'
      }
    },
    {
      id: 'sistema',
      title: 'Sistema / Configuración',
      description: 'Estado del motor secundario PostgreSQL, pings de red, adaptador local y logs.',
      icon: Sliders,
      color: 'from-indigo-500/10 to-indigo-600/5 hover:border-indigo-400',
      iconColor: 'text-indigo-700',
      badge: {
        text: 'PostgreSQL OK',
        type: 'emerald'
      }
    },
    {
      id: 'backups',
      title: 'Backups',
      description: 'Generación de copias de seguridad (.JSON), restauración de checkpoints y borrados.',
      icon: Database,
      color: 'from-violet-500/10 to-violet-600/5 hover:border-violet-400',
      iconColor: 'text-violet-700',
      badge: {
        text: 'Historial',
        type: 'neutral'
      }
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn" id="home-operational-menu">
      
      {/* 1. Impact Brand Header Block */}
      <div className="bg-gradient-to-br from-[#4A2D1B] via-[#6B4A35] to-[#2E190E] rounded-3xl p-8 md:p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 border border-[#C8956A]/20">
        {/* Subtle decorative logo outline in the background of the banner */}
        <div className="absolute right-[-25px] bottom-[-25px] opacity-10 rotate-12 scale-110 pointer-events-none">
          <ElPatronLogo className="w-64 h-64" variant="icon" color="#FFFDF8" />
        </div>
        
        {/* Prominent circular badge logo on the banner with object-contain */}
        <div className="w-24 h-24 md:w-28 md:h-28 bg-[#FFFDF8] rounded-full flex items-center justify-center p-1.5 shadow-lg border border-white/10 shrink-0 relative z-10">
          <ElPatronLogo className="w-full h-full object-contain rounded-full" variant="badge" color="#4A2D1B" />
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* Shift info badge */}
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border shadow-xs ${shiftInfo.color}`}>
            {shiftInfo.label}
          </span>
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
            <span className="bg-white/10 text-[#FFFDF8] text-[11px] px-3 py-1 rounded-full font-bold border border-white/5 font-sans">
              Mesa de Enlace Local
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
                className={`p-3.5 rounded-2xl border flex justify-between items-center text-xs font-semibold cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all glass-panel shadow-sm ${
                  alert.type === 'danger' 
                    ? 'border-red-200/50 hover:border-red-400 dark:border-red-500/30' 
                    : 'border-amber-250/50 hover:border-amber-400 dark:border-amber-500/30'
                }`}
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

      {/* 2. Top-Level Operational Context Row (Live stats + quick action info) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 rounded-3xl glass-panel shadow-md max-w-7xl mx-auto">
        
        {/* Salon Capacity & Shift Widget */}
        <div className="space-y-3 md:border-r border-stone-200/30 md:pr-5 last:border-0">
          <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest block">Estado del Salón</span>
          <div className="flex items-center gap-2">
            <div className="bg-[#4A2D1B]/5 dark:bg-white/5 border border-stone-200/40 dark:border-white/10 px-3.5 py-2 rounded-xl text-stone-800 dark:text-stone-200 text-sm font-bold flex items-center gap-2.5 w-full shadow-inner">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Ocupación: {Math.round((occupiedTables / (mesas.length || 1)) * 100)}%</span>
            </div>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">{occupiedTables} mesas ocupadas de {mesas.length} totales.</p>
        </div>

        {/* Active operator / logged user */}
        <div className="space-y-3 md:border-r border-stone-200/30 md:px-5 last:border-0">
          <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest block">Usuario Activo</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#4A2D1B]/10 dark:bg-white/10 border border-stone-200/40 dark:border-white/15 flex items-center justify-center text-stone-600">
              <User className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            </div>
            {canChangeUser ? (
              <select
                value={activeMozo}
                onChange={(e) => onMozoChange(e.target.value)}
                className="text-sm bg-transparent border-0 font-extrabold text-stone-850 dark:text-stone-100 focus:outline-none focus:ring-0 p-0 cursor-pointer hover:text-[#624A3E] dark:hover:text-[#C8956A]"
              >
                {usuarios.filter(usuario => usuario.activo !== false).map(usuario => (
                  <option key={usuario.id_usuario} value={usuario.nombre} className="dark:bg-[#1e130c] dark:text-stone-100">
                    {usuario.nombre} ({usuario.rol === 'superadmin' ? 'Super Admin' : usuario.rol === 'administrador' ? 'Administrador' : usuario.rol === 'cocina' ? 'Cocina' : 'Mozo'})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-extrabold text-stone-850 dark:text-stone-100">{activeMozo}</span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Persona logueada de forma segura.</p>
        </div>

        {/* Simulated shift time with clock advancement */}
        <div className="space-y-3 md:border-r border-stone-200/30 md:px-5 last:border-0 bg-[#4A2D1B]/5 dark:bg-white/5 p-4 rounded-2xl border border-dashed border-stone-300/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              Reloj Operacional
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${autoTimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-stone-800 dark:text-stone-100 font-mono tracking-tight">{getSimulatedTimeStr()}</span>
            <div className="flex gap-1.5">
              <button
                onClick={onToggleAutoTimer}
                title={autoTimerRunning ? "Pausar" : "Iniciar"}
                className={`p-1.5 rounded-lg transition-all ${autoTimerRunning ? 'bg-amber-100/80 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100/80 text-emerald-700 hover:bg-emerald-200'} cursor-pointer`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoTimerRunning ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => onAdvanceTime(15)}
                className="text-[10px] px-2 py-1 font-bold bg-white dark:bg-[#4A2D1B]/60 text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-white/10 rounded-lg hover:bg-stone-50 dark:hover:bg-[#4A2D1B] transition-colors cursor-pointer"
              >
                +15m
              </button>
            </div>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Control de comanda en reloj.</p>
        </div>

        {/* Mini Manager Insights */}
        <div className="space-y-3 md:pl-5">
          <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest block">Turno en Cifras</span>
          <div className="flex flex-col gap-1 text-xs text-stone-700 dark:text-stone-300 font-semibold">
            <div className="flex justify-between items-center">
              <span>Ventas del Turno:</span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm font-extrabold">${totalSales.toLocaleString('es-AR')}</strong>
            </div>
            <div className="flex justify-between items-center border-t border-stone-200/30 pt-1">
              <span>Ticket Promedio:</span>
              <strong className="text-stone-900 dark:text-[#C8956A] font-mono font-extrabold">${averageTicket.toLocaleString('es-AR')}</strong>
            </div>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Estimados consolidados de caja.</p>
        </div>

      </div>

      {/* Quick Shortcuts Panel */}
      <div className="glass-panel rounded-3xl p-5 max-w-7xl mx-auto space-y-3.5 shadow-md">
        <h4 className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest pl-1">
          Acciones y Consultas Rápidas
        </h4>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('caja')}
            className="flex items-center gap-1.5 btn-premium-secondary px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Registrar Pago en Caja
          </button>
          
          <button
            onClick={() => onNavigate('inventario')}
            className="flex items-center gap-1.5 btn-premium-secondary px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Insumos Críticos
          </button>

          <button
            onClick={() => onNavigate('recetas')}
            className="flex items-center gap-1.5 btn-premium-secondary px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
          >
            <ChefHat className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            Recetas y Emplatados
          </button>

          <button
            onClick={() => onNavigate('sistema')}
            className="flex items-center gap-1.5 btn-premium-secondary px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            Diagnóstico de Servidores
          </button>
        </div>
      </div>


      {/* 3. Elegantly designed modules dashboard grid (operational focus) */}
      <div className="max-w-7xl mx-auto px-0 md:px-0 space-y-6">
        <h3 className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4">
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
                className={`group glass-panel p-6 rounded-3xl transition-all text-left flex flex-col justify-between min-h-[170px] cursor-pointer hover:shadow-lg dark:hover:shadow-[#E8B800]/5 bg-gradient-to-br ${item.color} border-l-4 border-l-[#8C6239] hover:scale-[1.01]`}
              >
                {/* Module Top Row */}
                <div className="w-full flex items-center justify-between gap-4">
                  <div className={`p-2.5 rounded-xl bg-white dark:bg-[#4A2D1B]/50 shadow-md border border-stone-200/50 dark:border-white/10 ${item.iconColor}`}>
                    <Icon className="w-6 h-6 shrink-0" />
                  </div>
                  
                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wide ${badgeStyle}`}>
                    {item.badge.text}
                  </span>
                </div>

                {/* Module description content */}
                <div className="space-y-1.5 pt-4">
                  <h4 className="font-extrabold text-lg text-stone-900 dark:text-stone-100 group-hover:text-[#624A3E] dark:group-hover:text-[#C8956A] transition-colors tracking-tight flex items-center gap-1">
                    <span>{item.title}</span>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-450 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors line-clamp-2 leading-relaxed font-sans">
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
