import { getSupabaseConfig, resetSupabaseClientCache, tryGetActiveSupabaseClient } from './lib/supabaseClient';
import {
  sheetFetchTable,
  sheetUpsertRow,
  sheetBatchInsert,
  sheetDeleteRow
} from './lib/googleSheetsClient';

export { getSupabaseConfig };

export const getSupabaseClient = () => tryGetActiveSupabaseClient();
export const resetSupabaseInstance = () => resetSupabaseClientCache();

// =============================================================================
// 1. Usuarios (Google Sheets <--> Sistema)
// =============================================================================
export async function dbFetchUsuarios() {
  try {
    const list = await (await import('./services/usuariosService')).usuariosService.list();
    if (list && list.length > 0) return list;
  } catch (e) {
    console.warn('dbFetchUsuarios:', e);
  }
  const { INITIAL_USUARIOS } = await import('./data/initialData');
  return INITIAL_USUARIOS;
}

export async function dbUpsertUsuarios(usuarios: any[]) {
  try {
    for (const u of usuarios) {
      await sheetUpsertRow('usuarios', u);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertUsuarios error:', sheetErr);
  }
  try { await (await import('./services/usuariosService')).usuariosService.upsert(usuarios); }
  catch (e) { console.warn('dbUpsertUsuarios:', e); }
}

// =============================================================================
// 2. Mesas
// =============================================================================
export async function dbFetchMesas(forceFresh = false) {
  const { hydrateTableUnions } = await import('./lib/tableUnions');
  try {
    const list = await (await import('./services/mesasService')).mesasService.list(forceFresh);
    if (list && list.length > 0) {
      return hydrateTableUnions(list);
    }
  } catch (e) {
    console.warn('dbFetchMesas (Supabase) error:', e);
  }
  try {
    const data = await sheetFetchTable('mesas', forceFresh);
    if (data && data.length > 0) {
      return hydrateTableUnions(data);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchMesas fallback error:', sheetErr);
  }
  try {
    const { INITIAL_MESAS } = await import('./data/initialData');
    return hydrateTableUnions(INITIAL_MESAS);
  } catch {
    return null;
  }
}

export async function dbUpsertMesas(mesas: any[]) {
  try {
    const service = (await import('./services/mesasService')).mesasService;
    await service.upsert(mesas);
  } catch (e) {
    console.warn('dbUpsertMesas (Supabase) error:', e);
  }
}

// =============================================================================
// 3. Insumos
// =============================================================================
export async function dbFetchInsumos() {
  try {
    const data = await sheetFetchTable('insumos');
    if (data && data.length > 0) {
      return data.map((i: any) => ({
        ...i,
        stock_actual: Number(i.stock_actual || 0),
        stock_minimo: Number(i.stock_minimo || 0),
        costo_unitario: Number(i.costo_unitario || 0),
        es_bebida_directa: i.es_bebida_directa === true || String(i.es_bebida_directa).toLowerCase() === 'true',
      }));
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchInsumos fallback to Supabase:', sheetErr);
  }
  try { return await (await import('./services/insumosService')).insumosService.list(); }
  catch (e) { console.warn('dbFetchInsumos:', e); return null; }
}

export async function dbUpsertInsumos(insumos: any[]) {
  try {
    for (const i of insumos) {
      await sheetUpsertRow('insumos', i);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertInsumos error:', sheetErr);
  }
  try { await (await import('./services/insumosService')).insumosService.upsert(insumos); }
  catch (e) { console.warn('dbUpsertInsumos:', e); }
}

export async function dbRecordMovement(movement: any) {
  try {
    await sheetUpsertRow('caja_ledger', {
      id_ledger: `mov_${Date.now()}`,
      concepto: movement.motivo || movement.concepto || 'Ajuste Insumo',
      monto: Number(movement.cantidad || 0),
      tipo: movement.tipo_movimiento || 'ajuste',
      fecha: new Date().toISOString()
    });
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbRecordMovement error:', sheetErr);
  }
  try { await (await import('./services/insumosService')).insumosService.recordMovement(movement); }
  catch (e) { console.warn('dbRecordMovement:', e); }
}

// =============================================================================
// 4. Productos del Menú (Carta / Precios en Google Sheets)
// =============================================================================
export async function dbFetchProductosMenu() {
  try {
    const { menuService } = await import('./services/menuService');
    return await menuService.list();
  } catch (e) {
    console.warn('dbFetchProductosMenu error:', e);
    return null;
  }
}

export async function dbUpsertProductosMenu(productos: any[]) {
  try {
    await (await import('./services/menuService')).menuService.upsert(productos);
  } catch (e) {
    console.warn('dbUpsertProductosMenu (Supabase) error:', e);
  }
  try {
    for (const p of productos) {
      await sheetUpsertRow('productos_menu', p);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertProductosMenu error:', sheetErr);
  }
}

// =============================================================================
// 5. Recetas
// =============================================================================
export async function dbFetchRecetas() {
  try {
    const list = await (await import('./services/recetasService')).recetasService.list();
    if (list && list.length > 0) return list;
  } catch (e) {
    console.warn('dbFetchRecetas fallback to INITIAL_RECETAS_ESCANDALLO:', e);
  }
  const { INITIAL_RECETAS_ESCANDALLO } = await import('./data/initialData');
  return INITIAL_RECETAS_ESCANDALLO;
}
export async function dbUpsertRecetas(recetas: any[]) {
  try { await (await import('./services/recetasService')).recetasService.upsert(recetas); }
  catch (e) { console.warn('dbUpsertRecetas:', e); }
}

// =============================================================================
// 6. Promociones
// =============================================================================
export async function dbFetchPromociones() {
  try {
    const data = await sheetFetchTable('promociones');
    if (data && data.length > 0) {
      return data.map((pr: any) => ({
        ...pr,
        descuento: Number(pr.descuento || 0),
        descuento_porcentaje: Number(pr.descuento_porcentaje || 0),
        precio: Number(pr.precio || 0),
        activa: pr.activa !== false && String(pr.activa).toLowerCase() !== 'false',
      }));
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchPromociones fallback to Supabase:', sheetErr);
  }
  try { return await (await import('./services/promocionesService')).promocionesService.list(); }
  catch (e) { console.warn('dbFetchPromociones:', e); return null; }
}

export async function dbUpsertPromociones(promos: any[]) {
  try {
    for (const p of promos) {
      await sheetUpsertRow('promociones', p);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertPromociones error:', sheetErr);
  }
  try { await (await import('./services/promocionesService')).promocionesService.upsert(promos); }
  catch (e) { console.warn('dbUpsertPromociones:', e); }
}

// =============================================================================
// 7. Proveedores
// =============================================================================
export async function dbFetchProveedores() {
  try {
    const data = await sheetFetchTable('proveedores');
    if (data && data.length > 0) return data;
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchProveedores fallback to Supabase:', sheetErr);
  }
  try { return await (await import('./services/proveedoresService')).proveedoresService.list(); }
  catch (e) { console.warn('dbFetchProveedores:', e); return null; }
}

export async function dbUpsertProveedores(provs: any[]) {
  try {
    for (const p of provs) {
      await sheetUpsertRow('proveedores', p);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertProveedores error:', sheetErr);
  }
  try { await (await import('./services/proveedoresService')).proveedoresService.upsert(provs); }
  catch (e) { console.warn('dbUpsertProveedores:', e); }
}

// =============================================================================
// 8. Reservas
// =============================================================================
export async function dbFetchReservas() {
  try {
    const data = await sheetFetchTable('reservas');
    if (data && data.length > 0) return data;
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchReservas fallback to Supabase:', sheetErr);
  }
  try { return await (await import('./services/reservasService')).reservasService.list(); }
  catch (e) { console.warn('dbFetchReservas:', e); return null; }
}

export async function dbUpsertReservas(reservas: any[]) {
  try {
    for (const r of reservas) {
      await sheetUpsertRow('reservas', r);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertReservas error:', sheetErr);
  }
  try { await (await import('./services/reservasService')).reservasService.upsert(reservas); }
  catch (e) { console.warn('dbUpsertReservas:', e); }
}

// =============================================================================
// 9. Auditoría / Logs
// =============================================================================
export async function dbFetchLogs() {
  try { return await (await import('./services/auditoriaService')).auditoriaService.list(); }
  catch (e) { console.warn('dbFetchLogs:', e); return null; }
}

export async function dbInsertLog(log: any) {
  sheetUpsertRow('pedido_operaciones', {
    id_operacion: log.id || `log_${Date.now()}`,
    tipo_operacion: log.tipo || 'sistema',
    detalles: log.mensaje || '',
    usuario: log.usuario || 'Sistema',
    fecha_hora: new Date().toISOString()
  }).catch(sheetErr => {
    console.warn('[GoogleSheets] dbInsertLog error:', sheetErr);
  });
  try { await (await import('./services/auditoriaService')).auditoriaService.create(log); }
  catch (e) { console.warn('dbInsertLog:', e); }
}

// =============================================================================
// 10. Pedidos (Comandas del Mozo a Google Sheets)
// =============================================================================
export async function dbFetchPedidos(forceFresh = false) {
  try {
    const data = await sheetFetchTable('pedidos_cabecera', forceFresh);
    if (data && data.length > 0) {
      return data.map((p: any) => ({
        ...p,
        id_pedido: Number(p.id_pedido),
        id_mesa: Number(p.id_mesa || 1),
        minutos_transcurridos: Number(p.minutos_transcurridos || 0),
        items: typeof p.items === 'string' ? (JSON.parse(p.items || '[]')) : (p.items || []),
      }));
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchPedidos fallback to Supabase:', sheetErr);
  }
  try { return await (await import('./services/pedidosService')).pedidosService.list(); }
  catch (e) { console.warn('dbFetchPedidos:', e); return null; }
}

export async function dbSavePedidoComplex(pedido: any) {
  try {
    // 1. Guardar cabecera en Google Sheets
    await sheetUpsertRow('pedidos_cabecera', {
      id_pedido: pedido.id_pedido,
      id_mesa: pedido.id_mesa,
      numero_mesa: pedido.numero_mesa,
      mozo: pedido.mozo,
      estado_comanda: pedido.estado_comanda || 'pendiente',
      observaciones: pedido.observaciones || '',
      fecha_hora: pedido.fecha_hora || new Date().toISOString(),
      items: JSON.stringify(pedido.items || [])
    });

    // 2. Guardar detalles de platos si existen
    if (Array.isArray(pedido.items) && pedido.items.length > 0) {
      const detalles = pedido.items.map((it: any, idx: number) => ({
        id_detalle: `${pedido.id_pedido}_${idx}`,
        id_pedido: pedido.id_pedido,
        id_producto: it.id_producto || '',
        nombre: it.nombre || '',
        cantidad: Number(it.cantidad || 1),
        categoria: it.categoria || 'Menu',
        precio_unitario: Number(it.precio_unitario || 0),
        estado: it.estado || 'pendiente',
        fecha_hora: new Date().toISOString()
      }));
      await sheetBatchInsert('pedido_detalle', detalles);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbSavePedidoComplex error:', sheetErr);
  }

  try { await (await import('./services/pedidosService')).pedidosService.upsert([pedido]); }
  catch (e) { console.warn('dbSavePedidoComplex fallback:', e); }
}

// =============================================================================
// 11. Mermas
// =============================================================================
export async function dbFetchMermas() {
  try {
    const list = await (await import('./services/mermasService')).mermasService.list();
    if (list) return list;
  } catch (e) {
    console.warn('dbFetchMermas fallback to empty list:', e);
  }
  return [];
}

export async function dbUpsertMermas(mermas: any[]) {
  try { await (await import('./services/mermasService')).mermasService.upsert(mermas); }
  catch (e) { console.warn('dbUpsertMermas:', e); }
}

// =============================================================================
// 12. Facturas y Cobros
// =============================================================================
export async function dbFetchFacturas() {
  try {
    const data = await sheetFetchTable('facturas');
    if (data && data.length > 0) return data;
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchFacturas fallback:', sheetErr);
  }
  try { return await (await import('./services/facturacionService')).facturacionService.list(); }
  catch (e) { console.warn('dbFetchFacturas:', e); return null; }
}

export async function dbUpsertFacturas(facturas: any[]) {
  try {
    for (const f of facturas) {
      await sheetUpsertRow('facturas', f);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertFacturas error:', sheetErr);
  }
  try { await (await import('./services/facturacionService')).facturacionService.upsert(facturas); }
  catch (e) { console.warn('dbUpsertFacturas:', e); }
}

// =============================================================================
// 13. Pagos
// =============================================================================
export async function dbFetchPagos(idFactura?: string) {
  try {
    const data = await sheetFetchTable('pagos');
    if (data && data.length > 0) {
      const parsed = data.map((p: any) => ({
        id_pago: String(p.id_pago),
        id_factura: String(p.id_factura),
        monto: Number(p.monto || 0),
        metodo: p.metodo,
        fecha: p.fecha
      }));
      return idFactura ? parsed.filter((p: any) => p.id_factura === idFactura) : parsed;
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchPagos fallback:', sheetErr);
  }
  try { return await (await import('./services/pagosService')).pagosService.list(idFactura); }
  catch (e) { console.warn('dbFetchPagos:', e); return null; }
}

export async function dbUpsertPagos(pagos: any[]) {
  try {
    for (const p of pagos) {
      await sheetUpsertRow('pagos', p);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertPagos error:', sheetErr);
  }
  try { await (await import('./services/pagosService')).pagosService.bulkCreate(pagos); }
  catch (e) { console.warn('dbUpsertPagos:', e); }
}

// =============================================================================
// 14. ARCA Configuración Fiscal
// =============================================================================
export async function dbFetchArcaConfig() {
  try {
    const client = tryGetActiveSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('arca_config')
        .select('*')
        .eq('id', 'primary')
        .maybeSingle();
      if (!error && data) return data;
    }
  } catch (e) {
    console.warn('dbFetchArcaConfig Supabase error:', e);
  }
  const { OFFICIAL_ARCA_CONFIG } = await import('./data/arcaConfig');
  return OFFICIAL_ARCA_CONFIG;
}

export async function dbUpsertArcaConfig(config: any) {
  try {
    const client = tryGetActiveSupabaseClient();
    if (client) {
      const { error } = await client
        .from('arca_config')
        .upsert({ ...config, id: 'primary' });
      if (error) throw error;
    }
  } catch (e) {
    console.warn('dbUpsertArcaConfig Supabase error:', e);
  }
  try {
    await sheetUpsertRow('arca_config', { ...config, id: 'primary' });
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertArcaConfig error:', sheetErr);
  }
}


