import React, { useState } from 'react';
import { 
  Loader2,
  ArrowRight,
  User,
  Lock,
  AlertCircle
} from 'lucide-react';
import ElPatronLogo from './ElPatronLogo';
import { Usuario } from '../types';
import { INITIAL_USUARIOS } from '../data/initialData';

interface PythonStreamlitLoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

export default function PythonStreamlitLogin({ onLoginSuccess }: PythonStreamlitLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Ingresá usuario y contraseña');
      return;
    }

    const user = INITIAL_USUARIOS.find(
      u => u.username === username.trim().toLowerCase() && u.password === password
    );

    if (!user) {
      setError('Usuario o contraseña incorrectos');
      return;
    }

    if (user.activo === false) {
      setError('Este usuario está desactivado');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      onLoginSuccess(user);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
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
          <div className="space-y-4 pt-2" onKeyDown={handleKeyDown}>
            <div className="space-y-1">
              <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ingresá tu usuario"
                  className="w-full py-3 pl-10 pr-4 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A2D1B]/20 focus:border-[#4A2D1B] transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresá tu contraseña"
                  className="w-full py-3 pl-10 pr-4 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A2D1B]/20 focus:border-[#4A2D1B] transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 py-2 px-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
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
