import type { BackupSnapshotData } from '../services/backupsService';

export type BackupValidationSeverity = 'error' | 'warning';

export interface BackupValidationIssue {
  severity: BackupValidationSeverity;
  code: string;
  collection: string;
  message: string;
}

export interface BackupValidationReport {
  valid: boolean;
  totalRecords: number;
  errors: BackupValidationIssue[];
  warnings: BackupValidationIssue[];
}

type UnknownRow = Record<string, unknown>;

const textId = (value: unknown) => String(value ?? '').trim();
const finiteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

const duplicateIssues = (
  rows: unknown[],
  collection: string,
  key: string,
  label: string
): BackupValidationIssue[] => {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  const issues: BackupValidationIssue[] = [];

  rows.forEach((raw, index) => {
    const row = (raw ?? {}) as UnknownRow;
    const id = textId(row[key]);
    if (!id) {
      issues.push({
        severity: 'error',
        code: 'missing_id',
        collection,
        message: `${label}: el registro ${index + 1} no tiene ${key}.`
      });
      return;
    }
    if (seen.has(id)) duplicated.add(id);
    seen.add(id);
  });

  duplicated.forEach(id => issues.push({
    severity: 'error',
    code: 'duplicate_id',
    collection,
    message: `${label}: el identificador ${id} está duplicado.`
  }));
  return issues;
};

const warning = (collection: string, code: string, message: string): BackupValidationIssue => ({
  severity: 'warning',
  collection,
  code,
  message
});

const error = (collection: string, code: string, message: string): BackupValidationIssue => ({
  severity: 'error',
  collection,
  code,
  message
});

