export type IntegritySeverity = 'critical' | 'warning' | 'info';

export interface IntegrityIssue {
  code: string;
  severity: IntegritySeverity;
  title: string;
  description: string;
  count: number;
  sampleIds: string[];
}

export interface DataIntegrityReport {
  generatedAt: string;
  status: 'healthy' | 'attention' | 'critical';
  summary: {
    critical: number;
    warnings: number;
    information: number;
  };
  counts: Record<string, number>;
  issues: IntegrityIssue[];
  review: {
    duplicateIngredientGroups: Array<{
      name: string;
      items: Array<{
        id: string;
        stock: number;
        minimumStock: number;
        unit: string;
        recipeCount: number;
        movementCount: number;
      }>;
    }>;
    usersWithoutAuth: Array<{
      id: string;
      name: string;
      username: string;
      role: string;
    }>;
  };
}

export interface IntegrityDataSet {
  usuarios?: unknown[];
  mesas?: unknown[];
  insumos?: unknown[];
  productos_menu?: unknown[];
  recetas_escandallo?: unknown[];
  pedidos_cabecera?: unknown[];
  pedido_detalle?: unknown[];
  facturas?: unknown[];
  pagos?: unknown[];
  pagos_integridad_revision?: unknown[];
  movimientos_inventario?: unknown[];
}

type Row = Record<string, unknown>;

const rows = (value: unknown[] | undefined): Row[] => (value ?? []).filter(
  (item): item is Row => Boolean(item && typeof item === 'object'),
);

const text = (value: unknown): string => String(value ?? '').trim();
const normalized = (value: unknown): string => text(value).toLocaleLowerCase('es-AR');
const numeric = (value: unknown): number => Number(value);
const sample = (values: unknown[]): string[] => values.map(text).filter(Boolean).slice(0, 8);

