import { createClient } from '@supabase/supabase-js';

// Default credentials from your prompt (supports dynamic editing in the UI/localStorage)
const DEFAULT_URL = "https://sqczmyaoqplrmrgyczjy.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxY3pteWFvcXBscm1yZ3ljemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQ5NzQsImV4cCI6MjA5Njg1MDk3NH0.R5bPwot9KCMJ9OXWcokL705ZD7_0ujH9fGY_GcqxjYY";

// Retrieve from localStorage to allow direct runtime configuration, or config variables
export const getSupabaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  
  // Clean localStorage if it contains the old default Supabase URL, to avoid collision
  const storedUrl = localStorage.getItem('SUPABASE_URL');
  if (storedUrl === "https://jyisecrmuiebuvtgqjhy.supabase.co" || storedUrl === "https://jyisecrmuiebuvtgqjhy.supabase.co/") {
    localStorage.removeItem('SUPABASE_URL');
    localStorage.removeItem('SUPABASE_ANON_KEY');
  }

  let url = localStorage.getItem('SUPABASE_URL') || metaEnv.VITE_SUPABASE_URL || DEFAULT_URL;
  const key = localStorage.getItem('SUPABASE_ANON_KEY') || metaEnv.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

  if (url) {
    url = url.trim();
    // Remove /rest/v1/ or /rest/v1 suffixes if they are present
    if (url.endsWith('/rest/v1/')) {
      url = url.substring(0, url.length - 9);
    } else if (url.endsWith('/rest/v1')) {
      url = url.substring(0, url.length - 8);
    } else if (url.endsWith('rest/v1')) {
      url = url.substring(0, url.length - 7);
    }
    // Remove trailing slash
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
  }

  return { url, key };
};

// Lazy creation helper to allow live configuration updates
let supabaseInstance: any = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export const getSupabaseClient = () => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || key.includes('...')) {
    return null;
  }
  try {
    if (!supabaseInstance || lastUsedUrl !== url || lastUsedKey !== key) {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: false }
      });
      lastUsedUrl = url;
      lastUsedKey = key;
    }
    return supabaseInstance;
  } catch (err) {
    console.error('Error al inicializar cliente Supabase:', err);
    return null;
  }
};

// Reset instance when credentials change
export const resetSupabaseInstance = () => {
  supabaseInstance = null;
  lastUsedUrl = '';
  lastUsedKey = '';
};

/**
 * Robust database sync utilities.
 * Fallbacks to local operations if connection fails or tables do not exist yet.
 */

// 1. Usuarios
export async function dbFetchUsuarios(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('usuarios').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar usuarios, ignorando...', err);
    return null;
  }
}

export async function dbUpsertUsuarios(usuarios: any[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { error } = await client.from('usuarios').upsert(usuarios);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase: No se pudieron guardar usuarios:', err);
  }
}

// 2. Mesas / Mesetas
export async function dbFetchMesas(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    // Check both potential names for resiliency (fallback on 'mesas' if 'mesetas' fails)
    let res = await client.from('mesetas').select('*');
    if (res.error) {
      res = await client.from('mesas').select('*');
    }
    if (res.error) throw res.error;
    return res.data;
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar mesas:', err);
    return null;
  }
}

export async function dbUpsertMesas(mesas: any[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    // Map properties to database schema if needed
    const mapped = mesas.map(m => ({
      id_mesa: m.id_mesa,
      numero_mesa: m.numero_mesa,
      estado: m.estado,
      comensales: m.comensales || null
    }));
    
    let res = await client.from('mesetas').upsert(mapped);
    if (res.error) {
      res = await client.from('mesas').upsert(mapped);
    }
    if (res.error) throw res.error;
  } catch (err) {
    console.warn('Supabase: No se pudieron guardar mesas:', err);
  }
}

// 3. Insumos (Depósitos)
export async function dbFetchInsumos(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    // Check 'depósitos' first
    let res = await client.from('depósitos').select('*');
    if (res.error) {
      res = await client.from('insumos').select('*');
    }
    if (res.error) throw res.error;
    return res.data;
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar insumos:', err);
    return null;
  }
}

