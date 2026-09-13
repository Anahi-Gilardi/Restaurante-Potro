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
    const data = await sheetFetchTable('usuarios');
    if (data && data.length > 0) return data;
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchUsuarios fallback to Supabase:', sheetErr);
  }
  try { return await (await import('./services/usuariosService')).usuariosService.list(); }
  catch (e) { console.warn('dbFetchUsuarios:', e); return null; }
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
export async function dbFetchMesas() {
  try {
    const data = await sheetFetchTable('mesas');
    if (data && data.length > 0) {
      return data.map((m: any) => ({
        ...m,
        id_mesa: Number(m.id_mesa || 1),
        comensales: m.comensales ? Number(m.comensales) : undefined,
      }));
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchMesas fallback to Supabase:', sheetErr);
  }
  try { return await (await import('./services/mesasService')).mesasService.list(); }
  catch (e) { console.warn('dbFetchMesas:', e); return null; }
}

export async function dbUpsertMesas(mesas: any[]) {
  try {
    for (const m of mesas) {
      await sheetUpsertRow('mesas', m);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertMesas error:', sheetErr);
  }
  try { await (await import('./services/mesasService')).mesasService.upsert(mesas); }
  catch (e) { console.warn('dbUpsertMesas:', e); }
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
    const data = await sheetFetchTable('productos_menu');
    if (data && data.length > 0) {
      return data.map((p: any) => ({
        ...p,
        precio_venta: Number(p.precio_venta || 0),
        precio_original: p.precio_original ? Number(p.precio_original) : undefined,
        precio_final: p.precio_final ? Number(p.precio_final) : undefined,
        activo: p.activo !== false && String(p.activo).toLowerCase() !== 'false',
        requiere_cocina: p.requiere_cocina !== false && String(p.requiere_cocina).toLowerCase() !== 'false',
      }));
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbFetchProductosMenu fallback to Supabase:', sheetErr);
  }
  try { return await (await import('./services/menuService')).menuService.list(); }
  catch (e) { console.warn('dbFetchProductosMenu:', e); return null; }
}

export async function dbUpsertProductosMenu(productos: any[]) {
  try {
    for (const p of productos) {
      await sheetUpsertRow('productos_menu', p);
    }
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbUpsertProductosMenu error:', sheetErr);
  }
  try { await (await import('./services/menuService')).menuService.upsert(productos); }
  catch (e) { console.warn('dbUpsertProductosMenu:', e); }
}

// =============================================================================
// 5. Recetas
// =============================================================================
export async function dbFetchRecetas() {
  try { return await (await import('./services/recetasService')).recetasService.list(); }
  catch (e) { console.warn('dbFetchRecetas:', e); return null; }
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
  try {
    await sheetUpsertRow('pedido_operaciones', {
      id_operacion: log.id || `log_${Date.now()}`,
      tipo_operacion: log.tipo || 'sistema',
      detalles: log.mensaje || '',
      usuario: log.usuario || 'Sistema',
      fecha_hora: new Date().toISOString()
    });
  } catch (sheetErr) {
    console.warn('[GoogleSheets] dbInsertLog error:', sheetErr);
  }
  try { await (await import('./services/auditoriaService')).auditoriaService.create(log); }
  catch (e) { console.warn('dbInsertLog:', e); }
}

// =============================================================================
// 10. Pedidos (Comandas del Mozo a Google Sheets)
// =============================================================================
export async function dbFetchPedidos() {
  try {
    const data = await sheetFetchTable('pedidos_cabecera');
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
  try { return await (await import('./services/mermasService')).mermasService.list(); }
  catch (e) { console.warn('dbFetchMermas:', e); return null; }
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

