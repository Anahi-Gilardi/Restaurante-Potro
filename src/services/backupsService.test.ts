import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mergeCheckpoints, parseBackupContent } from './backupsService';

const emptySnapshot = {
  usuarios: [{
    id_usuario: 1,
    nombre: 'Sofía',
    apellido: 'Admin',
    rol: 'administrador' as const,
    activo: true
  }],
  mesas: [],
  insumos: [],
  productosMenu: [],
  recetas: [],
  pedidos: [],
  mermas: [],
  proveedores: [],
  promociones: [],
  reservas: [],
  facturas: [],
  logs: [],
  pagos: [],
  cierresCaja: [],
  clientes: [],
  movimientosCajaChica: [],
  historialCostos: [],
  movimientosInventario: [],
  categorias: [],
  configuracion: []
};

test('valida la estructura y recupera fechas del respaldo', () => {
  const snapshot = parseBackupContent(JSON.stringify({
    ...emptySnapshot,
    pedidos: [{
      id_pedido: 1,
      id_mesa: 1,
      numero_mesa: '1',
      mozo: 'Enzo',
      estado_comanda: 'pendiente',
      items: [],
      fecha_hora: '2026-06-14T20:00:00.000Z',
      minutos_transcurridos: 0,
      origen: 'Mozo'
    }],
    mermas: [{
      id_merma: 'm1',
      id_insumo: 'i1',
      nombre_insumo: 'Papa',
      cantidad: 1,
      unidad_medida: 'g',
      motivo: 'otro',
      fecha: '2026-06-14T20:00:00.000Z'
    }],
    logs: [{
      id: 'l1',
      tipo: 'sistema',
      mensaje: 'Backup',
      timestamp: '2026-06-14T20:00:00.000Z'
    }]
  }));

  assert.ok(snapshot.pedidos[0].fecha_hora instanceof Date);
  assert.ok(snapshot.mermas[0].fecha instanceof Date);
  assert.ok(snapshot.logs[0].timestamp instanceof Date);
});

test('rechaza copias incompletas antes de reemplazar datos', () => {
  assert.throws(
    () => parseBackupContent(JSON.stringify({ mesas: [] })),
    /respaldo está incompleto/i
  );
});

test('acepta respaldos antiguos y agrega las colecciones contables nuevas', () => {
  const legacy = { ...emptySnapshot } as Record<string, unknown>;
  for (const key of [
    'pagos',
    'cierresCaja',
    'clientes',
    'movimientosCajaChica',
    'historialCostos',
    'movimientosInventario',
    'categorias',
    'configuracion'
  ]) delete legacy[key];

  const parsed = parseBackupContent(JSON.stringify(legacy));
  assert.deepEqual(parsed.pagos, []);
  assert.deepEqual(parsed.cierresCaja, []);
  assert.deepEqual(parsed.clientes, []);
  assert.deepEqual(parsed.movimientosInventario, []);
});

test('recupera fechas de clientes e historial de costos', () => {
  const parsed = parseBackupContent(JSON.stringify({
    ...emptySnapshot,
    clientes: [{
      id_cliente: 'cli_1',
      dni_cuit: '20123456789',
      nombre: 'Cliente',
      puntos: 10,
      fecha_registro: '2026-07-17T12:00:00.000Z'
    }],
    historialCostos: [{
      id_historial: 'hc_1',
      id_insumo: 'i1',
      nombre_insumo: 'Papa',
      costo_anterior: 1,
      costo_nuevo: 2,
      fecha: '2026-07-17T12:00:00.000Z'
    }]
  }));

  assert.ok(parsed.clientes[0].fecha_registro instanceof Date);
  assert.ok(parsed.historialCostos[0].fecha instanceof Date);
});

test('acepta datos históricos sin usuarios porque conserva Supabase Auth actual', () => {
  const parsed = parseBackupContent(JSON.stringify({ ...emptySnapshot, usuarios: [] }));
  assert.deepEqual(parsed.usuarios, []);
});

test('el respaldo excluye secretos y no restaura perfiles de autenticación desde el navegador', () => {
  const source = readFileSync(new URL('./backupsService.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from\(['"]arca_config['"]\)/);
  assert.doesNotMatch(source, /from\(['"]app_login_credentials['"]\)/);
  assert.doesNotMatch(source, /usuariosSvc\.upsert/);
});

test('prioriza el checkpoint remoto cuando también existe copia local', () => {
  const local = [{
    id_cp: 'cp_1',
    nombre: 'Local',
    fecha: '1',
    peso: '1 KB',
    tablas_afectadas: 'mesas',
    tipo: 'manual' as const,
    ubicacion: 'local' as const
  }];
  const remote = [{
    ...local[0],
    nombre: 'Cloud',
    ubicacion: 'cloud' as const
  }];

  const merged = mergeCheckpoints(remote, local);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].nombre, 'Cloud');
});
