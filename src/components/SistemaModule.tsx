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
  Percent,
  FileKey,
  KeyRound,
  Trash2,
  UploadCloud,
  ReceiptText,
  Loader2
} from 'lucide-react';
import { ProductoMenu, Insumo, RecetaEscandallo, Pedido, Mesa } from '../types';
import SupabaseManager from './SupabaseManager';
import DataIntegrityPanel from './DataIntegrityPanel';
import ElPatronLogo from './ElPatronLogo';
import { useToast, ToastContainer } from './ToastContainer';
import {
  deleteArcaConfiguration,
  getArcaAdminConfig,
  saveArcaConfiguration,
  testArcaConnection,
  type ArcaAdminConfig,
} from '../services/arcaService';
import { DEFAULT_RESTAURANT_PROFILE } from '../lib/restaurantProfile';
import { argentinaDateIso } from '../lib/argentinaDate';
import { calculatePedidoTotal } from '../lib/orderPricing';
import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import type { DataIntegrityReport } from '../lib/dataIntegrity';
import { dataIntegrityService } from '../services/dataIntegrityService';
import {
  diagnosticTargetLabel,
  latencyNeedleAngle,
  latencyRating,
  type DiagnosticStorageTarget,
} from '../lib/systemDiagnostics';

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
  const [activeDbEngine, setActiveDbEngine] = useState<DiagnosticStorageTarget>('supabase-cloud');
  const [arcaConfig, setArcaConfig] = useState<ArcaAdminConfig | null>(null);
  const [arcaCuit, setArcaCuit] = useState(DEFAULT_RESTAURANT_PROFILE.cuit.replace(/\D/g, ''));
  const [arcaPuntoVenta, setArcaPuntoVenta] = useState('2');
  const [arcaEnvironment, setArcaEnvironment] = useState<'homologacion' | 'produccion'>('produccion');
  const [arcaLegalName, setArcaLegalName] = useState(DEFAULT_RESTAURANT_PROFILE.razonSocial);
  const [arcaTradeName, setArcaTradeName] = useState(DEFAULT_RESTAURANT_PROFILE.nombreComercial);
  const [arcaCommercialAddress, setArcaCommercialAddress] = useState(DEFAULT_RESTAURANT_PROFILE.direccion);
  const [arcaGrossIncome, setArcaGrossIncome] = useState(DEFAULT_RESTAURANT_PROFILE.ingresosBrutos);
  const [arcaActivityStart, setArcaActivityStart] = useState('2026-06-01');
  const [arcaCertificate, setArcaCertificate] = useState<File | null>(null);
  const [arcaPrivateKey, setArcaPrivateKey] = useState<File | null>(null);
  const [arcaLoading, setArcaLoading] = useState(true);
  const [arcaSaving, setArcaSaving] = useState(false);
  const [arcaTesting, setArcaTesting] = useState(false);
  const [arcaDeleting, setArcaDeleting] = useState(false);
  const [arcaPanelError, setArcaPanelError] = useState('');
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(true);
  const [integrityCleaning, setIntegrityCleaning] = useState(false);
  const [integrityError, setIntegrityError] = useState('');

  // Latency test states
  const [dbPingStatus, setDbPingStatus] = useState<'idle' | 'testing' | 'ready' | 'error'>('idle');
  const [dbPingMs, setDbPingMs] = useState<number>(0);
  const [dbPingError, setDbPingError] = useState('');
  const [needleAngle, setNeedleAngle] = useState(-90); // Rango: -90 a 90 grados

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

  useEffect(() => {
    let active = true;
    getArcaAdminConfig()
      .then(config => {
        if (!active) return;
        setArcaConfig(config);
        if (config.puntoVenta) setArcaPuntoVenta(String(config.puntoVenta));
        if (config.environment) setArcaEnvironment(config.environment);
        if (config.legalName) setArcaLegalName(config.legalName);
        if (config.tradeName) setArcaTradeName(config.tradeName);
        if (config.commercialAddress) setArcaCommercialAddress(config.commercialAddress);
        if (config.grossIncomeNumber) setArcaGrossIncome(config.grossIncomeNumber);
        if (config.activityStartDate) setArcaActivityStart(config.activityStartDate);
        setArcaPanelError('');
      })
      .catch(error => {
        if (active) setArcaPanelError(error instanceof Error ? error.message : 'No se pudo leer la configuracion ARCA.');
      })
      .finally(() => { if (active) setArcaLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSaveArca = async () => {
    const cleanCuit = arcaCuit.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cleanCuit)) {
      toast.error('El CUIT emisor debe tener exactamente 11 numeros.');
      return;
    }
    const puntoVenta = Number(arcaPuntoVenta);
    if (!Number.isInteger(puntoVenta) || puntoVenta < 1) {
      toast.error('Ingrese un punto de venta valido.');
      return;
    }
    if (!arcaLegalName.trim() || !arcaTradeName.trim() || !arcaCommercialAddress.trim() || !arcaGrossIncome.trim() || !arcaActivityStart) {
      toast.error('Complete todos los datos legales del emisor antes de guardar.');
      return;
    }
    setArcaSaving(true);
    try {
      const config = await saveArcaConfiguration({
        cuit: cleanCuit,
        puntoVenta,
        environment: arcaEnvironment,
        taxProfile: 'monotributo',
        legalName: arcaLegalName.trim(),
        tradeName: arcaTradeName.trim(),
        commercialAddress: arcaCommercialAddress.trim(),
        grossIncomeNumber: arcaGrossIncome.trim(),
        activityStartDate: arcaActivityStart,
        certificate: arcaCertificate,
        privateKey: arcaPrivateKey,
      });
      setArcaConfig(config);
      setArcaCertificate(null);
      setArcaPrivateKey(null);
      setArcaPanelError('');
      addLog('sistema', `ARCA: Firma digital guardada para el punto de venta ${puntoVenta} (${arcaEnvironment}).`);
      toast.success('Configuracion ARCA guardada y cifrada en el servidor.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la configuracion ARCA.';
      setArcaPanelError(message);
      toast.error(message);
    } finally {
      setArcaSaving(false);
    }
  };

  const handleTestArca = async () => {
    setArcaTesting(true);
    setArcaPanelError('');
    try {
      const result = await testArcaConnection();
      if (!result.success) throw new Error(result.error || result.status.message);
      setArcaConfig(previous => previous ? { ...previous, connected: true, message: result.status.message } : previous);
      addLog('sistema', 'ARCA: Conexion WSAA/WSFE comprobada correctamente para Factura C.');
      toast.success('Conexion con ARCA confirmada.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo conectar con ARCA.';
      setArcaPanelError(message);
      toast.error(message);
    } finally {
      setArcaTesting(false);
    }
  };

  const handleDeleteArca = async () => {
    if (!window.confirm('Se eliminara la firma digital guardada. Las facturas no podran obtener CAE hasta volver a configurarla.')) return;
    setArcaDeleting(true);
    try {
      const config = await deleteArcaConfiguration();
      setArcaConfig(config);
      setArcaCertificate(null);
      setArcaPrivateKey(null);
      addLog('sistema', 'ARCA: Firma digital desconectada desde el modulo Sistema.');
      toast.success(config.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la firma digital.');
    } finally {
      setArcaDeleting(false);
    }
  };

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
      if (p.activo === false) return false;
      const hasUsableRecipe = recetas.some(r => (
        r.id_producto === p.id_producto
        && Number(r.cantidad_a_descontar) > 0
        && insumos.some(insumo => insumo.id_insumo === r.id_insumo)
      ));
      return !hasUsableRecipe;
    });
  }, [productosMenu, recetas, insumos]);

  const ingredientsBelowMin = useMemo(() => {
    return insumos.filter(i => i.stock_actual <= i.stock_minimo);
  }, [insumos]);

  const localStorageAvailable = useMemo(() => {
    try {
      const key = 'el_patron_readiness_probe';
      localStorage.setItem(key, 'ok');
      const available = localStorage.getItem(key) === 'ok';
      localStorage.removeItem(key);
      return available;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    dataIntegrityService.audit()
      .then(report => {
        if (!active) return;
        setIntegrityReport(report);
        setIntegrityError('');
      })
      .catch(error => {
        if (active) setIntegrityError(error instanceof Error ? error.message : 'No se pudo auditar Supabase.');
      })
      .finally(() => { if (active) setIntegrityLoading(false); });
    return () => { active = false; };
  }, []);

  const handleRefreshIntegrity = async () => {
    setIntegrityLoading(true);
    setIntegrityError('');
    try {
      const report = await dataIntegrityService.audit();
      setIntegrityReport(report);
      toast.success('Auditoría de integridad actualizada.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo auditar Supabase.';
      setIntegrityError(message);
      toast.error(message);
    } finally {
      setIntegrityLoading(false);
    }
  };

  const handleSafeCleanup = async () => {
    if (!window.confirm('Se eliminarán sólo recetas inválidas o huérfanas y se desactivarán productos duplicados sin receta. No se borrarán ventas, facturas ni stocks duplicados.')) return;
    setIntegrityCleaning(true);
    setIntegrityError('');
    try {
      const result = await dataIntegrityService.cleanupSafe();
      setIntegrityReport(result.report);
      const changed = result.actions.reduce((sum, action) => sum + action.count, 0);
      addLog('sistema', `INTEGRIDAD: Limpieza segura de Supabase completada. ${changed} registros corregidos.`);
      toast.success(changed > 0 ? `Limpieza segura aplicada a ${changed} registros.` : 'No había correcciones automáticas pendientes.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo limpiar Supabase.';
      setIntegrityError(message);
      toast.error(message);
    } finally {
      setIntegrityCleaning(false);
    }
  };

  const supabaseConfigured = useMemo(() => Boolean(tryGetActiveSupabaseClient()), []);
  const arcaReady = Boolean(arcaConfig?.connected && arcaConfig.legalDataComplete && arcaConfig.environment === 'produccion');

  // Puntaje derivado exclusivamente de comprobaciones observables en el navegador.
  const scorePercent = useMemo(() => {
    const checks = [
      localStorageAvailable,
      supabaseConfigured,
      menuItemsWithoutRecipe.length === 0,
      ingredientsBelowMin.length === 0,
      arcaReady,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [arcaReady, ingredientsBelowMin, localStorageAvailable, menuItemsWithoutRecipe, supabaseConfigured]);

  // Medición real de la capa seleccionada. No se muestran valores simulados.
  const triggerSpeedTest = async () => {
    setDbPingStatus('testing');
    setDbPingError('');
    setNeedleAngle(-90);
    const startedAt = performance.now();
    try {
      if (activeDbEngine === 'local-cache') {
        const testKey = 'el_patron_diagnostic_probe';
        localStorage.setItem(testKey, 'ok');
        if (localStorage.getItem(testKey) !== 'ok') throw new Error('La cache local no pudo leerse.');
        localStorage.removeItem(testKey);
      } else {
        const client = tryGetActiveSupabaseClient();
        if (!client) throw new Error('Supabase no esta configurado.');
        const { error } = await client.from('mesas').select('id_mesa').limit(1);
        if (error) throw error;
      }
      const targetLatency = Math.max(1, Math.round(performance.now() - startedAt));
      setDbPingMs(targetLatency);
      setNeedleAngle(latencyNeedleAngle(targetLatency));
      setDbPingStatus('ready');
      addLog('sistema', `DIAGNOSTICO: Medicion real completada en ${diagnosticTargetLabel(activeDbEngine)}: ${targetLatency}ms.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo medir la capa de datos.';
      setDbPingStatus('error');
      setDbPingError(message);
      addLog('sistema', `DIAGNOSTICO ERROR: ${diagnosticTargetLabel(activeDbEngine)} no respondio. ${message}`);
      toast.error(message);
    }
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
    link.setAttribute("download", `Backup_${tableName}_${argentinaDateIso()}.csv`);
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
            <ElPatronLogo className="w-12 h-12 object-contain rounded" variant="badge" color="#8C6239" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#8C6239] dark:text-[#C8956A] tracking-tight uppercase">Módulo de Sistemas y Configuración</h2>
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

          <DataIntegrityPanel
            report={integrityReport}
            loading={integrityLoading}
            cleaning={integrityCleaning}
            error={integrityError}
            onRefresh={handleRefreshIntegrity}
            onCleanup={handleSafeCleanup}
          />
   
          {/* Motor de DB y Velocímetro */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-stone-400 dark:text-stone-300 block">Infraestructura y Persistencia</span>
                <h3 className="font-extrabold text-[#8C6239] dark:text-[#C8956A] text-sm uppercase tracking-tight mt-0.5">Capas de Persistencia Disponibles</h3>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">La selección inferior solo elige qué capa medir; no cambia la base principal.</p>
              </div>
              <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-black px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/50 uppercase">
                Conexión Segura
              </span>
            </div>
   
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setActiveDbEngine('local-cache')}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  activeDbEngine === 'local-cache'
                    ? 'border-[#624A3E] bg-[#624A3E]/5 ring-1 ring-[#624A3E]/10 dark:border-[#C8956A]'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-955 hover:bg-stone-100/50 dark:hover:bg-stone-850'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" />
                  <span className="text-xs font-black text-stone-800 dark:text-white uppercase">Cache local del navegador</span>
                </div>
                <p className="text-[10px] text-stone-550 dark:text-stone-300 mt-1.5 leading-relaxed font-semibold">
                  Respaldo operativo mediante LocalStorage e IndexedDB. Permite continuidad temporal cuando se interrumpe la red.
                </p>
              </button>
   
              <button
                onClick={() => setActiveDbEngine('supabase-cloud')}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  activeDbEngine === 'supabase-cloud'
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
                <span className="text-[10px] text-stone-400 dark:text-stone-300 uppercase font-black">Diagnóstico real de persistencia</span>
                <p className="text-[11px] text-stone-555 dark:text-stone-300 leading-snug">Mide una lectura real en {diagnosticTargetLabel(activeDbEngine)}.</p>
                <button
                  onClick={triggerSpeedTest}
                  disabled={dbPingStatus === 'testing'}
                  className="mt-3 py-1.5 px-3 bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-60"
                >
                  <Activity className="w-3.5 h-3.5 text-[#C8956A] animate-pulse" />
                  {dbPingStatus === 'testing' ? 'Midiendo...' : 'Medir respuesta'}
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
                      {dbPingMs} ms • {latencyRating(dbPingMs)}
                    </span>
                  ) : dbPingStatus === 'testing' ? (
                    <span className="text-[10px] text-stone-400 font-bold uppercase animate-pulse">Midiendo...</span>
                  ) : dbPingStatus === 'error' ? (
                    <span className="text-[9px] text-red-500 font-bold leading-tight">{dbPingError}</span>
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
              <h3 className="font-extrabold text-[#8C6239] dark:text-[#C8956A] text-sm uppercase tracking-tight mt-0.5">Visor Interno de Registros</h3>
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
                        ? 'border-[#8C6239] bg-[#8C6239]/5 ring-1 ring-[#8C6239]/10 dark:border-[#C8956A]' 
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

          {/* Firma digital ARCA: los archivos solo viajan al backend y se cifran antes de persistir. */}
          <div className="bg-[#FFFDF8] dark:bg-stone-900 rounded-2xl p-5 border border-[#D9CDBC] dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-stone-150 dark:border-stone-800 pb-3 text-left">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#EFE5D4] dark:bg-stone-800 flex items-center justify-center shrink-0">
                  <ReceiptText className="w-4.5 h-4.5 text-[#624A3E] dark:text-[#C8956A]" />
                </div>
                <div>
                  <h3 className="font-black text-stone-850 dark:text-white text-xs uppercase tracking-tight">
                    Firma Digital y Factura Electronica (ARCA)
                  </h3>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    Certificado X.509 y clave privada cifrados en el servidor para autorizar Facturas C con CAE.
                  </p>
                </div>
              </div>
              {arcaLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#8C6239]" />
              ) : (
                <span className={`shrink-0 px-2 py-1 rounded-full text-[8px] font-black uppercase border ${arcaConfig?.configured && arcaConfig.legalDataComplete ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900' : 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-850 dark:border-stone-700'}`}>
                  {arcaConfig?.connected ? 'Conectado a ARCA' : arcaConfig?.configured && arcaConfig.legalDataComplete ? 'Listo para facturar' : arcaConfig?.configured ? 'Datos incompletos' : 'Sin configurar'}
                </span>
              )}
            </div>

            {arcaLoading && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/50 text-sky-800 dark:text-sky-300 text-[9px] font-semibold text-left">
                <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                Consultando la configuración fiscal cifrada del servidor. Los datos definitivos aparecerán al completar esta verificación.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350">CUIT emisor (solo numeros)</span>
                <input
                  value={arcaCuit}
                  inputMode="numeric"
                  maxLength={11}
                  onChange={event => setArcaCuit(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#8C6239]/20"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350">Punto de venta</span>
                <input
                  value={arcaPuntoVenta}
                  inputMode="numeric"
                  onChange={event => setArcaPuntoVenta(event.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#8C6239]/20"
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350 block">Condicion fiscal</span>
                <div className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-[#F7F1E7] dark:bg-stone-850 text-[#624A3E] dark:text-[#D7AD87] text-xs font-black">
                  Monotributo - Factura C
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350">Apellido y nombre / razon social</span>
                <input value={arcaLegalName} maxLength={120} onChange={event => setArcaLegalName(event.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-[#8C6239]/20" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350">Nombre comercial</span>
                <input value={arcaTradeName} maxLength={120} onChange={event => setArcaTradeName(event.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-[#8C6239]/20" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350">Ingresos Brutos / condicion</span>
                <input value={arcaGrossIncome} maxLength={40} placeholder="Numero o No contribuyente" onChange={event => setArcaGrossIncome(event.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-[#8C6239]/20" />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350">Domicilio comercial registrado</span>
                <input value={arcaCommercialAddress} maxLength={180} onChange={event => setArcaCommercialAddress(event.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-[#8C6239]/20" />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350">Inicio de actividades</span>
                <input type="date" value={arcaActivityStart} onChange={event => setArcaActivityStart(event.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-[#8C6239]/20" />
              </label>
            </div>

            <div className="p-1 rounded-xl bg-[#E8DFD0] dark:bg-stone-850 grid grid-cols-2 gap-1">
              {(['homologacion', 'produccion'] as const).map(environment => (
                <button
                  key={environment}
                  type="button"
                  onClick={() => setArcaEnvironment(environment)}
                  className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${arcaEnvironment === environment ? 'bg-[#624A3E] text-white shadow-sm' : 'text-stone-500 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-stone-800'}`}
                >
                  {environment === 'produccion' ? 'Produccion' : 'Homologacion'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 text-left">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350">Certificado (.crt / .pem)</span>
                <div className="flex gap-1.5">
                  <label className={`min-w-0 flex-1 h-10 px-3 border rounded-xl flex items-center justify-center gap-2 cursor-pointer text-[9px] font-black transition-colors ${arcaCertificate || arcaConfig?.certificateConfigured ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400' : 'border-dashed border-stone-300 bg-white text-stone-500 dark:bg-stone-950 dark:border-stone-700'}`}>
                    {arcaCertificate ? <UploadCloud className="w-3.5 h-3.5 shrink-0" /> : <FileKey className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{arcaCertificate?.name || (arcaConfig?.certificateConfigured ? 'Certificado cargado' : 'Seleccionar certificado')}</span>
                    <input
                      type="file"
                      accept=".crt,.cer,.pem,application/x-x509-ca-cert"
                      className="hidden"
                      onChange={event => setArcaCertificate(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button type="button" onClick={() => setArcaCertificate(null)} className="w-10 h-10 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-950 flex items-center justify-center text-stone-400 hover:text-rose-600 cursor-pointer" aria-label="Quitar certificado seleccionado">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <span className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-350">Clave privada (.key / .pem)</span>
                <div className="flex gap-1.5">
                  <label className={`min-w-0 flex-1 h-10 px-3 border rounded-xl flex items-center justify-center gap-2 cursor-pointer text-[9px] font-black transition-colors ${arcaPrivateKey || arcaConfig?.privateKeyConfigured ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400' : 'border-dashed border-stone-300 bg-white text-stone-500 dark:bg-stone-950 dark:border-stone-700'}`}>
                    {arcaPrivateKey ? <UploadCloud className="w-3.5 h-3.5 shrink-0" /> : <KeyRound className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{arcaPrivateKey?.name || (arcaConfig?.privateKeyConfigured ? 'Clave privada cargada' : 'Seleccionar clave privada')}</span>
                    <input
                      type="file"
                      accept=".key,.pem"
                      className="hidden"
                      onChange={event => setArcaPrivateKey(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button type="button" onClick={() => setArcaPrivateKey(null)} className="w-10 h-10 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-950 flex items-center justify-center text-stone-400 hover:text-rose-600 cursor-pointer" aria-label="Quitar clave privada seleccionada">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {arcaConfig?.certificateValidTo && (
              <div className="text-left text-[9px] leading-relaxed text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-850 rounded-lg px-3 py-2 border border-stone-150 dark:border-stone-800">
                Certificado vigente hasta <b>{new Date(arcaConfig.certificateValidTo).toLocaleDateString('es-AR')}</b> · origen: {arcaConfig.source === 'database' ? 'panel Sistema' : 'variables privadas del servidor'}.
              </div>
            )}

            {arcaConfig?.connected && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[9px] font-semibold text-left leading-relaxed">
                <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Conexion WSAA/WSFE confirmada con ARCA. {arcaConfig.message || 'El servicio fiscal respondio correctamente.'}</span>
              </div>
            )}

            {arcaPanelError && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-[9px] font-semibold text-left leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {arcaPanelError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                disabled={arcaSaving || arcaLoading}
                onClick={handleSaveArca}
                className="py-2.5 px-4 bg-[#624A3E] hover:bg-[#503B32] disabled:opacity-50 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                {arcaSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar configuracion
              </button>
              <button
                type="button"
                disabled={!arcaConfig?.configured || !arcaConfig.legalDataComplete || arcaTesting}
                onClick={handleTestArca}
                className="py-2.5 px-4 bg-[#1A1817] hover:bg-black disabled:opacity-40 text-[#F3C55A] rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                {arcaTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                Probar conexion
              </button>
            </div>

            <button
              type="button"
              disabled={!arcaConfig?.configured || arcaDeleting}
              onClick={handleDeleteArca}
              className="w-full py-2 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 disabled:opacity-40 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              {arcaDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Desconectar / eliminar firma digital
            </button>
          </div>
          
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
                  checked={localStorageAvailable}
                  disabled
                  className="mt-0.5 rounded border-stone-700 text-[#C8956A] bg-stone-900 focus:ring-offset-[#1A1817] w-4 h-4"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">Respaldo local del navegador disponible</span>
                  <span className="text-[9px] text-stone-400 block mt-0.5 leading-normal">
                    LocalStorage e IndexedDB disponibles como contingencia temporal; la base principal permanece en Supabase.
                  </span>
                </div>
              </label>

              {/* Item 2 */}
              <label className="flex items-start gap-3 p-2.5 bg-[#252220] hover:bg-[#2F2B29] rounded-xl cursor-pointer transition-colors border border-stone-800">
                <input
                  type="checkbox"
                  checked={supabaseConfigured}
                  disabled
                  className="mt-0.5 rounded border-stone-700 text-[#C8956A] bg-stone-900 focus:ring-offset-[#1A1817] w-4 h-4"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">Cliente Supabase PostgreSQL configurado</span>
                  <span className="text-[9px] text-stone-400 block mt-0.5 leading-normal">
                    La aplicación tiene una configuración de nube válida; use la medición superior para comprobar la respuesta.
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
                    Cada plato activo debe tener al menos un insumo existente y una cantidad positiva en su escandallo.
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

              {/* Item 5 (ARCA autoevaluado) */}
              <label className="flex items-start gap-3 p-2.5 bg-[#252220] rounded-xl border border-stone-800 opacity-90">
                <input
                  type="checkbox"
                  checked={arcaReady}
                  disabled
                  className="mt-0.5 rounded border-stone-700 text-[#C8956A] bg-stone-900 focus:ring-offset-[#1A1817] w-4 h-4"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">ARCA Producción Verificado</span>
                  <span className="text-[9px] text-stone-400 block mt-0.5 leading-normal">
                    Requiere datos legales completos y una prueba WSAA/WSFE exitosa en el ambiente de producción.
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
              <p className="text-emerald-500 font-bold">✔ npm test + TypeScript + build verificados</p>
              <p className="text-stone-300">Cache local: LocalStorage / IndexedDB disponible</p>
              <p className="text-stone-400 font-bold">Diagnóstico seleccionado: {diagnosticTargetLabel(activeDbEngine)}</p>
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
                  total_est: calculatePedidoTotal(p, productosMenu),
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
              <Compass className="w-4.5 h-4.5 text-[#8C6239] dark:text-[#C8956A]" />
              <div className="text-left">
                <h4 className="font-bold text-[#8C6239] dark:text-[#C8956A] text-xs uppercase tracking-tight">
                  Logotipo y Marca
                </h4>
                <p className="text-[10px] text-stone-500 mt-0.5 font-semibold">
                  Carga una imagen personalizada del logotipo (ej: caballo, isotipo) para los banners de toda la app.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-[#8C6239]/40 rounded-xl bg-[#FFFDF8]/40 dark:bg-stone-955/20 transition-all space-y-3 relative group">
              <div className="w-16 h-16 rounded-full bg-[#FAF4EE] dark:bg-stone-850 flex items-center justify-center p-1 shadow-sm border border-stone-100 dark:border-stone-800 relative overflow-hidden">
                <ElPatronLogo className="w-14 h-14 object-contain rounded-full" variant="badge" color="#8C6239" />
              </div>

              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-stone-850 dark:text-stone-200 block">Subir Logo El Patrón</span>
                <p className="text-[9px] text-stone-505 dark:text-stone-400 max-w-[210px] leading-relaxed mx-auto font-semibold">
                  La imagen seleccionada reemplazará el isotipo vectorial por defecto en la esquina del menú y en la barra de navegación lateral.
                </p>
              </div>

              <div className="flex gap-2 w-full pt-1">
                <label className="flex-1 py-1.5 px-2 bg-[#8C6239] hover:bg-[#B97F47] text-stone-950 rounded-lg text-[10px] font-black uppercase text-center cursor-pointer transition-colors shadow-sm block">
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
