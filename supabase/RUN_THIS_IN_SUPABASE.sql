-- =============================================================================
-- EL PATRON PRO — SCHEMA MAESTRO COMPLETO (BASE DE DATOS UNIFICADA)
-- Copiar y pegar todo este script en el "SQL Editor" de Supabase y ejecutarlo.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ELIMINAR CONSTRAINTS PREVIAS RESTRICTIVAS
-- ============================================================
DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conrelid::regclass AS table_name, conname AS constraint_name
    FROM pg_constraint
    WHERE contype IN ('c', 'f')
      AND conrelid::regclass::text IN (
        'usuarios', 'mesas', 'insumos', 'productos_menu', 
        'recetas_escandallo', 'pedidos_cabecera', 'pedido_detalle', 
        'mermas', 'auditoria_eventos', 'proveedores', 'promociones', 
        'reservas', 'facturas', 'pagos', 'cierres_caja', 
        'movimientos_inventario', 'backups', 'clientes', 
        'movimientos_caja_chica', 'historial_costos_insumos', 'configuracion'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
      constraint_row.table_name,
      constraint_row.constraint_name
    );
  END LOOP;
END $$;

-- ============================================================
-- 2. CREACIÓN DE TABLAS MAESTRAS (MASTER TABLES)
-- ============================================================

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
    id_usuario INT PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'mozo'
);

-- Asegurar que las columnas nuevas existan si la tabla ya existía
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS mail TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS contrasena TEXT;

-- Sembrar usuarios administrativos iniciales
INSERT INTO public.usuarios (id_usuario, nombre, apellido, username, password, rol, activo) VALUES
  (1, 'Super Admin', '', 'super@admi.com', 'superadmi2026/', 'superadmin', true),
  (2, 'Administrador', '', 'admi@patron.com', 'Elpatron2026/', 'administrador', true),
  (3, 'Mozo', '', 'mozo@patron.com', 'Elpatronmozo2026/', 'mozo', true)
ON CONFLICT (id_usuario) DO NOTHING;

-- Tabla de Mesas
CREATE TABLE IF NOT EXISTS public.mesas (
    id_mesa INT PRIMARY KEY,
    numero_mesa TEXT NOT NULL UNIQUE,
    estado TEXT NOT NULL DEFAULT 'libre',
    comensales INT
);

-- Tabla de Insumos / Inventario
CREATE TABLE IF NOT EXISTS public.insumos (
    id_insumo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    stock_actual NUMERIC NOT NULL DEFAULT 0.0,
    stock_minimo NUMERIC NOT NULL DEFAULT 0.0,
    unidad_medida TEXT NOT NULL DEFAULT 'unidades',
    categoria TEXT NOT NULL DEFAULT 'secos',
    subcategoria TEXT,
    proveedor TEXT,
    costo_unitario NUMERIC DEFAULT 0.0,
    es_bebida_directa BOOLEAN NOT NULL DEFAULT false
);

-- Tabla de Productos del Menú (Carta)
CREATE TABLE IF NOT EXISTS public.productos_menu (
    id_producto TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio_venta NUMERIC NOT NULL DEFAULT 0.0,
    categoria TEXT NOT NULL DEFAULT 'Menu',
    activo BOOLEAN NOT NULL DEFAULT true,
    imagen TEXT,
    descripcion TEXT,
    subcategoria TEXT,
    tipo TEXT NOT NULL DEFAULT 'plato',
    tiempo_preparacion_estimado INT,
    requiere_cocina BOOLEAN NOT NULL DEFAULT true,
    precio_original NUMERIC,
    precio_final NUMERIC,
    descuento_aplicado NUMERIC DEFAULT 0,
    pasos_preparacion TEXT[],
    alergenos TEXT[],
    consejo_emplatado TEXT
);

