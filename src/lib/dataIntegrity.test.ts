import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeDataIntegrity } from './dataIntegrity';

test('detecta relaciones huérfanas, duplicados y valores inválidos', () => {
  const report = analyzeDataIntegrity({
    productos_menu: [{ id_producto: 'p1', nombre: 'Plato', precio_venta: 10, activo: true, requiere_cocina: true }],
    insumos: [{ id_insumo: 'i1', nombre: 'Sal', stock_actual: 5, stock_minimo: 1, costo_unitario: 2 }],
    recetas_escandallo: [
      { id_receta: 'r1', id_producto: 'p1', id_insumo: 'i1', cantidad_a_descontar: 1 },
      { id_receta: 'r2', id_producto: 'p1', id_insumo: 'i1', cantidad_a_descontar: 2 },
    ],
    facturas: [],
    pagos: [{ id_pago: 'pay1', id_factura: 'missing' }],
    mesas: [{ id_mesa: 1, numero_mesa: '1', estado: 'libre', capacidad: 4, comensales_actuales: 0 }],
  }, new Date('2026-07-16T12:00:00.000Z'));

  assert.equal(report.status, 'critical');
  assert.equal(report.generatedAt, '2026-07-16T12:00:00.000Z');
  assert.equal(report.issues.find(issue => issue.code === 'duplicate_recipe_pairs')?.count, 2);
  assert.equal(report.issues.find(issue => issue.code === 'orphan_payments')?.count, 1);
});

test('diferencia ventas históricas y pagos conciliados de errores operativos', () => {
  const report = analyzeDataIntegrity({
    productos_menu: [{ id_producto: 'p1', nombre: 'Plato', precio_venta: 10, activo: true, requiere_cocina: false }],
    insumos: [],
    recetas_escandallo: [],
    pedidos_cabecera: [{ id_pedido: 5 }],
    pedido_detalle: [{ id_detalle: 'd1', id_pedido: 5, id_producto: 'producto_retirado' }],
    facturas: [{ id_factura: 'f1' }],
    pagos: [{ id_pago: 'pay1', id_factura: 'f1' }],
    pagos_integridad_revision: [{ id_pago: 'legacy1' }],
  });

  assert.equal(report.status, 'healthy');
  assert.equal(report.issues.find(issue => issue.code === 'historical_deleted_products')?.severity, 'info');
  assert.equal(report.issues.find(issue => issue.code === 'quarantined_payments')?.count, 1);
});
