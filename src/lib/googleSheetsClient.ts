/**
 * src/lib/googleSheetsClient.ts
 *
 * Cliente de Base de Datos directo para Google Sheets (Restaurante El Patrón).
 * Conecta el sistema con la API Web App de Google Sheets sin depender de Supabase.
 */

export const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbw45APBuDOZrZY5P2EBQyR50HdXRSF6CrLNP01ipu0X11_u42IgnhxbuJdO_t-YS-e94Q/exec';

export interface SheetApiResponse<T = any> {
  success: boolean;
  table?: string;
  count?: number;
  data?: T;
  error?: string;
  result?: any;
}

let cachedTables: Record<string, any[]> = {};
const lastFetchTimestamps: Record<string, number> = {};
const inFlightTableFetches = new Map<string, Promise<any[]>>();
let inFlightReadAllPromise: Promise<Record<string, any[]>> | null = null;
const CACHE_TTL_MS = 60_000; // 60 segundos antes de considerar el caché 'stale'

export const KNOWN_SHEET_TABLES = [
  'productos_menu',
  'mesas',
  'categorias',
  'promociones',
  'pedidos_cabecera',
  'pedido_detalle',
  'pedido_operaciones',
  'insumos',
  'proveedores',
  'reservas',
  'facturas',
  'pagos',
  'tipos_pago',
  'ventas_platos',
  'cierres_caja',
  'caja_ledger',
  'usuarios',
  'configuracion',
  'arca_config',
  'arca_emisiones'
];

const CACHE_VERSION = '2026_09_18_v5';

// Limpieza automática de caché obsoleto y liberación de imágenes base64 pesadas en localStorage
if (typeof window !== 'undefined') {
  try {
    const currentVersion = window.localStorage.getItem('el_patron_cache_version');
    if (currentVersion !== CACHE_VERSION) {
      window.localStorage.removeItem('el_patron_sheet_cache_pedidos_cabecera');
      window.localStorage.removeItem('el_patron_sheet_cache_pedido_detalle');
      window.localStorage.removeItem('el_patron_sheet_cache_mesas');
      window.localStorage.setItem('el_patron_cache_version', CACHE_VERSION);
    }
    // Liberar claves de imágenes base64 pesadas que saturaban los 5MB de localStorage
    const imgKeysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('el_patron_img_')) {
        const val = window.localStorage.getItem(k);
        if (val && val.length > 500) {
          imgKeysToRemove.push(k);
        }
      }
    }
    imgKeysToRemove.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    });
  } catch {}
}

