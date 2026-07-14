import { getSupabaseConfig, resetSupabaseClientCache, tryGetActiveSupabaseClient } from './lib/supabaseClient';

export { getSupabaseConfig };

export const getSupabaseClient = () => tryGetActiveSupabaseClient();
export const resetSupabaseInstance = () => resetSupabaseClientCache();

// Usuarios
export async function dbFetchUsuarios() {
  try { return await (await import('./services/usuariosService')).usuariosService.list(); }
  catch (e) { console.warn('dbFetchUsuarios:', e); return null; }
}
export async function dbUpsertUsuarios(usuarios: any[]) {
  try { await (await import('./services/usuariosService')).usuariosService.upsert(usuarios); }
  catch (e) { console.warn('dbUpsertUsuarios:', e); }
}

// Mesas
export async function dbFetchMesas() {
  try { return await (await import('./services/mesasService')).mesasService.list(); }
  catch (e) { console.warn('dbFetchMesas:', e); return null; }
}
export async function dbUpsertMesas(mesas: any[]) {
  try { await (await import('./services/mesasService')).mesasService.upsert(mesas); }
  catch (e) { console.warn('dbUpsertMesas:', e); }
}

// Insumos
export async function dbFetchInsumos() {
  try { return await (await import('./services/insumosService')).insumosService.list(); }
  catch (e) { console.warn('dbFetchInsumos:', e); return null; }
}
export async function dbUpsertInsumos(insumos: any[]) {
  try { await (await import('./services/insumosService')).insumosService.upsert(insumos); }
  catch (e) { console.warn('dbUpsertInsumos:', e); }
}
export async function dbRecordMovement(movement: any) {
  try { await (await import('./services/insumosService')).insumosService.recordMovement(movement); }
  catch (e) { console.warn('dbRecordMovement:', e); }
}

// Productos Menu
export async function dbFetchProductosMenu() {
  try { return await (await import('./services/menuService')).menuService.list(); }
  catch (e) { console.warn('dbFetchProductosMenu:', e); return null; }
}
export async function dbUpsertProductosMenu(productos: any[]) {
  try { await (await import('./services/menuService')).menuService.upsert(productos); }
  catch (e) { console.warn('dbUpsertProductosMenu:', e); }
}

// Recetas
export async function dbFetchRecetas() {
  try { return await (await import('./services/recetasService')).recetasService.list(); }
  catch (e) { console.warn('dbFetchRecetas:', e); return null; }
}
export async function dbUpsertRecetas(recetas: any[]) {
  try { await (await import('./services/recetasService')).recetasService.upsert(recetas); }
  catch (e) { console.warn('dbUpsertRecetas:', e); }
}

// Promociones
export async function dbFetchPromociones() {
  try { return await (await import('./services/promocionesService')).promocionesService.list(); }
  catch (e) { console.warn('dbFetchPromociones:', e); return null; }
}
export async function dbUpsertPromociones(promos: any[]) {
  try { await (await import('./services/promocionesService')).promocionesService.upsert(promos); }
  catch (e) { console.warn('dbUpsertPromociones:', e); }
}

// Proveedores
export async function dbFetchProveedores() {
  try { return await (await import('./services/proveedoresService')).proveedoresService.list(); }
  catch (e) { console.warn('dbFetchProveedores:', e); return null; }
}
export async function dbUpsertProveedores(provs: any[]) {
  try { await (await import('./services/proveedoresService')).proveedoresService.upsert(provs); }
  catch (e) { console.warn('dbUpsertProveedores:', e); }
}

// Reservas
export async function dbFetchReservas() {
  try { return await (await import('./services/reservasService')).reservasService.list(); }
  catch (e) { console.warn('dbFetchReservas:', e); return null; }
}
export async function dbUpsertReservas(reservas: any[]) {
  try { await (await import('./services/reservasService')).reservasService.upsert(reservas); }
  catch (e) { console.warn('dbUpsertReservas:', e); }
}

// Auditoria / Logs
export async function dbFetchLogs() {
  try { return await (await import('./services/auditoriaService')).auditoriaService.list(); }
  catch (e) { console.warn('dbFetchLogs:', e); return null; }
}
export async function dbInsertLog(log: any) {
  try { await (await import('./services/auditoriaService')).auditoriaService.create(log); }
  catch (e) { console.warn('dbInsertLog:', e); }
}

// Pedidos
export async function dbFetchPedidos() {
  try { return await (await import('./services/pedidosService')).pedidosService.list(); }
  catch (e) { console.warn('dbFetchPedidos:', e); return null; }
}
export async function dbSavePedidoComplex(pedido: any) {
  try { await (await import('./services/pedidosService')).pedidosService.upsert([pedido]); }
  catch (e) { console.warn('dbSavePedidoComplex:', e); throw e; }
}

// Mermas
export async function dbFetchMermas() {
  try { return await (await import('./services/mermasService')).mermasService.list(); }
  catch (e) { console.warn('dbFetchMermas:', e); return null; }
}
export async function dbUpsertMermas(mermas: any[]) {
  try { await (await import('./services/mermasService')).mermasService.upsert(mermas); }
  catch (e) { console.warn('dbUpsertMermas:', e); }
}

// Facturas
export async function dbFetchFacturas() {
  try { return await (await import('./services/facturacionService')).facturacionService.list(); }
  catch (e) { console.warn('dbFetchFacturas:', e); return null; }
}
export async function dbUpsertFacturas(facturas: any[]) {
  try { await (await import('./services/facturacionService')).facturacionService.upsert(facturas); }
  catch (e) { console.warn('dbUpsertFacturas:', e); }
}
