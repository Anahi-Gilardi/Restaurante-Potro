import { Usuario, Mesa, Insumo, ProductoMenu, RecetaEscandallo, Pedido } from '../types';

export const INITIAL_USUARIOS: Usuario[] = [
  { id_usuario: 1, nombre: 'Enzo', apellido: 'Fernández', rol: 'mozo' },
  { id_usuario: 2, nombre: 'Micaela', apellido: 'Gómez', rol: 'mozo' },
  { id_usuario: 3, nombre: 'Damián', apellido: 'Martínez', rol: 'cocina' },
  { id_usuario: 4, nombre: 'Sofía', apellido: 'Alegre', rol: 'administrador' },
];

export const INITIAL_MESAS: Mesa[] = [
  { id_mesa: 1, numero_mesa: 'Mesa 1', estado: 'libre' },
  { id_mesa: 2, numero_mesa: 'Mesa 2', estado: 'ocupada', comensales: 2 },
  { id_mesa: 3, numero_mesa: 'Mesa 3', estado: 'libre' },
  { id_mesa: 4, numero_mesa: 'Mesa 4', estado: 'ocupada', comensales: 3 },
  { id_mesa: 5, numero_mesa: 'Mesa 5', estado: 'libre' },
  { id_mesa: 6, numero_mesa: 'Mesa 6', estado: 'libre' },
  { id_mesa: 8, numero_mesa: 'Mesa 8', estado: 'ocupada', comensales: 1 },
  { id_mesa: 12, numero_mesa: 'Mesa 12', estado: 'ocupada', comensales: 4 },
  { id_mesa: 101, numero_mesa: 'VIP-1', estado: 'libre' },
  { id_mesa: 102, numero_mesa: 'Terraza-3', estado: 'libre' },
];

export const INITIAL_INSUMOS: Insumo[] = [
  // Bodega & Bebidas (Venta Directa)
  { id_insumo: 'ins_vin_malbec', nombre: 'Vino Malbec Reservado 750ml', stock_actual: 15.00, stock_minimo: 5.00, unidad_medida: 'unidades', categoria: 'bodega' },
  { id_insumo: 'ins_vin_rutini', nombre: 'Vino Rutini Cabernet 750ml', stock_actual: 8.00, stock_minimo: 3.00, unidad_medida: 'unidades', categoria: 'bodega' },
  { id_insumo: 'ins_beb_agua', nombre: 'Agua Mineral 500ml', stock_actual: 50.00, stock_minimo: 15.00, unidad_medida: 'unidades', categoria: 'bodega' },
  { id_insumo: 'ins_beb_gaseosa', nombre: 'Gaseosa Cola 354ml', stock_actual: 45.00, stock_minimo: 10.00, unidad_medida: 'unidades', categoria: 'bodega' },

  // Materias Primas para Cocina (Descuento por Escandallo)
  { id_insumo: 'ins_car_bife', nombre: 'Corte de Carne Vacuna (Bife)', stock_actual: 12000.00, stock_minimo: 3000.00, unidad_medida: 'g', categoria: 'frescos' },
  { id_insumo: 'ins_car_entrana', nombre: 'Corte de Entraña Selection', stock_actual: 6000.00, stock_minimo: 2000.00, unidad_medida: 'g', categoria: 'frescos' },
  { id_insumo: 'ins_veg_papa', nombre: 'Papa Negra Bastón', stock_actual: 25000.00, stock_minimo: 5000.00, unidad_medida: 'g', categoria: 'frescos' },
  { id_insumo: 'ins_ace_girasol', nombre: 'Aceite de Girasol (Merma frita)', stock_actual: 10000.00, stock_minimo: 2000.00, unidad_medida: 'ml', categoria: 'secos' },
  { id_insumo: 'ins_pasta_fresca', nombre: 'Pasta Casera (Serrana)', stock_actual: 4500.00, stock_minimo: 1500.00, unidad_medida: 'g', categoria: 'frescos' },
  { id_insumo: 'ins_salsa_pomodoro', nombre: 'Salsa Tuco Pomodoro Casera', stock_actual: 5000.00, stock_minimo: 1000.00, unidad_medida: 'ml', categoria: 'frescos' },
  { id_insumo: 'ins_car_pollo', nombre: 'Pechuga de Pollo Fresca', stock_actual: 8000.00, stock_minimo: 2000.00, unidad_medida: 'g', categoria: 'frescos' },
  { id_insumo: 'ins_veg_lechuga', nombre: 'Lechuga Romana Orgánica', stock_actual: 3000.00, stock_minimo: 800.00, unidad_medida: 'g', categoria: 'frescos' },
  { id_insumo: 'ins_aderezo_cesar', nombre: 'Aderezo César Artesanal', stock_actual: 1500.00, stock_minimo: 450.00, unidad_medida: 'ml', categoria: 'secos' },
  { id_insumo: 'ins_car_hamburguesa', nombre: 'Medallón de Carne Novillo 180g', stock_actual: 30.00, stock_minimo: 8.00, unidad_medida: 'unidades', categoria: 'frescos' },
  { id_insumo: 'ins_pan_hamburguesa', nombre: 'Pan de Papa para Hamburguesa', stock_actual: 32.00, stock_minimo: 10.00, unidad_medida: 'unidades', categoria: 'secos' },
  { id_insumo: 'ins_queso_cheddar', nombre: 'Queso Cheddar Feteado', stock_actual: 120.00, stock_minimo: 30.00, unidad_medida: 'unidades', categoria: 'frescos' },
  { id_insumo: 'ins_tarta_masa', nombre: 'Masa Hojaldre Casera', stock_actual: 12.00, stock_minimo: 4.00, unidad_medida: 'unidades', categoria: 'secos' },
  { id_insumo: 'ins_veg_acelga', nombre: 'Acelga/Espinaca Blanqueada', stock_actual: 4000.00, stock_minimo: 1000.00, unidad_medida: 'g', categoria: 'frescos' },
  { id_insumo: 'ins_queso_mozzarella', nombre: 'Queso Mozzarella', stock_actual: 6000.00, stock_minimo: 1500.00, unidad_medida: 'g', categoria: 'frescos' },
];

