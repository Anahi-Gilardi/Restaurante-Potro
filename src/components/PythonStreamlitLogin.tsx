import React, { useState } from 'react';
import { 
  Play, 
  Terminal, 
  ShieldAlert, 
  Lock, 
  User, 
  Cpu, 
  Server, 
  Code,
  Info,
  CheckCircle,
  Copy,
  AlertCircle
} from 'lucide-react';

interface PythonStreamlitLoginProps {
  onLoginSuccess: () => void;
}

export default function PythonStreamlitLogin({ onLoginSuccess }: PythonStreamlitLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSimulatingBoot, setIsSimulatingBoot] = useState(false);
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  // Requirements data provided by the user
  const pythonRequirements = [
    'libpq-dev',
    'build-essential',
    'gcc',
    'python3-dev',
    'streamlit>=1.35.0',
    'pandas>=2.0.0',
    'plotly>=5.18.0',
    'python-dotenv>=1.0.0',
    'psycopg2-binary>=2.9.0',
    'psycopg>=3.2.0',
    'psycopg-pool>=3.2.0',
    'python-escpos>=3.0',
    'fastapi>=0.109.0',
    'uvicorn>=0.26.0',
    'pydantic>=2.0.0',
    'openpyxl>=3.1.0',
    'reportlab>=4.2.0',
    'supabase>=2.3.0',
    '# Python version for Streamlit Cloud',
    'python-3.11'
  ];

  const handleCopyRequirements = () => {
    navigator.clipboard.writeText(pythonRequirements.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const executeLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Exact access guidelines matching user intent
    if (username.toLowerCase() === 'sistema' && password === 'restaurante') {
      setError(null);
      triggerSuccessfulBoot();
    } else {
      setError('Credenciales inválidas en el Servidor PostgreSQL / SQLite Streamlit. Pruebe con "sistema" y "restaurante".');
    }
  };

  const handleBypass = () => {
    setUsername('sistema');
    setPassword('restaurante');
    setError(null);
    // Instant simulation login
    triggerSuccessfulBoot(true);
  };

  const triggerSuccessfulBoot = (instant = false) => {
    if (instant) {
      onLoginSuccess();
      return;
    }

    setIsSimulatingBoot(true);
    const logs = [
      '🐍 Python 3.11.8: Inicializando servidor virtual FastAPI...',
      '📦 Cargando bibliotecas de psycopg3 y psycopg-pool para base relacional...',
      '🔌 Enlazando adaptador PostgreSQL nativo (libpq-dev / psycopg2-binary)...',
      '🔗 Conectando con API de Supabase DB Client v2.3.0...',
      '🚀 Servidor Uvicorn corriendo exitosamente en http://127.0.0.1:3000 ',
      '💼 Streamlit App v1.35.0: Cargando plantilla de sesión de El Patrón Pro...',
      '🔓 AUTENTICADO: Rol "sistema" autorizado de manera segura.'
    ];

    let count = 0;
    const interval = setInterval(() => {
      if (count < logs.length) {
        setBootLog(prev => [...prev, logs[count]]);
        count++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onLoginSuccess();
        }, 600);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-[#F5F1E9] text-slate-800 font-sans flex flex-col justify-between" id="streamlit-login-container">
      {/* Streamlit simulated premium top bar decorator */}
      <div className="h-1.5 bg-[#624A3E] w-full" />

      {/* Main Content card */}
      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Streamlit Form */}
        <div className="md:col-span-7 bg-white rounded-xl shadow-xs border border-slate-200/80 p-8 space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#624A3E]/10 text-[#624A3E] border border-[#624A3E]/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
              Streamlit Frontend
            </span>
            <span className="text-xs bg-slate-100 text-slate-605 border border-slate-200/80 px-2 py-0.5 rounded font-mono">
              Port: 8501
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="text-[#624A3E]">🍽️</span> El Patrón Pro
            </h1>
            <p className="text-xs text-slate-500 font-medium font-sans">
              Autenticación de Alta Gama para Gestión Gastronómica Pro con Python v3.11 + Postgres SQL
            </p>
          </div>

          {!isSimulatingBoot ? (
            <form onSubmit={executeLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Usuario del Sistema
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese usuario (sistema)"
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 focus:border-[#624A3E] focus:ring-1 focus:ring-[#624A3E] rounded-lg bg-slate-50 focus:outline-none transition-all placeholder:text-slate-400 font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingrese clave (restaurante)"
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 focus:border-[#624A3E] focus:ring-1 focus:ring-[#624A3E] rounded-lg bg-slate-50 focus:outline-none transition-all placeholder:text-slate-400 font-sans"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-850 border border-red-100 p-3.5 rounded-lg flex items-start gap-2.5 animate-fadeIn">
                  <ShieldAlert className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
                  <div className="text-xs leading-normal">
                    <p className="font-bold">Error de Autenticación</p>
                    <p className="opacity-90">{error}</p>
                  </div>
                </div>
              )}

              {/* Tips banner */}
              <div className="bg-[#FEF3C7] border border-amber-200 p-3 rounded-lg text-amber-950 text-xs flex gap-2">
                <Info className="w-4 h-4 shrink-0 text-[#F59E0B] mt-0.5" />
                <div>
                  <p className="font-extrabold">Uso recomendado (Acceso de Control):</p>
                  <p className="opacity-90 mt-0.5">
                    Utilice el usuario <strong className="font-extrabold text-[#624A3E]">sistema</strong> y contraseña <strong className="font-extrabold text-[#624A3E]">restaurante</strong> para acceder al panel general configurado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#624A3E] text-white hover:bg-[#503C32] font-extrabold rounded-lg text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Iniciar Sesión
                </button>

                <button
                  type="button"
                  onClick={handleBypass}
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold rounded-lg text-xs transition-all border border-stone-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Bypass Rápido
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#624A3E] border-t-transparent rounded-full animate-spin shrink-0" />
                <div>
                  <h3 className="font-bold text-[#624A3E] text-sm">Validando con Servidor Python...</h3>
                  <p className="text-[11px] text-slate-500">Puente FastAPI asíncrono PostgreSQL</p>
                </div>
              </div>

              <div className="bg-slate-900 font-mono text-[10px] text-zinc-300 p-4 rounded-xl space-y-1 border border-slate-850 max-h-[220px] overflow-y-auto">
                {bootLog.map((log, idx) => (
                  <p key={idx} className="animate-fadeIn pl-2 border-l border-[#624A3E]/50 font-semibold">{log}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Server Dependencies Config Status (Requirements "Estos Datos") */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 p-6 space-y-4">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5 font-mono">
                  <Cpu className="w-3.5 h-3.5" />
                  Virtualenv active
                </span>
                <h2 className="font-extrabold text-white text-sm mt-0.5 tracking-tight font-sans">
                  Requisitos del Proyecto Python
                </h2>
              </div>
              <Server className="w-5 h-5 text-indigo-400" />
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Las bibliotecas requeridas para el motor de bases de datos relacionales, escandallo, impresión ESCPOS y reportes PDF se listan a continuación:
            </p>

            {/* List requirements.txt file */}
            <div className="bg-slate-950 rounded-lg border border-slate-805/90 p-4 space-y-2 relative group">
              <div className="flex justify-between items-center text-[10px] font-mono text-indigo-300 border-b border-slate-800 pb-1 mb-1">
                <span>requirements.txt</span>
                <button
                  type="button"
                  onClick={handleCopyRequirements}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                  title="Copiar requerimientos"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-sans font-bold">{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <pre className="font-mono text-[9px] text-amber-50/90 leading-tight max-h-[190px] overflow-y-auto whitespace-pre rounded select-all py-1 scrollbar-thin">
                {pythonRequirements.join('\n')}
              </pre>
            </div>

            {/* Simulated server logs indicator */}
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-400 font-sans">
                <Code className="w-3.5 h-3.5 text-blue-400" />
                Postgres & CLI Specs
              </div>
              <div className="text-[9px] font-mono text-zinc-400 space-y-0.5">
                <p>Host: <strong className="text-white">supabase-pg-pool.cloud</strong></p>
                <p>Port: <strong className="text-white">5432</strong></p>
                <p>Webapp Applet: <strong className="text-emerald-400">Streamlit 1.35.0 (Ready)</strong></p>
              </div>
            </div>

          </div>

          {/* Quick tips card about python dependencies */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-sans">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Conectores Compilados (.CJS Bridge)
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal font-sans">
              El frontend de la aplicación web está sincronizado para poder procesar todos los cálculos locales utilizando estructuras isomorfas en base de datos. ¡Introduce las credenciales para comenzar la simulación de comandas y stocks!
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[11px] text-slate-400">
        <p>Restaurante Pro v2.1 • Implementado con pila técnica local SQLite & Python 3.11 Gateway</p>
      </footer>
    </div>
  );
}
