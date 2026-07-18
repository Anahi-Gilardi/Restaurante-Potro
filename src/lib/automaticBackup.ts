export type BackupTableRows = Record<string, Array<Record<string, any>>>;

export const AUTOMATIC_BACKUP_SOURCE_TABLES = [
  'usuarios',
  'mesas',
  'insumos',
  'productos_menu',
  'recetas_escandallo',
  'pedidos_cabecera',
  'pedido_detalle',
  'mermas',
  'proveedores',
  'promociones',
  'reservas',
  'facturas',
  'auditoria_eventos',
  'pagos',
  'cierres_caja',
  'clientes',
  'movimientos_caja_chica',
  'historial_costos_insumos',
  'movimientos_inventario',
  'categorias',
  'configuracion'
] as const;

export const AUTOMATIC_BACKUP_COLLECTIONS = [
  'usuarios',
  'mesas',
  'insumos',
  'productosMenu',
  'recetas',
  'pedidos',
  'mermas',
  'proveedores',
  'promociones',
  'reservas',
  'facturas',
  'logs',
  'pagos',
  'cierresCaja',
  'clientes',
  'movimientosCajaChica',
  'historialCostos',
  'movimientosInventario',
  'categorias',
  'configuracion'
] as const;

export const LEGACY_FISCAL_CONFIG_KEYS = new Set([
  'nombre_comercial',
  'razon_social',
  'cuit',
  'direccion',
  'telefono',
  'email',
  'inicio_actividades',
  'condicion_iva',
  'mensaje_pie'
]);

export const sanitizeBackupConfiguration = (rows: Array<Record<string, any>>) => (
  rows.filter(row => !LEGACY_FISCAL_CONFIG_KEYS.has(String(row.clave ?? '').trim().toLowerCase()))
);

const parseHeaderItems = (value: unknown): Array<Record<string, any>> => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const mapPedidos = (headers: Array<Record<string, any>>, details: Array<Record<string, any>>) => (
  headers.map(header => {
    const fallbackItems = parseHeaderItems(header.items);
    const relatedItems = details
      .filter(detail => Number(detail.id_pedido) === Number(header.id_pedido))
      .sort((a, b) => String(a.id_detalle ?? '').localeCompare(String(b.id_detalle ?? '')))
      .map(detail => ({
        id_producto: detail.id_producto ?? '',
        nombre: detail.nombre ?? '',
        cantidad: Number(detail.cantidad) || 0,
        categoria: detail.categoria ?? '',
        precio_unitario: detail.precio_unitario ?? fallbackItems.find(item => item.id_producto === detail.id_producto)?.precio_unitario,
        estado: detail.estado ?? 'pendiente'
      }));

    return {
      id_pedido: Number(header.id_pedido),
      idempotency_key: header.idempotency_key ?? undefined,
      id_mesa: Number(header.id_mesa) || 0,
      numero_mesa: header.numero_mesa ?? '',
      mozo: header.mozo ?? '',
      estado_comanda: header.estado_comanda ?? 'pendiente',
      items: relatedItems.length > 0 ? relatedItems : fallbackItems,
      observaciones: header.observaciones ?? undefined,
      fecha_hora: header.fecha_hora,
      minutos_transcurridos: Number(header.minutos_transcurridos) || 0,
      origen: header.origen ?? 'Mozo',
      tiempo_despacho_minutos: header.tiempo_despacho_minutos ?? undefined,
      segundos_en_listo: header.segundos_en_listo ?? undefined,
      stock_descontado: Boolean(header.stock_descontado),
      fecha_descuento_stock: header.fecha_descuento_stock ?? undefined
    };
  })
);

const facturaTipo = (value: unknown): 'ticket' | 'A' | 'B' | 'C' | 'NC' | 'X' => {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('nota')) return 'NC';
  if (text.includes('factura a')) return 'A';
  if (text.includes('factura b')) return 'B';
  if (text.includes('factura c')) return 'C';
  if (text.includes('comprobante x')) return 'X';
  return 'ticket';
};

const facturaEstado = (row: Record<string, any>) => {
  if (String(row.tipo_comprobante ?? '').toLowerCase().includes('nota')) return 'nota_credito';
  if (row.fiscal_status === 'authorized') return 'autorizado';
  if (row.fiscal_status === 'observed') return 'observado';
  if (row.fiscal_status === 'uncertain') return 'incierto';
  if (row.fiscal_status === 'rejected') return 'rechazado';
  return 'borrador';
};

const medioPago = (value: unknown) => {
  if (value === 'Tarjeta Debito') return 'debito';
  if (value === 'Tarjeta Credito') return 'tarjeta';
  if (value === 'Transferencia') return 'transferencia';
  if (value === 'MercadoPago') return 'mp_qr';
  if (value === 'Mixto') return 'mixto';
  return 'efectivo';
};

