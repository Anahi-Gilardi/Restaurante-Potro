import {
  Armchair,
  BadgeDollarSign,
  BookOpen,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  ChefHat,
  ChevronRight,
  ClipboardList,
  Clock3,
  DatabaseBackup,
  Home,
  LayoutDashboard,
  LogOut,
  Pause,
  Play,
  ReceiptText,
  Scale,
  Settings2,
  ShieldAlert,
  Tags,
  Truck,
  User,
  UsersRound,
  Wifi
} from 'lucide-react';
import { normalizeRole, type AppView } from '../lib/permissions';
import type { Usuario } from '../types';
import ElPatronLogo from './ElPatronLogo';

const SIDEBAR_NAV_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'panel', label: 'Panel general', icon: LayoutDashboard },
  { id: 'mozo', label: 'Mozo y salón', icon: ClipboardList },
  { id: 'cocina', label: 'Cocina', icon: ChefHat },
  { id: 'caja', label: 'Caja', icon: BadgeDollarSign },
  { id: 'reportes', label: 'Reportes y BI', icon: ChartNoAxesCombined },
  { id: 'usuarios', label: 'Usuarios', icon: UsersRound },
  { id: 'menu', label: 'Menú', icon: BookOpen },
  { id: 'recetas', label: 'Recetas', icon: Scale },
  { id: 'mesas', label: 'Mesas', icon: Armchair },
  { id: 'inventario', label: 'Inventario', icon: Boxes },
  { id: 'proveedores', label: 'Proveedores', icon: Truck },
  { id: 'promociones', label: 'Promociones', icon: Tags },
  { id: 'reservas', label: 'Reservas', icon: CalendarDays },
  { id: 'facturacion', label: 'Facturación', icon: ReceiptText },
  { id: 'sistema', label: 'Sistema', icon: Settings2 },
  { id: 'backups', label: 'Backups', icon: DatabaseBackup }
] as const;

interface AppSidebarProps {
  activeView: AppView;
  activeUser: Usuario;
  activeMozo: string;
  allowedViews: AppView[];
  autoTimerRunning: boolean;
  canManageOperators: boolean;
  permitirVentaSinStock: boolean;
  usuarios: Usuario[];
  getSimulatedTimeStr: () => string;
  onAdvanceTime: (minutes: number) => void;
  onLogout: () => void;
  onMozoChange: (mozo: string) => void;
  onNavigate: (view: AppView) => void;
  onStockRuleChange: (enabled: boolean) => void;
  onToggleAutoTimer: () => void;
}

