-- Migración SQL para Supabase / PostgreSQL
-- Sistema Gestor Gastronómico
-- Nombres limpios, sin acentos ni carácteres especiales incompatibles.

-- Enable UUID extension just in case
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tablas Maestras
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('mozo', 'cocina', 'administrador'))
);

CREATE TABLE IF NOT EXISTS mesas (
    id_mesa INT PRIMARY KEY,
    numero_mesa TEXT NOT NULL UNIQUE,
    estado TEXT NOT NULL CHECK (estado IN ('libre', 'ocupada', 'esperando_cuenta')),
    comensales INT
);

CREATE TABLE IF NOT EXISTS insumos (
    id_insumo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    stock_actual NUMERIC NOT NULL DEFAULT 0.0,
    stock_minimo NUMERIC NOT NULL DEFAULT 0.0,
    unidad_medida TEXT NOT NULL CHECK (unidad_medida IN ('unidades', 'g', 'ml')),
    categoria TEXT NOT NULL CHECK (categoria IN ('bodega', 'frescos', 'secos'))
);

CREATE TABLE IF NOT EXISTS productos_menu (
    id_producto TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio_venta NUMERIC NOT NULL DEFAULT 0.0,
    categoria TEXT NOT NULL CHECK (categoria IN ('cocina', 'bebidas', 'postres')),
    activo BOOLEAN NOT NULL DEFAULT true,
    imagen TEXT
);

CREATE TABLE IF NOT EXISTS recetas_escandallo (
    id_receta TEXT PRIMARY KEY,
    id_producto TEXT NOT NULL REFERENCES productos_menu(id_producto) ON DELETE CASCADE,
    id_insumo TEXT NOT NULL REFERENCES insumos(id_insumo) ON DELETE CASCADE,
    cantidad_a_descontar NUMERIC NOT NULL DEFAULT 0.0
);

-- Tablas de Operación / Transaccionales
CREATE TABLE IF NOT EXISTS pedidos_cabecera (
    id_pedido INT PRIMARY KEY,
    id_mesa INT REFERENCES mesas(id_mesa) ON DELETE SET NULL,
    numero_mesa TEXT NOT NULL,
    mozo TEXT NOT NULL,
    estado_comanda TEXT NOT NULL CHECK (estado_comanda IN ('pendiente', 'en_cocina', 'listo', 'entregado_cobrado')),
    observaciones TEXT,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    minutos_transcurridos INT NOT NULL DEFAULT 0,
    origen TEXT NOT NULL CHECK (origen IN ('Mozo', 'Rappi', 'PedidosYa')),
    tiempo_despacho_minutos INT,
    segundos_en_listo INT DEFAULT 0,
    items TEXT -- fallback format for direct payload recovery
);

CREATE TABLE IF NOT EXISTS pedido_detalle (
    id_detalle TEXT PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedidos_cabecera(id_pedido) ON DELETE CASCADE,
    id_producto TEXT REFERENCES productos_menu(id_producto) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    categoria TEXT NOT NULL CHECK (categoria IN ('cocina', 'bebidas', 'postres'))
);

CREATE TABLE IF NOT EXISTS mermas (
    id_merma TEXT PRIMARY KEY,
    id_insumo TEXT NOT NULL REFERENCES insumos(id_insumo) ON DELETE CASCADE,
    nombre_insumo TEXT NOT NULL,
    cantidad NUMERIC NOT NULL DEFAULT 0.0,
    unidad_medida TEXT NOT NULL,
    motivo TEXT NOT NULL CHECK (motivo IN ('vencimiento', 'rotura', 'error_cocina', 'otro')),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria_eventos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('pedido_creado', 'descuento_stock', 'alerta_stock', 'comanda_estado', 'merma_registrada', 'sistema')),
    mensaje TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    contacto TEXT NOT NULL,
    telefono TEXT,
    categoria TEXT,
    insumo_principal TEXT
);

