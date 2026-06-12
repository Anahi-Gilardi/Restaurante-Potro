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
  categoria: 'bodega' | 'frescos' | 'secos';
}

export interface ProductoMenu {
  id_producto: string;
  nombre: string;
  precio_venta: number;
  categoria: 'cocina' | 'bebidas' | 'postres';
  activo: boolean;
  imagen: string;
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
}

export interface Pedido {
  id_pedido: number;
  id_mesa: number;
  numero_mesa: string;
  mozo: string;
  estado_comanda: 'pendiente' | 'en_cocina' | 'listo' | 'entregado_cobrado';
  items: PedidoItem[];
  observaciones?: string;
  fecha_hora: Date; // real date or simulated date
  minutos_transcurridos: number; // simulated elapsed minutes
  origen: 'Mozo' | 'Rappi' | 'PedidosYa'; // API delivery unificada or internal
  tiempo_despacho_minutos?: number; // performance metric
  segundos_en_listo?: number; // for "Plato Frío" warning (5m = 300s)
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
