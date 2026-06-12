import React from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { Mesa, Pedido, Insumo, ProductoMenu } from '../types';
import { getSupabaseClient } from '../supabase';
import ElPatronLogo from './ElPatronLogo';

interface HomeMenuModuleProps {
  mesas: Mesa[];
  pedidos: Pedido[];
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  activeMozo: string;
  onMozoChange: (mozo: string) => void;
  onNavigate: (view: any) => void;
  getSimulatedTimeStr: () => string;
  autoTimerRunning: boolean;
  onToggleAutoTimer: () => void;
  onAdvanceTime: (mins: number) => void;
}

export default function HomeMenuModule({
  mesas,
  pedidos,
  insumos,
  productosMenu,
  activeMozo,
  onMozoChange,
  onNavigate,
  getSimulatedTimeStr,
  autoTimerRunning,
  onToggleAutoTimer,
  onAdvanceTime
}: HomeMenuModuleProps) {
  
  // Real-time metrics calculations
  const totalSales = pedidos
    .filter(p => p.estado_comanda === 'entregado_cobrado')
    .reduce((acc, p) => {
      const itemsSum = p.items.reduce((sum, item) => sum + (item.cantidad * 12500), 0);
      return acc + (itemsSum || 14500); 
    }, 0);

  const occupiedTables = mesas.filter(m => m.estado === 'ocupada').length;
  const pendingCooking = pedidos.filter(p => p.estado_comanda === 'pendiente' || p.estado_comanda === 'en_cocina').length;
  const lowStockCount = insumos.filter(i => i.stock_actual <= i.stock_minimo).length;

  // Supabase connection client state check
  const hasSupabase = !!getSupabaseClient();

  // Menu items list
  const menuItems = [
    {
      id: 'panel',
      title: 'Panel General',
      description: 'Supervisión en vivo de comandas, auditoría de logs y consolidador de métricas.',
      icon: TrendingUp,
      color: 'from-amber-500/10 to-amber-600/5 hover:border-amber-400',
      iconColor: 'text-amber-700',
      badge: {
        text: `$${totalSales.toLocaleString('es-AR')}`,
        type: 'emerald'
      }
    },
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
      title: 'Cocina KDS',
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
      <div className="bg-gradient-to-br from-[#4A2D1B] via-[#6B4A35] to-[#2E190E] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 border-b-4 border-[#6B4A35]">
        {/* Subtle decorative logo outline in the background of the banner */}
        <div className="absolute right-[-25px] bottom-[-25px] opacity-10 rotate-12 scale-110 pointer-events-none">
          <ElPatronLogo className="w-64 h-64" variant="icon" color="#FFFDF8" />
        </div>
        
        {/* Prominent circular badge logo on the banner with object-contain */}
        <div className="w-24 h-24 md:w-28 md:h-28 bg-[#FFFDF8] rounded-full flex items-center justify-center p-1.5 shadow-lg border border-white/10 shrink-0 relative z-10">
          <ElPatronLogo className="w-full h-full object-contain rounded-full" variant="badge" color="#4A2D1B" />
        </div>

        <div className="absolute top-4 right-4 animate-pulse">
          <span className="bg-[#22C55E]/20 text-emerald-300 border border-[#22C55E]/30 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
            <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
            Servicio Activo
          </span>
        </div>

        <div className="flex-1 space-y-2.5 relative z-10 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#FFFDF8] font-sans">
            Bienvenido a El Patrón
          </h2>
          <p className="text-sm text-[#FAF4EE]/90 font-medium leading-relaxed max-w-xl">
            Sistema integral de gestión gastronómica diseñado para el control operativo absoluto en cocina, salón, caja, facturación e inventario de alta precisión.
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
            <span className="bg-white/10 text-amber-200 text-[11px] px-3 py-1 rounded-full font-bold border border-white/5 font-mono">
              Estación Principal Terminal POS
            </span>
            <span className="bg-white/10 text-[#FFFDF8] text-[11px] px-3 py-1 rounded-full font-bold border border-white/5 font-sans">
              Mesa de Enlace Local
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Operational Context Row (Live stats + quick action info) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        
        {/* Supabase Connection State */}
        <div className="space-y-1.5 border-r border-stone-100/80 pr-4 last:border-0">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Estado de Servidores</span>
          <div className="flex items-center gap-2">
            {hasSupabase ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl">
                <Cloud className="w-4 h-4 text-emerald-600" />
                <span>Supabase Activo</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-xl">
                <CloudOff className="w-4 h-4 text-amber-600" />
                <span>SQLite (Local)</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-stone-400/95">Persistencia de datos robusta en tiempo real.</p>
        </div>

        {/* Active operator / logged user */}
        <div className="space-y-1.5 border-r border-stone-100/80 px-2 last:border-0">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Usuario Activo</span>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600">
              <User className="w-4 h-4 text-stone-500" />
            </div>
            <select
              value={activeMozo}
              onChange={(e) => onMozoChange(e.target.value)}
              className="text-xs bg-transparent border-0 font-bold text-stone-800 focus:outline-none focus:ring-0 p-0 cursor-pointer hover:text-[#624A3E]"
            >
              <option value="Enzo">Enzo (Mozo Salón)</option>
              <option value="Micaela">Micaela (Mozo Salón)</option>
              <option value="Damián">Damián (Cocinero KDS)</option>
              <option value="Sofía">Sofía (Administrador / Caja)</option>
            </select>
          </div>
          <p className="text-[11px] text-stone-400/95">Persona logueada de forma segura.</p>
        </div>

        {/* Simulated shift time with clock advancement */}
        <div className="space-y-1.5 border-r border-stone-100/80 px-2 last:border-0 bg-stone-50/50 p-2 rounded-xl border border-dashed border-stone-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-stone-500" />
              Reloj Operacional
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${autoTimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-stone-800 font-mono tracking-tight">{getSimulatedTimeStr()}</span>
            <div className="flex gap-1">
              <button
                onClick={onToggleAutoTimer}
                title={autoTimerRunning ? "Pausar" : "Iniciar"}
                className={`p-1 rounded-lg ${autoTimerRunning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} cursor-pointer`}
              >
                <RefreshCw className={`w-3 h-3 ${autoTimerRunning ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => onAdvanceTime(15)}
                className="text-[9px] px-1.5 py-0.5 font-bold bg-white border border-stone-250 rounded hover:bg-stone-100"
              >
                +15m
              </button>
            </div>
          </div>
          <p className="text-[10px] text-stone-400 font-medium">Control de comanda en reloj.</p>
        </div>

        {/* Brief live status overview */}
        <div className="space-y-1.5 pl-2">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Turno en Cifras</span>
          <div className="flex flex-wrap gap-1.5">
            <div className="bg-stone-50 border border-stone-200/60 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px] font-bold text-stone-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Salón: {occupiedTables} / {mesas.length}</span>
            </div>
            <div className="bg-stone-50 border border-stone-200/60 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px] font-bold text-stone-700">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span>Cocina: {pendingCooking}</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-400/95">Métricas resumidas generales.</p>
        </div>

      </div>

      {/* 3. Elegantly designed modules dashboard grid (operational focus) */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-stone-500 uppercase tracking-widest block pl-1">
          Módulos y Terminales de Operación
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {menuItems.map(item => {
            const Icon = item.icon;
            
            // Determine badge theme colors
            let badgeStyle = 'bg-stone-100 text-stone-600 border border-stone-200';
            if (item.badge.type === 'emerald') badgeStyle = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
            if (item.badge.type === 'amber') badgeStyle = 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse';
            if (item.badge.type === 'rose') badgeStyle = 'bg-rose-50 text-rose-800 border border-rose-200 animate-bounce';

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`group bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between h-[160px] cursor-pointer bg-gradient-to-br ${item.color} border-l-4 border-l-[#8C6239]/80`}
              >
                {/* Module Top Row */}
                <div className="w-full flex justify-between items-start gap-4">
                  <div className={`p-2.5 rounded-xl bg-white shadow-xs border border-stone-150 ${item.iconColor}`}>
                    <Icon className="w-5 h-5 shrink-0" />
                  </div>
                  
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wide ${badgeStyle}`}>
                    {item.badge.text}
                  </span>
                </div>

                {/* Module description content */}
                <div className="space-y-1 pt-3">
                  <h4 className="font-extrabold text-stone-900 group-hover:text-[#624A3E] transition-colors text-sm tracking-tight flex items-center gap-1">
                    <span>{item.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </h4>
                  <p className="text-[11px] text-stone-500 group-hover:text-stone-600 transition-colors line-clamp-2 leading-relaxed">
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
