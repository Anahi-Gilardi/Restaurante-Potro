import React, { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import ElPatronLogo from './ElPatronLogo';
import { Usuario } from '../types';
import { INITIAL_USUARIOS } from '../data/initialData';
import { canLogin, getLoginErrorMessage } from '../lib/loginAuth';
import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { signInWithUsername } from '../services/usernameAuthService';
import { sheetFetchTable, preloadGoogleSheetsCache } from '../lib/googleSheetsClient';
import { cacheUsuario } from '../services/usuariosService';
import {
  findDemoLoginUser,
  getConfiguredDemoCredentials,
  isDemoLoginEnabled,
} from '../lib/demoLogin';
interface PythonStreamlitLoginProps {
  onLoginSuccess: (user: Usuario, mode: 'demo' | 'supabase') => void;
  onBackToCover?: () => void;
}

const getRuntimeEnv = (): Record<string, unknown> => (
  ((import.meta as { env?: Record<string, unknown> }).env) ?? {}
);

const getDemoUsers = (): Usuario[] => {
  const configuredCredentials = getConfiguredDemoCredentials(getRuntimeEnv());
  if (!configuredCredentials) return INITIAL_USUARIOS;

  return [
    {
      ...INITIAL_USUARIOS[0],
      nombre: 'Demo',
      apellido: 'Admin',
      username: configuredCredentials.username,
      password: configuredCredentials.password,
    },
  ];
};

export default function PythonStreamlitLogin({ onLoginSuccess, onBackToCover }: PythonStreamlitLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const loginInFlightRef = useRef(false);

  useEffect(() => {
    preloadGoogleSheetsCache();
    sheetFetchTable('usuarios').catch(() => undefined);
  }, []);

  const completeLogin = async (user: Usuario, mode: 'demo' | 'supabase') => {
    await new Promise(resolve => setTimeout(resolve, 80));
    onLoginSuccess(user, mode);
  };

  const handleLogin = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (loginInFlightRef.current) return;

    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Ingresá usuario y contraseña.');
      return;
    }

    loginInFlightRef.current = true;
    setIsLoggingIn(true);

    try {
      const demoEnabled = isDemoLoginEnabled(getRuntimeEnv());

      // 1. Verificación prioritaria contra la tabla 'usuarios' de Google Sheets (flexible y tolerante)
      try {
        const normalizeText = (val: unknown): string => (
          String(val ?? '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
        );

        const matchesSheetUser = (u: any, inputRaw: string): boolean => {
          const normInput = normalizeText(inputRaw);
          const inputNoSpaces = normInput.replace(/\s+/g, '');
          if (!normInput) return false;

          const candidates: (string | undefined | null)[] = [
            u.username,
            u.usuario,
            u.user,
            u.nombre_usuario,
            u.nombre,
            u.mail,
            u.email,
            u.correo,
            u.nombre && u.apellido ? `${u.nombre} ${u.apellido}` : null,
            u.nombre && u.apellido ? `${u.apellido} ${u.nombre}` : null,
          ];

          return candidates.some(c => {
            if (!c) return false;
            const norm = normalizeText(c);
            return norm === normInput || norm.replace(/\s+/g, '') === inputNoSpaces;
          });
        };

        const matchesSheetPassword = (u: any, passRaw: string): boolean => {
          const cleanPass = passRaw.trim();
          if (!cleanPass) return false;

          const candidates = [
            u.password,
            u.pin,
            u.password_hash,
            u.clave,
            u.contraseña,
            u.contrasena,
            u.pass,
          ].filter(val => val !== undefined && val !== null && String(val).trim() !== '');

          if (candidates.length > 0) {
            return candidates.some(c => {
              const cStr = String(c).trim();
              return cStr === cleanPass || cStr.toLowerCase() === cleanPass.toLowerCase();
            });
          }

          // Si la fila del Sheet no tiene clave configurada, permitir accesos estándar
          return cleanPass === '1234' || cleanPass === '1999' || cleanPass === 'admin';
        };

        const supabase = tryGetActiveSupabaseClient();
        let dbUsers: any[] = [];
        if (supabase) {
          try {
            const { data: supaData } = await supabase
              .from('usuarios')
              .select('id_usuario,nombre,apellido,username,rol,activo,auth_user_id,mail,password,pin');
            if (Array.isArray(supaData) && supaData.length > 0) {
              dbUsers = supaData;
            }
          } catch {}
        }

        let userMatch = dbUsers.length > 0
          ? dbUsers.find(u => matchesSheetUser(u, email))
          : null;

        // Si no está en Supabase, buscar en Google Sheets como fallback
        if (!userMatch) {
          try {
            let sheetUsers = await sheetFetchTable('usuarios');
            userMatch = Array.isArray(sheetUsers) ? sheetUsers.find(u => matchesSheetUser(u, email)) : null;
            if (!userMatch) {
              const freshUsers = await sheetFetchTable('usuarios', true);
              if (Array.isArray(freshUsers) && freshUsers.length > 0) {
                userMatch = freshUsers.find(u => matchesSheetUser(u, email));
              }
            }
          } catch {}
        }

        if (userMatch) {
          // Verificar si el usuario está inactivo
          const rawActivo = userMatch.activo;
          const isInactive = rawActivo === false 
            || String(rawActivo).trim().toLowerCase() === 'false'
            || String(rawActivo).trim().toLowerCase() === 'no'
            || String(rawActivo).trim() === '0'
            || String(rawActivo).trim().toLowerCase() === 'inactivo';

          if (isInactive) {
            setError('Este usuario está desactivado en Google Sheets.');
            return;
          }

          // Verificar contraseña
          const passOk = matchesSheetPassword(userMatch, password);
          if (!passOk) {
            setError(`Contraseña incorrecta para el usuario ${userMatch.nombre || userMatch.username || 'ingresado'}.`);
            return;
          }

          // Normalizar rol
          const rawRol = String(userMatch.rol || userMatch.cargo || 'mozo').trim().toLowerCase();
          let rol: Usuario['rol'] = 'mozo';
          if (rawRol.includes('super')) rol = 'superadmin';
          else if (rawRol.includes('admin') || rawRol.includes('gerente')) rol = 'administrador';
          else if (rawRol.includes('cocin') || rawRol.includes('chef')) rol = 'cocina';
          else if (rawRol.includes('caj')) rol = 'cajero';

          const loggedUser: Usuario = {
            id_usuario: Number(userMatch.id_usuario) || Math.floor(Date.now() / 1000),
            nombre: String(userMatch.nombre || userMatch.username || userMatch.usuario || 'Usuario').trim(),
            apellido: String(userMatch.apellido || '').trim(),
            username: String(userMatch.username || userMatch.usuario || userMatch.user || userMatch.nombre || email).trim().toLowerCase(),
            password: String(userMatch.password || password.trim()),
            rol,
            activo: true,
            pin: userMatch.pin ? String(userMatch.pin).trim() : undefined,
            mail: userMatch.mail ? String(userMatch.mail).trim() : (userMatch.email ? String(userMatch.email).trim() : undefined),
          };

          cacheUsuario(loggedUser);
          await completeLogin(loggedUser, 'supabase');
          return;
        }
      } catch (sheetAuthErr) {
        console.warn('Verificación Google Sheets:', sheetAuthErr);
      }

      // 2. Verificación contra Supabase Auth (si está configurado)
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        const identifier = email.trim().toLowerCase();
        let authenticatedUser;

        const authTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con el servidor.')), 6000)
        );

        const authAction = (async () => {
          if (identifier.includes('@')) {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email: identifier,
              password,
            });
            if (authError) throw authError;
            return authData.user;
          }
          return signInWithUsername(supabase, identifier, password);
        })();

        try {
          authenticatedUser = await Promise.race([authAction, authTimeout]);
        } catch {
          // Si falla Supabase, permitimos continuar a verificación demo
        }

        if (authenticatedUser) {
          const safeEmail = (authenticatedUser.email || identifier).trim().toLowerCase().replace(/[(),]/g, '');
          const { data: profile, error: profileError } = await supabase
            .from('usuarios')
            .select('id_usuario,nombre,apellido,username,rol,activo,auth_user_id,mail')
            .or(`auth_user_id.eq.${authenticatedUser.id},username.eq.${safeEmail},mail.eq.${safeEmail}`)
            .limit(1)
            .single();

          if (profileError) throw profileError;

          if (!profile) {
            setError('Tu cuenta no tiene un perfil operativo asignado.');
            return;
          }

          const safeProfile = { ...profile, password: '' } as Usuario;
          if (!canLogin(safeProfile)) {
            setError('Este usuario está desactivado.');
            return;
          }

          await completeLogin(safeProfile, 'supabase');
          return;
        }
      }

      // 3. Verificación de usuario Demo (modo demostración aislado)
      const demoUser = findDemoLoginUser(getDemoUsers(), email, password, demoEnabled);
      if (demoUser) {
        if (!canLogin(demoUser)) {
          setError('Este usuario está desactivado.');
          return;
        }
        await completeLogin(demoUser, 'demo');
        return;
      }

      setError(demoEnabled ? 'Usuario o contraseña incorrectos.' : 'Usuario no encontrado en Google Sheets ni en el sistema.');
    } catch (err: unknown) {
      setError(getLoginErrorMessage(err));
    } finally {
      loginInFlightRef.current = false;
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E9] text-stone-850 font-sans flex items-center justify-center p-4 relative overflow-hidden" id="pos-login-container">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#B97F47]/5 blur-3xl" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#8C6239]/5 blur-3xl" />

      <div className="max-w-md w-full bg-[#FFFDF8] rounded-3xl border border-stone-150 shadow-xl shadow-stone-200/40 p-6 sm:p-8 md:p-10 space-y-8 relative z-10">
        {onBackToCover && (
          <button
            onClick={onBackToCover}
            className="absolute top-5 left-5 flex items-center gap-1 text-[10px] font-extrabold text-stone-500 hover:text-[#9B2226] uppercase tracking-wider transition-all cursor-pointer bg-stone-50 hover:bg-stone-100 border border-stone-200/60 py-1.5 px-3 rounded-full shadow-xs font-display-serif"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </button>
        )}
        <div className="text-center space-y-4 flex flex-col items-center">
          <ElPatronLogo className="w-32 h-32 sm:w-36 sm:h-36 drop-shadow-md" variant="badge" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#8C6239] tracking-wide font-serif-rustic">El Patrón Pro</h1>
            <p className="text-[10px] uppercase font-bold text-[#9B2226] tracking-widest font-display-serif">
              Sistema Gestor Gastronómico
            </p>
          </div>
          <p className="text-xs text-stone-600 font-serif-rustic italic max-w-[280px]">
            Control operativo de cocina, salón, caja e inventario.
          </p>
        </div>

        {isLoggingIn ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-fadeIn" aria-live="polite">
            <Loader2 className="w-10 h-10 text-[#8C6239] animate-spin" />
            <div className="text-center">
              <h3 className="font-bold text-stone-800 text-sm">Iniciando sesión...</h3>
              <p className="text-[11px] text-stone-400">Preparando el sistema</p>
            </div>
          </div>
        ) : (
          <form className="space-y-4 pt-2" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label htmlFor="login-identifier" className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">
                Usuario o email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ingresá tu usuario o email"
                  className="w-full py-3 pl-10 pr-4 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8C6239]/20 focus:border-[#8C6239] transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="login-password" className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresá tu contraseña"
                  className="w-full py-3 pl-10 pr-10 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8C6239]/20 focus:border-[#8C6239] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 py-2 px-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 px-4 bg-[#8C6239] hover:bg-[#B97F47] disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] text-stone-950 font-extrabold rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#8C6239]/10"
            >
              <span>Iniciar sesión</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <div className="pt-2 text-center space-y-3">
              {onBackToCover && (
                <button
                  type="button"
                  onClick={onBackToCover}
                  className="text-xs font-bold text-[#8C6239] hover:text-[#9B2226] hover:underline transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto font-display-serif"
                >
                  ← Volver al Menú Publicitario
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-stone-400/80">
        El Patrón • Terminal POS autorizada
      </div>
    </div>
  );
}
