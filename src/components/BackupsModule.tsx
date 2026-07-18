import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  Trash, 
  Search, 
  X, 
  AlertTriangle,
  UploadCloud,
  FileJson,
  Plus,
  StickyNote,
  Server,
  CloudLightning,
  Sparkles,
  Info
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { backupsService, BackupSnapshotData, Checkpoint, parseBackupContent } from '../services/backupsService';
import { getAutomaticBackupStatus } from '../lib/automaticBackup';
import { validateBackupSnapshot, type BackupValidationReport } from '../lib/backupValidation';
import { EventoLog, Insumo, Merma, Mesa, Pedido, ProductoMenu, RecetaEscandallo, Usuario } from '../types';
import { usuariosService } from '../services/usuariosService';
import { mesasService } from '../services/mesasService';
import { insumosService } from '../services/insumosService';
import { menuService } from '../services/menuService';
import { recetasService } from '../services/recetasService';
import { pedidosService } from '../services/pedidosService';
import { mermasService } from '../services/mermasService';
import { proveedoresService } from '../services/proveedoresService';
import { promocionesService } from '../services/promocionesService';
import { reservasService } from '../services/reservasService';
import { facturacionService } from '../services/facturacionService';
import { auditoriaService } from '../services/auditoriaService';
import { ToastContainer, useToast } from './ToastContainer';

