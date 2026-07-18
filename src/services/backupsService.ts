import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { sanitizeBackupConfiguration } from '../lib/automaticBackup';
import type {
  Categoria,
  CierreCaja,
  Cliente,
  EventoLog,
  HistorialCostoInsumo,
  Insumo,
  Merma,
  Mesa,
  MovimientoCajaChica,
  PagoDb,
  Pedido,
  ProductoMenu,
  Proveedor,
  RecetaEscandallo,
  Reserva,
  Usuario
} from '../types';
import type { Factura } from './facturacionService';
import type { Promocion } from './promocionesService';

// Lazy imports to avoid TDZ in main bundle
async function getAuditoriaService() { return (await import('./auditoriaService')).auditoriaService; }
async function getFacturacionService() { return (await import('./facturacionService')).facturacionService; }
async function getInsumosService() { return (await import('./insumosService')).insumosService; }
async function getMenuService() { return (await import('./menuService')).menuService; }
async function getMermasService() { return (await import('./mermasService')).mermasService; }
async function getMesasService() { return (await import('./mesasService')).mesasService; }
async function getPedidosService() { return (await import('./pedidosService')).pedidosService; }
async function getPromocionesService() { return (await import('./promocionesService')).promocionesService; }
async function getProveedoresService() { return (await import('./proveedoresService')).proveedoresService; }
async function getRecetasService() { return (await import('./recetasService')).recetasService; }
async function getReservasService() { return (await import('./reservasService')).reservasService; }

export interface Checkpoint {
  id_cp: string;
  nombre: string;
  fecha: string;
  peso: string;
  tablas_afectadas: string;
  tipo: 'automatica' | 'manual';
  contenido?: string;
  ubicacion?: 'cloud' | 'local';
}

export interface BackupSnapshotData {
  usuarios: Usuario[];
  mesas: Mesa[];
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  pedidos: Pedido[];
  mermas: Merma[];
  proveedores: Proveedor[];
  promociones: Promocion[];
  reservas: Reserva[];
  facturas: Factura[];
  logs: EventoLog[];
  pagos: PagoDb[];
  cierresCaja: CierreCaja[];
  clientes: Cliente[];
  movimientosCajaChica: MovimientoCajaChica[];
  historialCostos: HistorialCostoInsumo[];
  movimientosInventario: Record<string, unknown>[];
  categorias: Categoria[];
  configuracion: Record<string, unknown>[];
}

export type SupplementalBackupData = Pick<
  BackupSnapshotData,
  | 'pagos'
  | 'cierresCaja'
  | 'clientes'
  | 'movimientosCajaChica'
  | 'historialCostos'
  | 'movimientosInventario'
  | 'categorias'
  | 'configuracion'
>;

const LOCAL_BACKUPS_KEY = 'el_patron_backups_locales';
const REQUIRED_SNAPSHOT_KEYS: Array<keyof BackupSnapshotData> = [
  'usuarios',
  'mesas',
  'insumos',
  'productosMenu',
  'recetas',
  'pedidos',
  'mermas',
  'proveedores',
  'promociones',
  'reservas',
  'facturas',
  'logs'
];

const SUPPLEMENTAL_SNAPSHOT_KEYS: Array<keyof SupplementalBackupData> = [
  'pagos',
  'cierresCaja',
  'clientes',
  'movimientosCajaChica',
  'historialCostos',
  'movimientosInventario',
  'categorias',
  'configuracion'
];

const ALL_SNAPSHOT_KEYS: Array<keyof BackupSnapshotData> = [
  ...REQUIRED_SNAPSHOT_KEYS,
  ...SUPPLEMENTAL_SNAPSHOT_KEYS
];

// Native IndexedDB Helper
const openBackupsDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = indexedDB.open('el_patron_backups_db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('backups')) {
        db.createObjectStore('backups', { keyPath: 'id_cp' });
      }
    };
  });
};