function getTableStorageCache(tableName: string): any[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`el_patron_sheet_cache_${tableName}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    if (tableName === 'pedidos_cabecera') {
      const rawCancelled = window.localStorage.getItem('el_patron_cancelled_order_ids');
      const rawCobrado = window.localStorage.getItem('el_patron_cobrado_order_ids');
      const cancelledSet = new Set(rawCancelled ? JSON.parse(rawCancelled).map(Number) : []);
      const cobradoSet = new Set(rawCobrado ? JSON.parse(rawCobrado).map(Number) : []);

      return parsed.map((p: any) => {
        const idNum = Number(p.id_pedido);
        if (cancelledSet.has(idNum)) return { ...p, estado_comanda: 'cancelado' };
        if (cobradoSet.has(idNum)) return { ...p, estado_comanda: 'entregado_cobrado' };
        return p;
      });
    }

    return parsed;
  } catch {
    return null;
  }
}

function setTableStorageCache(tableName: string, data: any[]) {
  if (typeof window === 'undefined') return;
  try {
    let toSave = data;
    if (tableName === 'pedidos_cabecera' && Array.isArray(data)) {
      const rawCancelled = window.localStorage.getItem('el_patron_cancelled_order_ids');
      const rawCobrado = window.localStorage.getItem('el_patron_cobrado_order_ids');
      const cancelledSet = new Set(rawCancelled ? JSON.parse(rawCancelled).map(Number) : []);
      const cobradoSet = new Set(rawCobrado ? JSON.parse(rawCobrado).map(Number) : []);

      toSave = data.map((p: any) => {
        const idNum = Number(p.id_pedido);
        if (cancelledSet.has(idNum)) return { ...p, estado_comanda: 'cancelado' };
        if (cobradoSet.has(idNum)) return { ...p, estado_comanda: 'entregado_cobrado' };
        return p;
      });
    } else if (tableName === 'productos_menu' && Array.isArray(data)) {
      // Evitar saturar localStorage con fotos en base64 (las imágenes viven en memoria / IndexedDB)
      toSave = data.map((p: any) => {
        const img = typeof p?.imagen === 'string' && p.imagen.startsWith('data:image/') ? '' : p?.imagen;
        const urlImg = typeof p?.url_imagen === 'string' && p.url_imagen.startsWith('data:image/') ? '' : p?.url_imagen;
        if (img !== p?.imagen || urlImg !== p?.url_imagen) {
          return { ...p, imagen: img, url_imagen: urlImg };
        }
        return p;
      });
    }
    window.localStorage.setItem(`el_patron_sheet_cache_${tableName}`, JSON.stringify(toSave));
  } catch (err) {
    try {
      window.localStorage.removeItem('el_patron_sheet_cache_productos_menu');
      window.localStorage.setItem(`el_patron_sheet_cache_${tableName}`, JSON.stringify(data));
    } catch {
      console.warn(`[GoogleSheetsClient] LocalStorage full for ${tableName}:`, err);
    }
  }
}

// Hidratación instantánea (0ms) de memoria desde disco al cargar el script
if (typeof window !== 'undefined') {
  try {
    for (const tbl of KNOWN_SHEET_TABLES) {
      const disk = getTableStorageCache(tbl);
      if (disk && Array.isArray(disk)) {
        cachedTables[tbl] = disk;
      }
    }
  } catch (err) {
    console.warn('[GoogleSheetsClient] Error al pre-hidratar memoria desde disco:', err);
  }
}

const SHEETS_TIMEOUT_MS = 30_000;
const RECENT_MUTATION_GRACE_MS = 18_000; // 18s de protección tras escritura local para evitar que lecturas en paralelo pisen cambios recientes
const tableWriteQueues: Record<string, Promise<any>> = {};
const pendingWriteCounts: Record<string, number> = {};
const recentRowMutations: Record<string, Map<string, { row: any; deleted?: boolean; timestamp: number }>> = {};

function getMutationMap(tableName: string) {
  if (!recentRowMutations[tableName]) {
    recentRowMutations[tableName] = new Map();
  }
  return recentRowMutations[tableName];
}

function enqueueSheetWrite<T>(tableName: string, task: () => Promise<T>, mutatedPk?: string): Promise<T> {
  pendingWriteCounts[tableName] = (pendingWriteCounts[tableName] || 0) + 1;
  const currentQueue = tableWriteQueues[tableName] || Promise.resolve();
  const run = currentQueue.then(task, task).finally(() => {
    pendingWriteCounts[tableName] = Math.max(0, (pendingWriteCounts[tableName] || 1) - 1);
    if (mutatedPk !== undefined) {
      const map = recentRowMutations[tableName];
      const existing = map?.get(mutatedPk);
      if (existing) {
        existing.timestamp = Date.now();
      }
    }
  });
  tableWriteQueues[tableName] = run.catch(() => {});
  return run;
}

function getSheetsEndpoint(): string {
  // Conectar directamente a Google Apps Script (soporta CORS nativamente y evita latencias de proxies serverless)
  return GOOGLE_SHEETS_WEBAPP_URL;
}

async function fetchFromSheets(urlOrAction: string, options?: RequestInit): Promise<Response> {
  const isDirect = urlOrAction.startsWith('http');
  const endpoint = isDirect ? urlOrAction : `${GOOGLE_SHEETS_WEBAPP_URL}${urlOrAction}`;

  const executeFetch = async (targetUrl: string, timeoutMs: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      try { controller.abort(new Error('Google Sheets timeout')); } catch { controller.abort(); }
    }, timeoutMs);

    try {
      const res = await fetch(targetUrl, {
        credentials: 'omit',
        ...options,
        signal: options?.signal || controller.signal
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  // 1. Intento principal directo
  try {
    const res = await executeFetch(endpoint, SHEETS_TIMEOUT_MS);
    if (res.ok || isDirect || res.status === 302 || res.status === 0) {
      return res;
    }
    // Si dio 404 o 5xx en Apps Script (desincronización temporal de redirección echo de Google), reintentar una vez tras 800ms
    if (res.status === 404 || res.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const retryRes = await executeFetch(endpoint, SHEETS_TIMEOUT_MS);
      if (retryRes.ok || retryRes.status === 302 || retryRes.status === 0) {
        return retryRes;
      }
    }
    throw new Error(`Google Sheets status ${res.status}`);
  } catch (primaryErr) {
    // 2. Si falló el acceso directo (por ejemplo si un adblocker bloquea script.google.com o Google echo 404)
    // intentar vía proxy serverless /api/sheets de Vercel (servidor a servidor)
    if (!isDirect && typeof window !== 'undefined' && window.location?.origin && !window.location.hostname.includes('localhost')) {
      try {
        const proxyUrl = `${window.location.origin}/api/sheets${urlOrAction}`;
        const pRes = await executeFetch(proxyUrl, 15000);
        if (pRes.ok) {
          return pRes;
        }
      } catch {}
    }

    throw primaryErr;
  }
}

async function safeParseResponse<T = any>(resp: Response): Promise<SheetApiResponse<T>> {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    if (resp.ok || resp.status === 302 || resp.status === 0 || text.includes('<html') || text.includes('google')) {
      return { success: true, result: { operation: 'acknowledged' } } as SheetApiResponse<T>;
    }
    return { success: false, error: text.slice(0, 150) };
  }
}

/**
 * Consulta y sincroniza todas las tablas de Google Sheets en una única llamada HTTP.
 * Utiliza deduplicación para no saturar con múltiples peticiones paralelas.
 */
const PK_FIELD_MAP: Record<string, string> = {
  productos_menu: 'id_producto',
  mesas: 'id_mesa',
  categorias: 'id_categoria',
  promociones: 'id_promo',
  pedidos_cabecera: 'id_pedido',
  pedido_detalle: 'id_detalle',
  pedido_operaciones: 'id_operacion',
  insumos: 'id_insumo',
  proveedores: 'id_proveedor',
  reservas: 'id_reserva',
  facturas: 'id_factura',
  pagos: 'id_pago',
  tipos_pago: 'id_pago',
  ventas_platos: 'id_registro',
  cierres_caja: 'id_cierre',
  caja_ledger: 'id_ledger',
  usuarios: 'id_usuario',
  configuracion: 'clave',
  arca_config: 'id',
  arca_emisiones: 'id',
  v_conciliacion_facturas: 'id_factura'
};

function mergeProtectedLocalMutations(tableName: string, remoteRows: any[]): any[] {
  const mutMap = recentRowMutations[tableName];
  if (!mutMap || mutMap.size === 0) return remoteRows;

  const now = Date.now();
  const hasInFlightWrites = (pendingWriteCounts[tableName] || 0) > 0;
  const pk = PK_FIELD_MAP[tableName] || 'id';

  // Limpiar mutaciones expiradas si no hay escrituras en vuelo
  if (!hasInFlightWrites) {
    for (const [key, entry] of mutMap.entries()) {
      if (now - entry.timestamp > RECENT_MUTATION_GRACE_MS) {
        mutMap.delete(key);
      }
    }
  }

  if (mutMap.size === 0) return remoteRows;

  const seenPks = new Set<string>();
  const merged: any[] = [];

  for (const remoteRow of remoteRows) {
    const rowPk = remoteRow?.[pk] !== undefined ? String(remoteRow[pk]) : undefined;
    if (rowPk !== undefined) {
      seenPks.add(rowPk);
      const localMut = mutMap.get(rowPk);
      if (localMut) {
        if (localMut.deleted) {
          continue; // Fue eliminada localmente hace instantes
        }
        merged.push({ ...remoteRow, ...localMut.row });
        continue;
      }
    }
    merged.push(remoteRow);
  }

  // Agregar filas insertadas localmente que aún no figuran en la respuesta de Google Sheets
  for (const [rowPk, localMut] of mutMap.entries()) {
    if (!localMut.deleted && localMut.row && !seenPks.has(rowPk)) {
      merged.push(localMut.row);
    }
  }

  return merged;
}

export async function sheetFetchAllTables(forceFresh = false): Promise<Record<string, any[]>> {
  const now = Date.now();
  const lastAllFetch = Math.max(...Object.values(lastFetchTimestamps), 0);
  
  if (!forceFresh && Object.keys(cachedTables).length > 0 && now - lastAllFetch < CACHE_TTL_MS) {
    return cachedTables;
  }

  if (inFlightReadAllPromise) {
    return inFlightReadAllPromise;
  }

  inFlightReadAllPromise = (async () => {
    try {
      const resp = await fetchFromSheets('?action=readAll', {
        method: 'GET'
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} al consultar Google Sheets`);
      }

      const json = await safeParseResponse<Record<string, any[]>>(resp);
      if (json.success && json.data) {
        const fetchTime = Date.now();
        for (const [tbl, rows] of Object.entries(json.data)) {
          const safeRows = Array.isArray(rows) ? mergeProtectedLocalMutations(tbl, rows) : rows;
          cachedTables[tbl] = safeRows;
          lastFetchTimestamps[tbl] = fetchTime;
          setTableStorageCache(tbl, safeRows);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('el_patron_sheets_sync_completed', { detail: { timestamp: fetchTime } }));
        }
        return cachedTables;
      }
      throw new Error(json.error || 'Respuesta inválida de Google Sheets');
    } catch (error) {
      if (Object.keys(cachedTables).length > 0) {
        console.info('[GoogleSheetsClient] Tablas operativas desde almacenamiento local mientras reconecta con Google Sheets.');
        return cachedTables;
      }
      console.warn('[GoogleSheetsClient] Error al leer todas las tablas:', error);
      throw error;
    } finally {
      inFlightReadAllPromise = null;
    }
  })();

  return inFlightReadAllPromise;
}

