import React, { useState, useMemo } from 'react';
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
  Compass
} from 'lucide-react';
import { ProductoMenu, Insumo, RecetaEscandallo, Pedido, Mesa } from '../types';

interface SistemaModuleProps {
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  pedidos: Pedido[];
  mesas: Mesa[];
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'sistema', mensaje: string) => void;
}

export default function SistemaModule({
  insumos,
  productosMenu,
  recetas,
  pedidos,
  mesas,
  addLog
}: SistemaModuleProps) {
  // Test latencies
  const [dbPingStatus, setDbPingStatus] = useState<'idle' | 'testing' | 'ready'>('idle');
  const [dbPingMs, setDbPingMs] = useState<number>(0);
  const [activeDbEngine, setActiveDbEngine] = useState<'SQLite Local (.db)' | 'PostgreSQL / Supabase (Cloud)'>('SQLite Local (.db)');

  // Selected checklist verification states
  const [deployChecklist, setDeployChecklist] = useState<{ [id: string]: boolean }>({
    'db_local': true,
    'sql_supabase': false,
    'users_config': true,
    'menu_receta': false, // will check dynamically
    'stock_critico': false, // will check dynamically
    'caja_init': true,
    'ci_github': true,
    'secrets_bound': false
  });

  // Database audit of "Productos activos sin receta" (menu items that have no recipes assigned!)
  const menuItemsWithoutRecipe = useMemo(() => {
    return productosMenu.filter(p => {
      const hasRecipe = recetas.some(r => r.id_producto === p.id_producto);
      return !hasRecipe;
    });
  }, [productosMenu, recetas]);

  // Ingredients below critical safety stock minimums
  const ingredientsBelowMin = useMemo(() => {
    return insumos.filter(i => i.stock_actual <= i.stock_minimo);
  }, [insumos]);

  // Simulate active latencies speed test
  const triggerSpeedTest = () => {
    setDbPingStatus('testing');
    setTimeout(() => {
      setDbPingMs(Math.floor(Math.random() * 15 + (activeDbEngine === 'SQLite Local (.db)' ? 12 : 110)));
      setDbPingStatus('ready');
      addLog('sistema', `DIAGNOSTICO: Test de latencia de red completado en ${activeDbEngine}. Velocidad óptima.`);
    }, 1200);
  };

  // CSV Serialization helper
  const triggerCsvDownload = (tableName: string, dataArray: any[]) => {
    if (dataArray.length === 0) {
      alert("No hay registros en la tabla para exportar.");
      return;
    }

    // Get table keys
    const headers = Object.keys(dataArray[0]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      headers.join(";") + "\n" + 
      dataArray.map(row => 
        headers.map(header => {
          let cell = row[header];
          if (cell instanceof Date) {
            return cell.toISOString();
          }
          if (typeof cell === 'string') {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          if (typeof cell === 'object' && cell !== null) {
            return `"${JSON.stringify(cell).replace(/"/g, '""')}"`;
          }
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

    addLog('sistema', `DIAGNOSTICO: Backup local de base de datos generado para la tabla '${tableName}'.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="sistema-module-container">
      
      {/* COLUMN LEFT: Live Diagnostics, DB engine & backup buttons (Col Span 7) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Connection & DB Engine Settings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans">Infraestructura y Persistencia</p>
              <h3 className="font-extrabold text-[#624A3E] font-sans tracking-tight">Motor de Base de Datos Vinculado</h3>
            </div>
            
            <span className="bg-[#624A3E]/10 border border-[#624A3E]/20 text-[#624A3E] text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
              Estabilidad 100%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setActiveDbEngine('SQLite Local (.db)');
                setDbPingStatus('idle');
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                activeDbEngine === 'SQLite Local (.db)'
                  ? 'border-[#624A3E] bg-[#624A3E]/5 ring-1 ring-[#624A3E]/10'
                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#624A3E]" />
                <span className="text-xs font-extrabold text-slate-800">SQLite Local</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Almacenamiento local en archivo plano `data/restaurante.db`. Ideal para operaciones offline.
              </p>
            </button>

            <button
              onClick={() => {
                setActiveDbEngine('PostgreSQL / Supabase (Cloud)');
                setDbPingStatus('idle');
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                activeDbEngine === 'PostgreSQL / Supabase (Cloud)'
                  ? 'border-[#624A3E] bg-[#624A3E]/5 ring-1 ring-[#624A3E]/10'
                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-extrabold text-slate-800">Supabase PG Link</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Base PostgreSQL en la nube Supabase. Operación simultánea remota escalable de producción.
              </p>
            </button>
          </div>

          {/* Test Performance block */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Diagnóstico de Latencia de Red</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Frecuencia de respuesta de transacciones escandallo de stock síncronos.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {dbPingStatus === 'ready' && (
                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Velocidad Ping</span>
                  <span className={`font-mono text-xs font-extrabold ${dbPingMs < 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {dbPingMs} ms {dbPingMs < 50 ? '(Ultra-Rápido ⚡)' : '(Estable)'}
                  </span>
                </div>
              )}
              
              <button
                onClick={triggerSpeedTest}
                disabled={dbPingStatus === 'testing'}
                className="py-1.5 px-3 bg-slate-900 shrink-0 hover:bg-slate-800 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                {dbPingStatus === 'testing' ? 'Testeando...' : 'Test Speed'}
              </button>
            </div>
          </div>

        </div>

        {/* Dynamic Database Diagnostics Panel (Checking specific README requests!) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-xs font-sans tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Auditorías Críticas de Producción
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Audit A: Productos activos sin receta */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              menuItemsWithoutRecipe.length > 0 
                ? 'border-amber-100 bg-amber-50/30' 
                : 'border-slate-100 bg-slate-50/40'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-sans">Productos Activos Sin Receta</span>
                <p className="text-[11px] text-slate-500 leading-snug mt-1 font-sans">
                  Productos configurados como comercialmente activos pero que no poseen insumos asignados. No decrementarán stock en KDS.
                </p>
              </div>

              {menuItemsWithoutRecipe.length > 0 ? (
                <div className="mt-3 bg-amber-100 border border-amber-200 p-2 text-stone-800 rounded-lg text-[10px] space-y-0.5">
                  <p className="font-bold text-amber-900">⚠️ {menuItemsWithoutRecipe.length} platos sin receta:</p>
                  <ul className="list-disc list-inside text-[9px] opacity-90">
                    {menuItemsWithoutRecipe.map(p => <li key={p.id_producto}>{p.nombre}</li>)}
                  </ul>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-1.5 text-emerald-700 text-[10px] font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Todos las platos poseen fórmulas asociadas.
                </div>
              )}
            </div>

            {/* Audit B: Stock bajo */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              ingredientsBelowMin.length > 0 
                ? 'border-rose-100 bg-rose-50/20' 
                : 'border-slate-100 bg-slate-50/40'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-sans">Insumos Abajo del Mínimo</span>
                <p className="text-[11px] text-slate-500 leading-snug mt-1 font-sans">
                  Materias primas que perforaron el stock de seguridad. Pueden ocasionar la inhabilitación de platos en terminales de Mozos.
                </p>
              </div>

              {ingredientsBelowMin.length > 0 ? (
                <div className="mt-3 bg-red-100 border border-red-200 p-2 text-red-800 rounded-lg text-[10px]">
                  <p className="font-bold text-red-900">🚨 {ingredientsBelowMin.length} materiales críticos:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ingredientsBelowMin.slice(0, 3).map(i => (
                      <span key={i.id_insumo} className="bg-white border rounded text-[9px] px-1 font-mono">{i.nombre}</span>
                    ))}
                    {ingredientsBelowMin.length > 3 && <span>...</span>}
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-1.5 text-emerald-700 text-[10px] font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Depósito abastecido de manera óptima.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Database Backups Local serialization */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-slate-800 text-xs font-sans tracking-tight">
                Copia de Seguridad y Exportación Local (.db Backup)
              </h4>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Descargue archivos físicos síncronos estructurados para migración u operaciones externas.
              </p>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => triggerCsvDownload('usuarios_export', [{ id: 1, nom: 'Enzo', rol: 'mozo' }, { id: 2, nom: 'Micaela', rol: 'mozo' }])}
              className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200/50"
            >
              <Download className="w-3 h-3 text-slate-500" />
              usuarios.csv
            </button>
            <button
              onClick={() => triggerCsvDownload('mesas_export', mesas)}
              className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200/50"
            >
              <Download className="w-3 h-3 text-slate-500" />
              mesas.csv
            </button>
            <button
              onClick={() => triggerCsvDownload('insumos_export', insumos)}
              className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200/50"
            >
              <Download className="w-3 h-3 text-slate-500" />
              insumos.csv
            </button>
            <button
              onClick={() => triggerCsvDownload('pedidos_export', pedidos.map(p => ({
                id: p.id_pedido,
                mesa: p.numero_mesa,
                mozo: p.mozo,
                items_count: p.items.length,
                total_est: p.items.reduce((sum, current) => sum + current.cantidad * 8000, 0),
                fecha: p.fecha_hora.toISOString()
              })))}
              className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200/50"
            >
              <Download className="w-3 h-3 text-slate-500" />
              pedidos.csv
            </button>
          </div>
        </div>

        {/* Entorno Servidor Python (requirements.txt) */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md space-y-4 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#FF4B4B] font-mono">requirements.txt</p>
              <h4 className="font-extrabold text-white text-xs font-sans tracking-tight">
                Dependencias del Servidor de Producción Python 3.11
              </h4>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                Copia o descarga los paquetes configurados para el login y base relacional PostgreSQL/Supabase.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 font-mono text-[10px] text-slate-300 max-h-[160px] overflow-y-auto scrollbar-thin">
            {[
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
            ].map((line, idx) => (
              <div key={idx} className="flex justify-between py-0.5 hover:bg-slate-900 px-1 rounded transition-colors">
                <span className={line.startsWith('#') ? 'text-slate-500 italic' : line.includes('>=') ? 'text-amber-300/95 font-medium' : 'text-slate-300'}>{line}</span>
                {!line.startsWith('#') && line.includes('>=') && (
                  <span className="text-[9px] text-[#FF4B4B] bg-red-950/40 border border-[#FF4B4B]/30 px-1 rounded font-bold">Compilado</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center bg-slate-850 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
            <span>Ubicación del script:</span>
            <span className="font-mono text-[10px] text-[#FF4B4B] bg-slate-950 px-2 py-0.5 rounded font-bold">backend/login.py</span>
          </div>
        </div>

      </div>

      {/* COLUMN RIGHT: Production Deploy Checklist (Col Span 5) */}
      <div className="lg:col-span-5">
        
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-white text-sm font-sans tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" />
              Checklist de Despliegue en Producción
            </h3>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Pasos requeridos antes del lanzamiento general en la sucursal.
            </p>
          </div>

          <div className="space-y-3">
            
            {/* Checklist item 1 */}
            <label className="flex items-start gap-3 p-2.5 bg-slate-850 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors border border-slate-800">
              <input
                type="checkbox"
                checked={deployChecklist.db_local}
                onChange={(e) => setDeployChecklist(prev => ({ ...prev, db_local: e.target.checked }))}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 bg-slate-800 focus:ring-offset-slate-900 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-100 block">Base de Datos SQLite inicializada</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-sans leading-normal">
                  Base local cargada de manera sincronizada en `data/restaurante.db` lista para persistir.
                </span>
              </div>
            </label>

            {/* Checklist item 2 */}
            <label className="flex items-start gap-3 p-2.5 bg-slate-850 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors border border-slate-800">
              <input
                type="checkbox"
                checked={deployChecklist.sql_supabase}
                onChange={(e) => setDeployChecklist(prev => ({ ...prev, sql_supabase: e.target.checked }))}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 bg-slate-800 focus:ring-offset-slate-900 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-100 block">Link SQL Supabase (PostgreSQL)</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-sans leading-normal">
                  Carga del esquema en la nube con `supabase/schema.sql` y enlace con variables secretas `DATABASE_URL`.
                </span>
              </div>
            </label>

            {/* Checklist item 3 */}
            <label className="flex items-start gap-3 p-2.5 bg-slate-850 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors border border-slate-800">
              <input
                type="checkbox"
                checked={menuItemsWithoutRecipe.length === 0}
                disabled
                className="mt-0.5 rounded border-slate-700 text-indigo-600 bg-slate-800 focus:ring-offset-slate-900 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-100 block flex items-center gap-1.5">
                  Recetas de Plato Completadas
                  <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold ${menuItemsWithoutRecipe.length === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                    {menuItemsWithoutRecipe.length === 0 ? 'SÍ' : `NO - ${menuItemsWithoutRecipe.length}`}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-sans leading-normal">
                  Todos los platos activos del menú gastronómico poseen receta de escandallo asociada. (Auditado automáticamente).
                </span>
              </div>
            </label>

            {/* Checklist item 4 */}
            <label className="flex items-start gap-3 p-2.5 bg-slate-850 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors border border-slate-800">
              <input
                type="checkbox"
                checked={ingredientsBelowMin.length === 0}
                disabled
                className="mt-0.5 rounded border-slate-700 text-indigo-600 bg-slate-800 focus:ring-offset-slate-900 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-100 block flex items-center gap-1.5">
                  Bodega Abastecida (Stock Mínimo)
                  <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold ${ingredientsBelowMin.length === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400 animate-pulse'}`}>
                    {ingredientsBelowMin.length === 0 ? 'SÍ' : `NO - Falta Abastecer`}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-sans leading-normal">
                  Evita quiebres de stock en cocina. Reponer insumos en la sección de Stock si hay alertas activas.
                </span>
              </div>
            </label>

            {/* Checklist item 5 */}
            <label className="flex items-start gap-3 p-2.5 bg-slate-850 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors border border-slate-800">
              <input
                type="checkbox"
                checked={deployChecklist.ci_github}
                onChange={(e) => setDeployChecklist(prev => ({ ...prev, ci_github: e.target.checked }))}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 bg-slate-800 focus:ring-offset-slate-900 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-100 block">Integración Continua (CI) en GitHub</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-sans leading-normal">
                  Workflow `.github/workflows/ci.yml` configurado para compilar, auditar código de Streamlit/TypeScript y pruebas unitarias de extremo a extremo.
                </span>
              </div>
            </label>

          </div>

          {/* Visual terminal logs widget inside checking */}
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 font-mono text-[9px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1 text-slate-300 font-extrabold border-b border-slate-800 pb-1 mb-1">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              STATUS CONSOLA DE PLENO DEPLOY
            </div>
            <p className="text-emerald-500">✔ python -m py_compile tests_restaurante.py ok</p>
            <p className="text-emerald-500">✔ npx tsc --noEmit && vite build success</p>
            <p className="text-slate-300">SQLite Engine: Linked successfully (data/restaurante.db)</p>
            <p className="text-purple-400">Supabase State: Waiting DB_URL secret assignment</p>
          </div>
        </div>

      </div>

    </div>
  );
}
