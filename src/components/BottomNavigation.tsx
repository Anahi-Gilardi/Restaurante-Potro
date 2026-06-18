import React from 'react';
import { Home, Smartphone, ChefHat, DollarSign, Receipt, Grid } from 'lucide-react';
import { AppView } from '../lib/permissions';

interface BottomNavigationProps {
  activeView: AppView;
  allowedViews: AppView[];
  onNavigate: (view: AppView) => void;
}

const NAV_ITEMS: { id: AppView; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'mozo', label: 'Mozo', icon: Smartphone },
  { id: 'cocina', label: 'Cocina', icon: ChefHat },
  { id: 'caja', label: 'Caja', icon: DollarSign },
  { id: 'facturacion', label: 'Factura', icon: Receipt },
  { id: 'panel', label: 'Panel', icon: Grid },
];

export default function BottomNavigation({ activeView, allowedViews, onNavigate }: BottomNavigationProps) {
  const visible = NAV_ITEMS.filter(item => allowedViews.includes(item.id));

  return (
    <nav className="mobile-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md bg-[#FAF6F0]/90 border-t border-[#B07A48]/30 safe-area-bottom shadow-lg transition-all duration-200">
      <div className="flex justify-around items-center w-full h-16">
        {visible.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="touch-target flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all duration-150 active:scale-95 cursor-pointer"
              style={{ minHeight: 48 }}
            >
              <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'text-[#624A3E] scale-110' : 'text-stone-400/80 hover:text-stone-600'}`} />
              <span className={`text-[9px] font-black uppercase tracking-wider transition-colors ${isActive ? 'text-[#624A3E]' : 'text-stone-400/80'}`}>
                {item.label}
              </span>
              {isActive && <div className="w-5 h-0.75 bg-[#624A3E] rounded-full mt-0.5 animate-fadeIn" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
