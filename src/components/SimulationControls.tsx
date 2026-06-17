import React from 'react';
import { 
  Play, 
  Pause, 
  Clock, 
  Plus, 
  Smartphone, 
  RefreshCw, 
  CheckCircle, 
  HelpCircle,
  TrendingUp,
  Activity,
  Award
} from 'lucide-react';

interface SimulationControlsProps {
  minutosGlobal: number;
  autoTimerRunning: boolean;
  onAdvanceTime: (mins: number) => void;
  onToggleAutoTimer: () => void;
  onInjectDeliveryOrder: (source: 'Rappi' | 'PedidosYa') => void;
  onResetAllData: () => void;
}

export default function SimulationControls({
  minutosGlobal,
  autoTimerRunning,
  onAdvanceTime,
  onToggleAutoTimer,
  onInjectDeliveryOrder,
  onResetAllData
}: SimulationControlsProps) {
  
  // Format simulated time based on an starting hour (e.g., 20:30)
  const getFormattedSimulatedTime = () => {
    const startHour = 20;
    const startMin = 30;
    const totalMins = startHour * 60 + startMin + minutosGlobal;
    const hour = Math.floor(totalMins / 60) % 24;
    const min = totalMins % 60;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} hs`;
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-lg flex flex-col md:flex-row gap-4 justify-between items-center" id="simulation-bar-container">
      
      {/* SIMULATED TIME AND TIMER STATUS */}
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3 border border-slate-750">
          <div className="relative">
            <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
            {autoTimerRunning && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 rounded-full w-2.5 h-2.5 animate-ping" />
            )}
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 font-sans tracking-widest block">Hora de Servicio</span>
            <span className="text-sm font-extrabold font-mono tracking-tight text-white block">
              {getFormattedSimulatedTime()}
            </span>
          </div>
        </div>

        <div>
          <h4 className="font-extrabold text-xs text-slate-200 font-sans flex items-center gap-1.5 leading-none">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Consola del Simulador Realtime
          </h4>
          <p className="text-[10px] text-slate-400 font-sans mt-1 leading-normal max-w-xs md:max-w-md">
            Pruebe el software gastronómico en acción acelerando el reloj, inyectando pedidos externos ó reseteando inventarios.
          </p>
        </div>
      </div>

      {/* TIMEPASS CONTROLS */}
      <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end items-center">
        
        {/* Advance clock btns */}
        <div className="flex bg-slate-800 p-1 border border-slate-750 rounded-xl">
          <button
            onClick={() => onAdvanceTime(1)}
            className="py-1.5 px-2.5 hover:bg-slate-700/80 hover:text-white text-slate-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
            title="Suma 1 Minutos"
          >
            +1 Min
          </button>
          <button
            onClick={() => onAdvanceTime(5)}
            className="py-1.5 px-2.5 hover:bg-slate-700/80 hover:text-white text-slate-300 rounded-lg text-[10px] font-bold transition-all"
            title="Suma 5 Minutos"
          >
            +5 Min
          </button>
          <button
            onClick={() => onAdvanceTime(10)}
            className="py-1.5 px-3 hover:bg-slate-700/80 hover:text-white text-slate-300 rounded-lg text-[10px] font-bold transition-all"
            title="Suma 10 Minutos"
          >
            +10 Min
          </button>
        </div>

        {/* Play Pause Auto Timer */}
        <button
          onClick={onToggleAutoTimer}
          className={`py-2 px-3.5 rounded-xl text-[10px] font-extrabold font-sans flex items-center gap-1.5 transition-all shadow-md ${
            autoTimerRunning 
              ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {autoTimerRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 text-white" />
              Pausar Reloj
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-white fill-white" />
              Reloj Automático
            </>
          )}
        </button>

        {/* API DELIVERY INTEGRATION SIMULATION */}
        <div className="flex bg-slate-800 p-1 border border-slate-750 rounded-xl">
          <button
            onClick={() => onInjectDeliveryOrder('Rappi')}
            className="py-1.5 px-2.5 hover:bg-slate-750 text-[#ff3c1a] rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1.5"
          >
            <Smartphone className="w-3 h-3 text-[#ff3c1a]" />
            Simular Rappi API
          </button>
          <button
            onClick={() => onInjectDeliveryOrder('PedidosYa')}
            className="py-1.5 px-2.5 hover:bg-slate-750 text-[#ff003c] rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1.5"
          >
            <Smartphone className="w-3 h-3 text-[#ff003c]" />
            Simular PedidosYa API
          </button>
        </div>

        {/* Global reset trigger */}
        <button
          onClick={onResetAllData}
          className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-750 transition-colors"
          title="Restablecer Datos del Ecosistema"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

      </div>

    </div>
  );
}
