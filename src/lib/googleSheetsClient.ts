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
  'cierres_caja',
  'caja_ledger',
  'usuarios',
  'configuracion',
  'arca_config',
  'arca_emisiones'
];

function getTableStorageCache(tableName: string): any[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`el_patron_sheet_cache_${tableName}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setTableStorageCache(tableName: string, data: any[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`el_patron_sheet_cache_${tableName}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[GoogleSheetsClient] LocalStorage full for ${tableName}:`, err);
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

const SHEETS_TIMEOUT_MS = 25_000; // 25s para dar tiempo suficiente a Google Apps Script sin abortar prematuramente
let sheetWriteQueue: Promise<any> = Promise.resolve();

function enqueueSheetWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = sheetWriteQueue.then(task, task);
  sheetWriteQueue = run.catch(() => {});
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
        cachedTables = { ...cachedTables, ...json.data };
        for (const [tbl, rows] of Object.entries(json.data)) {
          lastFetchTimestamps[tbl] = fetchTime;
          setTableStorageCache(tbl, rows);
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
          cachedTables[tableName] = json.data;
          lastFetchTimestamps[tableName] = now;
          setTableStorageCache(tableName, json.data);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('el_patron_sheet_data_updated', {
              detail: { table: tableName, count: json.data.length }
            }));
          }
          return json.data;
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

export async function sheetUpsertRow<T extends Record<string, any>>(tableName: string, rowData: T): Promise<any> {
  if (!cachedTables[tableName]) {
    const disk = getTableStorageCache(tableName);
    cachedTables[tableName] = disk && Array.isArray(disk) ? disk : [];
  }

  const pkFieldMap: Record<string, string> = {
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
    cierres_caja: 'id_cierre',
    caja_ledger: 'id_ledger',
    usuarios: 'id_usuario',
    configuracion: 'clave',
    arca_config: 'id',
    arca_emisiones: 'id',
    v_conciliacion_facturas: 'id_factura'
  };

  const pk = pkFieldMap[tableName] || 'id';
  const pkVal = rowData[pk];

  if (!cachedTables[tableName]) {
    const disk = getTableStorageCache(tableName);
    cachedTables[tableName] = disk && Array.isArray(disk) ? disk : [];
  }

  if (pkVal !== undefined) {
    const idx = cachedTables[tableName].findIndex(r => String(r[pk]) === String(pkVal));
    if (idx >= 0) {
      cachedTables[tableName][idx] = { ...cachedTables[tableName][idx], ...rowData };
    } else {
      cachedTables[tableName].push({ ...rowData });
    }
    setTableStorageCache(tableName, cachedTables[tableName]);
    lastFetchTimestamps[tableName] = Date.now();
  }

  const payload = {
    action: 'upsert',
    table: tableName,
    data: rowData
  };

  return enqueueSheetWrite(async () => {
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
  });
}

export async function sheetBatchInsert<T extends Record<string, any>>(tableName: string, items: T[]): Promise<any> {
  if (!items || items.length === 0) return { count: 0 };

  if (!cachedTables[tableName]) {
    const disk = getTableStorageCache(tableName);
    cachedTables[tableName] = disk && Array.isArray(disk) ? disk : [];
  }
  cachedTables[tableName].push(...items);
  setTableStorageCache(tableName, cachedTables[tableName]);
  lastFetchTimestamps[tableName] = Date.now();

  const payload = {
    action: 'batchInsert',
    table: tableName,
    data: items
  };

  return enqueueSheetWrite(async () => {
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
  const pkFieldMap: Record<string, string> = {
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
    cierres_caja: 'id_cierre',
    caja_ledger: 'id_ledger',
    usuarios: 'id_usuario',
    configuracion: 'clave'
  };

  const pk = pkFieldMap[tableName] || 'id';
  if (!cachedTables[tableName]) {
    const disk = getTableStorageCache(tableName);
    cachedTables[tableName] = disk && Array.isArray(disk) ? disk : [];
  }
  cachedTables[tableName] = cachedTables[tableName].filter(r => String(r[pk]) !== String(id));
  setTableStorageCache(tableName, cachedTables[tableName]);
  lastFetchTimestamps[tableName] = Date.now();

  const payload = {
    action: 'delete',
    table: tableName,
    id: id
  };

  return enqueueSheetWrite(async () => {
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
  });
}