-- Tabla de Recetas / Escandallo (Relación Insumo-Producto)
CREATE TABLE IF NOT EXISTS public.recetas_escandallo (
    id_receta TEXT PRIMARY KEY,
    id_producto TEXT NOT NULL REFERENCES public.productos_menu(id_producto) ON DELETE CASCADE,
    id_insumo TEXT NOT NULL REFERENCES public.insumos(id_insumo) ON DELETE CASCADE,
    cantidad_a_descontar NUMERIC NOT NULL DEFAULT 0.0,
    unidad_medida TEXT,
    merma_estimada_porcentaje NUMERIC DEFAULT 0.0
);

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
    id_proveedor TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    contacto TEXT NOT NULL,
    telefono TEXT,
    categoria TEXT,
    insumo_principal TEXT
);

-- Tabla de Promociones
CREATE TABLE IF NOT EXISTS public.promociones (
    id_promo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    descuento NUMERIC NOT NULL DEFAULT 0.0,
    fecha_inicio DATE,
    fecha_fin DATE,
    activa BOOLEAN NOT NULL DEFAULT true
);

-- Tabla de Clientes (Fidelización y Puntos)
CREATE TABLE IF NOT EXISTS public.clientes (
    id_cliente TEXT PRIMARY KEY DEFAULT 'cli_' || replace(uuid_generate_v4()::text, '-', ''),
    dni_cuit TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    puntos NUMERIC NOT NULL DEFAULT 0 CONSTRAINT chk_puntos_no_negativos CHECK (puntos >= 0),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Configuración de Sistema
CREATE TABLE IF NOT EXISTS public.configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);

-- Sembrar valores iniciales del restaurante
INSERT INTO public.configuracion (clave, valor) VALUES
    ('nombre_comercial', 'El Patrón Restaurante'),
    ('razon_social', 'Gastronomía El Patrón S.A.S.'),
    ('cuit', '30-71649251-4'),
    ('direccion', 'Av. Pres. Figueroa Alcorta 3420, CABA'),
    ('telefono', '+54 11 4802-9988'),
    ('email', 'facturas@elpatronrestaurante.com.ar'),
    ('inicio_actividades', '15/04/2022'),
    ('condicion_iva', 'Responsable Inscripto'),
    ('mensaje_pie', 'Gracias por su visita al verdadero rincón criollo.')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- 3. CREACIÓN DE TABLAS TRANSACCIONALES
-- ============================================================

-- Tabla de Pedidos / Comandas (Cabecera)
CREATE TABLE IF NOT EXISTS public.pedidos_cabecera (
    id_pedido INT PRIMARY KEY,
    id_mesa INT REFERENCES public.mesas(id_mesa) ON DELETE SET NULL,
    numero_mesa TEXT NOT NULL,
    mozo TEXT NOT NULL,
    estado_comanda TEXT NOT NULL DEFAULT 'pendiente' 
        CONSTRAINT chk_estado_comanda CHECK (estado_comanda IN (
            'abierta', 'pendiente', 'en_cocina', 'listo', 
            'entregado', 'entregado_cobrado', 'cancelado', 'finalizada', 'archivada'
        )),
    observaciones TEXT,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    minutos_transcurridos INT NOT NULL DEFAULT 0,
    origen TEXT NOT NULL DEFAULT 'Mozo',
    tiempo_despacho_minutos INT,
    segundos_en_listo INT DEFAULT 0,
    stock_descontado BOOLEAN NOT NULL DEFAULT false,
    fecha_descuento_stock TIMESTAMPTZ,
    fecha_inicio_cocina TIMESTAMPTZ,
    fecha_listo TIMESTAMPTZ,
    items TEXT -- Cache/Fallback en formato JSON
);