export async function dbUpsertInsumos(insumos: any[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const mapped = insumos.map(i => ({
      id_insumo: i.id_insumo,
      nombre: i.nombre,
      stock_actual: i.stock_actual,
      stock_minimo: i.stock_minimo,
      unidad_medida: i.unidad_medida,
      categoria: i.categoria
    }));

    let res = await client.from('depósitos').upsert(mapped);
    if (res.error) {
      res = await client.from('insumos').upsert(mapped);
    }
    if (res.error) throw res.error;
  } catch (err) {
    console.warn('Supabase: No se pudieron guardar insumos:', err);
  }
}

// 4. Productos Menu
export async function dbFetchProductosMenu(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    // Try primary "productos_menu" (no accent) first, then falling back
    let res = await client.from('productos_menu').select('*');
    if (res.error) {
      res = await client.from('productos_menú').select('*');
    }
    if (res.error) {
      res = await client.from('productos').select('*');
    }
    if (res.error) throw res.error;

    // Normalizar propiedad de categoría para mapear 'categorías' o 'categoria' a 'categoria'
    return res.data.map((item: any) => ({
      ...item,
      categoria: item.categoria !== undefined ? item.categoria : (item.categorías !== undefined ? item.categorías : 'cocina')
    }));
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar productos_menu:', err);
    return null;
  }
}

export async function dbUpsertProductosMenu(productos: any[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const mappedWithNoAccent = productos.map(p => ({
      id_producto: p.id_producto,
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      categoria: p.categoria,
      activo: p.activo,
      imagen: p.imagen
    }));

    const mappedWithAccentAndPlural = productos.map(p => ({
      id_producto: p.id_producto,
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      categorías: p.categoria,
      activo: p.activo,
      imagen: p.imagen
    }));

    // Intenta mapeo estandar primero
    let res = await client.from('productos_menu').upsert(mappedWithNoAccent);
    
    // Si falla por columna inexistente (e.g., "categoria" no existe)
    if (res.error) {
      const errorMsg = res.error?.message?.toLowerCase() || '';
      if (errorMsg.includes('categoria') || errorMsg.includes('column') || res.error?.code === '42703') {
        res = await client.from('productos_menu').upsert(mappedWithAccentAndPlural);
      }
    }

    // Fallbacks para otros nombres de tablas si es necesario
    if (res.error) {
      let resFallback = await client.from('productos_menú').upsert(mappedWithNoAccent);
      if (resFallback.error) {
        resFallback = await client.from('productos_menú').upsert(mappedWithAccentAndPlural);
      }
      if (resFallback.error) {
        let resFallbackProd = await client.from('productos').upsert(mappedWithNoAccent);
        if (resFallbackProd.error) {
          resFallbackProd = await client.from('productos').upsert(mappedWithAccentAndPlural);
        }
        if (resFallbackProd.error) throw resFallbackProd.error;
      }
    }
  } catch (err) {
    console.warn('Supabase: No se pudieron guardar productos_menu:', err);
  }
}

// 5. Recetas
export async function dbFetchRecetas(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('recetas_escandallo').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar recetas_escandallo:', err);
    return null;
  }
}

export async function dbUpsertRecetas(recetas: any[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { error } = await client.from('recetas_escandallo').upsert(recetas);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase: No se pudieron guardar recetas:', err);
  }
}

// 6. Promociones
export async function dbFetchPromociones(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('promociones').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar promociones:', err);
    return null;
  }
}

export async function dbUpsertPromociones(promos: any[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { error } = await client.from('promociones').upsert(promos);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase: No se pudieron guardar promociones:', err);
  }
}

// 7. Proveedores
export async function dbFetchProveedores(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('proveedores').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar proveedores:', err);
    return null;
  }
}

export async function dbUpsertProveedores(provs: any[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { error } = await client.from('proveedores').upsert(provs);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase: No se pudieron guardar proveedores:', err);
  }
}

// 8. Reservas
export async function dbFetchReservas(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('reservas').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar reservas:', err);
    return null;
  }
}

export async function dbUpsertReservas(reservas: any[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { error } = await client.from('reservas').upsert(reservas);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase: No se pudieron guardar reservas:', err);
  }
}

