import { getActiveSupabaseClient } from '../lib/supabaseClient';
import {
  EventoLog,
  Insumo,
  Merma,
  Mesa,
  Pedido,
  ProductoMenu,
  Proveedor,
  RecetaEscandallo,
  Reserva,
  Usuario
} from '../types';
import { auditoriaService } from './auditoriaService';
import { facturacionService, type Factura } from './facturacionService';
import { insumosService } from './insumosService';
import { menuService } from './menuService';
import { mermasService } from './mermasService';
import { mesasService } from './mesasService';
import { pedidosService } from './pedidosService';
import { promocionesService, type Promocion } from './promocionesService';
import { proveedoresService } from './proveedoresService';
import { recetasService } from './recetasService';
import { reservasService } from './reservasService';
import { usuariosService } from './usuariosService';

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
}

const LOCAL_BACKUPS_KEY = 'el_patron_backups_locales';
const SNAPSHOT_KEYS: Array<keyof BackupSnapshotData> = [
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

const readLocalBackups = (): Checkpoint[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_BACKUPS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalBackups = (backups: Checkpoint[]) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(backups));
};

const cacheCheckpoint = (checkpoint: Checkpoint) => {
  const merged = new Map(readLocalBackups().map(item => [item.id_cp, item]));
  merged.set(checkpoint.id_cp, checkpoint);
  writeLocalBackups(Array.from(merged.values()));
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
  for (const key of SNAPSHOT_KEYS) {
    if (!Array.isArray(candidate[key])) {
      throw new Error(`El respaldo está incompleto: falta la colección "${key}".`);
    }
  }

  const snapshot = candidate as unknown as BackupSnapshotData;
  const hasActiveAdmin = snapshot.usuarios.some(usuario => (
    usuario.rol === 'administrador' && usuario.activo !== false
  ));
  if (!hasActiveAdmin) {
    throw new Error('El respaldo no contiene ningún administrador activo.');
  }

  return reviveDates(snapshot);
};

export const backupsService = {
  async list(): Promise<Checkpoint[]> {
    const local = readLocalBackups();
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
      tablas_afectadas: SNAPSHOT_KEYS.join(', '),
      tipo: 'manual',
      contenido: serialized,
      ubicacion: 'local'
    };

    cacheCheckpoint(checkpoint);

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
      cacheCheckpoint(checkpoint);
    } catch (error) {
      console.warn('Backup guardado localmente; no se pudo sincronizar con Supabase.', error);
    }

    return checkpoint;
  },

  async restore(snapshot: BackupSnapshotData): Promise<void> {
    const sync = async <T>(items: T[], upsert: (items: T[]) => Promise<unknown>) => {
      if (items.length > 0) await upsert(items);
    };

    await sync(snapshot.usuarios, items => usuariosService.upsert(items));
    await sync(snapshot.mesas, items => mesasService.upsert(items));
    await sync(snapshot.insumos, items => insumosService.upsert(items));
    await sync(snapshot.productosMenu, items => menuService.upsert(items));
    await sync(snapshot.recetas, items => recetasService.upsert(items));
    await sync(snapshot.proveedores, items => proveedoresService.upsert(items));
    await sync(snapshot.promociones, items => promocionesService.upsert(items));
    await sync(snapshot.reservas, items => reservasService.upsert(items));
    await sync(snapshot.pedidos, items => pedidosService.upsert(items));
    await sync(snapshot.mermas, items => mermasService.upsert(items));
    await sync(snapshot.facturas, items => facturacionService.upsert(items));
    await sync(snapshot.logs, items => auditoriaService.upsert(items));
  },

  async remove(id: string): Promise<boolean> {
    writeLocalBackups(readLocalBackups().filter(item => item.id_cp !== id));
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