const readLocalBackups = async (): Promise<Checkpoint[]> => {
  try {
    const db = await openBackupsDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('backups', 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Falling back to localStorage due to Node.js/Unsupported environment:', err);
    if (typeof localStorage !== 'undefined') {
      try {
        const parsed = JSON.parse(localStorage.getItem(LOCAL_BACKUPS_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
};

const writeLocalBackups = async (backups: Checkpoint[]) => {
  try {
    const db = await openBackupsDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('backups', 'readwrite');
      const store = transaction.objectStore('backups');
      
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        if (backups.length === 0) {
          resolve();
          return;
        }
        let count = 0;
        let failed = false;
        backups.forEach(backup => {
          const putRequest = store.put(backup);
          putRequest.onsuccess = () => {
            count++;
            if (count === backups.length && !failed) resolve();
          };
          putRequest.onerror = () => {
            failed = true;
            reject(putRequest.error);
          };
        });
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Falling back to localStorage write:', err);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(backups));
      } catch (storageErr) {
        console.error('LocalStorage write failed:', storageErr);
      }
    }
  }
};

const cacheCheckpoint = async (checkpoint: Checkpoint) => {
  const localList = await readLocalBackups();
  const merged = new Map(localList.map(item => [item.id_cp, item]));
  merged.set(checkpoint.id_cp, checkpoint);
  const sorted = Array.from(merged.values())
    .sort((a, b) => b.id_cp.localeCompare(a.id_cp))
    .slice(0, 10);
  await writeLocalBackups(sorted);
};

export const mergeCheckpoints = (remote: Checkpoint[], local: Checkpoint[]) => {
  const merged = new Map<string, Checkpoint>();
  local.forEach(item => merged.set(item.id_cp, item));
  remote.forEach(item => merged.set(item.id_cp, item));
  return Array.from(merged.values()).sort((a, b) => b.id_cp.localeCompare(a.id_cp));
};

const reviveDates = (snapshot: BackupSnapshotData): BackupSnapshotData => ({
  ...snapshot,
  pedidos: snapshot.pedidos.map(pedido => ({
    ...pedido,
    fecha_hora: new Date(pedido.fecha_hora),
    fecha_descuento_stock: pedido.fecha_descuento_stock
      ? new Date(pedido.fecha_descuento_stock)
      : undefined
  })),
  mermas: snapshot.mermas.map(merma => ({
    ...merma,
    fecha: new Date(merma.fecha)
  })),
  logs: snapshot.logs.map(log => ({
    ...log,
    timestamp: new Date(log.timestamp)
  })),
  clientes: snapshot.clientes.map(cliente => ({
    ...cliente,
    fecha_registro: new Date(cliente.fecha_registro)
  })),
  historialCostos: snapshot.historialCostos.map(item => ({
    ...item,
    fecha: new Date(item.fecha)
  }))
});

export const parseBackupContent = (contenido?: string): BackupSnapshotData => {
  if (!contenido) {
    throw new Error('El punto de control no contiene datos restaurables.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contenido);
  } catch {
    throw new Error('El contenido del respaldo no es un JSON válido.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('El respaldo no tiene la estructura esperada.');
  }

  const candidate = parsed as Record<string, unknown>;
  for (const key of REQUIRED_SNAPSHOT_KEYS) {
    if (!Array.isArray(candidate[key])) {
      throw new Error(`El respaldo está incompleto: falta la colección "${key}".`);
    }
  }

  // Compatibilidad con copias 1.3 y anteriores: no incluían las colecciones
  // contables auxiliares, por lo que se restauran como listas vacías.
  for (const key of SUPPLEMENTAL_SNAPSHOT_KEYS) {
    if (!Array.isArray(candidate[key])) candidate[key] = [];
  }

  return reviveDates(candidate as unknown as BackupSnapshotData);
};

export const backupsService = {
  async captureSupplementalData(): Promise<SupplementalBackupData> {
    const supabase = getActiveSupabaseClient();
    const tableMap = {
      pagos: 'pagos',
      cierresCaja: 'cierres_caja',
      clientes: 'clientes',
      movimientosCajaChica: 'movimientos_caja_chica',
      historialCostos: 'historial_costos_insumos',
      movimientosInventario: 'movimientos_inventario',
      categorias: 'categorias',
      configuracion: 'configuracion'
    } as const;

    const entries = await Promise.all(Object.entries(tableMap).map(async ([key, table]) => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
      const safeData = table === 'configuracion'
        ? sanitizeBackupConfiguration(data ?? [])
        : (data ?? []);
      return [key, safeData] as const;
    }));

    return Object.fromEntries(entries) as SupplementalBackupData;
  },

  async list(): Promise<Checkpoint[]> {
    const local = await readLocalBackups();
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('backups').select('*').order('fecha', { ascending: false });
      if (error) throw error;

      const remote = (data || []).map(b => ({
        id_cp: b.id_backup,
        nombre: b.nombre_archivo,
        fecha: new Date(b.fecha).toLocaleString('es-AR'),
        peso: b.tamano,
        tablas_afectadas: b.tablas,
        tipo: 'manual' as const,
        contenido: b.contenido,
        ubicacion: 'cloud' as const
      }));
      return mergeCheckpoints(remote, local);
    } catch (error) {
      console.warn('No se pudieron leer backups remotos; usando copias locales.', error);
      return local;
    }
  },

  async create(backup: { nombre: string; dataToDump: BackupSnapshotData }): Promise<Checkpoint> {
    const serialized = JSON.stringify(backup.dataToDump);
    const sizeInKb = parseFloat((serialized.length / 1024).toFixed(1));
    const checkpointId = `cp_${Date.now()}`;
    const checkpoint: Checkpoint = {
      id_cp: checkpointId,
      nombre: backup.nombre,
      fecha: new Date().toLocaleString('es-AR'),
      peso: `${sizeInKb} KB`,
      tablas_afectadas: ALL_SNAPSHOT_KEYS.join(', '),
      tipo: 'manual',
      contenido: serialized,
      ubicacion: 'local'
    };

    await cacheCheckpoint(checkpoint);

    try {
      const supabase = getActiveSupabaseClient();
      const { error } = await supabase.from('backups').insert([{
        id_backup: checkpointId,
        nombre_archivo: backup.nombre,
        fecha: new Date().toISOString(),
        tamano: `${sizeInKb} KB`,
        tablas: checkpoint.tablas_afectadas,
        contenido: serialized
      }]);
      if (error) throw error;
      checkpoint.ubicacion = 'cloud';
      await cacheCheckpoint(checkpoint);
    } catch (error) {
      console.warn('Backup guardado localmente; no se pudo sincronizar con Supabase.', error);
    }

    return checkpoint;
  },

  async restore(snapshot: BackupSnapshotData): Promise<{ usersSkipped: true }> {
    const sync = async <T>(items: T[], upsert: (items: T[]) => Promise<unknown>) => {
      if (items.length > 0) await upsert(items);
    };

    const mesasSvc = await getMesasService();
    const insumosSvc = await getInsumosService();
    const menuSvc = await getMenuService();
    const recetasSvc = await getRecetasService();
    const proveedoresSvc = await getProveedoresService();
    const promocionesSvc = await getPromocionesService();
    const reservasSvc = await getReservasService();
    const pedidosSvc = await getPedidosService();
    const mermasSvc = await getMermasService();
    const facturacionSvc = await getFacturacionService();
    const auditoriaSvc = await getAuditoriaService();

    // Las identidades de usuarios pertenecen a Supabase Auth. Restaurar perfiles
    // desde el navegador rompería ese vínculo y está bloqueado deliberadamente.
    await sync(snapshot.mesas, items => mesasSvc.upsert(items));
    await sync(snapshot.insumos, items => insumosSvc.upsert(items));
    await sync(snapshot.productosMenu, items => menuSvc.upsert(items));
    await sync(snapshot.recetas, items => recetasSvc.upsert(items));
    await sync(snapshot.proveedores, items => proveedoresSvc.upsert(items));
    await sync(snapshot.promociones, items => promocionesSvc.upsert(items));
    await sync(snapshot.reservas, items => reservasSvc.upsert(items));
    await sync(snapshot.pedidos, items => pedidosSvc.upsert(items));
    await sync(snapshot.mermas, items => mermasSvc.upsert(items));
    await sync(snapshot.facturas, items => facturacionSvc.upsert(items));
    await sync(snapshot.logs, items => auditoriaSvc.upsert(items));

    const supabase = getActiveSupabaseClient();
    const restoreTable = async (table: string, items: Record<string, unknown>[]) => {
      if (items.length === 0) return;
      const { error } = await supabase.from(table).upsert(items);
      if (error) throw new Error(`No se pudo restaurar ${table}: ${error.message}`);
    };

    await restoreTable('pagos', snapshot.pagos as unknown as Record<string, unknown>[]);
    await restoreTable('cierres_caja', snapshot.cierresCaja as unknown as Record<string, unknown>[]);
    await restoreTable('clientes', snapshot.clientes as unknown as Record<string, unknown>[]);
    await restoreTable('movimientos_caja_chica', snapshot.movimientosCajaChica as unknown as Record<string, unknown>[]);
    await restoreTable('historial_costos_insumos', snapshot.historialCostos as unknown as Record<string, unknown>[]);
    await restoreTable('movimientos_inventario', snapshot.movimientosInventario);
    await restoreTable('categorias', snapshot.categorias as unknown as Record<string, unknown>[]);
    await restoreTable('configuracion', snapshot.configuracion);

    return { usersSkipped: true };
  },

  async remove(id: string): Promise<boolean> {
    const local = await readLocalBackups();
    await writeLocalBackups(local.filter(item => item.id_cp !== id));
    try {
      const supabase = getActiveSupabaseClient();
      const { error } = await supabase.from('backups').delete().eq('id_backup', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn('Backup eliminado localmente, pero no se pudo borrar en Supabase.', error);
      return false;
    }
  }
};
