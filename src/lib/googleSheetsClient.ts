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
let lastFetchTimestamp = 0;

export async function sheetFetchAllTables(forceFresh = false): Promise<Record<string, any[]>> {
  const now = Date.now();
  if (!forceFresh && Object.keys(cachedTables).length > 0 && now - lastFetchTimestamp < 5000) {
    return cachedTables;
  }

  try {
    const resp = await fetch(`${GOOGLE_SHEETS_WEBAPP_URL}?action=readAll`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} al consultar Google Sheets`);
    }

    const json: SheetApiResponse<Record<string, any[]>> = await resp.json();
    if (json.success && json.data) {
      cachedTables = json.data;
      lastFetchTimestamp = now;
      return cachedTables;
    }
    throw new Error(json.error || 'Respuesta inválida de Google Sheets');
  } catch (error) {
    console.warn('[GoogleSheetsClient] Error al leer todas las tablas:', error);
    if (Object.keys(cachedTables).length > 0) {
      return cachedTables;
    }
    throw error;
  }
}

export async function sheetFetchTable<T = any>(tableName: string, forceFresh = false): Promise<T[]> {
  const now = Date.now();
  if (!forceFresh && cachedTables[tableName] && now - lastFetchTimestamp < 5000) {
    return cachedTables[tableName] as T[];
  }

  try {
    const resp = await fetch(`${GOOGLE_SHEETS_WEBAPP_URL}?action=read&table=${encodeURIComponent(tableName)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} al consultar tabla '${tableName}'`);
    }

    const json: SheetApiResponse<T[]> = await resp.json();
    if (json.success && Array.isArray(json.data)) {
      cachedTables[tableName] = json.data;
      return json.data;
    }
    throw new Error(json.error || `Error al leer tabla '${tableName}'`);
  } catch (error) {
    console.warn(`[GoogleSheetsClient] Error al leer '${tableName}':`, error);
    if (cachedTables[tableName]) {
      return cachedTables[tableName] as T[];
    }
    throw error;
  }
}

export async function sheetUpsertRow<T extends Record<string, any>>(tableName: string, rowData: T): Promise<any> {
  if (!cachedTables[tableName]) {
    cachedTables[tableName] = [];
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

  if (pkVal !== undefined) {
    const idx = cachedTables[tableName].findIndex(r => String(r[pk]) === String(pkVal));
    if (idx >= 0) {
      cachedTables[tableName][idx] = { ...cachedTables[tableName][idx], ...rowData };
    } else {
      cachedTables[tableName].push({ ...rowData });
    }
  }

  const payload = {
    action: 'upsert',
    table: tableName,
    data: rowData
  };

  try {
    const resp = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const json: SheetApiResponse = await resp.json();
    if (!json.success) {
      throw new Error(json.error || 'Error al persistir en Google Sheets');
    }
    return json.result;
  } catch (err) {
    console.error(`[GoogleSheetsClient] Error al hacer upsert en '${tableName}':`, err);
    throw err;
  }
}

export async function sheetBatchInsert<T extends Record<string, any>>(tableName: string, items: T[]): Promise<any> {
  if (!items || items.length === 0) return { count: 0 };

  if (!cachedTables[tableName]) {
    cachedTables[tableName] = [];
  }
  cachedTables[tableName].push(...items);

  const payload = {
    action: 'batchInsert',
    table: tableName,
    data: items
  };

  try {
    const resp = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const json: SheetApiResponse = await resp.json();
    if (!json.success) {
      throw new Error(json.error || 'Error al persistir lote en Google Sheets');
    }
    return json;
  } catch (err) {
    console.error(`[GoogleSheetsClient] Error al hacer batchInsert en '${tableName}':`, err);
    throw err;
  }
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
  if (cachedTables[tableName]) {
    cachedTables[tableName] = cachedTables[tableName].filter(r => String(r[pk]) !== String(id));
  }

  const payload = {
    action: 'delete',
    table: tableName,
    id: id
  };

  try {
    const resp = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const json: SheetApiResponse = await resp.json();
    return Boolean(json.success);
  } catch (err) {
    console.error(`[GoogleSheetsClient] Error al eliminar fila en '${tableName}':`, err);
    return false;
  }
}
