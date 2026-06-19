// =============================================================================
// types.ts — Tipos centrales del Sistema Gestor Gastronómico "El Patrón"
// Fusionado: tipos originales + extensiones del módulo de Caja/Facturación
// =============================================================================

// ---------------------------------------------------------------------------
// Entidades base
// ---------------------------------------------------------------------------

export interface Usuario {
    id_usuario: number;
    nombre: string;
    apellido: string;
    username: string;
    password: string;
    rol: 'superadmin' | 'administrador' | 'mozo' | 'cocina';
    activo?: boolean;
}

export interface Mesa {
    id_mesa: number;
    numero_mesa: string;
    estado: 'libre' | 'ocupada' | 'esperando_cuenta' | 'reservada' | 'limpiando' | 'unida';
    comensales?: number;
    reserva_cliente?: string;
    reserva_hora?: string;
    /** Capacidad máxima de comensales según el plano */
    capacidad?: number;
    /** Zona del restaurante (usada por MesasProto1) */
    zona?: 'comedor' | 'salon';
    /** Sector del restaurante (legacy, usado por MesasModule) */
    sector?: 'patio' | 'comedor' | 'salon' | 'terraza' | 'vip';
    /** Coordenada X para el plano interactivo */
    x?: number;
    /** Coordenada Y para el plano interactivo */
    y?: number;
    /** Ancho del rectángulo de la mesa */
    width?: number;
    /** Alto del rectángulo de la mesa */
    height?: number;
    /** Radio de redondeo del rectángulo */
    rx?: number;
    /** Forma visual de la mesa en el plano (legacy, usado por MesasModule) */
    forma?: 'redonda' | 'rectangular';
    /** IDs de mesas unidas a esta mesa combinada */
    mesas_unidas?: number[];
    /** ID de la mesa principal si esta mesa está unida a otra */
    parent_id?: number | null;
}

export interface Insumo {
    id_insumo: string;
    nombre: string;
    stock_actual: number;
    stock_minimo: number;
    unidad_medida: 'unidades' | 'g' | 'ml';
    /** Categoría principal de almacén */
  categoria: 'bodega' | 'frescos' | 'secos';
    /** Subcategoría descriptiva (Carnes, Lácteos, Vinos tintos, etc.) */
  subcategoria?: string;
    /** Proveedor habitual */
  proveedor?: string;
    /** Costo unitario en ARS (por unidad de medida) */
  costo_unitario?: number;
    /** true si el insumo se sirve directamente como bebida sin elaboración */
  es_bebida_directa?: boolean;
}

export interface ProductoMenu {
  id_producto: string;
  nombre: string;
  precio_venta: number;
  categoria: string;
  activo: boolean;
  imagen: string;
  /** Subcategoría para el filtro de carta (entradas, pastas, carnes, etc.) */
  subcategoria?: string;
  descripcion?: string;
  /** Tipo simplificado: plato | bebida | vino | postre */
  tipo?: string;
  /** true si requiere preparación en cocina */
  requiere_cocina?: boolean;
  /** Tiempo estimado de preparación en minutos */
  tiempo_preparacion_estimado?: number;
  /** Pasos de preparación y emplatado para cocina */
  pasos_preparacion?: string[];
  /** Alérgenos contenidos en el plato */
  alergenos?: string[];
  /** Consejos o instrucciones de emplatado */
  consejo_emplatado?: string;
}

export interface RecetaEscandallo {
    id_receta: string;
    id_producto: string;
    id_insumo: string;
    cantidad_a_descontar: number;
    unidad_medida?: Insumo['unidad_medida'] | string;
    rendimiento?: number;
}

export interface PedidoItem {
    id_producto: string;
    id_insumo?: string;
    nombre: string;
    cantidad: number;
    categoria: string;
    /** Precio unitario al momento del pedido (snapshot) */
  precio_unitario?: number;
}

export interface Pedido {
    id_pedido: number;
    idempotency_key?: string;
    id_mesa: number;
    numero_mesa: string;
    mozo: string;
    estado_comanda: 'pendiente' | 'en_cocina' | 'listo' | 'entregado' | 'entregado_cobrado' | 'cancelado';
    items: PedidoItem[];
    observaciones?: string;
    fecha_hora: Date;
    minutos_transcurridos: number;
    origen: 'Mozo' | 'Rappi' | 'PedidosYa';
    tiempo_despacho_minutos?: number;
    segundos_en_listo?: number;
    stock_descontado?: boolean;
    fecha_descuento_stock?: Date;
    fecha_inicio_cocina?: Date | string;
    fecha_listo?: Date | string;
}

export interface Merma {
    id_merma: string;
    id_insumo: string;
    nombre_insumo: string;
    cantidad: number;
    unidad_medida: string;
    motivo: 'vencimiento' | 'rotura' | 'error_cocina' | 'otro';
    fecha: Date;
    costo_perdida?: number;
}

export interface EventoLog {
    id: string;
    tipo:
      | 'pedido_creado'
      | 'descuento_stock'
      | 'alerta_stock'
      | 'comanda_estado'
      | 'merma_registrada'
      | 'sistema';
    mensaje: string;
    timestamp: Date;
}

// ---------------------------------------------------------------------------
// Módulo de Caja y Facturación
// ---------------------------------------------------------------------------