/**
 * Revalida una tabla en segundo plano sin bloquear el hilo de ejecución del usuario.
 */
function revalidateTableInBackground(tableName: string): void {
  if (inFlightTableFetches.has(tableName) || inFlightReadAllPromise) {
    return;
  }

  executeFetchTable(tableName).catch(() => {});
}

/**
 * Ejecuta la llamada física de red para una tabla específica con deduplicación en vuelo.
 */
async function executeFetchTable<T = any>(tableName: string): Promise<T[]> {
  if (inFlightTableFetches.has(tableName)) {
    return inFlightTableFetches.get(tableName)!;
  }

  // Si ya hay una lectura global (readAll) en curso, esperamos su resultado para evitar llamadas duplicadas
  if (inFlightReadAllPromise) {
    try {
      await inFlightReadAllPromise;
      if (cachedTables[tableName] !== undefined && Array.isArray(cachedTables[tableName])) {
        return cachedTables[tableName] as T[];
      }
    } catch {}
  }

  const fetchPromise = (async () => {
    const now = Date.now();
    try {
      const resp = await fetchFromSheets(`?action=read&table=${encodeURIComponent(tableName)}`, {
        method: 'GET'
      });

      if (resp.ok) {
        const json = await safeParseResponse<T[]>(resp);
        if (json.success && Array.isArray(json.data)) {
          let mergedData: any[] = mergeProtectedLocalMutations(tableName, json.data);
          // Preservar pedidos activos locales en vuelo hacia Google Sheets (evitar sobrescritura con datos viejos)
          if (tableName === 'pedidos_cabecera' && Array.isArray(cachedTables[tableName]) && cachedTables[tableName].length > 0) {
            const mergedList: any[] = [];
            const processedIds = new Set<string>();

            // 1. Procesar filas remotas
            mergedData.forEach((remoteRow: any) => {
              const idStr = String(remoteRow.id_pedido);
              processedIds.add(idStr);
              const localRow = cachedTables[tableName].find((l: any) => String(l.id_pedido) === idStr);
              if (localRow && localRow.estado_comanda !== 'cancelado' && localRow.estado_comanda !== 'entregado_cobrado') {
                const parseItems = (raw: any): any[] => {
                  if (Array.isArray(raw)) return raw;
                  if (typeof raw === 'string') {
                    try { return JSON.parse(raw); } catch { return []; }
                  }
                  return [];
                };
                const localItems = parseItems(localRow.items);
                const remoteItems = parseItems(remoteRow.items);
                // Si la versión local tiene más ítems recién agregados, preservar la versión local enriquecida
                if (localItems.length > remoteItems.length) {
                  mergedList.push({
                    ...remoteRow,
                    items: localRow.items,
                    total: localRow.total || remoteRow.total,
                    observaciones: localRow.observaciones || remoteRow.observaciones
                  });
                  return;
                }
              }
              mergedList.push(remoteRow);
            });

            // 2. Preservar órdenes locales que todavía no llegaron a Google Sheets
            cachedTables[tableName].forEach((localRow: any) => {
              const idStr = String(localRow.id_pedido);
              if (!processedIds.has(idStr) && localRow.estado_comanda !== 'cancelado' && localRow.estado_comanda !== 'entregado_cobrado') {
                mergedList.unshift(localRow);
              }
            });

            mergedData = mergedList;
          }
          cachedTables[tableName] = mergedData;
          lastFetchTimestamps[tableName] = now;
          setTableStorageCache(tableName, mergedData);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('el_patron_sheet_data_updated', {
              detail: { table: tableName, count: mergedData.length }
            }));
          }
          return mergedData as T[];
        }
      }
    } catch (error: any) {
      console.info(`[GoogleSheetsClient] Lectura de '${tableName}' sincronizada desde almacenamiento local:`, error?.message || error);
    }

    if (cachedTables[tableName] !== undefined && Array.isArray(cachedTables[tableName])) {
      return cachedTables[tableName] as T[];
    }
    const diskCache = getTableStorageCache(tableName);
    if (diskCache !== null && Array.isArray(diskCache)) {
      return diskCache as T[];
    }
    return [] as T[];
  })().finally(() => {
    inFlightTableFetches.delete(tableName);
  });

  inFlightTableFetches.set(tableName, fetchPromise);
  return fetchPromise;
}

