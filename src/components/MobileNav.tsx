import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, User, Clock, LogOut } from 'lucide-react';
import { AppView, getAllowedViews } from '../lib/permissions';
import { Usuario } from '../types';
import ElPatronLogo from './ElPatronLogo';

interface MobileNavProps {
  activeView: AppView;
  allowedViews: AppView[];
  activeUser: Usuario;
  activeMozo: string;
  usuarios: Usuario[];
  autoTimerRunning: boolean;
  getSimulatedTimeStr: () => string;
  onNavigate: (view: AppView) => void;
  onMozoChange: (mozo: string) => void;
  onLogout: () => void;
  onToggleAutoTimer: () => void;
  onAdvanceTime: (mins: number) => void;
}

const NAV_ITEMS: { id: AppView; label: string; icon: string }[] = [
  { id: 'home', label: 'Inicio', icon: '🏠' },
  { id: 'panel', label: 'Panel', icon: '📊' },
  { id: 'mozo', label: 'Mozo', icon: '📱' },
  { id: 'cocina', label: 'Cocina', icon: '🍳' },
  { id: 'caja', label: 'Caja', icon: '💵' },
  { id: 'reportes', label: 'Reportes', icon: '📈' },
  { id: 'menu', label: 'Menú', icon: '📖' },
  { id: 'recetas', label: 'Recetas', icon: '⚖️' },
  { id: 'mesas', label: 'Mesas', icon: '🪑' },
  { id: 'inventario', label: 'Inventario', icon: '📦' },
  { id: 'proveedores', label: 'Proveedores', icon: '🚚' },
  { id: 'promociones', label: 'Promociones', icon: '🏷️' },
  { id: 'reservas', label: 'Reservas', icon: '📅' },
  { id: 'facturacion', label: 'Facturación', icon: '🧾' },
  { id: 'usuarios', label: 'Usuarios', icon: '👥' },
  { id: 'sistema', label: 'Sistema', icon: '💻' },
  { id: 'backups', label: 'Backups', icon: '🗄️' },
];

export default function MobileNav({
  activeView,
  allowedViews,
  activeUser,
  activeMozo,
  usuarios,
  autoTimerRunning,
  getSimulatedTimeStr,
  onNavigate,
  onMozoChange,
  onLogout,
  onToggleAutoTimer,
  onAdvanceTime
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const isAdmin = activeUser.rol === 'administrador' || activeUser.rol === 'superadmin';
  const visibleItems = NAV_ITEMS.filter(item => allowedViews.includes(item.id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    setOpen(false);
  };

  return (
    <>
      {/* ── Mobile / Tablet header (lg:hidden) ─────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#4A2D1B] border-b border-[#B07A48]/30 shadow-md flex items-center justify-between px-3 safe-area-top">
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#FFFDF8] transition-colors cursor-pointer shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center px-2">
          <div className="w-7 h-7 bg-[#FFFDF8] rounded-lg flex items-center justify-center p-0.5 border border-[#B07A48]/30 overflow-hidden shrink-0">
            <ElPatronLogo className="w-full h-full object-contain rounded" variant="icon" color="#4A2D1B" />
          </div>
          <div className="min-w-0 text-center">
            <span className="font-extrabold text-sm text-[#FFFDF8] tracking-tight block leading-tight font-serif-vintage italic">El Patrón</span>
            <span className="text-[7px] uppercase font-bold text-[#FAF4EE]/70 tracking-widest block leading-tight">Gestión Gastro</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-[9px] font-bold text-[#FAF4EE]/70 uppercase tracking-wider">Reloj</span>
            <span className="text-xs font-black text-[#FFFDF8] font-mono leading-none">{getSimulatedTimeStr()}</span>
          </div>
          <button
            onClick={onToggleAutoTimer}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${autoTimerRunning ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}
            aria-label="Toggle timer"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Mobile drawer (full overlay) ───────────────────────────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setOpen(false)} />
          <div
            ref={drawerRef}
            className="absolute top-0 left-0 bottom-0 w-[min(82vw,320px)] bg-[#FAF6F0] shadow-2xl flex flex-col border-r border-[#624A3E]/15"
          >
            {/* Drawer header */}
            <div className="p-3 border-b border-[#624A3E]/15 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center p-0.5 border border-[#624A3E]/15 overflow-hidden shrink-0">
                  <ElPatronLogo className="w-full h-full object-contain rounded" variant="icon" color="#4A2D1B" />
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-sm text-[#4A2D1B] font-serif-vintage italic block leading-tight">El Patrón</span>
                  <span className="text-[7px] uppercase font-bold text-[#624A3E]/70 tracking-widest block leading-tight">Gestión Gastro</span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl bg-[#624A3E]/10 hover:bg-[#624A3E]/20 flex items-center justify-center text-[#624A3E] cursor-pointer"
                aria-label="Cerrar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reloj y simulación */}
            <div className="mx-3 mt-3 p-3 bg-[#624A3E]/5 border border-[#624A3E]/10 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] uppercase font-bold text-[#624A3E]/60 tracking-wider font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#624A3E]" /> Reloj
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${autoTimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              </div>
              <div className="flex items-center justify-between">
                <strong className="text-sm font-black text-[#624A3E] font-mono tracking-tight">{getSimulatedTimeStr()}</strong>
                <div className="flex items-center gap-1">
                  <button onClick={onToggleAutoTimer} className={`p-1.5 rounded-lg cursor-pointer ${autoTimerRunning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onAdvanceTime(15)} className="px-2 py-1 rounded-lg bg-[#624A3E]/10 text-[#624A3E]/70 text-[9px] font-bold cursor-pointer">+15m</button>
                </div>
              </div>
            </div>

            {/* User selector */}
            <div className="mx-3 mt-2 p-3 bg-[#624A3E]/5 border border-[#624A3E]/10 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white border border-[#624A3E]/15 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-[#624A3E]/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[7px] text-[#624A3E]/55 block font-bold uppercase tracking-wider">Usuario</span>
                  {isAdmin ? (
                    <select
                      value={activeMozo}
                      onChange={(e) => onMozoChange(e.target.value)}
                      className="text-[11px] bg-transparent border-none p-0 focus:outline-none font-extrabold text-[#4A2D1B] cursor-pointer w-full mt-0.5 focus:ring-0"
                    >
                      {usuarios.filter(u => u.activo !== false).map(u => (
                        <option key={u.id_usuario || u.nombre} value={u.nombre} className="bg-[#FAF6F0] text-[#4A2D1B]">{u.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[11px] font-extrabold text-[#4A2D1B] mt-0.5 block">{activeUser.nombre}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {visibleItems.map(item => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98] cursor-pointer ${isActive ? 'bg-[#624A3E] text-white shadow-sm font-bold' : 'text-[#624A3E]/70 hover:text-[#4A2D1B] hover:bg-[#624A3E]/10'}`}
                  >
                    <span className="text-base shrink-0 leading-none">{item.icon}</span>
                    <span className="text-[13px] font-bold tracking-wide leading-none">{item.label}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm shadow-amber-400/50 shrink-0" />}
                  </button>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-[#624A3E]/15">
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer text-[#7B2D12] hover:bg-[#7B2D12]/10 border border-transparent hover:border-[#7B2D12]/20"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="text-[13px] font-bold tracking-wide leading-none">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