export const validateBackupSnapshot = (snapshot: BackupSnapshotData): BackupValidationReport => {
  const issues: BackupValidationIssue[] = [];
  const collections = Object.values(snapshot).filter(Array.isArray) as unknown[][];

  const identitySpecs: Array<[unknown[], string, string, string]> = [
    [snapshot.mesas, 'mesas', 'id_mesa', 'Mesas'],
    [snapshot.insumos, 'insumos', 'id_insumo', 'Insumos'],
    [snapshot.productosMenu, 'productosMenu', 'id_producto', 'Productos'],
    [snapshot.recetas, 'recetas', 'id_receta', 'Recetas'],
    [snapshot.pedidos, 'pedidos', 'id_pedido', 'Comandas'],
    [snapshot.mermas, 'mermas', 'id_merma', 'Mermas'],
    [snapshot.proveedores, 'proveedores', 'id_proveedor', 'Proveedores'],
    [snapshot.promociones, 'promociones', 'id_promo', 'Promociones'],
    [snapshot.reservas, 'reservas', 'id_reserva', 'Reservas'],
    [snapshot.facturas, 'facturas', 'id_factura', 'Facturas'],
    [snapshot.pagos, 'pagos', 'id_pago', 'Pagos'],
    [snapshot.cierresCaja, 'cierresCaja', 'id_cierre', 'Cierres'],
    [snapshot.clientes, 'clientes', 'id_cliente', 'Clientes'],
    [snapshot.movimientosCajaChica, 'movimientosCajaChica', 'id_movimiento', 'Caja chica'],
    [snapshot.historialCostos, 'historialCostos', 'id_historial', 'Historial de costos'],
    [snapshot.categorias, 'categorias', 'id', 'Categorías']
  ];
  identitySpecs.forEach(spec => issues.push(...duplicateIssues(...spec)));

  const mesaIds = new Set(snapshot.mesas.map(item => textId(item.id_mesa)));
  const insumoIds = new Set(snapshot.insumos.map(item => textId(item.id_insumo)));
  const productoIds = new Set(snapshot.productosMenu.map(item => textId(item.id_producto)));
  const facturaIds = new Set(snapshot.facturas.map(item => textId(item.id_factura)));
  const recipePairs = new Set<string>();

  snapshot.insumos.forEach(item => {
    if (!finiteNumber(item.stock_actual) || item.stock_actual < 0) {
      issues.push(error('insumos', 'invalid_stock', `El insumo ${item.nombre || item.id_insumo} tiene stock inválido.`));
    }
    if (!finiteNumber(item.stock_minimo) || item.stock_minimo < 0) {
      issues.push(error('insumos', 'invalid_minimum', `El insumo ${item.nombre || item.id_insumo} tiene stock mínimo inválido.`));
    }
  });

  snapshot.productosMenu.forEach(item => {
    if (!finiteNumber(item.precio_venta) || item.precio_venta < 0) {
      issues.push(error('productosMenu', 'invalid_price', `El producto ${item.nombre || item.id_producto} tiene precio inválido.`));
    }
  });

  snapshot.recetas.forEach(item => {
    if (!productoIds.has(textId(item.id_producto))) {
      issues.push(error('recetas', 'missing_product', `La receta ${item.id_receta} referencia un producto inexistente.`));
    }
    if (!insumoIds.has(textId(item.id_insumo))) {
      issues.push(error('recetas', 'missing_ingredient', `La receta ${item.id_receta} referencia un insumo inexistente.`));
    }
    if (!finiteNumber(item.cantidad_a_descontar) || item.cantidad_a_descontar <= 0) {
      issues.push(error('recetas', 'invalid_quantity', `La receta ${item.id_receta} tiene una cantidad inválida.`));
    }
    const pair = `${textId(item.id_producto)}::${textId(item.id_insumo)}`;
    if (recipePairs.has(pair)) {
      issues.push(error('recetas', 'duplicate_pair', `El producto ${item.id_producto} repite el insumo ${item.id_insumo}.`));
    }
    recipePairs.add(pair);
  });

  snapshot.pedidos.forEach(item => {
    if (item.id_mesa > 0 && !mesaIds.has(textId(item.id_mesa))) {
      issues.push(warning('pedidos', 'missing_table', `La comanda ${item.id_pedido} pertenece a una mesa histórica que ya no existe.`));
    }
    if (!Array.isArray(item.items)) {
      issues.push(error('pedidos', 'invalid_items', `La comanda ${item.id_pedido} no contiene una lista válida de productos.`));
      return;
    }
    item.items.forEach(orderItem => {
      if (!finiteNumber(orderItem.cantidad) || orderItem.cantidad <= 0) {
        issues.push(error('pedidos', 'invalid_item_quantity', `La comanda ${item.id_pedido} contiene una cantidad inválida.`));
      }
      if (orderItem.precio_unitario !== undefined && (!finiteNumber(orderItem.precio_unitario) || orderItem.precio_unitario < 0)) {
        issues.push(error('pedidos', 'invalid_item_price', `La comanda ${item.id_pedido} contiene un precio inválido.`));
      }
      if (orderItem.id_producto && !productoIds.has(textId(orderItem.id_producto))) {
        issues.push(warning('pedidos', 'missing_historic_product', `La comanda ${item.id_pedido} contiene un producto histórico eliminado del menú.`));
      }
    });
  });

  snapshot.mermas.forEach(item => {
    if (!insumoIds.has(textId(item.id_insumo))) {
      issues.push(warning('mermas', 'missing_historic_ingredient', `La merma ${item.id_merma} referencia un insumo histórico eliminado.`));
    }
    if (!finiteNumber(item.cantidad) || item.cantidad <= 0) {
      issues.push(error('mermas', 'invalid_quantity', `La merma ${item.id_merma} tiene una cantidad inválida.`));
    }
  });

  snapshot.reservas.forEach(item => {
    if (item.id_mesa && !mesaIds.has(textId(item.id_mesa))) {
      issues.push(warning('reservas', 'missing_table', `La reserva ${item.id_reserva} referencia una mesa que ya no existe.`));
    }
  });

  snapshot.facturas.forEach(item => {
    if (!finiteNumber(item.total) || item.total < 0) {
      issues.push(error('facturas', 'invalid_total', `La factura ${item.id_factura} tiene un total inválido.`));
    }
  });

  snapshot.pagos.forEach(item => {
    if (!finiteNumber(item.monto) || item.monto <= 0) {
      issues.push(error('pagos', 'invalid_amount', `El pago ${item.id_pago} tiene un importe inválido.`));
    }
    if (!facturaIds.has(textId(item.id_factura))) {
      issues.push(warning('pagos', 'missing_invoice', `El pago ${item.id_pago} referencia un comprobante histórico no incluido.`));
    }
  });

  snapshot.historialCostos.forEach(item => {
    if (!insumoIds.has(textId(item.id_insumo))) {
      issues.push(warning('historialCostos', 'missing_historic_ingredient', `El historial ${item.id_historial} referencia un insumo eliminado.`));
    }
  });

  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  return {
    valid: errors.length === 0,
    totalRecords: collections.reduce((total, rows) => total + rows.length, 0),
    errors,
    warnings
  };
};