const duplicateGroups = (data: Row[], field: string): Row[][] => {
  const groups = new Map<string, Row[]>();
  data.forEach(row => {
    const key = normalized(row[field]);
    if (!key) return;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  return [...groups.values()].filter(group => group.length > 1);
};

const usageCounts = (data: Row[], field: string): Map<string, number> => {
  const counts = new Map<string, number>();
  data.forEach(row => {
    const id = text(row[field]);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  return counts;
};

const addIssue = (
  issues: IntegrityIssue[],
  severity: IntegritySeverity,
  code: string,
  title: string,
  description: string,
  ids: unknown[],
) => {
  if (ids.length === 0) return;
  issues.push({ code, severity, title, description, count: ids.length, sampleIds: sample(ids) });
};

export function analyzeDataIntegrity(input: IntegrityDataSet, now = new Date()): DataIntegrityReport {
  const usuarios = rows(input.usuarios);
  const mesas = rows(input.mesas);
  const insumos = rows(input.insumos);
  const productos = rows(input.productos_menu);
  const recetas = rows(input.recetas_escandallo);
  const pedidos = rows(input.pedidos_cabecera);
  const detalles = rows(input.pedido_detalle);
  const facturas = rows(input.facturas);
  const pagos = rows(input.pagos);
  const pagosRevision = rows(input.pagos_integridad_revision);
  const movimientos = rows(input.movimientos_inventario);

  const productIds = new Set(productos.map(row => text(row.id_producto)));
  const ingredientIds = new Set(insumos.map(row => text(row.id_insumo)));
  const orderIds = new Set(pedidos.map(row => text(row.id_pedido)));
  const invoiceIds = new Set(facturas.map(row => text(row.id_factura)));
  const recipeProductIds = new Set(recetas.filter(row => numeric(row.cantidad_a_descontar) > 0).map(row => text(row.id_producto)));
  const validRoles = new Set(['superadmin', 'administrador', 'mozo', 'cocina']);
  const validTableStates = new Set(['libre', 'ocupada', 'esperando_cuenta', 'reservada', 'limpiando', 'unida', 'sucia']);
  const recipeUsage = usageCounts(recetas, 'id_insumo');
  const movementUsage = usageCounts(movimientos, 'id_insumo');
  const issues: IntegrityIssue[] = [];

  const invalidProducts = productos.filter(row => (
    !text(row.id_producto)
    || !text(row.nombre)
    || !Number.isFinite(numeric(row.precio_venta))
    || numeric(row.precio_venta) < 0
  ));
  addIssue(issues, 'critical', 'invalid_products', 'Productos con datos inválidos', 'Falta ID/nombre o el precio es negativo.', invalidProducts.map(row => row.id_producto));

  const invalidIngredients = insumos.filter(row => (
    !text(row.id_insumo)
    || !text(row.nombre)
    || !Number.isFinite(numeric(row.stock_actual))
    || !Number.isFinite(numeric(row.stock_minimo))
    || numeric(row.stock_actual) < 0
    || numeric(row.stock_minimo) < 0
    || (row.costo_unitario != null && (!Number.isFinite(numeric(row.costo_unitario)) || numeric(row.costo_unitario) < 0))
  ));
  addIssue(issues, 'critical', 'invalid_ingredients', 'Insumos con valores inválidos', 'Stock, mínimo y costo deben ser números no negativos.', invalidIngredients.map(row => row.id_insumo));

  const invalidRecipes = recetas.filter(row => (
    !text(row.id_receta)
    || !text(row.id_producto)
    || !text(row.id_insumo)
    || !Number.isFinite(numeric(row.cantidad_a_descontar))
    || numeric(row.cantidad_a_descontar) <= 0
  ));
  addIssue(issues, 'critical', 'invalid_recipes', 'Recetas inválidas', 'Una receta debe relacionar producto e insumo con cantidad positiva.', invalidRecipes.map(row => row.id_receta));

  const orphanRecipes = recetas.filter(row => (
    !productIds.has(text(row.id_producto)) || !ingredientIds.has(text(row.id_insumo))
  ));
  addIssue(issues, 'critical', 'orphan_recipes', 'Recetas huérfanas', 'La receta referencia un producto o insumo inexistente.', orphanRecipes.map(row => row.id_receta));

  const recipePairs = new Map<string, Row[]>();
  recetas.forEach(row => {
    const key = `${text(row.id_producto)}|${text(row.id_insumo)}`;
    recipePairs.set(key, [...(recipePairs.get(key) ?? []), row]);
  });
  const duplicateRecipeRows = [...recipePairs.values()].filter(group => group.length > 1).flat();
  addIssue(issues, 'critical', 'duplicate_recipe_pairs', 'Ingredientes repetidos en una receta', 'El mismo insumo aparece más de una vez para un producto y puede descontar stock dos veces.', duplicateRecipeRows.map(row => row.id_receta));

  const orphanPayments = pagos.filter(row => text(row.id_factura) && !invoiceIds.has(text(row.id_factura)));
  addIssue(issues, 'critical', 'orphan_payments', 'Pagos sin comprobante asociado', 'El pago operativo no tiene una factura o ticket interno persistido.', orphanPayments.map(row => row.id_pago));

  const invalidTables = mesas.filter(row => {
    const capacity = numeric(row.capacidad);
    const diners = numeric(row.comensales_actuales ?? row.comensales ?? 0);
    return !text(row.numero_mesa)
      || !validTableStates.has(text(row.estado))
      || !Number.isFinite(capacity)
      || capacity < 1
      || !Number.isFinite(diners)
      || diners < 0
      || diners > capacity;
  });
  addIssue(issues, 'critical', 'invalid_tables', 'Mesas con estado o capacidad inválida', 'La capacidad y comensales deben ser coherentes y el estado debe ser reconocido.', invalidTables.map(row => row.id_mesa));

  const invalidUsers = usuarios.filter(row => !text(row.username) || !validRoles.has(text(row.rol)));
  addIssue(issues, 'critical', 'invalid_users', 'Perfiles de usuario inválidos', 'Cada perfil necesita un usuario y un rol permitido.', invalidUsers.map(row => row.id_usuario));

  const activeProductDuplicates = duplicateGroups(productos.filter(row => row.activo !== false), 'nombre');
  addIssue(
    issues,
    'warning',
    'duplicate_active_products',
    'Productos activos con nombre duplicado',
    'Pueden aparecer dos veces en la carta; revise cuál es el producto canónico.',
    activeProductDuplicates.flatMap(group => group.map(row => row.id_producto)),
  );

  const ingredientDuplicates = duplicateGroups(insumos, 'nombre');
  addIssue(
    issues,
    'warning',
    'duplicate_ingredients',
    'Insumos posiblemente duplicados',
    'No se fusionan automáticamente porque requieren conteo físico para no falsear stock.',
    ingredientDuplicates.flatMap(group => group.map(row => row.id_insumo)),
  );

  const usersWithoutAuth = usuarios.filter(row => row.activo !== false && !text(row.auth_user_id));
  addIssue(issues, 'warning', 'users_without_auth', 'Usuarios antiguos sin acceso vinculado', 'Asigne una contraseña desde Usuarios para crear su identidad segura.', usersWithoutAuth.map(row => row.id_usuario));

  const missingKitchenRecipes = productos.filter(row => (
    row.activo !== false && row.requiere_cocina !== false && !recipeProductIds.has(text(row.id_producto))
  ));
  addIssue(issues, 'warning', 'products_without_recipe', 'Platos activos sin receta utilizable', 'No podrán descontar inventario correctamente.', missingKitchenRecipes.map(row => row.id_producto));

  const orphanHistoricalDetails = detalles.filter(row => (
    text(row.id_pedido) && orderIds.has(text(row.id_pedido)) && text(row.id_producto) && !productIds.has(text(row.id_producto))
  ));
  addIssue(issues, 'info', 'historical_deleted_products', 'Ventas históricas de productos retirados', 'Se conservan como fotografía de la venta; no deben borrarse ni reasignarse.', orphanHistoricalDetails.map(row => row.id_detalle));

  addIssue(
    issues,
    'info',
    'quarantined_payments',
    'Pagos históricos aislados para conciliación',
    'Se preservaron fuera de la tabla operativa hasta identificar su comprobante original.',
    pagosRevision.map(row => row.id_pago),
  );

  const suspiciousInactiveProducts = productos.filter(row => (
    row.activo === false && (text(row.id_producto).length <= 4 || text(row.nombre).length <= 4)
  ));
  addIssue(issues, 'info', 'inactive_products_review', 'Productos inactivos para revisar', 'Permanecen fuera de la carta y no se borran sin una decisión comercial.', suspiciousInactiveProducts.map(row => row.id_producto));

  const critical = issues.filter(issue => issue.severity === 'critical').reduce((sum, issue) => sum + issue.count, 0);
  const warnings = issues.filter(issue => issue.severity === 'warning').reduce((sum, issue) => sum + issue.count, 0);
  const information = issues.filter(issue => issue.severity === 'info').reduce((sum, issue) => sum + issue.count, 0);

  return {
    generatedAt: now.toISOString(),
    status: critical > 0 ? 'critical' : warnings > 0 ? 'attention' : 'healthy',
    summary: { critical, warnings, information },
    counts: {
      usuarios: usuarios.length,
      mesas: mesas.length,
      insumos: insumos.length,
      productos: productos.length,
      recetas: recetas.length,
      pedidos: pedidos.length,
      detalles: detalles.length,
      facturas: facturas.length,
      pagos: pagos.length,
      pagos_en_revision: pagosRevision.length,
      movimientos_inventario: movimientos.length,
    },
    issues,
    review: {
      duplicateIngredientGroups: ingredientDuplicates.map(group => ({
        name: text(group[0]?.nombre),
        items: group
          .map(row => ({
            id: text(row.id_insumo),
            stock: numeric(row.stock_actual),
            minimumStock: numeric(row.stock_minimo),
            unit: text(row.unidad_medida),
            recipeCount: recipeUsage.get(text(row.id_insumo)) ?? 0,
            movementCount: movementUsage.get(text(row.id_insumo)) ?? 0,
          }))
          .sort((a, b) => (b.movementCount + b.recipeCount) - (a.movementCount + a.recipeCount) || a.id.localeCompare(b.id)),
      })),
      usersWithoutAuth: usersWithoutAuth.map(row => ({
        id: text(row.id_usuario),
        name: `${text(row.nombre)} ${text(row.apellido)}`.trim(),
        username: text(row.username),
        role: text(row.rol),
      })),
    },
  };
}