CREATE TABLE IF NOT EXISTS promociones (
    id_promo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    descuento NUMERIC NOT NULL DEFAULT 0.0,
    fecha_inicio DATE,
    fecha_fin DATE,
    activa BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS reservas (
    id_reserva TEXT PRIMARY KEY,
    cliente TEXT NOT NULL,
    personas INT NOT NULL DEFAULT 1,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL,
    id_mesa INT REFERENCES mesas(id_mesa) ON DELETE SET NULL,
    estado TEXT NOT NULL CHECK (estado IN ('confirmada', 'cancelada', 'pendiente'))
);

CREATE TABLE IF NOT EXISTS facturas (
    id_factura TEXT PRIMARY KEY,
    id_pedido INT REFERENCES pedidos_cabecera(id_pedido) ON DELETE SET NULL,
    numero_factura TEXT NOT NULL,
    total NUMERIC NOT NULL DEFAULT 0.0,
    tipo_comprobante TEXT NOT NULL DEFAULT 'Factura B',
    metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
    cuit_cliente TEXT,
    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos (
    id_pago TEXT PRIMARY KEY,
    id_factura TEXT REFERENCES facturas(id_factura) ON DELETE CASCADE,
    monto NUMERIC NOT NULL DEFAULT 0.0,
    metodo TEXT NOT NULL DEFAULT 'Efectivo',
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cierres_caja (
    id_cierre TEXT PRIMARY KEY,
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_cierre TIMESTAMPTZ,
    monto_apertura NUMERIC NOT NULL DEFAULT 0.0,
    monto_ventas NUMERIC NOT NULL DEFAULT 0.0,
    monto_real NUMERIC,
    diferencia NUMERIC,
    observaciones TEXT,
    usuario_cajero TEXT NOT NULL DEFAULT 'Cajero'
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento TEXT PRIMARY KEY,
    id_insumo TEXT REFERENCES insumos(id_insumo) ON DELETE CASCADE,
    tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida_comanda', 'salida_merma', 'ajuste')),
    cantidad NUMERIC NOT NULL DEFAULT 0.0,
    stock_anterior NUMERIC NOT NULL DEFAULT 0.0,
    stock_nuevo NUMERIC NOT NULL DEFAULT 0.0,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backups (
    id_backup TEXT PRIMARY KEY,
    nombre_archivo TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tamano TEXT NOT NULL,
    tablas TEXT NOT NULL,
    contenido TEXT NOT NULL
);

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas_escandallo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_cabecera ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE mermas ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad RLS básicas de demostración/acceso abierto
-- Permite todas las operaciones para pruebas locales/de desarrollo (pueden ser restringidas para producción real)
CREATE POLICY "Permitir todo a usuarios autenticados para usuarios" ON usuarios FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para mesas" ON mesas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para insumos" ON insumos FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para productos_menu" ON productos_menu FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para recetas_escandallo" ON recetas_escandallo FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para pedidos_cabecera" ON pedidos_cabecera FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para pedido_detalle" ON pedido_detalle FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para mermas" ON mermas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para auditoria_eventos" ON auditoria_eventos FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para proveedores" ON proveedores FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para promociones" ON promociones FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para reservas" ON reservas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para facturas" ON facturas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para pagos" ON pagos FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para cierres_caja" ON cierres_caja FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para movimientos_inventario" ON movimientos_inventario FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados para backups" ON backups FOR ALL TO public USING (true) WITH CHECK (true);

-- ÍNDICES para mejorar rendimiento relacional
CREATE INDEX IF NOT EXISTS idx_recetas_producto ON recetas_escandallo(id_producto);
CREATE INDEX IF NOT EXISTS idx_pedido_detalle_pedido ON pedido_detalle(id_pedido);
CREATE INDEX IF NOT EXISTS idx_mermas_insumo ON mermas(id_insumo);
CREATE INDEX IF NOT EXISTS idx_mov_inventario_insumo ON movimientos_inventario(id_insumo);
CREATE INDEX IF NOT EXISTS idx_reservas_mesa ON reservas(id_mesa);
CREATE INDEX IF NOT EXISTS idx_facturas_pedido ON facturas(id_pedido);
CREATE INDEX IF NOT EXISTS idx_pagos_factura ON pagos(id_factura);
