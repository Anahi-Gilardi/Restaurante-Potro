import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { BackupSnapshotData } from '../services/backupsService';
import { validateBackupSnapshot } from './backupValidation';

const snapshot = (): BackupSnapshotData => ({
  usuarios: [],
  mesas: [{ id_mesa: 1, numero_mesa: 'Mesa 1', estado: 'libre' }],
  insumos: [{ id_insumo: 'i1', nombre: 'Papa', stock_actual: 10, stock_minimo: 2, unidad_medida: 'g', categoria: 'frescos' }],
  productosMenu: [{ id_producto: 'p1', nombre: 'Papas', precio_venta: 1000, categoria: 'comida', activo: true, imagen: '' }],
  recetas: [{ id_receta: 'r1', id_producto: 'p1', id_insumo: 'i1', cantidad_a_descontar: 100 }],
  pedidos: [{ id_pedido: 1, id_mesa: 1, numero_mesa: 'Mesa 1', mozo: 'Admin', estado_comanda: 'pendiente', items: [{ id_producto: 'p1', nombre: 'Papas', cantidad: 1, categoria: 'comida', precio_unitario: 1000 }], fecha_hora: new Date(), minutos_transcurridos: 0, origen: 'Mozo' }],
  mermas: [],
  proveedores: [],
  promociones: [],
  reservas: [],
  facturas: [{ id_factura: 'f1', nro_ticket: 'T-1', cliente: 'Consumidor Final', cuit: '', total: 1000, iva_veintiuno: 0, medio_pago: 'efectivo', fecha: '2026-07-18', estado: 'borrador' }],
  logs: [],
  pagos: [{ id_pago: 'pg1', id_factura: 'f1', monto: 1000, metodo: 'Efectivo', fecha: '2026-07-18' }],
  cierresCaja: [],
  clientes: [],
  movimientosCajaChica: [],
  historialCostos: [],
  movimientosInventario: [],
  categorias: [],
  configuracion: []
});

test('aprueba una copia coherente y contabiliza sus registros', () => {
  const report = validateBackupSnapshot(snapshot());
  assert.equal(report.valid, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.warnings.length, 0);
  assert.equal(report.totalRecords, 7);
});

test('bloquea duplicados, recetas huerfanas e importes invalidos', () => {
  const data = snapshot();
  data.mesas.push({ ...data.mesas[0] });
  data.recetas[0].id_insumo = 'inexistente';
  data.pagos[0].monto = -1;

  const report = validateBackupSnapshot(data);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(issue => issue.code === 'duplicate_id'));
  assert.ok(report.errors.some(issue => issue.code === 'missing_ingredient'));
  assert.ok(report.errors.some(issue => issue.code === 'invalid_amount'));
});

test('las referencias historicas ausentes son advertencias y no bloquean', () => {
  const data = snapshot();
  data.pedidos[0].id_mesa = 99;
  data.pedidos[0].items[0].id_producto = 'producto_eliminado';

  const report = validateBackupSnapshot(data);
  assert.equal(report.valid, true);
  assert.deepEqual(report.warnings.map(issue => issue.code), ['missing_table', 'missing_historic_product']);
});

test('la interfaz bloquea el boton cuando la verificacion detecta errores', () => {
  const source = readFileSync(new URL('../components/BackupsModule.tsx', import.meta.url), 'utf8');
  assert.match(source, /validateBackupSnapshot\(snapshot\)/);
  assert.match(source, /Restauraci.n bloqueada/);
  assert.match(source, /disabled=\{confirmAction\.type === 'restore'/);
  assert.match(source, /disabled=\{!uploadedValidation\?\.valid\}/);
});
