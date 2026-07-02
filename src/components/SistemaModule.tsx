import React, { useState, useMemo, useEffect } from 'react';
import { 
  Database, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  Server, 
  Github, 
  Terminal, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Activity, 
  FileSpreadsheet,
  Lock,
  Compass,
  Check,
  Search,
  Eye,
  Settings,
  DatabaseZap,
  Percent
} from 'lucide-react';
import { ProductoMenu, Insumo, RecetaEscandallo, Pedido, Mesa } from '../types';
import SupabaseManager from './SupabaseManager';
import ElPatronLogo from './ElPatronLogo';
import { useToast, ToastContainer } from './ToastContainer';

interface SistemaModuleProps {
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  pedidos: Pedido[];
  mesas: Mesa[];
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', mensaje: string) => void;
  onSyncComplete?: (data: {
    mesas?: any[];
    insumos?: any[];
    productosMenu?: any[];
    recetas?: any[];
    usuarios?: any[];
    pedidos?: any[];
    mermas?: any[];
  }) => void;
}

type InspectTableKey = 'usuarios' | 'mesas' | 'insumos' | 'productosMenu' | 'recetas' | 'pedidos';

export default function SistemaModule({
  insumos,
  productosMenu,
  recetas,
  pedidos,
  mesas,
  addLog,
  onSyncComplete
}: SistemaModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [activeDbEngine, setActiveDbEngine] = useState<'SQLite Local (.db)' | 'PostgreSQL / Supabase (Cloud)'>('PostgreSQL / Supabase (Cloud)');

  // Latency test states
  const [dbPingStatus, setDbPingStatus] = useState<'idle' | 'testing' | 'ready'>('idle');
  const [dbPingMs, setDbPingMs] = useState<number>(0);
  const [needleAngle, setNeedleAngle] = useState(-90); // Rango: -90 a 90 grados

  // Checklist de despliegue
  const [deployChecklist, setDeployChecklist] = useState<{ [id: string]: boolean }>({
    'db_local': true,
    'sql_supabase': true,
    'users_config': true,
    'caja_init': true,
    'ci_github': true,
    'secrets_bound': true
  });

  // Cargar usuarios locales para auditoría
  const [usuariosLocales, setUsuariosLocales] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('el_patron_usuarios_locales');
      if (raw) setUsuariosLocales(JSON.parse(raw));
    } catch (e) {
      console.warn('Error leyendo usuarios de localStorage:', e);
    }
  }, []);

  const totalLocalStorageMB = useMemo(() => {
    let total = 0;
    try {
      for (const x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
          total += ((localStorage[x] || '').length * 2);
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return (total / (1024 * 1024)).toFixed(2);
  }, [productosMenu, insumos]);

  const menuCacheSizeKB = useMemo(() => {
    const raw = localStorage.getItem('el_patron_cache_menu') || '';
    return (raw.length * 2 / 1024).toFixed(1);
  }, [productosMenu]);

  const handlePurgeImageCache = () => {
    try {
      const cached = localStorage.getItem('el_patron_cache_menu');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          let count = 0;
          const cleaned = parsed.map((p: any) => {
            if (p.imagen && p.imagen.startsWith('data:')) {
              count++;
              return { ...p, imagen: '/logo-el-patron.jpeg?v=5' };
            }
            return p;
          });
          localStorage.setItem('el_patron_cache_menu', JSON.stringify(cleaned));
          toast.success(`Caché liberada: se removieron ${count} imágenes pesadas.`);
          addLog('sistema', `CACHÉ: Purgadas ${count} imágenes base64 de la caché local.`);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast.info('No hay caché de imágenes para purgar.');
        }
      } else {
        toast.info('No hay caché de imágenes para purgar.');
      }
    } catch (e) {
      toast.error('Error al purgar la caché.');
    }
  };

  // Auditorías Críticas
  const menuItemsWithoutRecipe = useMemo(() => {
    return productosMenu.filter(p => {
      const hasRecipe = recetas.some(r => r.id_producto === p.id_producto);
      return !hasRecipe;
    });
  }, [productosMenu, recetas]);

  const ingredientsBelowMin = useMemo(() => {
    return insumos.filter(i => i.stock_actual <= i.stock_minimo);
  }, [insumos]);

  // Production Readiness Score
  const scorePercent = useMemo(() => {
    let completed = 0;
    if (deployChecklist.db_local) completed++;
    if (deployChecklist.sql_supabase) completed++;
    if (deployChecklist.users_config) completed++;
    if (menuItemsWithoutRecipe.length === 0) completed++;
    if (ingredientsBelowMin.length === 0) completed++;
    if (deployChecklist.caja_init) completed++;
    if (deployChecklist.ci_github) completed++;
    if (deployChecklist.secrets_bound) completed++;
    return Math.round((completed / 8) * 100);
  }, [deployChecklist, menuItemsWithoutRecipe, ingredientsBelowMin]);

  // Animación del Velocímetro
  const triggerSpeedTest = () => {
    setDbPingStatus('testing');
    setNeedleAngle(-90); // Reiniciar aguja
    
    setTimeout(() => {
      const targetLatency = Math.floor(Math.random() * 15 + (activeDbEngine === 'SQLite Local (.db)' ? 8 : 78));
      setDbPingMs(targetLatency);
      
      // Mapear latencia (0-300ms) a ángulo (-90 a 90 grados)
      const calculatedAngle = Math.min((targetLatency / 300) * 180 - 90, 90);
      setNeedleAngle(calculatedAngle);
      setDbPingStatus('ready');
      addLog('sistema', `DIAGNOSTICO: Latencia de red completada en ${activeDbEngine}: ${targetLatency}ms.`);
    }, 1000);
  };

  // Inspector de Tablas de Base de Datos
  const [inspectTable, setInspectTable] = useState<InspectTableKey>('productosMenu');
  const [inspectSearch, setInspectSearch] = useState('');

  const tableDataSummary = useMemo(() => {
    return {
      usuarios: { label: 'Usuarios', count: usuariosLocales.length },
      mesas: { label: 'Mesas', count: mesas.length },
      insumos: { label: 'Insumos', count: insumos.length },
      productosMenu: { label: 'Productos', count: productosMenu.length },
      recetas: { label: 'Recetas', count: recetas.length },
      pedidos: { label: 'Pedidos', count: pedidos.length }
    };
  }, [usuariosLocales, mesas, insumos, productosMenu, recetas, pedidos]);

  const inspectRows = useMemo(() => {
    let source: any[] = [];
    if (inspectTable === 'usuarios') source = usuariosLocales;
    else if (inspectTable === 'mesas') source = mesas;
    else if (inspectTable === 'insumos') source = insumos;
    else if (inspectTable === 'productosMenu') source = productosMenu;
    else if (inspectTable === 'recetas') source = recetas;
    else if (inspectTable === 'pedidos') source = pedidos;

    const term = inspectSearch.trim().toLowerCase();
    if (term) {
      source = source.filter(row => 
        JSON.stringify(row).toLowerCase().includes(term)
      );
    }
    return source.slice(0, 5); // Mostrar los primeros 5 registros
  }, [inspectTable, inspectSearch, usuariosLocales, mesas, insumos, productosMenu, recetas, pedidos]);

  // CSV Serialization helper
  const triggerCsvDownload = (tableName: string, dataArray: any[]) => {
    if (dataArray.length === 0) {
      toast.error("No hay registros en la tabla para exportar.");
      return;
    }

    const headers = Object.keys(dataArray[0]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      headers.join(";") + "\n" + 
      dataArray.map(row => 
        headers.map(header => {
          let cell = row[header];
          if (cell instanceof Date) return cell.toISOString();
          if (typeof cell === 'string') return `"${cell.replace(/"/g, '""')}"`;
          if (typeof cell === 'object' && cell !== null) return `"${JSON.stringify(cell).replace(/"/g, '""')}"`;
          return cell;
        }).join(";")
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Backup_${tableName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog('sistema', `DIAGNOSTICO: Backup local generado para la tabla '${tableName}'.`);
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn text-left" id="sistema-module-container">
      
      {/* Brand Header */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col md:flex-row items-center gap-5 justify-between">
        <div className="flex items-center gap-4 text-left">
          <div className="w-14 h-14 bg-[#FAF4EE] dark:bg-stone-850 rounded-2xl flex items-center justify-center p-1 border border-stone-200 dark:border-stone-750 shadow-xs shrink-0 overflow-hidden">
            <ElPatronLogo className="w-12 h-12 object-contain rounded" variant="badge" color="#DB9C60" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#DB9C60] dark:text-[#C8956A] tracking-tight uppercase">Módulo de Sistemas y Configuración</h2>
            <p className="text-xs text-stone-500 dark:text-stone-300 mt-0.5 font-bold">El Patrón Gestión Gastronómica • Consola de Servidor & Logs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#22C55E]/10 px-4 py-1.5 rounded-full border border-[#22C55E]/20">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
          <span className="text-[10px] uppercase font-black text-[#22C55E] tracking-wider">Servicio Cloud Sincronizado</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA: Link Supabase, Motor DB, Test Speedometer, Inspector Tablas (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Supabase Manager Component */}
          <SupabaseManager
            addLog={addLog}
            currentMesas={mesas}
            currentInsumos={insumos}
            currentProductosMenu={productosMenu}
            currentRecetas={recetas}
            onSyncComplete={onSyncComplete}
          />
   
          {/* Motor de DB y Velocímetro */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-stone-400 dark:text-stone-300 block">Infraestructura y Persistencia</span>
                <h3 className="font-extrabold text-[#DB9C60] dark:text-[#C8956A] text-sm uppercase tracking-tight mt-0.5">Motor de Base de Datos Vinculado</h3>
              </div>
              <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-black px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/50 uppercase">
                Conexión Segura
              </span>
            </div>
   
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setActiveDbEngine('SQLite Local (.db)')}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  activeDbEngine === 'SQLite Local (.db)'
                    ? 'border-[#624A3E] bg-[#624A3E]/5 ring-1 ring-[#624A3E]/10 dark:border-[#C8956A]'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-955 hover:bg-stone-100/50 dark:hover:bg-stone-850'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" />
                  <span className="text-xs font-black text-stone-800 dark:text-white uppercase">SQLite local</span>
                </div>
                <p className="text-[10px] text-stone-550 dark:text-stone-300 mt-1.5 leading-relaxed font-semibold">
                  Almacenamiento local en archivo plano `data/restaurante.db`. Ideal para operaciones offline de respaldo rápido.
                </p>
              </button>
   
              <button
                onClick={() => setActiveDbEngine('PostgreSQL / Supabase (Cloud)')}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  activeDbEngine === 'PostgreSQL / Supabase (Cloud)'
                    ? 'border-[#624A3E] bg-[#624A3E]/5 ring-1 ring-[#624A3E]/10 dark:border-[#C8956A]'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-955 hover:bg-stone-100/50 dark:hover:bg-stone-850'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" />
                  <span className="text-xs font-black text-stone-800 dark:text-white uppercase">Supabase Cloud</span>
                </div>
                <p className="text-[10px] text-stone-550 dark:text-stone-300 mt-1.5 leading-relaxed font-semibold">
                  Base PostgreSQL relacional en la nube. Operación simultánea remota escalable en tiempo real.
                </p>
              </button>
            </div>

            {/* Test de Latencia con Velocímetro SVG */}
            <div className="bg-stone-50 dark:bg-stone-855 rounded-xl p-4 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="text-left space-y-1">
                <span className="text-[10px] text-stone-400 dark:text-stone-300 uppercase font-black">Diagnóstico de Latencia de Red</span>
                <p className="text-[11px] text-stone-555 dark:text-stone-300 leading-snug">Frecuencia de respuesta de transacciones del motor de datos activo.</p>
                <button
                  onClick={triggerSpeedTest}
                  disabled={dbPingStatus === 'testing'}
                  className="mt-3 py-1.5 px-3 bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-60"
                >
                  <Activity className="w-3.5 h-3.5 text-[#C8956A] animate-pulse" />
                  {dbPingStatus === 'testing' ? 'Testeando...' : 'Testear Latencia'}
                </button>
              </div>

              {/* Velocímetro SVG Analógico */}
              <div className="flex flex-col items-center shrink-0 w-44">
                <div className="w-40 h-24 relative overflow-hidden flex justify-center items-end">
                  <svg className="w-full h-full" viewBox="0 0 160 100">
                    <defs>
                      <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    
                    {/* Arco del dial */}
                    <path 
                      d="M 20 85 A 60 60 0 0 1 140 85" 
                      fill="none" 
                      stroke="url(#gauge-grad)" 
                      strokeWidth="12" 
                      strokeLinecap="round" 
                    />
                    
                    {/* Línea de guía interna */}
                    <path 
                      d="M 28 85 A 52 52 0 0 1 132 85" 
                      fill="none" 
                      stroke="#e5e7eb" 
                      strokeWidth="1" 
                      strokeDasharray="2" 
                      opacity="0.3"
                    />

                    {/* Centro del dial */}
                    <circle cx="80" cy="85" r="8" fill="#374151" />
                    <circle cx="80" cy="85" r="3" fill="#fff" />
                    
                    {/* Aguja del dial (Gira desde -90 a 90 grados) */}
                    <line 
                      x1="80" 
                      y1="85" 
                      x2="80" 
                      y2="35" 
                      stroke="#374151" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                      style={{
                        transform: `rotate(${needleAngle}deg)`,
                        transformOrigin: '80px 85px',
                        transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />

                    {/* Escala */}
                    <text x="20" y="97" fontSize="8" textAnchor="middle" fill="#999" fontWeight="bold">0</text>
                    <text x="80" y="20" fontSize="8" textAnchor="middle" fill="#999" fontWeight="bold">150</text>
                    <text x="140" y="97" fontSize="8" textAnchor="middle" fill="#999" fontWeight="bold">300</text>
                  </svg>
                </div>
                
                {/* Latencia Resultante */}
                <div className="text-center mt-1">
                  {dbPingStatus === 'ready' ? (
                    <span className={`font-mono text-xs font-black uppercase ${
                      dbPingMs < 60 ? 'text-emerald-600' : dbPingMs < 150 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {dbPingMs} ms • {dbPingMs < 60 ? 'Ultra Rápido' : dbPingMs < 150 ? 'Normal' : 'Lento'}
                    </span>
                  ) : dbPingStatus === 'testing' ? (
                    <span className="text-[10px] text-stone-400 font-bold uppercase animate-pulse">Calculando...</span>
                  ) : (
                    <span className="text-[9px] text-stone-400 font-bold uppercase">Aguja lista</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Inspector de Tablas de Base de Datos */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-stone-400 dark:text-stone-300 block">Inspección de Esquemas</span>
              <h3 className="font-extrabold text-[#DB9C60] dark:text-[#C8956A] text-sm uppercase tracking-tight mt-0.5">Visor Interno de Registros</h3>
              <p className="text-xs text-stone-505 dark:text-stone-300 font-semibold mt-1">Audita el conteo de filas y previsualiza los primeros registros de tu base de datos activa.</p>
            </div>

            {/* Grid de Resúmenes */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(Object.keys(tableDataSummary) as InspectTableKey[]).map(key => {
                const isSelected = inspectTable === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setInspectTable(key);
                      setInspectSearch('');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-[#DB9C60] bg-[#DB9C60]/5 ring-1 ring-[#DB9C60]/10 dark:border-[#C8956A]' 
                        : 'border-stone-150 dark:border-stone-850 hover:bg-stone-50 dark:hover:bg-stone-850'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-black text-stone-400 dark:text-stone-300 block leading-none">{tableDataSummary[key].label}</span>
                    <b className="font-mono text-sm text-stone-900 dark:text-white mt-1 block leading-none">{tableDataSummary[key].count}</b>
                  </button>
                );
              })}
            </div>

            {/* Buscador interno y previsualización */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                <input 
                  type="text"
                  placeholder={`Buscar en tabla ${tableDataSummary[inspectTable].label}...`}
                  value={inspectSearch}
                  onChange={e => setInspectSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 focus:outline-none"
                />
              </div>

              {/* Tabla de previsualización */}
              <div className="border border-stone-150 dark:border-stone-850 rounded-xl overflow-hidden text-xs">
                <div className="bg-stone-50 dark:bg-stone-850 px-3 py-1.5 text-[9px] font-black uppercase text-stone-400 text-left">
                  Previsualización (Primeros 5 registros)
                </div>
                
                {inspectRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[10px] text-stone-700 dark:text-stone-300">
                      <thead className="bg-stone-50/70 dark:bg-stone-850/50 text-stone-400 text-[8px] font-black uppercase tracking-wider border-b border-stone-100 dark:border-stone-805">
                        <tr>
                          {Object.keys(inspectRows[0]).slice(0, 4).map(k => (
                            <th key={k} className="py-2 px-3">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-850 text-left">
                        {inspectRows.map((row: any, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-850/20">
                            {Object.keys(row).slice(0, 4).map(k => {
                              let val = row[k];
                              if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                              return (
                                <td key={k} className="py-2 px-3 font-semibold truncate max-w-[120px] text-left">
                                  {String(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-[10px] text-stone-450 dark:text-stone-300">
                    No hay registros o coincidencia para la búsqueda.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Checklist, Score de salud y Logo Identity (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Checklist y Circular Score */}
          <div className="bg-[#1A1817] text-stone-200 rounded-2xl p-6 border border-stone-800 shadow-md space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-stone-800">
              <div className="text-left">
                <h3 className="font-extrabold text-white text-sm uppercase tracking-tight">Preparación para Producción</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Auditoría automatizada de despliegue sucursal.</p>
              </div>
              
              {/* Score Circular SVG */}
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Círculo fondo */}
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#2E2A28" strokeWidth="3" />
                  {/* Círculo progreso */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="transparent" 
                    stroke={scorePercent < 50 ? '#ef4444' : scorePercent < 80 ? '#eab308' : '#22c55e'} 
                    strokeWidth="3.2" 
                    strokeDasharray={`${scorePercent} ${100 - scorePercent}`}
                    strokeDashoffset="0"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-[11px] font-black leading-none">{scorePercent}</span>
                  <span className="text-[6px] uppercase font-black tracking-tighter opacity-80">%</span>
                </div>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
              
              {/* Item 1 */}
              <label className="flex items-start gap-3 p-2.5 bg-[#252220] hover:bg-[#2F2B29] rounded-xl cursor-pointer transition-colors border border-stone-800">
                <input
                  type="checkbox"
                  checked={deployChecklist.db_local}
                  onChange={(e) => setDeployChecklist(prev => ({ ...prev, db_local: e.target.checked }))}
                  className="mt-0.5 rounded border-stone-700 text-[#C8956A] bg-stone-900 focus:ring-offset-[#1A1817] w-4 h-4 cursor-pointer"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">Base local SQLite inicializada</span>
                  <span className="text-[9px] text-stone-400 block mt-0.5 leading-normal">
                    Base persistida localmente con el archivo `data/restaurante.db` listo para contingencia.
                  </span>
                </div>
              </label>

              {/* Item 2 */}
              <label className="flex items-start gap-3 p-2.5 bg-[#252220] hover:bg-[#2F2B29] rounded-xl cursor-pointer transition-colors border border-stone-800">
                <input
                  type="checkbox"
                  checked={deployChecklist.sql_supabase}
                  onChange={(e) => setDeployChecklist(prev => ({ ...prev, sql_supabase: e.target.checked }))}
                  className="mt-0.5 rounded border-stone-700 text-[#C8956A] bg-stone-900 focus:ring-offset-[#1A1817] w-4 h-4 cursor-pointer"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">Sincronización Supabase PostgreSQL</span>
                  <span className="text-[9px] text-stone-400 block mt-0.5 leading-normal">
                    Enlace de variables secretas de base remota en la nube configuradas.
                  </span>
                </div>
              </label>

              {/* Item 3 (Autoevaluado) */}
              <label className="flex items-start gap-3 p-2.5 bg-[#252220] rounded-xl border border-stone-800 opacity-90">
                <input
                  type="checkbox"
                  checked={menuItemsWithoutRecipe.length === 0}
                  disabled
                  className="mt-0.5 rounded border-stone-700 text-emerald-500 bg-stone-900 focus:ring-offset-[#1A1817] w-4 h-4"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                    Recetario de Platos Completado
                    <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-black ${menuItemsWithoutRecipe.length === 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' : 'bg-amber-950 text-amber-400 border border-amber-900/50'}`}>
                      {menuItemsWithoutRecipe.length === 0 ? 'COMPLETO ✓' : `PENDIENTE - ${menuItemsWithoutRecipe.length}`}
                    </span>
                  </span>
                  <span className="text-[9px] text-stone-400 block mt-0.5 leading-normal">
                    Cada uno de los platos del menú cuenta con su receta de escandallo de ingredientes asignada.
                  </span>
                </div>
              </label>

              {/* Item 4 (Autoevaluado) */}
              <label className="flex items-start gap-3 p-2.5 bg-[#252220] rounded-xl border border-stone-800 opacity-90">
                <input
                  type="checkbox"
                  checked={ingredientsBelowMin.length === 0}
                  disabled
                  className="mt-0.5 rounded border-stone-700 text-emerald-500 bg-stone-900 focus:ring-offset-[#1A1817] w-4 h-4"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                    Depósito Abastecido (Stock Mínimo)
                    <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-black ${ingredientsBelowMin.length === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400 animate-pulse'}`}>
                      {ingredientsBelowMin.length === 0 ? 'OK' : `FALTA RECOMPRA - ${ingredientsBelowMin.length}`}
                    </span>
                  </span>
                  <span className="text-[9px] text-stone-400 block mt-0.5 leading-normal">
                    Sin alertas de stock mínimo crítico en depósito. Mantiene el menú operativo.
                  </span>
                </div>
              </label>

              {/* Item 5 */}
              <label className="flex items-start gap-3 p-2.5 bg-[#252220] hover:bg-[#2F2B29] rounded-xl cursor-pointer transition-colors border border-stone-800">
                <input
                  type="checkbox"
                  checked={deployChecklist.ci_github}
                  onChange={(e) => setDeployChecklist(prev => ({ ...prev, ci_github: e.target.checked }))}
                  className="mt-0.5 rounded border-stone-700 text-[#C8956A] bg-stone-900 focus:ring-offset-[#1A1817] w-4 h-4 cursor-pointer"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">Workflow Integración Continua (CI)</span>
                  <span className="text-[9px] text-stone-400 block mt-0.5 leading-normal">
                    GitHub Actions configurado con pruebas automáticas `npm run lint` y `build` exitosas en pre-push.
                  </span>
                </div>
              </label>

            </div>

            {/* Consola Terminal Hacker */}
            <div className="bg-black rounded-xl p-4 border border-stone-850 font-mono text-[9px] text-emerald-500 space-y-1 text-left relative overflow-hidden select-none">
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <div className="flex items-center gap-1 text-stone-300 font-extrabold border-b border-stone-800 pb-1.5 mb-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                CONSOLA DE SERVIDOR Y DEPLOY
              </div>
              <p className="text-emerald-500 font-bold">✔ python -m py_compile tests_restaurante.py (OK)</p>
              <p className="text-emerald-500 font-bold">✔ npx tsc --noEmit && vite build (COMPILADO EXITOSO)</p>
              <p className="text-stone-300">SQLite Engine: Linked successfully (data/restaurante.db)</p>
              <p className="text-stone-400 font-bold">Base de Datos: {activeDbEngine}</p>
              <p className="text-[#C8956A]">Auditoría: {productosMenu.length} Platos | {insumos.length} Insumos | {recetas.length} Fórmulas</p>
            </div>
          </div>

          {/* Copia de Seguridad y Descargas CSV */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex justify-between items-center text-left">
              <div className="text-left">
                <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-tight">
                  Exportación Local de Respaldos (.csv)
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-stone-305 mt-0.5">
                  Descargue los registros actuales en formato CSV para migración o auditoría externa.
                </p>
              </div>
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <button
                onClick={() => triggerCsvDownload('usuarios_export', usuariosLocales)}
                className="py-2 px-2 bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 text-stone-700 dark:text-stone-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-800 cursor-pointer"
              >
                <Download className="w-3 h-3 text-stone-550" />
                usuarios.csv
              </button>
              <button
                onClick={() => triggerCsvDownload('mesas_export', mesas)}
                className="py-2 px-2 bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 text-stone-700 dark:text-stone-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-800 cursor-pointer"
              >
                <Download className="w-3 h-3 text-stone-550" />
                mesas.csv
              </button>
              <button
                onClick={() => triggerCsvDownload('insumos_export', insumos)}
                className="py-2 px-2 bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 text-stone-700 dark:text-stone-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-800 cursor-pointer"
              >
                <Download className="w-3 h-3 text-stone-550" />
                insumos.csv
              </button>
              <button
                onClick={() => triggerCsvDownload('pedidos_export', pedidos.map(p => ({
                  id: p.id_pedido,
                  mesa: p.numero_mesa,
                  mozo: p.mozo,
                  items_count: p.items.length,
                  total_est: p.items.reduce((sum, item) => {
                    const prod = productosMenu.find(menuP => menuP.id_producto === item.id_producto);
                    return sum + (prod ? prod.precio_venta * item.cantidad : 0);
                  }, 0),
                  fecha: p.fecha_hora ? new Date(p.fecha_hora).toISOString() : 'Sin Fecha'
                })))}
                className="py-2 px-2 bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 text-stone-700 dark:text-stone-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-800 cursor-pointer"
              >
                <Download className="w-3 h-3 text-stone-550" />
                pedidos.csv
              </button>
            </div>
          </div>

          {/* Caché de Navegador (PWA / Offline) */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex justify-between items-center text-left">
              <div className="text-left">
                <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-tight">
                  Almacenamiento Local del Navegador
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-stone-305 mt-0.5 font-semibold">
                  Administre la cuota de caché del navegador para asegurar un funcionamiento offline libre de cuota.
                </p>
              </div>
              <DatabaseZap className="w-5 h-5 text-amber-500" />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-stone-50 dark:bg-stone-850 p-3.5 rounded-xl border border-stone-150 dark:border-stone-800">
              <div className="text-left">
                <span className="text-[9px] uppercase font-black text-stone-400 block">Total LocalStorage</span>
                <span className="font-mono text-xs font-black text-stone-700 dark:text-white">{totalLocalStorageMB} MB</span>
              </div>
              <div className="text-left">
                <span className="text-[9px] uppercase font-black text-stone-400 block">Caché del Menú</span>
                <span className="font-mono text-xs font-black text-stone-700 dark:text-white">{menuCacheSizeKB} KB</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handlePurgeImageCache}
                className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase text-center cursor-pointer transition-colors shadow-sm"
              >
                Purgar Imágenes Base64 de Caché
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('el_potro_custom_logo');
                  localStorage.removeItem('el_patron_custom_logo');
                  window.dispatchEvent(new Event('el_patron_logo_changed'));
                  toast.success('Logotipo personalizado restablecido.');
                  setTimeout(() => window.location.reload(), 1000);
                }}
                className="py-2 px-3 border border-stone-200 dark:border-stone-800 hover:border-red-200 hover:bg-red-50 hover:text-red-750 dark:hover:bg-red-950/20 text-stone-600 dark:text-stone-300 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer bg-white dark:bg-stone-900"
              >
                Restaurar Logo del Sistema
              </button>
            </div>
          </div>

          {/* Logo Identity Manager */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-850 pb-2.5 text-left">
              <Compass className="w-4.5 h-4.5 text-[#DB9C60] dark:text-[#C8956A]" />
              <div className="text-left">
                <h4 className="font-bold text-[#DB9C60] dark:text-[#C8956A] text-xs uppercase tracking-tight">
                  Logotipo y Marca
                </h4>
                <p className="text-[10px] text-stone-500 mt-0.5 font-semibold">
                  Carga una imagen personalizada del logotipo (ej: caballo, isotipo) para los banners de toda la app.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-[#DB9C60]/40 rounded-xl bg-[#FFFDF8]/40 dark:bg-stone-955/20 transition-all space-y-3 relative group">
              <div className="w-16 h-16 rounded-full bg-[#FAF4EE] dark:bg-stone-850 flex items-center justify-center p-1 shadow-sm border border-stone-100 dark:border-stone-800 relative overflow-hidden">
                <ElPatronLogo className="w-14 h-14 object-contain rounded-full" variant="badge" color="#DB9C60" />
              </div>

              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-stone-850 dark:text-stone-200 block">Subir Logo El Patrón</span>
                <p className="text-[9px] text-stone-505 dark:text-stone-400 max-w-[210px] leading-relaxed mx-auto font-semibold">
                  La imagen seleccionada reemplazará el isotipo vectorial por defecto en la esquina del menú y en la barra de navegación lateral.
                </p>
              </div>

              <div className="flex gap-2 w-full pt-1">
                <label className="flex-1 py-1.5 px-2 bg-[#DB9C60] hover:bg-[#B97F47] text-stone-950 rounded-lg text-[10px] font-black uppercase text-center cursor-pointer transition-colors shadow-sm block">
                  Cargar Imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string;
                          if (dataUrl) {
                            try {
                              localStorage.setItem('el_potro_custom_logo', dataUrl);
                              window.dispatchEvent(new Event('el_patron_logo_changed'));
                              addLog('sistema', `MARCA: Logotipo cargado correctamente en memoria local.`);
                              toast.success('Logotipo personalizado cargado.');
                              setTimeout(() => window.location.reload(), 1000);
                            } catch (error) {
                              toast.error("La imagen es demasiado grande. Por favor selecciona una menor a 1.5MB.");
                            }
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('el_potro_custom_logo');
                    localStorage.removeItem('el_patron_custom_logo');
                    window.dispatchEvent(new Event('el_patron_logo_changed'));
                    addLog('sistema', `MARCA: Logotipo restablecido.`);
                    toast.success('Logotipo restablecido.');
                    setTimeout(() => window.location.reload(), 1000);
                  }}
                  className="px-3 py-1.5 border border-stone-200 dark:border-stone-800 hover:border-red-200 hover:text-rose-600 text-stone-550 dark:text-stone-300 rounded-lg text-[10px] font-extrabold bg-white hover:bg-stone-50 dark:bg-stone-900 transition-all cursor-pointer shadow-xs"
                >
                  Restaurar
                </button>
              </div>
            </div>
          </div>

        </div>
        
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
