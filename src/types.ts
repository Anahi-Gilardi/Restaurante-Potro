export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  rol: 'mozo' | 'cocina' | 'administrador';
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
  categoria: string; // 'bodega' | 'frescos' | 'secos', etc.
  subcategoria?: string;
  proveedor?: string;
  costo_unitario?: number;
  es_bebida_directa: boolean;
}

export interface ProductoMenu {
  id_producto: string;
  nombre: string;
  descripcion?: string;
  precio_venta: number;
  categoria: string; // e.g. 'Entradas' | 'Pastas' | 'Carnes' | 'Pescados' | 'Comidas Criollas' | 'Postres' | 'Bebidas' | 'Bodega'
  subcategoria?: string;
  activo: boolean;
  imagen: string;
  tipo: 'plato' | 'bebida' | 'vino' | 'postre';
  tiempo_preparacion_estimado?: number;
  requiere_cocina: boolean;
}

export interface RecetaEscandallo {
  id_receta: string;
  id_producto: string;
  id_insumo: string;
  cantidad_a_descontar: number;
  unidad_medida?: string;
  merma_estimada_porcentaje?: number;
}

export interface PedidoItem {
  id_producto: string;
  nombre: string;
  cantidad: number;
  categoria: string;
}

export interface Pedido {
  id_pedido: number;
  id_mesa: number;
  numero_mesa: string;
  mozo: string;
  estado_comanda: 'pendiente' | 'en_cocina' | 'listo' | 'entregado_cobrado' | 'cancelado';
  items: PedidoItem[];
  observaciones?: string;
  fecha_hora: Date; // real date or simulated date
  minutos_transcurridos: number; // simulated elapsed minutes
  origen: 'Mozo' | 'Rappi' | 'PedidosYa'; // API delivery unificada or internal
  tiempo_despacho_minutos?: number; // performance metric
  segundos_en_listo?: number; // for "Plato Frío" warning (5m = 300s)
  stock_descontado?: boolean;
  fecha_descuento_stock?: Date | string;
}

export interface MovimientoInventario {
  id_movimiento: string;
  id_insumo: string;
  nombre_insumo?: string;
  tipo_movimiento: 'entrada' | 'salida_comanda' | 'salida_merma' | 'ajuste' | 'reverso';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  id_pedido?: number;
  id_producto?: string;
  fecha: Date | string;
  motivo?: string;
  observacion?: string;
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
  tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema';
  mensaje: string;
  timestamp: Date;
}

export type MedioPago = 'efectivo' | 'debito' | 'tarjeta' | 'transferencia' | 'mp_qr' | 'mixto';

export type TipoComprobante = 'ticket_interno' | 'factura_b' | 'factura_a' | 'nota_credito';

export interface FacturaDb {
  id_factura: string;
  id_pedido: number | null;
  numero_factura: string;
  tipo_comprobante: string;
  total: number;
  metodo_pago: string;
  cuit_cliente: string;
  fecha_emision: string;
}

export interface PagoDb {
  id_pago: string;
  id_factura: string;
  monto: number;
  metodo: string;
  fecha: string;
}

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

export interface PrinterConfig {
  printerName: string;
  paperWidth: '58mm' | '80mm';
  autoCut: boolean;
  openDrawer: boolean;
  copies: number;
}

export interface TicketItem {
  cantidad: number;
  descripcion: string;
  precio_unitario: number;
  subtotal: number;
}

export interface TicketData {
  nombreComercial: string;
  razonSocial: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  nroComprobante: string;
  idPedido: number;
  mesa: string;
  mozo: string;
  cajero: string;
  fechaHora: string;
  items: TicketItem[];
  subtotal: number;
  descuento: number;
  propina: number;
  iva: number;
  total: number;
  metodosPago: { metodo: string; monto: number }[];
  vuelto: number;
  tipoComprobante: TipoComprobante;
  mensajePie: string;
}