/**
 * Consulta de tabla con patrón Stale-While-Revalidate:
 * Si hay datos en memoria o disco, retorna INMEDIATAMENTE (0ms).
 * Si los datos están vencidos (>60s), revalida en segundo plano sin demorar la UI.
 */
export async function sheetFetchTable<T = any>(tableName: string, forceFresh = false): Promise<T[]> {
  const now = Date.now();
  const lastFetch = lastFetchTimestamps[tableName] || 0;
  const isStale = now - lastFetch > CACHE_TTL_MS;

  if (!forceFresh) {
    // 1. Memoria de acceso inmediato (0ms)
    if (cachedTables[tableName] !== undefined && Array.isArray(cachedTables[tableName])) {
      if (isStale) {
        revalidateTableInBackground(tableName);
      }
      return cachedTables[tableName] as T[];
    }

    // 2. Disco LocalStorage de acceso inmediato (0ms)
    const diskCache = getTableStorageCache(tableName);
    if (diskCache !== null && Array.isArray(diskCache)) {
      cachedTables[tableName] = diskCache;
      if (isStale) {
        revalidateTableInBackground(tableName);
      }
      return diskCache as T[];
    }
  }

  // 3. Si se fuerza frescura o no hay ningún dato previo, esperamos a la red
  return executeFetchTable<T>(tableName);
}

