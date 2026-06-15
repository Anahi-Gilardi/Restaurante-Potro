import React, { useState } from 'react';
import { 
  Loader2,
  ArrowRight,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import ElPatronLogo from './ElPatronLogo';
import { Usuario } from '../types';
import { getSupabaseClient } from '../supabase';

interface PythonStreamlitLoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

interface LoginUser {
  id_usuario: number;
  nombre: string;
  apellido: string;
  username: string;
  password: string;
  rol: Usuario['rol'];
  activo?: boolean;
}

const LOCAL_USERS: LoginUser[] = [
  { id_usuario: 1, nombre: 'Super Admin', apellido: '', username: 'super@admi.com', password: 'superadmi2026/', rol: 'superadmin' },
  { id_usuario: 2, nombre: 'Administrador', apellido: '', username: 'admi@patron.com', password: 'Elpatron2026/', rol: 'administrador' },
  { id_usuario: 3, nombre: 'Mozo', apellido: '', username: 'mozo@patron.com', password: 'Elpatronmozo2026/', rol: 'mozo' },
  { id_usuario: 4, nombre: 'Enzo', apellido: 'Fernández', username: 'enzo', password: '1234', rol: 'mozo' },
  { id_usuario: 5, nombre: 'Micaela', apellido: 'Gómez', username: 'micaela', password: '1234', rol: 'mozo' },
  { id_usuario: 6, nombre: 'Damián', apellido: 'Martínez', username: 'damian', password: '1234', rol: 'cocina' },
  { id_usuario: 7, nombre: 'Sofía', apellido: 'Alegre', username: 'sofia', password: '1234', rol: 'administrador' },
  { id_usuario: 8, nombre: 'Nuevo', apellido: 'Usuario', username: 'nuevo', password: 'clave', rol: 'mozo' },
];

export default function PythonStreamlitLogin({ onLoginSuccess }: PythonStreamlitLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Ingresá email y contraseña');
      return;
    }

    setIsLoggingIn(true);

    try {
      const supabase = getSupabaseClient();

      if (supabase) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { data: profile } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id_usuario', authData.user.id)
            .single();

          if (profile) {
            onLoginSuccess(profile as Usuario);
            return;
          }
        }
      }

      const localUser = LOCAL_USERS.find(
        u => u.username === email.trim().toLowerCase() && u.password === password
      );

      if (!localUser) {
        setError('Email o contraseña incorrectos');
        setIsLoggingIn(false);
        return;
      }

      if (localUser.activo === false) {
        setError('Este usuario está desactivado');
        setIsLoggingIn(false);
        return;
      }

      setTimeout(() => {
        onLoginSuccess(localUser as Usuario);
      }, 500);

    } catch (err: any) {
      const localUser = LOCAL_USERS.find(
        u => u.username === email.trim().toLowerCase() && u.password === password
      );

      if (localUser) {
        if (localUser.activo === false) {
          setError('Este usuario está desactivado');
          setIsLoggingIn(false);
          return;
        }
        setTimeout(() => {
          onLoginSuccess(localUser as Usuario);
        }, 500);
        return;
      }

      setError(err?.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : 'Error de conexión. Verificá tus credenciales.');
      setIsLoggingIn(false);
    }
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
              <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ingresá tu email"
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresá tu contraseña"
                  className="w-full py-3 pl-10 pr-10 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A2D1B]/20 focus:border-[#4A2D1B] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
              <span>Iniciar Sesión</span>
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
