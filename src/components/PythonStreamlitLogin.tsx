import React, { useState } from 'react';
import { 
  KeyRound, 
  Lock, 
  User, 
  Loader2,
  Database,
  ArrowRight
} from 'lucide-react';
import ElPatronLogo from './ElPatronLogo';

interface PythonStreamlitLoginProps {
  onLoginSuccess: () => void;
}

export default function PythonStreamlitLogin({ onLoginSuccess }: PythonStreamlitLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const executeLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (username.toLowerCase() === 'sistema' && password === 'restaurante') {
      setError(null);
      setIsLoggingIn(true);
      setTimeout(() => {
        onLoginSuccess();
      }, 700);
    } else {
      setError('Credenciales de acceso inválidas. Compruebe los datos e intente nuevamente.');
    }
  };

  const handleBypass = () => {
    setUsername('sistema');
    setPassword('restaurante');
    setError(null);
    setIsLoggingIn(true);
    setTimeout(() => {
      onLoginSuccess();
    }, 500);
  };
  return (
    <div className="min-h-screen bg-[#F5F1E9] text-stone-850 font-sans flex items-center justify-center p-4 relative overflow-hidden" id="pos-login-container">
      {/* Abstract warm luxury decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6B4A35]/5 blur-3xl" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#4A2D1B]/5 blur-3xl" />

      {/* Main Luxury Container */}
      <div className="max-w-md w-full bg-[#FFFDF8] rounded-3xl border border-stone-150 shadow-xl shadow-stone-200/40 p-8 md:p-10 space-y-8 relative z-10">
        
        {/* Brand Identity / Logo Header */}
        <div className="text-center space-y-4 flex flex-col items-center">
          <ElPatronLogo className="w-36 h-36 drop-shadow-md" variant="badge" />
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[#4A2D1B] tracking-tight">El Patrón Pro</h1>
            <p className="text-[10px] uppercase font-bold text-[#6B4A35] tracking-widest">
              Sistema Gestor Gastronómico
            </p>
          </div>
          <p className="text-xs text-stone-500 font-medium max-w-[280px]">
            Módulo de seguridad para el control operativo de cocina, salón, caja e inventario.
          </p>
        </div>

        {isLoggingIn ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-fadeIn">
            <Loader2 className="w-10 h-10 text-[#4A2D1B] animate-spin" />
            <div className="text-center">
              <h3 className="font-bold text-stone-800 text-sm">Autenticando credenciales...</h3>
              <p className="text-[11px] text-stone-400">Verificando seguridad del enlace local y Supabase</p>
            </div>
          </div>
        ) : (
          <form onSubmit={executeLogin} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
                <div className="text-xs leading-normal font-sans">
                  <p className="font-extrabold text-rose-800">Error de Acceso</p>
                  <p className="text-rose-700/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Input fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                  Usuario de Turno
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej. sistema"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-200 focus:border-[#4A2D1B] focus:ring-1 focus:ring-[#4A2D1B] rounded-xl bg-stone-50/50 focus:outline-none transition-all placeholder:text-stone-300 font-sans font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                  Contraseña de Seguridad
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-200 focus:border-[#4A2D1B] focus:ring-1 focus:ring-[#4A2D1B] rounded-xl bg-stone-50/50 focus:outline-none transition-all placeholder:text-stone-300 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-[#4A2D1B] hover:bg-[#6B4A35] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#4A2D1B]/10"
              >
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleBypass}
                className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-[#6B4A35] hover:text-[#4A2D1B] font-extrabold rounded-xl text-[11px] uppercase tracking-wider transition-all border border-amber-200/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ingreso Rápido Demo</span>
              </button>
            </div>
          </form>
        )}

        {/* Guest / Demo Notice Banner */}
        <div className="border-t border-stone-150 pt-5 text-center space-y-2">
          <p className="text-[10px] text-stone-400 font-medium">
            Acceso administrativo de demostración autorizado:
          </p>
          <div className="inline-flex justify-center gap-4 bg-stone-50 border border-stone-155 px-3 py-1.5 rounded-xl font-mono text-[10px] text-stone-550">
            <span>Usuario: <strong className="text-[#4A2D1B]">sistema</strong></span>
            <span className="text-stone-300">|</span>
            <span>Clave: <strong className="text-[#4A2D1B]">restaurante</strong></span>
          </div>
        </div>

      </div>

      {/* Decorative POS Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-stone-400/80">
        El Patrón Gastronomía Premium S.A. • Terminal POS Autorizada
      </div>
    </div>
  );
}