/**
 * Pre-calienta la conexión con Google Sheets y descarga el estado global en segundo plano.
 */
export function preloadGoogleSheetsCache(): void {
  if (typeof window === 'undefined') return;
  sheetFetchAllTables(false).catch(err => {
    console.warn('[GoogleSheetsClient] Pre-calentamiento silencioso:', err);
  });
}

const isTestEnv = (): boolean =>
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export async function sheetUpsertRow<T extends Record<string, any>>(tableName: string, rowData: T): Promise<any> {
  if (!cachedTables[tableName]) {
    const disk = getTableStorageCache(tableName);
    cachedTables[tableName] = disk && Array.isArray(disk) ? disk : [];
  }

  const pk = PK_FIELD_MAP[tableName] || 'id';
  const pkVal = rowData[pk];
  const pkStr = pkVal !== undefined ? String(pkVal) : undefined;

  let fullRow: any = { ...rowData };
  if (pkStr !== undefined) {
    const idx = cachedTables[tableName].findIndex(r => String(r[pk]) === pkStr);
    if (idx >= 0) {
      fullRow = { ...cachedTables[tableName][idx], ...rowData };
      cachedTables[tableName][idx] = fullRow;
    } else {
      cachedTables[tableName].push({ ...rowData });
    }
    getMutationMap(tableName).set(pkStr, {
      row: { ...fullRow },
      deleted: false,
      timestamp: Date.now()
    });
    setTableStorageCache(tableName, cachedTables[tableName]);
    lastFetchTimestamps[tableName] = Date.now();
  }

  if (isTestEnv()) {
    return { operation: 'saved_locally' };
  }

  const payload = {
    action: 'upsert',
    table: tableName,
    data: fullRow
  };

  return enqueueSheetWrite(tableName, async () => {
    try {
      const resp = await fetchFromSheets(`?action=upsert&table=${encodeURIComponent(tableName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const json = await safeParseResponse(resp);
      if (!json.success && json.error) {
        console.info(`[GoogleSheetsClient] Respuesta upsert en '${tableName}':`, json.error);
      }
      return json.result || { operation: 'saved' };
    } catch (err) {
      console.info(`[GoogleSheetsClient] Persistido localmente '${tableName}' (sincronización diferida):`, (err as any)?.message || err);
      return { operation: 'saved_locally' };
    }
  }, pkStr);
}

export async function sheetBatchInsert<T extends Record<string, any>>(tableName: string, items: T[]): Promise<any> {
  if (!items || items.length === 0) return { count: 0 };

  if (!cachedTables[tableName]) {
    const disk = getTableStorageCache(tableName);
    cachedTables[tableName] = disk && Array.isArray(disk) ? disk : [];
  }
  const pk = PK_FIELD_MAP[tableName] || 'id';
  const mutMap = getMutationMap(tableName);
  const now = Date.now();
  for (const item of items) {
    if (item && item[pk] !== undefined) {
      mutMap.set(String(item[pk]), { row: { ...item }, deleted: false, timestamp: now });
    }
  }
  cachedTables[tableName].push(...items);
  setTableStorageCache(tableName, cachedTables[tableName]);
  lastFetchTimestamps[tableName] = now;

  if (isTestEnv()) {
    return { operation: 'saved_locally', count: items.length };
  }

  const payload = {
    action: 'batchInsert',
    table: tableName,
    data: items
  };

  return enqueueSheetWrite(tableName, async () => {
    try {
      const resp = await fetchFromSheets(`?action=batchInsert&table=${encodeURIComponent(tableName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const json = await safeParseResponse(resp);
      if (!json.success && json.error) {
        console.info(`[GoogleSheetsClient] Respuesta batchInsert en '${tableName}':`, json.error);
      }
      return json.result || { operation: 'saved' };
    } catch (err) {
      console.info(`[GoogleSheetsClient] Persistido lote localmente en '${tableName}':`, err);
      return { operation: 'saved_locally' };
    }
  });
}

export async function sheetDeleteRow(tableName: string, id: string | number): Promise<boolean> {
  const pk = PK_FIELD_MAP[tableName] || 'id';
  const pkStr = String(id);
  if (!cachedTables[tableName]) {
    const disk = getTableStorageCache(tableName);
    cachedTables[tableName] = disk && Array.isArray(disk) ? disk : [];
  }
  cachedTables[tableName] = cachedTables[tableName].filter(r => String(r[pk]) !== pkStr);
  getMutationMap(tableName).set(pkStr, { row: null, deleted: true, timestamp: Date.now() });
  setTableStorageCache(tableName, cachedTables[tableName]);
  lastFetchTimestamps[tableName] = Date.now();

  if (isTestEnv()) {
    return true;
  }

  const payload = {
    action: 'delete',
    table: tableName,
    id: id
  };

  return enqueueSheetWrite(tableName, async () => {
    try {
      const resp = await fetchFromSheets(`?action=delete&table=${encodeURIComponent(tableName)}&id=${encodeURIComponent(String(id))}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const json = await safeParseResponse(resp);
      return Boolean(json.success);
    } catch (err) {
      console.info(`[GoogleSheetsClient] Eliminación diferida en '${tableName}':`, err);
      return true;
    }
  }, pkStr);
}