export default function AppSidebar({
  activeView,
  activeUser,
  activeMozo,
  allowedViews,
  autoTimerRunning,
  canManageOperators,
  permitirVentaSinStock,
  usuarios,
  getSimulatedTimeStr,
  onAdvanceTime,
  onLogout,
  onMozoChange,
  onNavigate,
  onStockRuleChange,
  onToggleAutoTimer
}: AppSidebarProps) {
  const visibleNavigation = SIDEBAR_NAV_ITEMS.filter(item => allowedViews.includes(item.id as AppView));
  const activeRole = normalizeRole(activeUser.rol);

  return (
    <aside
      className="sidebar-surface relative w-full lg:w-[18.5rem] lg:h-screen lg:sticky lg:top-0 text-stone-100 flex flex-col border-b lg:border-b-0 lg:border-r border-[#6E4B32]/35 shrink-0 z-40 overflow-hidden"
      id="sidebar-left-panel"
    >
      <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[#C79052]/10 blur-3xl" />

      <div className="relative px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#F7EFE4] rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.28)] ring-1 ring-[#E6C99D]/35 p-1 overflow-hidden shrink-0">
            <ElPatronLogo className="w-10 h-10 object-contain rounded-full" variant="icon" color="#4A2D1B" />
          </div>
          <div className="min-w-0">
            <span className="font-display-serif font-bold text-[15px] text-[#FFF8ED] tracking-[0.04em] block">El Patrón</span>
            <span className="text-[8px] uppercase font-semibold text-[#D9BC91] tracking-[0.18em] block mt-1 leading-none">Gestión gastronómica</span>
          </div>
        </div>
        <span className="bg-white/[0.05] text-[#D9BC91] text-[8px] border border-white/[0.08] px-2 py-1 rounded-full font-bold font-mono shrink-0">
          PRO
        </span>
      </div>

      <div className="relative px-4 pt-4 space-y-3">
        <section className="rounded-2xl border border-white/[0.08] bg-black/20 p-3.5 shadow-[0_12px_35px_rgba(0,0,0,0.16)] backdrop-blur-sm" aria-label="Reloj del servicio">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[9px] uppercase font-bold text-[#C9B8A4] tracking-[0.16em] flex items-center gap-2">
              <Clock3 className="w-3.5 h-3.5 text-[#D6A45D]" />
              Hora de servicio
            </span>
            <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-stone-400">
              <span className={`h-1.5 w-1.5 rounded-full ${autoTimerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-[#D6A45D]'}`} />
              {autoTimerRunning ? 'En marcha' : 'Pausado'}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <strong className="text-[22px] leading-none font-black text-white font-mono tracking-[-0.04em]">{getSimulatedTimeStr()}</strong>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleAutoTimer}
                title={autoTimerRunning ? 'Pausar simulación automática' : 'Iniciar simulación en tiempo real'}
                className={`sidebar-icon-button ${autoTimerRunning
                  ? 'bg-[#D6A45D]/15 text-[#F2C982] border-[#D6A45D]/30 hover:bg-[#D6A45D]/25'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20 hover:bg-emerald-500/20'
                }`}
              >
                {autoTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
              <button
                type="button"
                onClick={() => onAdvanceTime(15)}
                title="Adelantar 15 minutos"
                className="h-8 px-2.5 rounded-lg bg-white/[0.06] text-stone-300 hover:text-white border border-white/[0.08] hover:bg-white/[0.1] text-[9px] font-black cursor-pointer transition-all focus-visible-ring"
              >
                +15 min
              </button>
            </div>
          </div>
        </section>

        {canManageOperators && (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5 cursor-pointer hover:bg-white/[0.065] transition-colors select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                permitirVentaSinStock ? 'bg-orange-500/15 text-orange-300' : 'bg-[#D6A45D]/10 text-[#D6A45D]'
              }`}>
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[8px] text-stone-500 font-bold uppercase tracking-[0.13em] block">Control de stock</span>
                <span className="text-[11px] font-semibold text-stone-200 truncate block">
                  {permitirVentaSinStock ? 'Venta sin stock activa' : 'Bloquear sin stock'}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={permitirVentaSinStock}
              onChange={(event) => onStockRuleChange(event.target.checked)}
              className="peer sr-only"
            />
            <span className="relative h-5 w-9 rounded-full bg-white/10 ring-1 ring-white/10 transition-colors peer-checked:bg-[#B87935] after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-stone-300 after:shadow-sm after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-white" />
          </label>
        )}

        <section className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5" aria-label="Usuario operativo">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C68A4A]/25 to-[#6D452B]/20 border border-[#D6A45D]/15 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[#E2B777]" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] text-stone-500 block font-bold leading-none uppercase tracking-[0.13em]">Usuario activo</span>
              <span className="text-[7px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/15 rounded-full px-1.5 py-0.5">
                {activeRole}
              </span>
            </div>
            {canManageOperators ? (
              <select
                value={activeMozo}
                onChange={(event) => onMozoChange(event.target.value)}
                aria-label="Cambiar usuario activo"
                className="text-[11px] bg-transparent border-none p-0 focus:outline-none font-bold text-white cursor-pointer w-full mt-1 focus:ring-0"
              >
                {usuarios.filter(usuario => usuario.activo !== false).map(usuario => (
                  <option key={usuario.id_usuario} value={usuario.nombre} className="bg-[#241A15] text-stone-200">
                    {usuario.nombre} ({usuario.rol})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] font-bold text-white mt-1 block truncate">
                {activeUser.nombre}
              </span>
            )}
          </div>
        </section>
      </div>

      <div className="sidebar-scroll relative flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[9px] font-black text-stone-500 tracking-[0.17em] uppercase">Navegación</span>
          <span className="text-[8px] text-stone-600 font-mono">{visibleNavigation.length} módulos</span>
        </div>

        <nav className="space-y-1" id="sidebar-navigation" aria-label="Navegación principal">
          {visibleNavigation.map(item => {
            const isActive = activeView === item.id;
            const ItemIcon = item.icon;

            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                type="button"
                onClick={() => onNavigate(item.id as AppView)}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative w-full min-h-10 px-3 py-2 flex items-center gap-3 text-left rounded-xl border transition-all cursor-pointer focus-visible-ring ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7A4D2E]/95 to-[#533522]/90 text-white border-[#C98D4C]/30 shadow-[0_8px_22px_rgba(0,0,0,0.2)]'
                    : 'bg-transparent text-stone-400 border-transparent hover:bg-white/[0.055] hover:text-stone-100 hover:border-white/[0.06]'
                }`}
              >
                {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[#F0C47D] shadow-[0_0_10px_rgba(240,196,125,0.55)]" />}
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive ? 'bg-white/10 text-[#FFD89A]' : 'bg-white/[0.035] text-stone-500 group-hover:text-[#D9BC91]'
                }`}>
                  <ItemIcon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.2 : 1.9} />
                </span>
                <span className={`flex-1 text-[11px] tracking-[0.01em] ${isActive ? 'font-bold' : 'font-semibold'}`}>
                  {item.label}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 transition-all ${
                  isActive ? 'text-[#F0C47D] opacity-100' : 'text-stone-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'
                }`} />
              </button>
            );
          })}
        </nav>
      </div>

      <div className="relative px-4 py-3 border-t border-white/[0.07] bg-black/15">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9px] text-stone-300 font-bold">
                <Wifi className="w-3 h-3 text-emerald-400" />
                Sistema sincronizado
              </div>
              <p className="text-[8px] text-stone-600 mt-0.5 truncate">SQLite + Supabase conectados</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión"
            className="sidebar-icon-button text-stone-500 hover:bg-red-500/10 hover:border-red-400/20 hover:text-red-300"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