-- Tabla de Detalles de Pedido (Items individuales)
CREATE TABLE IF NOT EXISTS public.pedido_detalle (
    id_detalle TEXT PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES public.pedidos_cabecera(id_pedido) ON DELETE CASCADE,
    id_producto TEXT REFERENCES public.productos_menu(id_producto) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    cantidad INT NOT NULL CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    categoria TEXT NOT NULL DEFAULT 'Menu',
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    estado TEXT NOT NULL DEFAULT 'pendiente'
        CONSTRAINT chk_estado_detalle CHECK (estado IN ('pendiente', 'en_cocina', 'listo', 'entregado', 'cancelado')),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Mermas de Inventario
CREATE TABLE IF NOT EXISTS public.mermas (
    id_merma TEXT PRIMARY KEY,
    id_insumo TEXT NOT NULL REFERENCES public.insumos(id_insumo) ON DELETE CASCADE,
    nombre_insumo TEXT NOT NULL,
    cantidad NUMERIC NOT NULL DEFAULT 0.0,
    unidad_medida TEXT NOT NULL,
    motivo TEXT NOT NULL DEFAULT 'otro',
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    costo_perdida NUMERIC DEFAULT 0.0
);

-- Tabla de Auditoría / Logs de Eventos de Sistema
CREATE TABLE IF NOT EXISTS public.auditoria_eventos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL DEFAULT 'sistema',
    mensaje TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Reservas de Mesa
CREATE TABLE IF NOT EXISTS public.reservas (
    id_reserva TEXT PRIMARY KEY,
    cliente TEXT NOT NULL,
    personas INT NOT NULL DEFAULT 1,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL,
    id_mesa INT REFERENCES public.mesas(id_mesa) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente'
);

-- Tabla de Facturas Emitidas
CREATE TABLE IF NOT EXISTS public.facturas (
    id_factura TEXT PRIMARY KEY,
    id_pedido INT REFERENCES public.pedidos_cabecera(id_pedido) ON DELETE SET NULL,
    numero_factura TEXT NOT NULL,
    total NUMERIC NOT NULL DEFAULT 0.0,
    tipo_comprobante TEXT NOT NULL DEFAULT 'Ticket Interno',
    metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
    cuit_cliente TEXT,
    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Pagos de Factura
CREATE TABLE IF NOT EXISTS public.pagos (
    id_pago TEXT PRIMARY KEY,
    id_factura TEXT REFERENCES public.facturas(id_factura) ON DELETE CASCADE,
    monto NUMERIC NOT NULL DEFAULT 0.0,
    metodo TEXT NOT NULL DEFAULT 'Efectivo',
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Cierres de Caja (Arqueo de Turnos)
CREATE TABLE IF NOT EXISTS public.cierres_caja (
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

-- Tabla de Movimientos de Caja Chica (Caja manual)
CREATE TABLE IF NOT EXISTS public.movimientos_caja_chica (
    id_movimiento TEXT PRIMARY KEY DEFAULT 'mov_' || replace(uuid_generate_v4()::text, '-', ''),
    id_cierre TEXT REFERENCES public.cierres_caja(id_cierre) ON DELETE CASCADE,
    tipo TEXT NOT NULL CONSTRAINT chk_tipo_caja_chica CHECK (tipo IN ('ingreso', 'egreso')),
    monto NUMERIC NOT NULL CONSTRAINT chk_monto_positivo CHECK (monto > 0),
    concepto TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Movimientos de Inventario (Entradas / Ajustes)
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id_movimiento TEXT PRIMARY KEY,
    id_insumo TEXT REFERENCES public.insumos(id_insumo) ON DELETE CASCADE,
    tipo_movimiento TEXT NOT NULL DEFAULT 'ajuste',
    cantidad NUMERIC NOT NULL DEFAULT 0.0,
    stock_anterior NUMERIC NOT NULL DEFAULT 0.0,
    stock_nuevo NUMERIC NOT NULL DEFAULT 0.0,
    id_pedido INT REFERENCES public.pedidos_cabecera(id_pedido) ON DELETE SET NULL,
    id_producto TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    motivo TEXT,
    observacion TEXT
);

-- Tabla de Backups / Respaldos del Sistema
CREATE TABLE IF NOT EXISTS public.backups (
    id_backup TEXT PRIMARY KEY,
    nombre_archivo TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tamano TEXT NOT NULL,
    tablas TEXT NOT NULL,
    contenido TEXT NOT NULL
);

-- Tabla de Historial de Costos de Insumos
CREATE TABLE IF NOT EXISTS public.historial_costos_insumos (
    id_historial TEXT PRIMARY KEY DEFAULT 'hc_' || replace(uuid_generate_v4()::text, '-', ''),
    id_insumo TEXT NOT NULL REFERENCES public.insumos(id_insumo) ON DELETE CASCADE,
    nombre_insumo TEXT NOT NULL,
    costo_anterior NUMERIC NOT NULL DEFAULT 0.0,
    costo_nuevo NUMERIC NOT NULL DEFAULT 0.0,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. ÍNDICES DE RENDIMIENTO Y CONSULTAS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_recetas_producto ON public.recetas_escandallo(id_producto);
CREATE INDEX IF NOT EXISTS idx_recetas_insumo ON public.recetas_escandallo(id_insumo);
CREATE INDEX IF NOT EXISTS idx_pedido_detalle_pedido ON public.pedido_detalle(id_pedido);
CREATE INDEX IF NOT EXISTS idx_pedido_detalle_estado ON public.pedido_detalle(estado);
CREATE INDEX IF NOT EXISTS idx_mermas_insumo ON public.mermas(id_insumo);
CREATE INDEX IF NOT EXISTS idx_mov_inventario_insumo ON public.movimientos_inventario(id_insumo);
CREATE INDEX IF NOT EXISTS idx_mov_inventario_pedido ON public.movimientos_inventario(id_pedido);
CREATE INDEX IF NOT EXISTS idx_reservas_mesa ON public.reservas(id_mesa);
CREATE INDEX IF NOT EXISTS idx_facturas_pedido ON public.facturas(id_pedido);
CREATE INDEX IF NOT EXISTS idx_pagos_factura ON public.pagos(id_factura);
CREATE INDEX IF NOT EXISTS idx_mov_caja_chica_cierre ON public.movimientos_caja_chica(id_cierre);
CREATE INDEX IF NOT EXISTS idx_historial_costos_insumo ON public.historial_costos_insumos(id_insumo);
CREATE INDEX IF NOT EXISTS idx_historial_costos_fecha ON public.historial_costos_insumos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_dni ON public.clientes(dni_cuit);
CREATE INDEX IF NOT EXISTS idx_cabecera_mesa_activa ON public.pedidos_cabecera(id_mesa) WHERE (estado_comanda = 'abierta');

-- ============================================================
-- 5. CONFIGURACIÓN DE DISPARADORES (TRIGGERS)
-- ============================================================

-- Disparador para registrar cambios de costos automáticamente al actualizar un insumo
CREATE OR REPLACE FUNCTION public.log_insumo_cost_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.costo_unitario IS DISTINCT FROM NEW.costo_unitario) THEN
        INSERT INTO public.historial_costos_insumos (id_insumo, nombre_insumo, costo_anterior, costo_nuevo, fecha)
        VALUES (
            NEW.id_insumo,
            NEW.nombre,
            COALESCE(OLD.costo_unitario, 0.0),
            NEW.costo_unitario,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_insumo_cost_change ON public.insumos;
CREATE TRIGGER trg_log_insumo_cost_change
AFTER UPDATE OF costo_unitario ON public.insumos
FOR EACH ROW
EXECUTE FUNCTION public.log_insumo_cost_change();

-- ============================================================
-- 6. HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas_escandallo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_cabecera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mermas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja_chica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_costos_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. CREACIÓN DE POLÍTICAS RLS ABIERTAS (DEMO / DESARROLLO)
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios', 'mesas', 'insumos', 'productos_menu', 'recetas_escandallo', 
    'pedidos_cabecera', 'pedido_detalle', 'mermas', 'auditoria_eventos', 
    'proveedores', 'promociones', 'reservas', 'facturas', 'pagos', 
    'cierres_caja', 'movimientos_inventario', 'backups', 'clientes', 
    'movimientos_caja_chica', 'historial_costos_insumos', 'configuracion'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Permitir todo a usuarios autenticados para ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'permitir_todo_demo_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO public USING (true) WITH CHECK (true)', 'permitir_todo_demo_' || t, t);
  END LOOP;
END $$;

-- ============================================================
-- 8. REFRESCAR ESQUEMA Y CACHE DE POSTGREST
-- ============================================================
NOTIFY pgrst, 'reload schema';
