import React, { useState } from 'react';
import { 
  Loader2,
  ArrowRight
} from 'lucide-react';
import ElPatronLogo from './ElPatronLogo';

interface PythonStreamlitLoginProps {
  onLoginSuccess: () => void;
}

export default function PythonStreamlitLogin({ onLoginSuccess }: PythonStreamlitLoginProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleEnter = () => {
    setIsLoggingIn(true);
    setTimeout(() => {
      onLoginSuccess();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#F5F1E9] text-stone-850 font-sans flex items-center justify-center p-4 relative overflow-hidden" id="pos-login-container">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6B4A35]/5 blur-3xl" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#4A2D1B]/5 blur-3xl" />

      <div className="max-w-md w-full bg-[#FFFDF8] rounded-3xl border border-stone-150 shadow-xl shadow-stone-200/40 p-8 md:p-10 space-y-8 relative z-10">
        
        <div className="text-center space-y-4 flex flex-col items-center">
          <ElPatronLogo className="w-36 h-36 drop-shadow-md" variant="badge" />
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[#4A2D1B] tracking-tight">El Patrón Pro</h1>
            <p className="text-[10px] uppercase font-bold text-[#6B4A35] tracking-widest">
              Sistema Gestor Gastronómico
            </p>
          </div>
          <p className="text-xs text-stone-500 font-medium max-w-[280px]">
            Control operativo de cocina, salón, caja e inventario.
          </p>
        </div>

        {isLoggingIn ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-fadeIn">
            <Loader2 className="w-10 h-10 text-[#4A2D1B] animate-spin" />
            <div className="text-center">
              <h3 className="font-bold text-stone-800 text-sm">Iniciando sesión...</h3>
              <p className="text-[11px] text-stone-400">Preparando el sistema</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <button
              onClick={handleEnter}
              className="w-full py-4 px-4 bg-[#4A2D1B] hover:bg-[#6B4A35] text-white font-extrabold rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#4A2D1B]/10"
            >
              <span>Acceder al Programa</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-stone-400/80">
        El Patrón Gastronomía Premium S.A. • Terminal POS Autorizada
      </div>
    </div>
  );
}
