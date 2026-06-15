-- Upgrade schema for El Patron Pro.
-- Run this in Supabase SQL Editor before seeding the full menu/inventory data.
-- This migration keeps existing tables when possible and adds the columns needed by
-- menu, inventory, caja, PDF tickets, printer preparation, and audit flows.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old restrictive CHECK/FK constraints that blocked real menu categories and
-- can also block converting legacy numeric product ids to stable text ids.
DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conrelid::regclass AS table_name, conname AS constraint_name
    FROM pg_constraint
    WHERE contype IN ('c', 'f')
      AND conrelid::regclass::text IN (
        'productos_menu',
        'pedido_detalle',
        'insumos',
        'pedidos_cabecera',
        'auditoria_eventos',
        'movimientos_inventario',
        'facturas'
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', constraint_row.table_name, constraint_row.constraint_name);
  END LOOP;
END $$;

-- Existing projects may have numeric product ids. The app uses stable text ids
-- such as prod_ojo_bife and prod_vin_trumpeter, so normalize FK columns to TEXT.
ALTER TABLE IF EXISTS productos_menu
  ALTER COLUMN id_producto TYPE TEXT USING id_producto::TEXT;

ALTER TABLE IF EXISTS productos_menu
  ALTER COLUMN activo TYPE BOOLEAN USING (
    CASE
      WHEN activo::TEXT IN ('true', 't', '1', 'yes', 'on') THEN true
      ELSE false
    END
  );

ALTER TABLE IF EXISTS recetas_escandallo
  ALTER COLUMN id_producto TYPE TEXT USING id_producto::TEXT;

ALTER TABLE IF EXISTS pedido_detalle
  ALTER COLUMN id_producto TYPE TEXT USING id_producto::TEXT;

-- Master tables.
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  rol TEXT NOT NULL
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS mail TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password TEXT;

-- Insertar usuarios demo (solo si no existen)
INSERT INTO usuarios (id_usuario, nombre, apellido, username, password, rol, activo) VALUES
  (1, 'Super Admin', '', 'super@admi.com', 'superadmi2026/', 'superadmin', true),
  (2, 'Administrador', '', 'admi@patron.com', 'Elpatron2026/', 'administrador', true),
  (3, 'Mozo', '', 'mozo@patron.com', 'Elpatronmozo2026/', 'mozo', true)
ON CONFLICT (id_usuario) DO NOTHING;

CREATE TABLE IF NOT EXISTS mesas (
  id_mesa INT PRIMARY KEY,
  numero_mesa TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'libre',
  comensales INT
);

CREATE TABLE IF NOT EXISTS insumos (
  id_insumo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  stock_actual NUMERIC NOT NULL DEFAULT 0,
  stock_minimo NUMERIC NOT NULL DEFAULT 0,
  unidad_medida TEXT NOT NULL DEFAULT 'unidades',
  categoria TEXT NOT NULL DEFAULT 'secos'
);

ALTER TABLE insumos ADD COLUMN IF NOT EXISTS subcategoria TEXT;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS proveedor TEXT;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS es_bebida_directa BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS productos_menu (
  id_producto TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio_venta NUMERIC NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL DEFAULT 'Menu',
  activo BOOLEAN NOT NULL DEFAULT true,
  imagen TEXT
);

ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS subcategoria TEXT;
ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'plato';
ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS tiempo_preparacion_estimado INT;
ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS requiere_cocina BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS precio_original NUMERIC;
ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS precio_final NUMERIC;
ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS descuento_aplicado NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS recetas_escandallo (
  id_receta TEXT PRIMARY KEY,
  id_producto TEXT NOT NULL,
  id_insumo TEXT NOT NULL,
  cantidad_a_descontar NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE recetas_escandallo ADD COLUMN IF NOT EXISTS unidad_medida TEXT;
ALTER TABLE recetas_escandallo ADD COLUMN IF NOT EXISTS merma_estimada_porcentaje NUMERIC;

-- Operations.
CREATE TABLE IF NOT EXISTS pedidos_cabecera (
  id_pedido INT PRIMARY KEY,
  id_mesa INT,
  numero_mesa TEXT NOT NULL,
  mozo TEXT NOT NULL,
  estado_comanda TEXT NOT NULL DEFAULT 'pendiente',
  observaciones TEXT,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  minutos_transcurridos INT NOT NULL DEFAULT 0,
  origen TEXT NOT NULL DEFAULT 'Mozo',
  tiempo_despacho_minutos INT,
  segundos_en_listo INT DEFAULT 0,
  items TEXT
);

ALTER TABLE pedidos_cabecera ADD COLUMN IF NOT EXISTS stock_descontado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pedidos_cabecera ADD COLUMN IF NOT EXISTS fecha_descuento_stock TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS pedido_detalle (
  id_detalle TEXT PRIMARY KEY,
  id_pedido INT NOT NULL,
  id_producto TEXT,
  nombre TEXT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  categoria TEXT NOT NULL DEFAULT 'Menu'
);

CREATE TABLE IF NOT EXISTS mermas (
  id_merma TEXT PRIMARY KEY,
  id_insumo TEXT NOT NULL,
  nombre_insumo TEXT NOT NULL,
  cantidad NUMERIC NOT NULL DEFAULT 0,
  unidad_medida TEXT NOT NULL,
  motivo TEXT NOT NULL DEFAULT 'otro',
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria_eventos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'sistema',
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
  descuento NUMERIC NOT NULL DEFAULT 0,
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
  id_mesa INT,
  estado TEXT NOT NULL DEFAULT 'pendiente'
);

-- Caja, payments, tickets and backups.
CREATE TABLE IF NOT EXISTS facturas (
  id_factura TEXT PRIMARY KEY,
  id_pedido INT,
  numero_factura TEXT NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  tipo_comprobante TEXT NOT NULL DEFAULT 'Ticket Interno',
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
  cuit_cliente TEXT,
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos (
  id_pago TEXT PRIMARY KEY,
  id_factura TEXT REFERENCES facturas(id_factura) ON DELETE CASCADE,
  monto NUMERIC NOT NULL DEFAULT 0,
  metodo TEXT NOT NULL DEFAULT 'Efectivo',
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cierres_caja (
  id_cierre TEXT PRIMARY KEY,
  fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_cierre TIMESTAMPTZ,
  monto_apertura NUMERIC NOT NULL DEFAULT 0,
  monto_ventas NUMERIC NOT NULL DEFAULT 0,
  monto_real NUMERIC,
  diferencia NUMERIC,
  observaciones TEXT,
  usuario_cajero TEXT NOT NULL DEFAULT 'Cajero'
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id_movimiento TEXT PRIMARY KEY,
  id_insumo TEXT,
  tipo_movimiento TEXT NOT NULL DEFAULT 'ajuste',
  cantidad NUMERIC NOT NULL DEFAULT 0,
  stock_anterior NUMERIC NOT NULL DEFAULT 0,
  stock_nuevo NUMERIC NOT NULL DEFAULT 0,
  id_pedido INT,
  id_producto TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motivo TEXT,
  observacion TEXT
);

ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS id_pedido INT;
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS id_producto TEXT;
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS motivo TEXT;
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS observacion TEXT;

CREATE TABLE IF NOT EXISTS backups (
  id_backup TEXT PRIMARY KEY,
  nombre_archivo TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tamano TEXT NOT NULL,
  tablas TEXT NOT NULL,
  contenido TEXT NOT NULL
);

-- Helpful indexes.
CREATE INDEX IF NOT EXISTS idx_recetas_producto ON recetas_escandallo(id_producto);
CREATE INDEX IF NOT EXISTS idx_recetas_insumo ON recetas_escandallo(id_insumo);
CREATE INDEX IF NOT EXISTS idx_pedido_detalle_pedido ON pedido_detalle(id_pedido);
CREATE INDEX IF NOT EXISTS idx_mov_inventario_insumo ON movimientos_inventario(id_insumo);
CREATE INDEX IF NOT EXISTS idx_mov_inventario_pedido ON movimientos_inventario(id_pedido);
CREATE INDEX IF NOT EXISTS idx_reservas_mesa ON reservas(id_mesa);
CREATE INDEX IF NOT EXISTS idx_facturas_pedido ON facturas(id_pedido);
CREATE INDEX IF NOT EXISTS idx_pagos_factura ON pagos(id_factura);

-- Demo policies: open for local development. Restrict them before production.
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

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'usuarios','mesas','insumos','productos_menu','recetas_escandallo',
    'pedidos_cabecera','pedido_detalle','mermas','auditoria_eventos',
    'proveedores','promociones','reservas','facturas','pagos',
    'cierres_caja','movimientos_inventario','backups'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'permitir_todo_demo_' || table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Permitir todo a usuarios autenticados para ' || table_name, table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO public USING (true) WITH CHECK (true)',
      'permitir_todo_demo_' || table_name,
      table_name
    );
  END LOOP;
END $$;
