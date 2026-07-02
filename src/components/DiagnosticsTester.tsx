import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Database,
  Wifi,
  WifiOff,
  CloudLightning,
  Settings,
  Sparkles,
  Info,
  Server,
  Key,
  X,
  FileCode,
  ArrowRight,
  Terminal,
  RotateCcw
} from 'lucide-react';
import { getSupabaseConfig, resetSupabaseClientCache, tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { syncQueueService, SyncQueueItem } from '../services/syncQueueService';

interface DiagnosticsTesterProps {
  onClose?: () => void;
}

export default function DiagnosticsTester({ onClose }: DiagnosticsTesterProps) {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [showFullKey, setShowFullKey] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Connection diagnostics states
  const [pingStatus, setPingStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [readStatus, setReadStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [readDetails, setReadDetails] = useState('');
  const [writeStatus, setWriteStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [writeDetails, setWriteDetails] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [realtimeDetails, setRealtimeDetails] = useState('');

  // Queue and generic states
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    setQueue(syncQueueService.getQueue());
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load form overrides if they exist
    if (typeof window !== 'undefined') {
      setCustomUrl(window.localStorage.getItem('SUPABASE_URL') || '');
      setCustomKey(window.localStorage.getItem('SUPABASE_ANON_KEY') || '');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const runDiagnostics = async () => {
    // 1. Run Ping Test
    setPingStatus('running');
    setPingMs(null);
    const startTime = Date.now();
    try {
      // Direct HTTP fetch to test DNS resolution and network path
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(`${config.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': config.key,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      setPingMs(endTime - startTime);
      setPingStatus('success');
    } catch (err: any) {
      console.warn('Ping diagnostics test failed:', err);
      setPingStatus('failed');
    }

    // 2. Run Database Read Test
    setReadStatus('running');
    setReadDetails('');
    try {
      const client = tryGetActiveSupabaseClient();
      if (!client) throw new Error('No se pudo inicializar el cliente de Supabase.');

      // Try fetching mesas count
      const { data, count, error } = await client
        .from('mesas')
        .select('id_mesa', { count: 'exact', head: true });

      if (error) throw error;
      setReadStatus('success');
      setReadDetails(`Leído exitosamente. Mesas encontradas: ${count ?? 0}`);
    } catch (err: any) {
      console.error('Read diagnostics test failed:', err);
      setReadStatus('failed');
      setReadDetails(err.message || 'Error desconocido al leer.');
    }

    // 3. Run Database Write Test (creates an entry in audit events or tests privileges)
    setWriteStatus('running');
    setWriteDetails('');
    try {
      const client = tryGetActiveSupabaseClient();
      if (!client) throw new Error('Cliente Supabase no disponible.');

      const testPayload = {
        tipo: 'sistema',
        mensaje: `DIAGNOSTICO: Test automático de conexión desde terminal ${typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 50) : 'Desconocida'}`,
        timestamp: new Date().toISOString()
      };

      const { data, error } = await client
        .from('auditoria_eventos')
        .insert([testPayload])
        .select();

      if (error) throw error;
      setWriteStatus('success');
      setWriteDetails('Escritura exitosa en la tabla auditoria_eventos.');
    } catch (err: any) {
      console.error('Write diagnostics test failed:', err);
      setWriteStatus('failed');
      setWriteDetails(err.message || 'Error de permisos o tabla inexistente.');
    }

    // 4. Run Realtime subscription Test
    setRealtimeStatus('running');
    setRealtimeDetails('');
    try {
      const client = tryGetActiveSupabaseClient();
      if (!client) throw new Error('Cliente Supabase no disponible.');

      const testChannel = client.channel('diagnostics_test_channel');
      
      const subscriptionPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          testChannel.unsubscribe();
          reject(new Error('Timeout de suscripción (10s)'));
        }, 10000);

        testChannel
          .on('system' as any, { event: '*' }, (payload) => {
            console.log('Realtime system event:', payload);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              testChannel.unsubscribe();
              resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              clearTimeout(timeout);
              testChannel.unsubscribe();
              reject(new Error(`Canal en estado: ${status}`));
            }
          });
      });

      await subscriptionPromise;
      setRealtimeStatus('success');
      setRealtimeDetails('Conexión WebSocket / Realtime activa y suscrita.');
    } catch (err: any) {
      console.error('Realtime subscription test failed:', err);
      setRealtimeStatus('failed');
      setRealtimeDetails(err.message || 'Fallo de WebSocket.');
    }
  };

  const handleSaveOverrides = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window === 'undefined') return;

    setIsSaving(true);
    try {
      if (customUrl.trim()) {
        window.localStorage.setItem('SUPABASE_URL', customUrl.trim());
      } else {
        window.localStorage.removeItem('SUPABASE_URL');
      }

      if (customKey.trim()) {
        window.localStorage.setItem('SUPABASE_ANON_KEY', customKey.trim());
      } else {
        window.localStorage.removeItem('SUPABASE_ANON_KEY');
      }

      resetSupabaseClientCache();
      const updatedConfig = getSupabaseConfig();
      setConfig(updatedConfig);
      
      // Update form fields with resolved variables
      setCustomUrl(window.localStorage.getItem('SUPABASE_URL') || '');
      setCustomKey(window.localStorage.getItem('SUPABASE_ANON_KEY') || '');

      alert('Credenciales actualizadas e instancia de Supabase reiniciada.');
    } catch (err) {
      alert('Error guardando configuraciones.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (typeof window === 'undefined') return;
    if (confirm('¿Restablecer credenciales al servidor institucional por defecto de El Patrón?')) {
      window.localStorage.removeItem('SUPABASE_URL');
      window.localStorage.removeItem('SUPABASE_ANON_KEY');
      setCustomUrl('');
      setCustomKey('');
      resetSupabaseClientCache();
      setConfig(getSupabaseConfig());
      alert('Credenciales de fábrica restauradas.');
    }
  };

  const handleForceCacheBust = async () => {
    if (typeof window === 'undefined') return;
    if (confirm('Esto forzará la eliminación del cache del navegador, desregistrará los Service Workers PWA obsoletos y recargará la página. ¿Continuar?')) {
      try {
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('Service Worker desregistrado con éxito.');
          }
        }

        // Clear all CacheStorage
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log(`Cache borrado: ${cacheName}`);
          }
        }

        // Reload the browser ignoring cache (force new bundle fetch)
        window.location.reload();
      } catch (err) {
        console.error('Error al purgar la cache del PWA:', err);
        alert('Ocurrió un error. Se recargará la pantalla de todos modos.');
        window.location.reload();
      }
    }
  };

  const triggerManualSync = async () => {
    setIsProcessingQueue(true);
    try {
      await syncQueueService.processQueue();
      setQueue(syncQueueService.getQueue());
      alert('Proceso de sincronización completado.');
    } catch (err) {
      alert('Error en la sincronización.');
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleClearSyncQueue = () => {
    if (confirm('¿Estás seguro de que deseas vaciar la cola de sincronización pendiente? Perderás los pedidos que se guardaron de forma offline.')) {
      syncQueueService.saveQueue([]);
      setQueue([]);
    }
  };

  const formatKey = (key: string) => {
    if (showFullKey) return key;
    if (key.length <= 20) return key;
    return `${key.slice(0, 10)}...${key.slice(-10)}`;
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl border border-stone-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-scaleUp my-8 text-stone-850">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center border border-amber-250">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#8C6239]">Tester & Diagnóstico Completo</h2>
              <p className="text-xs text-stone-500">Mapeo del estado de conectividad con Supabase</p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4 text-stone-600" />
            </button>
          )}
        </div>

        {/* Section 1: Resolved Credentials */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-[#B97F47] tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" /> Credenciales Activas del Cliente
            </span>
            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1 border ${
              isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Internet Online' : 'Internet Offline'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-stone-150">
              <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wide">Base URL</span>
              <code className="text-stone-700 break-all select-all font-mono font-bold">{config.url || 'No configurada'}</code>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-stone-150 relative">
              <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wide">Anon Key (API Key)</span>
              <code className="text-stone-700 break-all font-mono text-[10px] block pr-14 leading-relaxed select-all">
                {config.key ? formatKey(config.key) : 'No configurada'}
              </code>
              {config.key && (
                <button
                  onClick={() => setShowFullKey(!showFullKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded border border-stone-200 text-[#8C6239] cursor-pointer"
                >
                  {showFullKey ? 'Ocultar' : 'Ver'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Interactive Tests */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-stone-500">Pruebas en tiempo real</h3>
            <button
              onClick={runDiagnostics}
              className="py-1.5 px-4 bg-[#8C6239] hover:bg-[#B97F47] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Ejecutar Diagnósticos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            
            {/* Ping / DNS Test */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-stone-800 block">1. DNS / Ping Rest Endpoint</span>
                <span className="text-[10px] text-stone-500">Verifica comunicación directa IP</span>
              </div>
              <div className="flex items-center gap-1.5">
                {pingStatus === 'idle' && <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />}
                {pingStatus === 'running' && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
                {pingStatus === 'success' && (
                  <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-green-200">
                    OK {pingMs !== null ? `(${pingMs}ms)` : ''}
                  </span>
                )}
                {pingStatus === 'failed' && (
                  <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-red-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Error
                  </span>
                )}
              </div>
            </div>

            {/* Read Test */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col justify-between">
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="font-bold text-stone-800 block">2. Lectura SQL (API Rest)</span>
                  <span className="text-[10px] text-stone-500">Prueba select count en tablas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {readStatus === 'idle' && <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />}
                  {readStatus === 'running' && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
                  {readStatus === 'success' && (
                    <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-green-200">
                      Lectura OK
                    </span>
                  )}
                  {readStatus === 'failed' && (
                    <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-red-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Falló
                    </span>
                  )}
                </div>
              </div>
              {readDetails && (
                <span className="text-[10px] font-mono mt-1 text-stone-600 border-t border-stone-200 pt-1">
                  {readDetails}
                </span>
              )}
            </div>

            {/* Write Test */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col justify-between">
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="font-bold text-stone-800 block">3. Escritura SQL (Insert)</span>
                  <span className="text-[10px] text-stone-500">Prueba inserción en logs técnico</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {writeStatus === 'idle' && <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />}
                  {writeStatus === 'running' && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
                  {writeStatus === 'success' && (
                    <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-green-200">
                      Escritura OK
                    </span>
                  )}
                  {writeStatus === 'failed' && (
                    <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-red-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Error DDL
                    </span>
                  )}
                </div>
              </div>
              {writeDetails && (
                <span className="text-[10px] font-mono mt-1 text-stone-600 border-t border-stone-200 pt-1 truncate">
                  {writeDetails}
                </span>
              )}
            </div>

            {/* Realtime channel / WS Test */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col justify-between">
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="font-bold text-stone-800 block">4. WebSocket Realtime</span>
                  <span className="text-[10px] text-stone-500">Prueba de canales push</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {realtimeStatus === 'idle' && <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />}
                  {realtimeStatus === 'running' && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
                  {realtimeStatus === 'success' && (
                    <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-green-200">
                      Canal OK
                    </span>
                  )}
                  {realtimeStatus === 'failed' && (
                    <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-red-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Inactivo
                    </span>
                  )}
                </div>
              </div>
              {realtimeDetails && (
                <span className="text-[10px] font-mono mt-1 text-stone-600 border-t border-stone-200 pt-1">
                  {realtimeDetails}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Section 3: PWA Cache and Storage Clear */}
        <div className="bg-[#FAF4EE] rounded-2xl p-4 border border-[#8C6239]/15 space-y-3">
          <div>
            <h3 className="text-xs font-black uppercase text-[#8C6239] tracking-wider flex items-center gap-1.5">
              <CloudLightning className="w-4 h-4 text-amber-600 animate-pulse" /> Limpieza de Caché y Reset del Dispositivo
            </h3>
            <p className="text-[11px] text-stone-500 mt-1 leading-normal">
              Si realizaste cambios y en tu teléfono no se muestran, puede ser debido a la caché agresiva del Service Worker PWA de Vite. Este botón eliminará los archivos viejos y obligará al navegador a descargar el nuevo paquete de código.
            </p>
          </div>
          <button
            onClick={handleForceCacheBust}
            className="w-full py-3 bg-[#8C6239] hover:bg-[#B97F47] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Forzar Purgado de Caché del Celular & Recargar
          </button>
        </div>

        {/* Section 4: Sync Queue Status */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">
              Cola de Sincronización Offline ({queue.length})
            </span>
            {queue.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleClearSyncQueue}
                  className="p-1 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                  title="Vaciar Cola"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={triggerManualSync}
                  disabled={isProcessingQueue}
                  className="text-[10px] font-bold px-2 py-0.5 bg-stone-200 hover:bg-stone-250 rounded border border-stone-300 flex items-center gap-1 cursor-pointer disabled:opacity-55"
                >
                  {isProcessingQueue ? 'Sincronizando...' : 'Sincronizar Ahora'}
                </button>
              </div>
            )}
          </div>

          {queue.length === 0 ? (
            <p className="text-[11px] text-stone-500 italic">No hay pedidos ni facturas pendientes en la cola local.</p>
          ) : (
            <div className="max-h-28 overflow-y-auto space-y-1.5 font-mono text-[10px]">
              {queue.map(item => (
                <div key={item.id} className="p-2 bg-white rounded-lg border border-stone-150 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-700">{item.action}</span>
                    <span className="text-stone-400 block text-[9px]">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                    Intento {item.attempts}/50
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Override Credentials Form */}
        <div className="border-t border-stone-150 pt-4 space-y-3">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-stone-500 flex items-center gap-1.5">
            <Settings className="w-4 h-4" /> Sobrescribir Servidor Supabase
          </h3>
          <p className="text-[10px] text-stone-400 leading-normal">
            Podés configurar temporalmente otra instancia de base de datos desde acá. Si dejas los campos vacíos y guardás, el sistema recurrirá a las credenciales oficiales de fábrica.
          </p>

          <form onSubmit={handleSaveOverrides} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-stone-500 block mb-1">URL Personalizada</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://su-proyecto.supabase.co"
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#8C6239]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 block mb-1">Anon Key Personalizada</label>
                <input
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#8C6239]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-60"
              >
                {isSaving ? 'Guardando...' : 'Aplicar Credenciales'}
              </button>
              
              <button
                type="button"
                onClick={handleResetDefaults}
                className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs uppercase tracking-wider border border-stone-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Restaurar Fábrica
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
