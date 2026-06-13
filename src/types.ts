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
    rol: 'mozo' | 'cocina' | 'administrador';
    activo?: boolean;
}

export interface Mesa {
    id_mesa: number;
    numero_mesa: string;
    estado: 'libre' | 'ocupada' | 'esperando_cuenta';
    comensales?: number;
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
    categoria: 'cocina' | 'bebidas' | 'postres';
    activo: boolean;
    imagen: string;
    /** Subcategoría para el filtro de carta (entradas, pastas, carnes, etc.) */
  subcategoria?: string;
    descripcion?: string;
}

export interface RecetaEscandallo {
    id_receta: string;
    id_producto: string;
    id_insumo: string;
    cantidad_a_descontar: number;
}

export interface PedidoItem {
    id_producto: string;
    nombre: string;
    cantidad: number;
    categoria: 'cocina' | 'bebidas' | 'postres';
    /** Precio unitario al momento del pedido (snapshot) */
  precio_unitario?: number;
}

export interface Pedido {
    id_pedido: number;
    id_mesa: number;
    numero_mesa: string;
    mozo: string;
    estado_comanda: 'pendiente' | 'en_cocina' | 'listo' | 'entregado_cobrado';
    items: PedidoItem[];
    observaciones?: string;
    fecha_hora: Date;
    minutos_transcurridos: number;
    origen: 'Mozo' | 'Rappi' | 'PedidosYa';
    tiempo_despacho_minutos?: number;
    segundos_en_listo?: number;
}

export interface Merma {
    id_merma: string;
    id_insumo: string;
    nombre_insumo: string;
    cantidad: number;
    unidad_medida: string;
    motivo: 'vencimiento' | 'rotura' | 'error_cocina' | 'otro';
    fecha: Date;
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
    precioUnitario: number;
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
    total: number;
    metodosPago: { metodo: string; monto: number }[];
    vuelto: number;
    mensajePie: string;
    clienteNombre?: string;
    clienteCuit?: string;
}

/** Factura persistida en BD */
export interface FacturaDb {
    id_factura: string;
    nro_ticket: string;
    tipo_comprobante: TipoComprobante;
    cliente: string;
    cuit: string;
    total: number;
    iva_veintiuno: number;
    medio_pago: string;
    fecha: string;
    estado: 'emitido' | 'nota_credito';
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
    email?: string;
    categoria?: string;
    activo?: boolean;
}

export interface Promocion {
    id_promocion: string;
    nombre: string;
    descripcion?: string;
    tipo: 'porcentaje' | 'monto_fijo' | '2x1';
    valor: number;
    activa: boolean;
    fecha_inicio?: string;
    fecha_fin?: string;
}

export interface Reserva {
    id_reserva: string;
    nombre_cliente: string;
    telefono: string;
    fecha: string;
    hora: string;
    comensales: number;
    mesa_asignada?: string;
    estado: 'confirmada' | 'pendiente' | 'cancelada' | 'completada';
    observaciones?: string;
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