export const INITIAL_PRODUCTOS_MENU: ProductoMenu[] = [
  {
    id_producto: 'prod_bife',
    nombre: 'Bife de Chorizo con Papas Fritas',
    precio_venta: 16500.00,
    categoria: 'cocina',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80&auto=format&fit=crop'
  },
  {
    id_producto: 'prod_pasta',
    nombre: 'Pastas Caseras con Tuco Pomodoro',
    precio_venta: 11200.00,
    categoria: 'cocina',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80&auto=format&fit=crop'
  },
  {
    id_producto: 'prod_entrana',
    nombre: 'Entraña Arriera Selection',
    precio_venta: 19800.00,
    categoria: 'cocina',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80&auto=format&fit=crop'
  },
  {
    id_producto: 'prod_hamburguesa',
    nombre: 'Hamburguesa Completa Gourmet',
    precio_venta: 10500.00,
    categoria: 'cocina',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80&auto=format&fit=crop'
  },
  {
    id_producto: 'prod_ensalada_cesar',
    nombre: 'Ensalada César con Pollo Grillado',
    precio_venta: 9500.00,
    categoria: 'cocina',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&q=80&auto=format&fit=crop'
  },
  {
    id_producto: 'prod_tarta',
    nombre: 'Tarta Rústica de Acelga y Mozzarella',
    precio_venta: 8500.00,
    categoria: 'cocina',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1621510456681-23a23cfb5f57?w=400&q=80&auto=format&fit=crop'
  },
  // Bebidas (Venta Directa)
  {
    id_producto: 'prod_vino_malbec',
    nombre: 'Vino Malbec Reservado (Copa)',
    precio_venta: 4200.00,
    categoria: 'bebidas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&q=80&auto=format&fit=crop'
  },
  {
    id_producto: 'prod_vino_rutini_botella',
    nombre: 'Vino Rutini Cabernet (Botella)',
    precio_venta: 21500.00,
    categoria: 'bebidas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop'
  },
  {
    id_producto: 'prod_agua',
    nombre: 'Agua Mineral Glaciar Con/Sin Gas',
    precio_venta: 2200.00,
    categoria: 'bebidas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1608885898957-a599fb18ec3f?w=400&q=80&auto=format&fit=crop'
  },
  {
    id_producto: 'prod_gaseosa',
    nombre: 'Gaseosa Línea Cola Fría',
    precio_venta: 2500.00,
    categoria: 'bebidas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80&auto=format&fit=crop'
  }
];

