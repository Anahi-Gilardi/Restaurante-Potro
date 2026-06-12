/**
 * Centralized Supabase Delegation File
 * Coordinates with modular services located in src/services/
 */

import { supabase, getSupabaseConfig, resetSupabaseClientCache, tryGetActiveSupabaseClient } from './lib/supabaseClient';
import { usuariosService } from './services/usuariosService';
import { mesasService } from './services/mesasService';
import { insumosService } from './services/insumosService';
import { menuService } from './services/menuService';
import { recetasService } from './services/recetasService';
import { pedidosService } from './services/pedidosService';
import { mermasService } from './services/mermasService';
import { proveedoresService } from './services/proveedoresService';
import { promocionesService } from './services/promocionesService';
import { reservasService } from './services/reservasService';
import { facturacionService } from './services/facturacionService';
import { auditoriaService } from './services/auditoriaService';
import { backupsService } from './services/backupsService';

export {
  getSupabaseConfig,
  supabase as default
};

// Lazy creation helper delegation
export const getSupabaseClient = () => {
  return tryGetActiveSupabaseClient();
};

export const resetSupabaseInstance = () => {
  resetSupabaseClientCache();
};

// 1. Usuarios
export async function dbFetchUsuarios() {
  try {
    return await usuariosService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar usuarios:', err);
    return null;
  }
}

export async function dbUpsertUsuarios(usuarios: any[]) {
  try {
    return await usuariosService.upsert(usuarios);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar usuarios:', err);
  }
}

// 2. Mesas
export async function dbFetchMesas() {
  try {
    return await mesasService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar mesas:', err);
    return null;
  }
}

export async function dbUpsertMesas(mesas: any[]) {
  try {
    return await mesasService.upsert(mesas);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar mesas:', err);
  }
}

// 3. Insumos
export async function dbFetchInsumos() {
  try {
    return await insumosService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar insumos:', err);
    return null;
  }
}

export async function dbUpsertInsumos(insumos: any[]) {
  try {
    return await insumosService.upsert(insumos);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar insumos:', err);
  }
}

export async function dbRecordMovement(movement: {
  id_insumo: string;
  tipo_movimiento: 'entrada' | 'salida_comanda' | 'salida_merma' | 'ajuste';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
}) {
  try {
    await insumosService.recordMovement(movement);
  } catch (err) {
    console.warn('Supabase: Fallo al registrar movimiento de inventario:', err);
  }
}

// 4. Productos Menú
export async function dbFetchProductosMenu() {
  try {
    return await menuService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar productos_menu:', err);
    return null;
  }
}

export async function dbUpsertProductosMenu(productos: any[]) {
  try {
    return await menuService.upsert(productos);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar productos:', err);
  }
}

// 5. Recetas
export async function dbFetchRecetas() {
  try {
    return await recetasService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar recetas:', err);
    return null;
  }
}

export async function dbUpsertRecetas(recetas: any[]) {
  try {
    return await recetasService.upsert(recetas);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar recetas:', err);
  }
}

// 6. Promociones
export async function dbFetchPromociones() {
  try {
    return await promocionesService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar promociones:', err);
    return null;
  }
}

export async function dbUpsertPromociones(promos: any[]) {
  try {
    await promocionesService.upsert(promos);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar promociones:', err);
  }
}

// 7. Proveedores
export async function dbFetchProveedores() {
  try {
    return await proveedoresService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar proveedores:', err);
    return null;
  }
}

export async function dbUpsertProveedores(provs: any[]) {
  try {
    return await proveedoresService.upsert(provs);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar proveedores:', err);
  }
}

// 8. Reservas
export async function dbFetchReservas() {
  try {
    return await reservasService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar reservas:', err);
    return null;
  }
}

export async function dbUpsertReservas(reservas: any[]) {
  try {
    await reservasService.upsert(reservas);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar reservas:', err);
  }
}

// 9. Eventos / Auditoría
export async function dbFetchLogs() {
  try {
    return await auditoriaService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar logs:', err);
    return null;
  }
}

export async function dbInsertLog(log: any) {
  try {
    await auditoriaService.create(log);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar registro de auditoría:', err);
  }
}

// 10. Pedidos
export async function dbFetchPedidos() {
  try {
    return await pedidosService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar pedidos compuesto:', err);
    return null;
  }
}

export async function dbSavePedidoComplex(pedido: any) {
  try {
    await pedidosService.upsert([pedido]);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar pedido complex:', err);
  }
}

// 11. Mermas
export async function dbFetchMermas() {
  try {
    return await mermasService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar mermas:', err);
    return null;
  }
}

export async function dbUpsertMermas(mermas: any[]) {
  try {
    return await mermasService.upsert(mermas);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar mermas:', err);
  }
}

// 12. Facturas
export async function dbFetchFacturas() {
  try {
    return await facturacionService.list();
  } catch (err) {
    console.warn('Supabase: Fallo al recuperar facturas:', err);
    return null;
  }
}

export async function dbUpsertFacturas(facturas: any[]) {
  try {
    return await facturacionService.upsert(facturas);
  } catch (err) {
    console.warn('Supabase: Fallo al guardar facturas:', err);
  }
}