interface BackupsModuleProps {
  operationalData: {
    usuarios: Usuario[];
    mesas: Mesa[];
    insumos: Insumo[];
    productosMenu: ProductoMenu[];
    recetas: RecetaEscandallo[];
    pedidos: Pedido[];
    mermas: Merma[];
    logs: EventoLog[];
  };
  onRestoreData: (snapshot: BackupSnapshotData) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function BackupsModule({
  operationalData,
  onRestoreData,
  addLog
}: BackupsModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [backups, setBackups] = useState<Checkpoint[]>([]);
  const [searchBackup, setSearchBackup] = useState('');
  const debouncedSearchBackup = useDebounce(searchBackup, 300);
  
  // Modals & confirms state
  const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'delete'; cp: Checkpoint } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customBackupName, setCustomBackupName] = useState('');
  const [customBackupNotes, setCustomBackupNotes] = useState('');

  // Drag & Drop state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedSnapshot, setUploadedSnapshot] = useState<BackupSnapshotData | null>(null);
  const [uploadedValidation, setUploadedValidation] = useState<BackupValidationReport | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [showUploadPreview, setShowUploadPreview] = useState(false);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [storageEstimate, setStorageEstimate] = useState({ usage: 0, quota: 0 });
  const [restoreCandidate, setRestoreCandidate] = useState<{
    snapshot: BackupSnapshotData;
    validation: BackupValidationReport;
  } | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoredOk, setRestoredOk] = useState<string | null>(null);

  const filteredBackups = backups.filter(cp =>
    cp.nombre.toLowerCase().includes(debouncedSearchBackup.toLowerCase())
  );

  const loadBackupHistory = async () => {
    setLoadingHistory(true);
    try {
      setBackups(await backupsService.list());
    } catch {
      toast.error('No se pudo cargar el historial de respaldos.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadBackupHistory();
    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then(estimate => {
        setStorageEstimate({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 });
      }).catch(() => undefined);
    }
  }, []);

  const automaticStatus = useMemo(() => getAutomaticBackupStatus(backups), [backups]);
  const formatAutomaticDate = (date: Date) => date.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Uso real del almacenamiento del origen (Cache API, IndexedDB y localStorage).
  const quotaPercent = useMemo(() => {
    if (storageEstimate.quota <= 0) return 0;
    return Math.min(Math.round((storageEstimate.usage / storageEstimate.quota) * 100), 100);
  }, [storageEstimate]);

  const handleOpenCreateModal = () => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    setCustomBackupName(`Punto de Control (${timestamp})`);
    setCustomBackupNotes('');
    setShowCreateModal(true);
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowCreateModal(false);
    setBackingUp(true);
    addLog('sistema', `SISTEMA: Iniciando volcado completo de base de datos...`);
    try {
      const [
        usuarios,
        mesas,
        insumos,
        productosMenu,
        recetas,
        pedidos,
        mermas,
        proveedores,
        promociones,
        reservas,
        facturas,
        logs,
        supplemental
      ] = await Promise.all([
        usuariosService.list().catch(() => operationalData.usuarios),
        mesasService.list().catch(() => operationalData.mesas),
        insumosService.list().catch(() => operationalData.insumos),
        menuService.list().catch(() => operationalData.productosMenu),
        recetasService.list().catch(() => operationalData.recetas),
        pedidosService.list().catch(() => operationalData.pedidos),
        mermasService.list().catch(() => operationalData.mermas),
        proveedoresService.list().catch(() => []),
        promocionesService.list().catch(() => []),
        reservasService.list().catch(() => []),
        facturacionService.list().catch(() => []),
        auditoriaService.list().catch(() => operationalData.logs),
        backupsService.captureSupplementalData()
      ]);

      const snapshot = {
        meta: {
          exportado: new Date().toISOString(),
          version: '1.4.0-Supabase',
          notas: customBackupNotes.trim() || undefined
        },
        data: {
          usuarios,
          mesas,
          insumos,
          productosMenu,
          recetas,
          pedidos,
          mermas,
          proveedores,
          promociones,
          reservas,
          facturas,
          logs,
          ...supplemental
        }
      };

      const newBackup = await backupsService.create({
        nombre: customBackupName.trim() || 'Punto de Control Completo',
        dataToDump: snapshot.data
      });
      setBackups(prev => [newBackup, ...prev]);
      
      // Descarga de archivo JSON interactiva
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `el_patron_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      addLog('sistema', `SISTEMA: Respaldo "${newBackup.nombre}" generado y descargado.`);
      toast.success(
        newBackup.ubicacion === 'cloud'
          ? 'Copia de seguridad guardada en Supabase y descargada como JSON.'
          : 'Copia guardada localmente y descargada. Servidor Supabase desconectado.'
      );
    } catch (error: any) {
      console.error(error);
      addLog('sistema', `ERROR: Falló la creación de copia de seguridad: ${error.message}`);
      toast.error(`No se pudo crear el respaldo: ${error.message}`);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreBackup = async (cp: Checkpoint) => {
    setLoadingId(cp.id_cp);
    try {
      const snapshot = parseBackupContent(await backupsService.getContent(cp));
      setRestoreCandidate({ snapshot, validation: validateBackupSnapshot(snapshot) });
      setConfirmAction({ type: 'restore', cp });
    } catch (error: any) {
      toast.error(`No se pudo verificar la copia: ${error.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const executeRestore = async (cp: Checkpoint) => {
    if (!restoreCandidate?.validation.valid) {
      toast.error('La restauración está bloqueada porque la copia contiene errores de integridad.');
      return;
    }
    setConfirmAction(null);
    setLoadingId(cp.id_cp);
    try {
      const snapshot = restoreCandidate.snapshot;
      const result = await backupsService.restore(snapshot);
      onRestoreData(snapshot);
      addLog('sistema', `SISTEMA: Base de datos y estado del salón restaurados desde el respaldo '${cp.nombre}'.`);
      setRestoredOk(`La copia '${cp.nombre}' se restauró de manera exitosa.`);
      toast.success('Punto de control restaurado correctamente.');
      if (result.usersSkipped) {
        toast.info('Los usuarios y contraseñas actuales se conservaron por seguridad.');
      }
      setTimeout(() => setRestoredOk(null), 5000);
    } catch (error: any) {
      addLog('sistema', `ERROR: Error al restaurar '${cp.nombre}': ${error.message}`);
      toast.error(error.message);
    } finally {
      setLoadingId(null);
      setRestoreCandidate(null);
    }
  };

  const handleDeleteBackup = (id: string) => {
    const cp = backups.find(c => c.id_cp === id);
    if (cp) {
      setRestoreCandidate(null);
      setConfirmAction({ type: 'delete', cp });
    }
  };

  const executeDelete = async (id: string) => {
    setConfirmAction(null);
    setBackups(prev => prev.filter(c => c.id_cp !== id));
    const removedFromCloud = await backupsService.remove(id);
    addLog('sistema', `SISTEMA: Punto de control eliminado.`);
    toast.info(removedFromCloud ? 'Respaldo eliminado.' : 'Respaldo local borrado.');
  };

  // Drag & Drop Files handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        // El backup descargado guarda los datos adentro de { meta, data }
        const snapshot = parsed.data ? parseBackupContent(JSON.stringify(parsed.data)) : parseBackupContent(text);
        
        setUploadedSnapshot(snapshot);
        setUploadedValidation(validateBackupSnapshot(snapshot));
        setUploadedFileName(file.name);
        setShowUploadPreview(true);
      } catch (err: any) {
        toast.error(`El archivo no es una copia válida: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processBackupFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processBackupFile(file);
    }
  };

  const executeUploadRestore = async () => {
    if (!uploadedSnapshot) return;
    if (!uploadedValidation?.valid) {
      toast.error('La restauración está bloqueada porque el archivo contiene errores de integridad.');
      return;
    }
    setShowUploadPreview(false);
    setBackingUp(true);
    addLog('sistema', `SISTEMA: Iniciando restauración forzada desde archivo subido '${uploadedFileName}'...`);
    try {
      const result = await backupsService.restore(uploadedSnapshot);
      onRestoreData(uploadedSnapshot);
      addLog('sistema', `SISTEMA: Sincronización completa completada desde el archivo importado '${uploadedFileName}'.`);
      setRestoredOk(`El archivo '${uploadedFileName}' se importó y restauró con éxito.`);
      toast.success('El sistema ha sido restaurado desde el archivo importado.');
      if (result.usersSkipped) {
        toast.info('Los usuarios y contraseñas actuales se conservaron por seguridad.');
      }
      setTimeout(() => setRestoredOk(null), 5000);
    } catch (err: any) {
      addLog('sistema', `ERROR: Error al importar respaldo: ${err.message}`);
      toast.error(`Error de restauración: ${err.message}`);
    } finally {
      setBackingUp(false);
      setUploadedSnapshot(null);
      setUploadedValidation(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Indicadores de almacenamiento y estado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Almacenamiento real del origen: Cache API, IndexedDB y localStorage */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-850 shadow-xs space-y-2">
          <span className="text-[10px] text-stone-400 dark:text-stone-300 font-black uppercase tracking-wider block">Almacenamiento del Sitio</span>
          <div className="flex justify-between items-baseline">
            <h4 className="text-xl font-black text-stone-900 dark:text-white font-mono">
              {(storageEstimate.usage / (1024 * 1024)).toFixed(2)} MB
            </h4>
            <span className="text-xs font-bold text-stone-400">({quotaPercent}%)</span>
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                quotaPercent < 40 ? 'bg-emerald-500' : quotaPercent < 80 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <span className="text-[9px] text-stone-450 dark:text-stone-300 font-bold">Incluye caché sin conexión y copias locales.</span>
        </div>

        {/* Base de Datos Link status */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-850 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-stone-400 dark:text-stone-300 font-black uppercase tracking-wider block">Motor de Sincronización</span>
            <h4 className="text-sm font-black text-[#624A3E] dark:text-[#C8956A] mt-1.5 uppercase flex items-center gap-1.5">
              <Server className="w-4 h-4" />
              Supabase PostgreSQL Link
            </h4>
          </div>
          <span className="text-[9px] text-stone-450 dark:text-stone-300 font-bold block mt-1">Sincronización bidireccional en caliente.</span>
        </div>

        {/* Último Respaldo */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-850 shadow-[#624A3E]/5 border-l-4 border-l-[#624A3E] flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-stone-400 dark:text-stone-300 font-black uppercase tracking-wider block">Última Copia Guardada</span>
            <h4 className="text-xs font-black text-stone-750 dark:text-white mt-1.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-stone-400" />
              {backups[0]?.fecha || 'Sin copias disponibles'}
            </h4>
          </div>
          <span className="text-[9px] text-stone-450 dark:text-stone-300 font-bold block mt-1">
            {backups.length} puntos de control en el historial.
          </span>
        </div>

        <div className={`bg-white dark:bg-stone-900 p-5 rounded-2xl border shadow-xs border-l-4 flex flex-col justify-between ${
          automaticStatus.health === 'healthy'
            ? 'border-emerald-200 dark:border-emerald-900/60 border-l-emerald-500'
            : automaticStatus.health === 'delayed'
              ? 'border-red-200 dark:border-red-900/60 border-l-red-500'
              : 'border-amber-200 dark:border-amber-900/60 border-l-amber-500'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-stone-400 dark:text-stone-300 font-black uppercase tracking-wider">Respaldo Automático</span>
              <button
                type="button"
                onClick={() => void loadBackupHistory()}
                disabled={loadingHistory}
                className="p-1 rounded-lg text-stone-400 hover:text-[#624A3E] hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 cursor-pointer"
                title="Actualizar estado"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <h4 className={`text-xs font-black mt-1.5 flex items-center gap-1.5 ${
              automaticStatus.health === 'healthy'
                ? 'text-emerald-700 dark:text-emerald-300'
                : automaticStatus.health === 'delayed'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-amber-700 dark:text-amber-300'
            }`}>
              {automaticStatus.health === 'healthy'
                ? <CheckCircle className="w-4 h-4" />
                : automaticStatus.health === 'delayed'
                  ? <AlertTriangle className="w-4 h-4" />
                  : <CloudLightning className="w-4 h-4" />}
              {loadingHistory
                ? 'Verificando...'
                : automaticStatus.health === 'healthy'
                  ? 'Funcionando correctamente'
                  : automaticStatus.health === 'delayed'
                    ? 'Ejecución demorada'
                    : 'Primera ejecución pendiente'}
            </h4>
          </div>
          <div className="mt-2 space-y-0.5 text-[9px] text-stone-500 dark:text-stone-300 font-bold">
            <p>
              Última: {automaticStatus.lastRunAt ? formatAutomaticDate(automaticStatus.lastRunAt) : 'sin copia automática'}
            </p>
            <p>Próxima ventana: {formatAutomaticDate(automaticStatus.nextRunAt)} hs</p>
          </div>
        </div>

      </div>

      {/* Panel de Operaciones e Historial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LISTADO DE BACKUPS (Span 7) */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-5 lg:col-span-7">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100 dark:border-stone-850">
            <div>
              <h3 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Database className="w-5 h-5 text-[#624A3E] dark:text-[#C8956A]" />
                Copias de Seguridad (DUMP)
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5 font-bold">Historial de puntos de control guardados en la nube y archivos locales.</p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              disabled={backingUp}
              className="w-full sm:w-auto px-4 py-2 bg-[#624A3E] hover:bg-[#503C32] disabled:bg-stone-300 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {backingUp ? 'Procesando...' : 'Crear Copia'}
            </button>
          </div>

          {restoredOk && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl animate-pulse flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="font-extrabold text-emerald-900">Restauración Exitosa del Sistema Gastronómico</p>
                <p className="font-medium text-emerald-700/90 mt-0.5">{restoredOk}</p>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="relative max-w-xs">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchBackup} 
              onChange={e => setSearchBackup(e.target.value)}
              placeholder="Buscar respaldo por nombre..."
              className="w-full pl-8 pr-2 py-1.5 text-xs border border-stone-200 dark:border-stone-750 rounded-lg bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-100 focus:outline-none" 
            />
          </div>

          {/* Lista de Checkpoints */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {backups.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-8 text-center bg-stone-50/50 dark:bg-stone-950/20">
                <Database className="w-8 h-8 text-stone-300 dark:text-stone-700 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-600 dark:text-stone-305">No se encontraron copias de seguridad.</p>
                <p className="text-xs text-stone-400 mt-1">Crea una nueva copia para guardar y poder descargar tu base de datos actual.</p>
              </div>
            )}
            
            {filteredBackups.map(cp => {
              const isLoading = loadingId === cp.id_cp;
              return (
                <div 
                  key={cp.id_cp} 
                  className="p-4 bg-[#F5F1E9]/30 dark:bg-stone-850/20 border border-stone-150 dark:border-stone-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-[#F5F1E9]/60 dark:hover:bg-stone-850/40 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-stone-900 dark:text-white text-sm tracking-tight">{cp.nombre}</h4>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        cp.tipo === 'automatica'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50'
                          : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50'
                      }`}>
                        {cp.tipo === 'automatica' ? 'Automática' : 'Manual'}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        cp.ubicacion === 'cloud' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50' 
                          : 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
                      }`}>
                        {cp.ubicacion === 'cloud' ? 'Supabase' : 'Este dispositivo'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-stone-400 font-bold">
                      <span>Fecha: <strong className="text-stone-600 dark:text-stone-300 font-mono">{cp.fecha}</strong></span>
                      <span>•</span>
                      <span>Peso: <strong className="text-stone-600 dark:text-stone-300 font-mono">{cp.peso}</strong></span>
                      <span>•</span>
                      <span>Colecciones: <strong className="text-stone-600 dark:text-stone-300">{cp.tablas_afectadas.split(',').filter(Boolean).length}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => handleRestoreBackup(cp)}
                      disabled={isLoading}
                      className="flex-1 sm:flex-initial py-1.5 px-3 rounded-lg bg-orange-50 hover:bg-orange-100 disabled:bg-stone-150 text-orange-700 disabled:text-stone-400 text-[10px] font-black transition-colors flex items-center justify-center gap-1 cursor-pointer dark:bg-orange-950/30 dark:text-orange-300 dark:hover:bg-orange-950/50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                      {isLoading ? 'Cargando...' : 'Restaurar'}
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(cp.id_cp)}
                      className="p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Eliminar del historial"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* IMPORTACIÓN JSON DRAG & DROP (Span 5) */}
        <div className="space-y-6 lg:col-span-5">
          
          {/* Zona de Drop */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-stone-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" />
              Importación Externa de Respaldo
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-300 font-bold leading-normal">
              ¿Tienes una copia de seguridad en tu computadora? Arrastra el archivo `.json` o haz clic abajo para recuperarlo directamente.
            </p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-2xl text-center flex flex-col items-center justify-center transition-all cursor-pointer bg-[#FFFDF8]/40 dark:bg-stone-950/10 ${
                isDragging 
                  ? 'border-[#624A3E] bg-[#624A3E]/5 dark:border-[#C8956A]' 
                  : 'border-stone-200 dark:border-stone-800 hover:border-[#624A3E]/30 dark:hover:border-[#C8956A]/30'
              }`}
            >
              <FileJson className={`w-8 h-8 mx-auto mb-2.5 transition-transform ${isDragging ? 'scale-110 text-[#624A3E] dark:text-[#C8956A]' : 'text-stone-300 dark:text-stone-700'}`} />
              <span className="text-[10px] font-black text-stone-850 dark:text-stone-200 block uppercase">Arrastra el archivo JSON aquí</span>
              <span className="text-[9px] text-stone-400 dark:text-stone-405 block mt-1 font-semibold">o selecciona desde tu dispositivo</span>
              
              <label className="mt-3.5 px-3 py-1.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-[9px] font-black uppercase rounded-lg transition-colors cursor-pointer block">
                Seleccionar Archivo
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {/* Panel de Ayuda y Diagnóstico */}
          <div className="bg-stone-50 dark:bg-stone-900/60 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs text-stone-550 dark:text-stone-300 space-y-3">
            <h5 className="font-extrabold text-stone-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
              <Info className="w-3.5 h-3.5 text-[#624A3E] dark:text-[#C8956A]" />
              Manual de Procedimiento
            </h5>
            <ul className="list-decimal list-inside space-y-2 text-[10px] font-semibold leading-relaxed">
              <li>El sistema genera descargas <strong className="font-mono">.json</strong> con las 20 colecciones operativas, incluidos pagos, cierres, clientes y trazabilidad de inventario.</li>
              <li>Al restaurar, se sobreescribe el estado de comandas del salón, stock e IVA.</li>
              <li>Por seguridad, las identidades, contraseñas y secretos ARCA nunca se reemplazan desde un archivo de respaldo.</li>
            </ul>
          </div>

        </div>

      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* MODAL CREAR BACKUP PERSONALIZADO */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateBackup} className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-left">
            <div className="p-4 bg-stone-50 dark:bg-stone-850 border-b border-stone-150 dark:border-stone-800 flex items-center justify-between">
              <h3 className="text-xs font-black text-stone-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#624A3E]" />
                Nuevo Punto de Control
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)} 
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-stone-550 uppercase tracking-wider block mb-1">Nombre Identificador</label>
                <input 
                  type="text" 
                  value={customBackupName} 
                  onChange={e => setCustomBackupName(e.target.value)}
                  placeholder="Ej. Cierre de caja sábado noche"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 font-bold focus:outline-none" 
                  required 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-555 uppercase tracking-wider block mb-1">Comentarios / Notas Contexto</label>
                <textarea 
                  value={customBackupNotes} 
                  onChange={e => setCustomBackupNotes(e.target.value)}
                  placeholder="Ej. Se tomaron respaldos antes de actualizar la carta de postres..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 h-20 resize-none focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-850 border-t border-stone-150 dark:border-stone-800 flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="py-2 px-4 rounded-xl border border-stone-200 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 text-xs font-black uppercase hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="py-2 px-4 rounded-xl bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-black uppercase transition-all cursor-pointer"
              >
                Confirmar y Descargar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL PREVISUALIZAR IMPORTACIÓN JSON */}
      {showUploadPreview && uploadedSnapshot && (
        <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-left">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/50 flex items-start gap-3 justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"><AlertTriangle className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-xs font-black text-amber-900 dark:text-amber-400 uppercase tracking-wider">Confirmar Restauración Externa</h3>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold mt-0.5">Se sobreescribirán todos los datos del servidor.</p>
                </div>
              </div>
              <button onClick={() => {
                setShowUploadPreview(false);
                setUploadedSnapshot(null);
                setUploadedValidation(null);
              }} className="p-1 rounded-lg text-amber-550 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[9px] uppercase font-black text-stone-400 block">Archivo Cargado</span>
                <span className="text-xs font-extrabold text-stone-800 dark:text-white font-mono break-all">{uploadedFileName}</span>
              </div>

              {/* Grid de colecciones detectadas */}
              <div className="border border-stone-150 dark:border-stone-850 rounded-xl overflow-hidden">
                <div className="bg-stone-50 dark:bg-stone-850 px-3 py-1.5 text-[9px] font-black uppercase text-stone-400">
                  Registros Identificados
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 font-mono text-[10px] text-stone-600 dark:text-stone-300">
                  <div>• Usuarios: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.usuarios.length}</strong></div>
                  <div>• Mesas: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.mesas.length}</strong></div>
                  <div>• Insumos: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.insumos.length}</strong></div>
                  <div>• Productos: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.productosMenu.length}</strong></div>
                  <div>• Fórmulas/Recetas: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.recetas.length}</strong></div>
                  <div>• Comandas: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.pedidos.length}</strong></div>
                  <div>• Facturas: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.facturas.length}</strong></div>
                  <div>• Pagos: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.pagos.length}</strong></div>
                  <div>• Cierres: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.cierresCaja.length}</strong></div>
                  <div>• Clientes: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.clientes.length}</strong></div>
                  <div>• Mov. inventario: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.movimientosInventario.length}</strong></div>
                  <div>• Historial costos: <strong className="text-stone-800 dark:text-white">{uploadedSnapshot.historialCostos.length}</strong></div>
                </div>
              </div>

              {uploadedValidation && (
                <div className={`rounded-xl border p-3 space-y-2 ${
                  uploadedValidation.valid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300'
                    : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300'
                }`}>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase">
                    <span>{uploadedValidation.valid ? 'Integridad aprobada' : 'Restauración bloqueada'}</span>
                    <span>{uploadedValidation.totalRecords} registros</span>
                  </div>
                  <p className="text-[10px] font-bold">
                    {uploadedValidation.errors.length} errores · {uploadedValidation.warnings.length} advertencias
                  </p>
                  {[...uploadedValidation.errors, ...uploadedValidation.warnings].slice(0, 4).map((issue, index) => (
                    <p key={`${issue.code}-${index}`} className="text-[9px] font-semibold leading-snug">• {issue.message}</p>
                  ))}
                  {uploadedValidation.errors.length + uploadedValidation.warnings.length > 4 && (
                    <p className="text-[9px] font-black">Hay más observaciones en el diagnóstico.</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-850 border-t border-stone-150 dark:border-stone-800 flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowUploadPreview(false);
                  setUploadedSnapshot(null);
                  setUploadedValidation(null);
                }}
                className="py-2 px-4 rounded-xl border border-stone-200 bg-white dark:bg-stone-900 text-stone-605 text-stone-600 dark:text-stone-300 text-xs font-black uppercase hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={executeUploadRestore}
                disabled={!uploadedValidation?.valid}
                className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-stone-300 disabled:text-stone-500 text-white text-xs font-black uppercase transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {uploadedValidation?.valid ? 'Reemplazar Base de Datos' : 'Copia Bloqueada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAR RESTAURAR O BORRAR BACKUP DESDE LA LISTA */}
      {confirmAction && (
        <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-left">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/50 flex items-start gap-3 justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"><AlertTriangle className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-xs font-black text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                    {confirmAction.type === 'restore' ? 'Restaurar Punto de Control' : 'Eliminar Respaldo'}
                  </h3>
                  <p className="text-[10px] text-amber-705 text-amber-700 dark:text-amber-300 font-bold mt-0.5">
                    {confirmAction.type === 'restore'
                      ? `Se reemplazará el estado actual por los datos del punto "${confirmAction.cp.nombre}".`
                      : `Se eliminará permanentemente la copia "${confirmAction.cp.nombre}".`}
                  </p>
                </div>
              </div>
              <button onClick={() => {
                setConfirmAction(null);
                setRestoreCandidate(null);
              }} className="p-1 rounded-lg text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {confirmAction.type === 'restore' && restoreCandidate && (
              <div className="p-4 bg-white dark:bg-stone-900 space-y-2">
                <div className={`rounded-xl border p-3 ${
                  restoreCandidate.validation.valid
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                    : 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-black uppercase ${
                      restoreCandidate.validation.valid ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'
                    }`}>
                      {restoreCandidate.validation.valid ? 'Verificación aprobada' : 'Restauración bloqueada'}
                    </span>
                    <span className="text-[9px] font-black text-stone-500 dark:text-stone-300">
                      {restoreCandidate.validation.totalRecords} registros
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] font-bold text-stone-600 dark:text-stone-300">
                    {restoreCandidate.validation.errors.length} errores · {restoreCandidate.validation.warnings.length} advertencias
                  </p>
                  {[...restoreCandidate.validation.errors, ...restoreCandidate.validation.warnings].slice(0, 4).map((issue, index) => (
                    <p key={`${issue.code}-${index}`} className={`mt-1 text-[9px] font-semibold ${
                      issue.severity === 'error' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
                    }`}>• {issue.message}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="p-4 sm:p-5 flex gap-2 justify-end bg-stone-50 dark:bg-stone-850">
              <button onClick={() => {
                setConfirmAction(null);
                setRestoreCandidate(null);
              }}
                className="py-2 px-4 rounded-xl border border-stone-200 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 text-xs font-black uppercase hover:bg-stone-50 cursor-pointer">Cancelar</button>
              <button
                onClick={() => confirmAction.type === 'restore' ? executeRestore(confirmAction.cp) : executeDelete(confirmAction.cp.id_cp)}
                disabled={confirmAction.type === 'restore' && !restoreCandidate?.validation.valid}
                className={`py-2 px-4 rounded-xl text-white text-xs font-black uppercase cursor-pointer transition-colors ${
                  confirmAction.type === 'restore'
                    ? 'bg-orange-600 hover:bg-orange-500 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500'
                }`}>
                {confirmAction.type === 'restore' && !restoreCandidate?.validation.valid ? 'Copia Bloqueada' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