export const INITIAL_RECETAS_ESCANDALLO: RecetaEscandallo[] = [
  // Bife de Chorizo con Papas Fritas
  { id_receta: 'rec_1_bife', id_producto: 'prod_bife', id_insumo: 'ins_car_bife', cantidad_a_descontar: 350.00 },
  { id_receta: 'rec_1_papa', id_producto: 'prod_bife', id_insumo: 'ins_veg_papa', cantidad_a_descontar: 250.00 },
  { id_receta: 'rec_1_aceite', id_producto: 'prod_bife', id_insumo: 'ins_ace_girasol', cantidad_a_descontar: 40.00 },

  // Pastas Caseras con Tuco Pomodoro
  { id_receta: 'rec_2_pasta', id_producto: 'prod_pasta', id_insumo: 'ins_pasta_fresca', cantidad_a_descontar: 150.00 },
  { id_receta: 'rec_2_tuco', id_producto: 'prod_pasta', id_insumo: 'ins_salsa_pomodoro', cantidad_a_descontar: 120.00 },

  // Entraña Arriera Selection
  { id_receta: 'rec_3_entrana', id_producto: 'prod_entrana', id_insumo: 'ins_car_entrana', cantidad_a_descontar: 300.00 },
  { id_receta: 'rec_3_papa', id_producto: 'prod_entrana', id_insumo: 'ins_veg_papa', cantidad_a_descontar: 250.00 },
  { id_receta: 'rec_3_aceite', id_producto: 'prod_entrana', id_insumo: 'ins_ace_girasol', cantidad_a_descontar: 40.00 },

  // Hamburguesa Completa Gourmet
  { id_receta: 'rec_4_medallon', id_producto: 'prod_hamburguesa', id_insumo: 'ins_car_hamburguesa', cantidad_a_descontar: 1.00 },
  { id_receta: 'rec_4_pan', id_producto: 'prod_hamburguesa', id_insumo: 'ins_pan_hamburguesa', cantidad_a_descontar: 1.00 },
  { id_receta: 'rec_4_cheddar', id_producto: 'prod_hamburguesa', id_insumo: 'ins_queso_cheddar', cantidad_a_descontar: 2.00 },
  { id_receta: 'rec_4_papa', id_producto: 'prod_hamburguesa', id_insumo: 'ins_veg_papa', cantidad_a_descontar: 100.00 },

  // Ensalada César con Pollo
  { id_receta: 'rec_5_pollo', id_producto: 'prod_ensalada_cesar', id_insumo: 'ins_car_pollo', cantidad_a_descontar: 150.00 },
  { id_receta: 'rec_5_lechuga', id_producto: 'prod_ensalada_cesar', id_insumo: 'ins_veg_lechuga', cantidad_a_descontar: 120.00 },
  { id_receta: 'rec_5_aderezo', id_producto: 'prod_ensalada_cesar', id_insumo: 'ins_aderezo_cesar', cantidad_a_descontar: 35.00 },

  // Tarta Rústica de Acelga
  { id_receta: 'rec_6_masa', id_producto: 'prod_tarta', id_insumo: 'ins_tarta_masa', cantidad_a_descontar: 1.00 },
  { id_receta: 'rec_6_acelga', id_producto: 'prod_tarta', id_insumo: 'ins_veg_acelga', cantidad_a_descontar: 250.00 },
  { id_receta: 'rec_6_queso', id_producto: 'prod_tarta', id_insumo: 'ins_queso_mozzarella', cantidad_a_descontar: 100.00 },

  // Vinos / Bebidas (Venta Directa: Vinculamos 1 a 1 de forma directa)
  { id_receta: 'rec_vd_vino', id_producto: 'prod_vino_malbec', id_insumo: 'ins_vin_malbec', cantidad_a_descontar: 0.20 }, // 1 copa = 0.2 botellas aprox.
  { id_receta: 'rec_vd_vino_bot', id_producto: 'prod_vino_rutini_botella', id_insumo: 'ins_vin_rutini', cantidad_a_descontar: 1.00 },
  { id_receta: 'rec_vd_agua', id_producto: 'prod_agua', id_insumo: 'ins_beb_agua', cantidad_a_descontar: 1.00 },
  { id_receta: 'rec_vd_gaseosa', id_producto: 'prod_gaseosa', id_insumo: 'ins_beb_gaseosa', cantidad_a_descontar: 1.00 },
];

