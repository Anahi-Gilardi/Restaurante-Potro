import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCheckpoints, parseBackupContent } from './backupsService';

const emptySnapshot = {
  usuarios: [],
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
  logs: []
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