export const buildAutomaticBackupSnapshot = (rows: BackupTableRows) => ({
  usuarios: (rows.usuarios ?? []).map(user => ({
    id_usuario: Number(user.id_usuario),
    nombre: String(user.nombre ?? ''),
    apellido: String(user.apellido ?? ''),
    username: String(user.username ?? ''),
    password: '',
    rol: user.rol,
    activo: user.activo !== false,
    auth_user_id: user.auth_user_id ?? null,
    mail: user.mail ?? null
  })),
  mesas: (rows.mesas ?? []).map(mesa => ({
    ...mesa,
    comensales: mesa.comensales_actuales ?? undefined
  })),
  insumos: rows.insumos ?? [],
  productosMenu: rows.productos_menu ?? [],
  recetas: rows.recetas_escandallo ?? [],
  pedidos: mapPedidos(rows.pedidos_cabecera ?? [], rows.pedido_detalle ?? []),
  mermas: rows.mermas ?? [],
  proveedores: rows.proveedores ?? [],
  promociones: (rows.promociones ?? []).map(promo => ({
    id_promo: promo.id_promo,
    nombre: promo.nombre,
    descuento_porcentaje: Number(promo.descuento ?? promo.descuento_porcentaje) || 0,
    tipo: promo.tipo ?? 'descuento_directo',
    dias_vigentes: promo.dias_vigentes ?? 'Todos los días',
    activo: promo.activa !== undefined ? promo.activa : promo.activo !== false,
    descripcion: promo.descripcion ?? ''
  })),
  reservas: (rows.reservas ?? []).map(reserva => ({
    id_reserva: reserva.id_reserva,
    nombre_cliente: reserva.cliente ?? reserva.nombre_cliente ?? '',
    telefono: reserva.telefono ?? '',
    pax: Number(reserva.personas ?? reserva.pax) || 1,
    id_mesa: reserva.id_mesa ?? null,
    nombre_mesa: reserva.nombre_mesa ?? (reserva.id_mesa ? `Mesa ${reserva.id_mesa}` : 'Sin mesa'),
    hora: reserva.hora ?? '21:00 hs',
    estado: reserva.estado ?? 'confirmada',
    fecha: reserva.fecha,
    email: reserva.email ?? undefined,
    observaciones: reserva.observaciones ?? reserva.notas ?? undefined,
    lista_espera: Boolean(reserva.lista_espera),
    prioridad_espera: reserva.prioridad_espera ?? undefined
  })),
  facturas: (rows.facturas ?? []).map(factura => {
    const tipo = facturaTipo(factura.tipo_comprobante);
    const total = Number(factura.total) || 0;
    return {
      id_factura: factura.id_factura,
      id_pedido: factura.id_pedido ?? undefined,
      nro_ticket: factura.numero_factura,
      cliente: factura.cuit_cliente ? `Clien_CUIT_${factura.cuit_cliente}` : 'Consumidor Final',
      cuit: factura.cuit_cliente ?? '',
      total,
      iva_veintiuno: ['C', 'X', 'ticket'].includes(tipo) ? 0 : Number((total - total / 1.21).toFixed(2)),
      medio_pago: medioPago(factura.metodo_pago),
      fecha: factura.fecha_emision,
      estado: facturaEstado(factura),
      tipo,
      afip_cae: factura.afip_cae,
      afip_vto: factura.afip_vto,
      afip_qr: factura.afip_qr,
      afip_resultado: factura.afip_resultado,
      arca_emission_id: factura.arca_emission_id,
      afip_cbte_tipo: factura.afip_cbte_tipo,
      afip_pto_vta: factura.afip_pto_vta,
      afip_cbte_nro: factura.afip_cbte_nro,
      afip_observaciones: Array.isArray(factura.afip_observaciones) ? factura.afip_observaciones : [],
      arca_emisor: factura.arca_emisor,
      condicion_iva_receptor: factura.condicion_iva_receptor,
      fecha_completa: factura.fecha_emision
    };
  }),
  logs: rows.auditoria_eventos ?? [],
  pagos: rows.pagos ?? [],
  cierresCaja: rows.cierres_caja ?? [],
  clientes: rows.clientes ?? [],
  movimientosCajaChica: rows.movimientos_caja_chica ?? [],
  historialCostos: rows.historial_costos_insumos ?? [],
  movimientosInventario: rows.movimientos_inventario ?? [],
  categorias: rows.categorias ?? [],
  configuracion: sanitizeBackupConfiguration(rows.configuracion ?? [])
});

export const argentinaDateKey = (date = new Date()): string => (
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
);

export const expiredAutomaticBackupIds = (
  backups: Array<{ id_backup?: unknown; fecha?: unknown }>,
  retention = 30
): string[] => backups
  .filter(item => String(item.id_backup ?? '').startsWith('auto_'))
  .sort((a, b) => new Date(String(b.fecha ?? 0)).getTime() - new Date(String(a.fecha ?? 0)).getTime())
  .slice(Math.max(1, retention))
  .map(item => String(item.id_backup));