export const INITIAL_PEDIDOS: Pedido[] = [
  {
    id_pedido: 1021,
    id_mesa: 2,
    numero_mesa: 'Mesa 2',
    mozo: 'Enzo',
    estado_comanda: 'listo',
    items: [
      { id_producto: 'prod_ensalada_cesar', nombre: 'Ensalada César con Pollo Grillado', cantidad: 1, categoria: 'cocina' },
      { id_producto: 'prod_tarta', nombre: 'Tarta Rústica de Acelga y Mozzarella', cantidad: 1, categoria: 'cocina' },
      { id_producto: 'prod_agua', nombre: 'Agua Mineral Glaciar Con/Sin Gas', cantidad: 2, categoria: 'bebidas' }
    ],
    observaciones: 'El agua sin gas, por favor.',
    fecha_hora: new Date(Date.now() - 30 * 60 * 1000), // Hace 30 min
    minutos_transcurridos: 30,
    segundos_en_listo: 360, // 6 minutos en Listo -> Dispara "Alerta de plato frío"!
    origen: 'Mozo',
    tiempo_despacho_minutos: 15
  },
  {
    id_pedido: 1022,
    id_mesa: 12,
    numero_mesa: 'Mesa 12',
    mozo: 'Enzo',
    estado_comanda: 'en_cocina',
    items: [
      { id_producto: 'prod_pasta', nombre: 'Pastas Caseras con Tuco Pomodoro', cantidad: 2, categoria: 'cocina' },
      { id_producto: 'prod_entrana', nombre: 'Entraña Arriera Selection', cantidad: 1, categoria: 'cocina' }
    ],
    observaciones: 'Entraña bien jugosa.',
    fecha_hora: new Date(Date.now() - 12 * 60 * 1000), // Hace 12m (Amarillo en Semáforo!)
    minutos_transcurridos: 12,
    origen: 'Mozo'
  },
  {
    id_pedido: 1023,
    id_mesa: 4,
    numero_mesa: 'Mesa 4',
    mozo: 'Micaela',
    estado_comanda: 'pendiente',
    items: [
      { id_producto: 'prod_bife', nombre: 'Bife de Chorizo con Papas Fritas', cantidad: 1, categoria: 'cocina' },
      { id_producto: 'prod_vino_rutini_botella', nombre: 'Vino Rutini Cabernet (Botella)', cantidad: 1, categoria: 'bebidas' }
    ],
    observaciones: 'Bife bien a punto (jugoso por dentro).',
    fecha_hora: new Date(Date.now() - 2 * 60 * 1000), // Hace 2m (Verde)
    minutos_transcurridos: 2,
    origen: 'Mozo'
  },
  {
    id_pedido: 1024,
    id_mesa: 8,
    numero_mesa: 'Mesa 8',
    mozo: 'Enzo',
    estado_comanda: 'pendiente',
    items: [
      { id_producto: 'prod_hamburguesa', nombre: 'Hamburguesa Completa Gourmet', cantidad: 1, categoria: 'cocina' },
      { id_producto: 'prod_gaseosa', nombre: 'Gaseosa Línea Cola Fría', cantidad: 1, categoria: 'bebidas' }
    ],
    observaciones: 'Sin aderezos extras.',
    fecha_hora: new Date(Date.now() - 1 * 60 * 1000), // Hace 1m (Verde)
    minutos_transcurridos: 1,
    origen: 'Mozo'
  },
  {
    id_pedido: 1025,
    id_mesa: 3,
    numero_mesa: 'Mesa 3',
    mozo: 'PedidosYa Delivery',
    estado_comanda: 'pendiente',
    items: [
      { id_producto: 'prod_bife', nombre: 'Bife de Chorizo con Papas Fritas', cantidad: 2, categoria: 'cocina' }
    ],
    observaciones: 'Enviar cubiertos descartables. Enviar por Rappi/PedidosYa API integrada.',
    fecha_hora: new Date(Date.now() - 0.2 * 60 * 1000), // Hace 10 segundos
    minutos_transcurridos: 0,
    origen: 'PedidosYa'
  }
];
