import React, { useState } from 'react';
import { useToast, ToastContainer } from './ToastContainer';
import { Sofa, MapPin, Grid, Layers, HelpCircle, Plus, Check } from 'lucide-react';
import { Mesa } from '../types';

interface MesasModuleProps {
  mesas: Mesa[];
  onSubmitPedido: any; // update table callback
  addLog: (tipo: any, mensaje: string) => void;
}

export default function MesasModule({ mesas, addLog }: MesasModuleProps) {
  const [localMesas, setLocalMesas] = useState<Mesa[]>(mesas);
  const [numeroMesa, setNumeroMesa] = useState('');
  const [sector, setSector] = useState<'salon' | 'terraza' | 'vip'>('salon');
  const { toast, toasts, removeToast } = useToast();

  const handleCreateMesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroMesa) return;

    const formattedName = sector === 'vip' 
      ? `VIP-${numeroMesa}` 
      : sector === 'terraza' 
        ? `Terraza-${numeroMesa}` 
        : `Mesa ${numeroMesa}`;

    // check if it exists
    if (localMesas.some(m => m.numero_mesa.toLowerCase() === formattedName.toLowerCase())) {
      toast.error('La mesa ya existe.');
      return;
    }

    const newMesa: Mesa = {
      id_mesa: Date.now() + Math.floor(Math.random() * 100),
      numero_mesa: formattedName,
      estado: 'libre'
    };

    setLocalMesas(prev => [...prev, newMesa]);
    addLog('sistema', `MESAS: Creada nueva mesa física '${formattedName}' en el sector ${sector.toUpperCase()}`);
    setNumeroMesa('');
  };

  const handleToggleEstadoMesa = (id: number) => {
    setLocalMesas(prev => prev.map(m => {
      if (m.id_mesa === id) {
        const nextEstado = m.estado === 'libre' ? 'ocupada' : 'libre';
        addLog('sistema', `MESAS: Cambiado estado de '${m.numero_mesa}' a ${nextEstado.toUpperCase()}`);
        return {
          ...m,
          estado: nextEstado,
          comensales: nextEstado === 'ocupada' ? 2 : undefined
        };
      }
      return m;
    }));
  };

  const freeCount = localMesas.filter(m => m.estado === 'libre').length;
  const occupiedCount = localMesas.filter(m => m.estado === 'ocupada').length;

  return (
    <div className="space-y-6">
      
      {/* Overview ratios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total de Mesas</span>
          <h4 className="text-2xl font-black text-stone-950 font-mono mt-1">{localMesas.length} mesas</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Mesas Disponibles</span>
          <h4 className="text-2xl font-black text-emerald-600 font-mono mt-1">{freeCount} libres</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-[#624A3E]/5 border-l-4 border-l-[#624A3E]">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Uso del Salón</span>
          <h4 className="text-2xl font-black text-amber-700 font-mono mt-1">
            {((occupiedCount / localMesas.length) * 100).toFixed(0)}% <span className="text-xs text-stone-400 font-normal">Ocupación</span>
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left pane form: Add Mesa */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 h-fit">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Ampliar Salón (Nueva Mesa)
          </h3>
          <form onSubmit={handleCreateMesa} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Número / Código de Identificación</label>
              <input 
                type="text" 
                value={numeroMesa} 
                onChange={e => setNumeroMesa(e.target.value)}
                placeholder="Ej. 14, B-3, terraza-6"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Sector / Área Geográfica</label>
              <select 
                value={sector} 
                onChange={e => setSector(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer text-stone-700 font-semibold"
              >
                <option value="salon">Muro Central / Salón Comedor</option>
                <option value="terraza">Terraza al Aire Libre</option>
                <option value="vip">Sector Reservado VIP</option>
              </select>
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
            >
              Habilitar Mesa en Plano
            </button>
          </form>
        </div>

        {/* Right pane: Interactive Layout */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Grid className="w-5 h-5 text-[#624A3E]" />
              Esquema de Distribución y Mesas Activas
            </h3>
            <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full">Clic para Ocupar / Liberar</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
            {localMesas.map(m => {
              const isOccupied = m.estado === 'ocupada';
              let colorClasses = 'border-stone-200 bg-stone-50 text-stone-800 hover:border-amber-900/30';
              if (isOccupied) {
                colorClasses = 'border-amber-700 bg-[#624A3E]/10 text-amber-950 font-black shadow-sm';
              } else if (m.estado === 'esperando_cuenta') {
                colorClasses = 'border-emerald-500 bg-emerald-50 text-emerald-950 animate-pulse';
              }

              return (
                <button
                  key={m.id_mesa}
                  onClick={() => handleToggleEstadoMesa(m.id_mesa)}
                  className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between h-28 ${colorClasses}`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[8px] uppercase tracking-wide opacity-75 font-semibold">
                      {m.numero_mesa.includes('VIP') ? 'VIP' : m.numero_mesa.includes('Terraza') ? 'Terraza' : 'Salón'}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-[#624A3E]' : 'bg-emerald-500'}`} />
                  </div>

                  <div className="py-2">
                    <Sofa className="w-5 h-5 mx-auto mb-1 opacity-70" />
                    <strong className="text-xs font-black block tracking-tight">{m.numero_mesa}</strong>
                  </div>

                  <div className="text-[9px] uppercase font-bold opacity-80 pt-1 border-t border-stone-200/40 w-full">
                    {isOccupied ? `Ocupada (${m.comensales || 2} pax)` : 'Disponible'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
