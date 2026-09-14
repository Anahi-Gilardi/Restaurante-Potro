-- =============================================================================
-- CREACIÓN DE TABLAS FALTANTES Y REALTIME EN SUPABASE
-- Soluciona: Error fetching mermas, recetas_escandallo, auditoria_eventos y WebSockets
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA 'mermas'
CREATE TABLE IF NOT EXISTS public.mermas (
    id_merma TEXT PRIMARY KEY,
    id_insumo TEXT,
    nombre_insumo TEXT,
    cantidad NUMERIC NOT NULL DEFAULT 0.0,
    unidad_medida TEXT,
    motivo TEXT,
    costo_perdida NUMERIC DEFAULT 0,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA 'recetas_escandallo'
CREATE TABLE IF NOT EXISTS public.recetas_escandallo (
    id_receta TEXT PRIMARY KEY,
    id_producto TEXT NOT NULL,
    id_insumo TEXT NOT NULL,
    cantidad_a_descontar NUMERIC NOT NULL DEFAULT 1.0,
    unidad_medida TEXT,
    rendimiento NUMERIC DEFAULT 1
);

-- 3. TABLA 'auditoria_eventos' (logs del sistema)
CREATE TABLE IF NOT EXISTS public.auditoria_eventos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT,
    terminal TEXT,
    entidad_id TEXT,
    estado_anterior TEXT,
    estado_nuevo TEXT,
    duracion_segundos NUMERIC
);

-- 4. TABLA 'insumos' (stock y costos de ingredientes)
CREATE TABLE IF NOT EXISTS public.insumos (
    id_insumo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    stock_actual NUMERIC NOT NULL DEFAULT 0.0,
    stock_minimo NUMERIC NOT NULL DEFAULT 0.0,
    unidad_medida TEXT NOT NULL DEFAULT 'unidades',
    costo_unitario NUMERIC NOT NULL DEFAULT 0.0,
    categoria TEXT DEFAULT 'general',
    proveedor TEXT,
    es_bebida_directa BOOLEAN DEFAULT false,
    merma_esperada_pct NUMERIC DEFAULT 0
);

-- 5. TABLAS 'pedidos_cabecera' Y 'pedido_detalle' (comandas en tiempo real)
CREATE TABLE IF NOT EXISTS public.pedidos_cabecera (
    id_pedido INT PRIMARY KEY,
    idempotency_key TEXT,
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
    stock_descontado BOOLEAN DEFAULT false,
    fecha_descuento_stock TIMESTAMPTZ,
    fecha_inicio_cocina TIMESTAMPTZ,
    fecha_listo TIMESTAMPTZ,
    items JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.pedido_detalle (
    id_detalle TEXT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto TEXT,
    nombre TEXT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    categoria TEXT,
    precio_unitario NUMERIC DEFAULT 0,
    estado TEXT DEFAULT 'pendiente'
);

-- 6. TABLA 'proveedores'
CREATE TABLE IF NOT EXISTS public.proveedores (
    id_proveedor TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    categoria TEXT,
    insumo_principal TEXT,
    email TEXT,
    cuit TEXT,
    direccion TEXT
);

-- 7. TABLA 'promociones'
CREATE TABLE IF NOT EXISTS public.promociones (
    id_promo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    descuento NUMERIC DEFAULT 0.0,
    precio NUMERIC DEFAULT 0.0,
    imagen_url TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    activa BOOLEAN NOT NULL DEFAULT true,
    dias_semana JSONB DEFAULT '[]'::jsonb,
    productos_incluidos JSONB DEFAULT '[]'::jsonb
);

-- 8. TABLA 'reservas'
CREATE TABLE IF NOT EXISTS public.reservas (
    id_reserva TEXT PRIMARY KEY,
    cliente TEXT NOT NULL,
    personas INT NOT NULL DEFAULT 1,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL,
    id_mesa INT,
    estado TEXT NOT NULL DEFAULT 'confirmada',
    telefono TEXT,
    observaciones TEXT
);

-- 9. TABLA 'pagos'
CREATE TABLE IF NOT EXISTS public.pagos (
    id_pago TEXT PRIMARY KEY,
    id_factura TEXT,
    monto NUMERIC NOT NULL DEFAULT 0.0,
    metodo TEXT NOT NULL DEFAULT 'Efectivo',
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TABLA 'cierres_caja'
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

-- 11. TABLA 'menu_diario'
CREATE TABLE IF NOT EXISTS public.menu_diario (
    id TEXT PRIMARY KEY,
    fecha DATE NOT NULL,
    id_producto TEXT NOT NULL,
    precio_promocional NUMERIC,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PERMISOS COMPLETOS: GRANT A ROLES ANON Y AUTHENTICATED
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 13. POLÍTICAS RLS PERMISIVAS EN TODAS LAS TABLAS
DO $$
DECLARE
    tbl text;
    tablas text[] := ARRAY[
        'mermas', 'recetas_escandallo', 'auditoria_eventos', 'insumos',
        'pedidos_cabecera', 'pedido_detalle', 'proveedores', 'promociones',
        'reservas', 'pagos', 'cierres_caja', 'menu_diario'
    ];
BEGIN
    FOREACH tbl IN ARRAY tablas LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'permitir_todo_' || tbl, tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', 'permitir_todo_' || tbl, tbl);
    END LOOP;
END $$;

-- 14. CONFIGURACIÓN REALTIME
ALTER TABLE public.pedidos_cabecera REPLICA IDENTITY FULL;
ALTER TABLE public.pedido_detalle REPLICA IDENTITY FULL;
ALTER TABLE public.mermas REPLICA IDENTITY FULL;
ALTER TABLE public.insumos REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pedidos_cabecera') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos_cabecera;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pedido_detalle') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_detalle;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mermas') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.mermas;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'insumos') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.insumos;
    END IF;
END $$;

-- 15. NOTIFICAR RECARGA DE ESQUEMA EN POSTGREST
NOTIFY pgrst, 'reload schema';