export type TipoComprobante =
    | 'factura_a'
  | 'factura_b'
  | 'ticket_consumo'
  | 'nota_credito_b';

export interface MovimientoCajaChica {
    id_movimiento: string;
    id_cierre: string;
    tipo: 'ingreso' | 'egreso';
    monto: number;
    concepto: string;
    fecha: string;
}

/** Sesión de caja (apertura → cierre de turno) */
export interface CierreCaja {
    id_cierre: string;
    fecha_apertura: string;
    fecha_cierre: string | null;
    monto_apertura: number;
    monto_ventas: number;
    monto_real: number | null;
    diferencia: number | null;
    observaciones: string;
    usuario_cajero: string;
    registros_totales?: {
      efectivo: number;
      debito: number;
      credito: number;
      transferencia: number;
      mercadopago: number;
    };
    movimientos_manuales?: MovimientoCajaChica[];
}

/** Configuración de impresora térmica */
export interface PrinterConfig {
    printerName: string;
    paperWidth: '58mm' | '80mm';
    autoCut: boolean;
    openDrawer: boolean;
    copies: number;
}

/** Ítem de ticket/factura para impresión */
export interface TicketItem {
    descripcion: string;
    cantidad: number;
    precioUnitario?: number;
    precio_unitario?: number;
    subtotal: number;
}

/** Datos completos para generar un ticket/factura PDF o ESC/POS */
export interface TicketData {
    idPedido: number;
    nroComprobante: string;
    tipoComprobante: TipoComprobante;
    fechaHora: string;
    mesa: string;
    mozo: string;
    cajero: string;
    nombreComercial: string;
    razonSocial: string;
    cuit: string;
    direccion: string;
    telefono: string;
    email: string;
    items: TicketItem[];
    subtotal: number;
    descuento: number;
    propina: number;
    iva: number;
    total: number;
    metodosPago: { metodo: string; monto: number }[];
    vuelto: number;
    mensajePie: string;
    clienteNombre?: string;
    clienteCuit?: string;
    cae?: string;
    vto?: string;
    qrData?: string;
    clienteDniCuit?: string;
    puntosCanjeados?: number;
    puntosGanados?: number;
    descuentoFidelidad?: number;
}

/** Factura persistida en BD */
export interface FacturaDb {
    id_factura: string;
    nro_ticket?: string;
    numero_factura?: string;
    tipo_comprobante: TipoComprobante | 'Factura A' | 'Factura B' | 'Ticket Consumo';
    cliente?: string;
    cuit?: string;
    cuit_cliente?: string;
    total: number;
    iva_veintiuno?: number;
    medio_pago?: string;
    metodo_pago?: string;
    fecha?: string;
    fecha_emision?: string;
    estado?: 'emitido' | 'nota_credito';
    id_pedido?: number;
}

/** Pago individual persistido en BD */
export interface PagoDb {
    id_pago: string;
    id_factura: string;
    monto: number;
    metodo: string;
    fecha: string;
}

// ---------------------------------------------------------------------------
// Módulos auxiliares
// ---------------------------------------------------------------------------

export interface Proveedor {
  id_proveedor: string;
  nombre: string;
  contacto: string;
  telefono: string;
  /** Email principal de contacto */
  email?: string;
  /** Alias de email usado en el módulo de proveedores */
  correo?: string;
  categoria?: string;
  activo?: boolean;
  /** Plazo habitual de entrega en días hábiles */
  tiempo_entrega_dias?: number;
}

export interface Promocion {
  id_promo: string;
  nombre: string;
  descripcion?: string;
  tipo: 'happy_hour' | 'combo' | 'descuento_directo';
  descuento_porcentaje: number;
  activo: boolean;
  dias_vigentes?: string;
}

export interface Reserva {
    id_reserva: string;
    nombre_cliente: string;
    telefono: string;
    hora: string;
    /** Número de personas */
    pax: number;
    /** Nombre de la mesa asignada */
    nombre_mesa: string;
    /** Estado de la reserva */
    estado: 'confirmada' | 'sentada' | 'cancelada' | 'pendiente' | 'completada';
    /** ID de la mesa (FK numérica, opcional) */
    id_mesa?: number | null;
    /** Fecha en formato ISO YYYY-MM-DD (opcional) */
    fecha?: string;
    /** Número de comensales (alias de pax) */
    comensales?: number;
    /** Mesa asignada (alias de nombre_mesa) */
    mesa_asignada?: string;
    observaciones?: string;
    /** Email del cliente */
    email?: string;
    /** Determina si la reserva es parte de la lista de espera */
    lista_espera?: boolean;
    /** Momento en que la reserva entro a lista de espera */
    entrada_lista_espera?: string;
    /** Prioridad en lista de espera (menor numero = mas alta prioridad) */
    prioridad_espera?: number;
}

// ---------------------------------------------------------------------------
// Toast / Notificaciones inline (reemplaza alert())
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number; // ms, default 4000
}

export interface Cliente {
    id_cliente: string;
    dni_cuit: string;
    nombre: string;
    email?: string;
    telefono?: string;
    puntos: number;
    fecha_registro: Date | string;
}

export interface HistorialCostoInsumo {
    id_historial: string;
    id_insumo: string;
    nombre_insumo: string;
    costo_anterior: number;
    costo_nuevo: number;
    fecha: Date | string;
}