// 9. Eventos / Auditoría
export async function dbFetchLogs(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('auditoria_eventos').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar auditoria_eventos:', err);
    return null;
  }
}

export async function dbInsertLog(log: any) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { error } = await client.from('auditoria_eventos').insert([log]);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase: No se pudo registrar log:', err);
  }
}

// 10. Pedidos (con cabecera y detalles para coincidir con la DB del usuario)
export async function dbFetchPedidos(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const cabeceras = await client.from('pedidos_cabecera').select('*');
    if (cabeceras.error) throw cabeceras.error;

    const detalles = await client.from('pedido_detail_or_similar').select('*'); // Try dynamic or fallbacks
    // Querying with table names from screenshot
    let resDet = await client.from('pedido_detalle').select('*');
    if (resDet.error) throw resDet.error;

    // Assemble complex nested objects matching 'Pedido' type
    const assembled = cabeceras.data.map(cab => {
      const itemsFiltrados = resDet.data
        .filter((d: any) => d.id_pedido === cab.id_pedido)
        .map((d: any) => ({
          id_producto: d.id_producto,
          nombre: d.nombre,
          cantidad: d.cantidad,
          categoria: d.categoria
        }));

      return {
        id_pedido: cab.id_pedido,
        id_mesa: cab.id_mesa,
        numero_mesa: cab.numero_mesa,
        mozo: cab.mozo,
        estado_comanda: cab.estado_comanda,
        items: itemsFiltrados,
        observaciones: cab.observaciones,
        fecha_hora: new Date(cab.fecha_hora),
        minutos_transcurridos: cab.minutos_transcurridos || 0,
        origen: cab.origen || 'Mozo',
        tiempo_despacho_minutos: cab.tiempo_despacho_minutos,
        segundos_en_listo: cab.segundos_en_listo
      };
    });

    return assembled;
  } catch (err) {
    console.warn('Supabase: No se pudieron cargar pedidos compuestos. Intentando fallback JSON binario...');
    // Support flat fallback
    try {
      const res = await client.from('pedidos_cabecera').select('*');
      if (!res.error) {
        // If they have full json or we store full state in cabecera
        return res.data.map(cab => ({
          ...cab,
          items: typeof cab.items === 'string' ? JSON.parse(cab.items) : (cab.items || [])
        }));
      }
    } catch { }
    return null;
  }
}

export async function dbSavePedidoComplex(pedido: any) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    // 1. Save cabecera
    const cabecera = {
      id_pedido: pedido.id_pedido,
      id_mesa: pedido.id_mesa,
      numero_mesa: pedido.numero_mesa,
      mozo: pedido.mozo,
      estado_comanda: pedido.estado_comanda,
      observaciones: pedido.observaciones || null,
      fecha_hora: pedido.fecha_hora.toISOString(),
      minutos_transcurridos: pedido.minutos_transcurridos,
      origen: pedido.origen,
      tiempo_despacho_minutos: pedido.tiempo_despacho_minutos || null,
      segundos_en_listo: pedido.segundos_en_listo || null,
      // Fallback serialized items in case detailing is not supported by DB schema constraints
      items: JSON.stringify(pedido.items)
    };

    const { error: cabError } = await client.from('pedidos_cabecera').upsert(cabecera);
    if (cabError) throw cabError;

    // 2. Save items detail
    if (pedido.items && pedido.items.length > 0) {
      const details = pedido.items.map((it: any, index: number) => ({
        id_detalle: `${pedido.id_pedido}_${index}`,
        id_pedido: pedido.id_pedido,
        id_producto: it.id_producto,
        nombre: it.nombre,
        cantidad: it.cantidad,
        categoria: it.categoria
      }));
      // Delete old details first
      await client.from('pedido_detalle').delete().eq('id_pedido', pedido.id_pedido);
      const { error: detError } = await client.from('pedido_detalle').upsert(details);
      if (detError) {
        console.warn('Supabase: Detalle de pedido no pudo ser guardado individualmente, guardado solo en Cabecera (JSON/Texto).');
      }
    }
  } catch (err) {
    console.warn('Supabase: Error al guardar comanda en base de datos remota:', err);
  }
}
