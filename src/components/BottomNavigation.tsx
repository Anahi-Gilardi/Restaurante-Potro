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
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 safe-area-bottom shadow-lg">
      <div className="flex justify-around items-center w-full h-16">
        {visible.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="touch-target flex-col gap-0.5 flex-1 py-1 transition-colors cursor-pointer"
              style={{ minHeight: 48 }}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#624A3E]' : 'text-stone-400'}`} />
              <span className={`text-[9px] font-bold uppercase ${isActive ? 'text-[#624A3E]' : 'text-stone-400'}`}>
                {item.label}
              </span>
              {isActive && <div className="w-4 h-0.5 bg-[#624A3E] rounded-full mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
