-- =============================================================================
-- PROYECTO: RESTAURANTE EL PATRÓN / BELLA ORIANA
-- SCRIPT COMPLETO DE MIGRACIÓN SUPABASE (NUEVO PROYECTO)
-- Incluye: Extensiones, Tablas, Triggers, Funciones RPC, Políticas RLS,
-- Permisos (Grants), Publicaciones Realtime y Datos Semilla (Seeds).
-- =============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. TABLA 'categorias'
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categorias (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    orden NUMERIC NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT true,
    icono TEXT
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.categorias TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Permitir todo en categorias" ON public.categorias;
CREATE POLICY "Permitir todo en categorias"
  ON public.categorias FOR ALL TO public USING (true) WITH CHECK (true);

-- Semilla de Categorías
INSERT INTO public.categorias (id, nombre, slug, orden, activa, icono) VALUES
  ('cat_entradas', 'Entradas', 'entradas', 1, true, 'UtensilsCrossed'),
  ('cat_pastas', 'Pastas', 'pastas', 2, true, 'UtensilsCrossed'),
  ('cat_carnes', 'Carnes', 'carnes', 3, true, 'Beef'),
  ('cat_pescados', 'Pescados', 'pescados', 4, true, 'Fish'),
  ('cat_criollas', 'Comidas Criollas', 'comidas-criollas', 5, true, 'Utensils'),
  ('cat_postres', 'Postres', 'postres', 6, true, 'Coffee'),
  ('cat_bebidas_con_alcohol', 'Bebidas con Alcohol', 'bebidas-con-alcohol', 7, true, 'Wine'),
  ('cat_bebidas_sin_alcohol', 'Bebidas sin Alcohol', 'bebidas-sin-alcohol', 7.5, true, 'Wine'),
  ('cat_bodega', 'Bodega', 'bodega', 8, true, 'Wine')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  slug = EXCLUDED.slug,
  orden = EXCLUDED.orden,
  activa = EXCLUDED.activa,
  icono = EXCLUDED.icono;

-- =============================================================================
-- 2. TABLA 'productos_menu'
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.productos_menu (
    id_producto TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_venta NUMERIC NOT NULL DEFAULT 0.0,
    categoria TEXT NOT NULL,
    subcategoria TEXT,
    tipo TEXT,
    tiempo_preparacion_estimado INT DEFAULT 15,
    requiere_cocina BOOLEAN DEFAULT true,
    activo BOOLEAN NOT NULL DEFAULT true,
    imagen TEXT,
    url_imagen TEXT,
    pasos_preparacion JSONB,
    alergenos JSONB NOT NULL DEFAULT '[]'::jsonb,
    consejo_emplatado TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asegurar columnas si se crea sobre tabla existente
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS subcategoria TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS tiempo_preparacion_estimado INT DEFAULT 15;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS requiere_cocina BOOLEAN DEFAULT true;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS imagen TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS url_imagen TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS pasos_preparacion JSONB;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS alergenos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS consejo_emplatado TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Quitar cualquier check rígido sobre categoria para admitir todas las del restaurante
ALTER TABLE public.productos_menu DROP CONSTRAINT IF EXISTS productos_menu_categoria_check;
ALTER TABLE public.productos_menu DROP CONSTRAINT IF EXISTS chk_categoria_productos;

ALTER TABLE public.productos_menu ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.productos_menu TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Permitir todo en productos_menu" ON public.productos_menu;
CREATE POLICY "Permitir todo en productos_menu"
  ON public.productos_menu FOR ALL TO public USING (true) WITH CHECK (true);

-- =============================================================================
-- 3. TABLA 'mesas'
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mesas (
  id_mesa INT PRIMARY KEY,
  numero_mesa TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'libre' CHECK (estado IN ('libre', 'ocupada', 'esperando_cuenta', 'reservada', 'limpiando', 'unida', 'sucia')),
  comensales INT DEFAULT NULL,
  comensales_actuales INT DEFAULT NULL,
  capacidad INT NOT NULL DEFAULT 2,
  zona TEXT NOT NULL DEFAULT 'salon' CHECK (zona IN ('comedor', 'salon')),
  sector TEXT DEFAULT 'salon' CHECK (sector IN ('patio', 'comedor', 'salon', 'terraza', 'vip')),
  x NUMERIC DEFAULT 0,
  y NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 80,
  height NUMERIC DEFAULT 80,
  rx NUMERIC DEFAULT 8,
  forma TEXT DEFAULT 'rectangular' CHECK (forma IN ('redonda', 'rectangular')),
  mesas_unidas JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_id INT REFERENCES public.mesas(id_mesa) ON DELETE SET NULL,
  reserva_cliente TEXT DEFAULT NULL,
  reserva_hora TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mesas_estado ON public.mesas (estado);
CREATE INDEX IF NOT EXISTS idx_mesas_parent_id ON public.mesas (parent_id);

-- Función y Trigger para mantener actualizados comensales y updated_at
CREATE OR REPLACE FUNCTION public.trg_sync_mesas_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.comensales IS NOT NULL AND NEW.comensales_actuales IS NULL THEN
    NEW.comensales_actuales := NEW.comensales;
  ELSIF NEW.comensales_actuales IS NOT NULL AND NEW.comensales IS NULL THEN
    NEW.comensales := NEW.comensales_actuales;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mesas_sync ON public.mesas;
CREATE TRIGGER trg_mesas_sync
BEFORE INSERT OR UPDATE ON public.mesas
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_mesas_fields();

ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.mesas TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Permitir todo en mesas" ON public.mesas;
CREATE POLICY "Permitir todo en mesas"
  ON public.mesas FOR ALL TO public USING (true) WITH CHECK (true);

-- Semilla de Mesas (14 mesas con distribución de salón)
INSERT INTO public.mesas (
  id_mesa, numero_mesa, estado, capacidad, zona, sector,
  x, y, width, height, rx, forma, mesas_unidas, updated_at
) VALUES
  (1, 'Mesa 1', 'libre', 2, 'salon', 'salon', 40, 40, 70, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (2, 'Mesa 2', 'libre', 2, 'salon', 'salon', 130, 40, 70, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (3, 'Mesa 3', 'libre', 2, 'salon', 'salon', 220, 40, 70, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (4, 'Mesa 4', 'libre', 4, 'salon', 'salon', 310, 40, 70, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (5, 'Mesa 5', 'libre', 4, 'salon', 'salon', 40, 150, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (6, 'Mesa 6', 'libre', 4, 'salon', 'salon', 150, 150, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (7, 'Mesa 7', 'libre', 4, 'salon', 'salon', 260, 150, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (8, 'Mesa 8', 'libre', 4, 'salon', 'salon', 40, 260, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (9, 'Mesa 9', 'libre', 4, 'salon', 'salon', 150, 260, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (10, 'Mesa 10', 'libre', 4, 'salon', 'salon', 260, 260, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (11, 'Mesa 11', 'libre', 6, 'salon', 'salon', 380, 150, 110, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (12, 'Mesa 12', 'libre', 6, 'salon', 'salon', 380, 260, 110, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (13, 'Mesa 13', 'libre', 4, 'salon', 'salon', 40, 370, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (14, 'Mesa 14', 'libre', 6, 'salon', 'salon', 150, 370, 110, 70, 8, 'rectangular', '[]'::jsonb, NOW())
ON CONFLICT (id_mesa) DO UPDATE SET
  numero_mesa = EXCLUDED.numero_mesa,
  capacidad = EXCLUDED.capacidad,
  zona = EXCLUDED.zona,
  sector = EXCLUDED.sector,
  x = EXCLUDED.x,
  y = EXCLUDED.y,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  rx = EXCLUDED.rx,
  forma = EXCLUDED.forma,
  mesas_unidas = EXCLUDED.mesas_unidas,
  updated_at = NOW();

-- =============================================================================
-- 4. TABLA 'usuarios'
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id_usuario INT PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    rol TEXT NOT NULL CHECK (rol IN ('mozo', 'cocina', 'administrador', 'cajero', 'superadmin')),
    activo BOOLEAN NOT NULL DEFAULT true,
    auth_user_id UUID UNIQUE,
    mail TEXT,
    pin TEXT
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.usuarios TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Permitir todo en usuarios" ON public.usuarios;
CREATE POLICY "Permitir todo en usuarios"
  ON public.usuarios FOR ALL TO public USING (true) WITH CHECK (true);

-- Semilla de Usuarios del Sistema (Incluye admin con PIN 1998)
INSERT INTO public.usuarios (id_usuario, nombre, apellido, username, password, rol, activo) VALUES
  (1, 'Super Admin', '', 'super@admi.com', 'superadmi2026/', 'superadmin', true),
  (2, 'Administrador', '', 'admi@patron.com', 'Elpatron2026/', 'administrador', true),
  (3, 'Mozo', '', 'mozo@patron.com', 'Elpatronmozo2026/', 'mozo', true),
  (4, 'Enzo', 'Fernández', 'enzo', '1234', 'mozo', true),
  (5, 'Micaela', 'Gómez', 'micaela', '1234', 'mozo', true),
  (6, 'Damián', 'Martínez', 'damian', '1234', 'cocina', true),
  (7, 'Sofía', 'Alegre', 'sofia', '1234', 'administrador', true),
  (8, 'Nuevo', 'Usuario', 'nuevo', 'clave', 'mozo', true),
  (9, 'Admin', '', 'admin', '1998', 'superadmin', true)
ON CONFLICT (id_usuario) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  apellido = EXCLUDED.apellido,
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo;

-- =============================================================================
-- 5. TABLA 'arca_config'
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.arca_config (
  id TEXT PRIMARY KEY CHECK (id = 'primary'),
  cuit TEXT NOT NULL CHECK (cuit ~ '^[0-9]{11}$'),
  punto_venta INTEGER NOT NULL CHECK (punto_venta BETWEEN 1 AND 99999),
  environment TEXT NOT NULL CHECK (environment IN ('homologacion', 'produccion')),
  tax_profile TEXT NOT NULL DEFAULT 'monotributo' CHECK (tax_profile = 'monotributo'),
  secret_ciphertext TEXT NOT NULL,
  secret_iv TEXT NOT NULL,
  secret_tag TEXT NOT NULL,
  certificate_subject TEXT,
  certificate_serial TEXT,
  certificate_valid_from TIMESTAMPTZ,
  certificate_valid_to TIMESTAMPTZ,
  legal_name TEXT,
  trade_name TEXT,
  commercial_address TEXT,
  gross_income_number TEXT,
  activity_start_date TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.arca_config ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.arca_config TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Permitir todo en arca_config" ON public.arca_config;
CREATE POLICY "Permitir todo en arca_config"
  ON public.arca_config FOR ALL TO public USING (true) WITH CHECK (true);

-- Semilla de Configuración Oficial ARCA (BELLA ORIANA / El Patrón - CUIT 27426946136)
INSERT INTO public.arca_config (
  id, cuit, punto_venta, environment, tax_profile,
  secret_ciphertext, secret_iv, secret_tag,
  certificate_subject, certificate_serial, certificate_valid_from, certificate_valid_to,
  legal_name, trade_name, commercial_address, gross_income_number, activity_start_date, updated_at
) VALUES (
  'primary',
  '27426946136',
  2,
  'produccion',
  'monotributo',
  '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',
  '7imeeyyeFMeUdjgs',
  'ZVqtHooqOVMfmmV3oR7iww==',
  'CN=restaurante-potro-prod-v2, serialNumber=CUIT 27426946136',
  '7868692834118efb',
  '2026-07-14T17:31:19+00:00',
  '2028-07-13T17:31:19+00:00',
  'BELLA ORIANA',
  'El Patron',
  'FOTHERINGHAM 33, CP 5800, RIO CUARTO, CORDOBA',
  '289734805',
  '2026-06-01',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  cuit = EXCLUDED.cuit,
  punto_venta = EXCLUDED.punto_venta,
  environment = EXCLUDED.environment,
  tax_profile = EXCLUDED.tax_profile,
  secret_ciphertext = EXCLUDED.secret_ciphertext,
  secret_iv = EXCLUDED.secret_iv,
  secret_tag = EXCLUDED.secret_tag,
  certificate_subject = EXCLUDED.certificate_subject,
  certificate_serial = EXCLUDED.certificate_serial,
  certificate_valid_from = EXCLUDED.certificate_valid_from,
  certificate_valid_to = EXCLUDED.certificate_valid_to,
  legal_name = EXCLUDED.legal_name,
  trade_name = EXCLUDED.trade_name,
  commercial_address = EXCLUDED.commercial_address,
  gross_income_number = EXCLUDED.gross_income_number,
  activity_start_date = EXCLUDED.activity_start_date,
  updated_at = NOW();

-- =============================================================================
-- 6. TABLA 'facturas'
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.facturas (
  id_factura TEXT PRIMARY KEY,
  id_pedido INT,
  numero_factura TEXT NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  tipo_comprobante TEXT NOT NULL DEFAULT 'Ticket Interno',
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
  cuit_cliente TEXT,
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  afip_cae TEXT,
  afip_vto TEXT,
  afip_qr TEXT,
  afip_resultado TEXT,
  fiscal_status TEXT NOT NULL DEFAULT 'draft' CHECK (fiscal_status IN ('draft', 'authorizing', 'authorized', 'observed', 'rejected', 'uncertain', 'credited')),
  arca_emission_id UUID,
  afip_cbte_tipo INTEGER,
  afip_pto_vta INTEGER,
  afip_cbte_nro INTEGER,
  afip_observaciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  arca_emisor JSONB,
  condicion_iva_receptor INTEGER,
  cliente_nombre TEXT,
  cliente_domicilio TEXT,
  documento_tipo_receptor INTEGER CHECK (documento_tipo_receptor IS NULL OR documento_tipo_receptor IN (80, 96, 99)),
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  moneda TEXT NOT NULL DEFAULT 'PES' CHECK (moneda = 'PES'),
  observaciones TEXT,
  comprobante_asociado TEXT,
  credited_by_factura_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_facturas_pedido ON public.facturas (id_pedido);
CREATE INDEX IF NOT EXISTS idx_facturas_arca_numero ON public.facturas (afip_pto_vta, afip_cbte_tipo, afip_cbte_nro);
CREATE UNIQUE INDEX IF NOT EXISTS uq_facturas_arca_numero_autorizado
  ON public.facturas (afip_pto_vta, afip_cbte_tipo, afip_cbte_nro)
  WHERE afip_cae IS NOT NULL;

-- Trigger de Inmutabilidad para Facturas Fiscales Autorizadas
CREATE OR REPLACE FUNCTION public.protect_authorized_fiscal_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.afip_cae IS NOT NULL THEN
      RAISE EXCEPTION 'Los comprobantes ARCA autorizados no se eliminan; emita una Nota de Credito C';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.afip_cae IS NOT NULL THEN
    IF NEW.afip_cae IS DISTINCT FROM OLD.afip_cae
       OR NEW.afip_vto IS DISTINCT FROM OLD.afip_vto
       OR NEW.afip_qr IS DISTINCT FROM OLD.afip_qr
       OR NEW.afip_resultado IS DISTINCT FROM OLD.afip_resultado
       OR NEW.afip_pto_vta IS DISTINCT FROM OLD.afip_pto_vta
       OR NEW.afip_cbte_tipo IS DISTINCT FROM OLD.afip_cbte_tipo
       OR NEW.afip_cbte_nro IS DISTINCT FROM OLD.afip_cbte_nro
       OR NEW.total IS DISTINCT FROM OLD.total
       OR NEW.metodo_pago IS DISTINCT FROM OLD.metodo_pago
       OR NEW.cuit_cliente IS DISTINCT FROM OLD.cuit_cliente
       OR NEW.cliente_nombre IS DISTINCT FROM OLD.cliente_nombre
       OR NEW.cliente_domicilio IS DISTINCT FROM OLD.cliente_domicilio
       OR NEW.documento_tipo_receptor IS DISTINCT FROM OLD.documento_tipo_receptor
       OR NEW.condicion_iva_receptor IS DISTINCT FROM OLD.condicion_iva_receptor
       OR NEW.items_json IS DISTINCT FROM OLD.items_json
       OR NEW.moneda IS DISTINCT FROM OLD.moneda
       OR NEW.fecha_emision IS DISTINCT FROM OLD.fecha_emision
       OR NEW.tipo_comprobante IS DISTINCT FROM OLD.tipo_comprobante
       OR NEW.arca_emisor IS DISTINCT FROM OLD.arca_emisor THEN
      RAISE EXCEPTION 'Los datos fiscales autorizados son inmutables';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_authorized_fiscal_invoice ON public.facturas;
CREATE TRIGGER trg_protect_authorized_fiscal_invoice
BEFORE UPDATE OR DELETE ON public.facturas
FOR EACH ROW EXECUTE FUNCTION public.protect_authorized_fiscal_invoice();

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.facturas TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Permitir todo en facturas" ON public.facturas;
CREATE POLICY "Permitir todo en facturas"
  ON public.facturas FOR ALL TO public USING (true) WITH CHECK (true);

-- =============================================================================
-- 7. TABLAS Y FUNCIONES AUXILIARES DE BACKEND FISCAL Y AUTENTICACIÓN
-- =============================================================================

-- Tablas de secuencia y auditoría ARCA
CREATE TABLE IF NOT EXISTS public.arca_sequence_leases (
  lock_key TEXT PRIMARY KEY,
  lease_owner UUID NOT NULL,
  leased_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.arca_sequence_leases ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.arca_sequence_leases TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Permitir leases a service_role y public" ON public.arca_sequence_leases;
CREATE POLICY "Permitir leases a service_role y public" ON public.arca_sequence_leases FOR ALL TO public USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_arca_sequence_lease(
  p_lock_key TEXT,
  p_owner UUID,
  p_seconds INTEGER DEFAULT 45
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  INSERT INTO public.arca_sequence_leases (lock_key, lease_owner, leased_until, updated_at)
  VALUES (p_lock_key, p_owner, NOW() + make_interval(secs => GREATEST(10, LEAST(p_seconds, 90))), NOW())
  ON CONFLICT (lock_key) DO UPDATE
    SET lease_owner = EXCLUDED.lease_owner,
        leased_until = EXCLUDED.leased_until,
        updated_at = NOW()
    WHERE public.arca_sequence_leases.leased_until < NOW()
       OR public.arca_sequence_leases.lease_owner = EXCLUDED.lease_owner;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_arca_sequence_lease(
  p_lock_key TEXT,
  p_owner UUID
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.arca_sequence_leases
  WHERE lock_key = p_lock_key AND lease_owner = p_owner;
$$;

GRANT EXECUTE ON FUNCTION public.claim_arca_sequence_lease(TEXT, UUID, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_arca_sequence_lease(TEXT, UUID) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.arca_emisiones (
  id UUID PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 8 AND 120),
  request_hash TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  created_by UUID NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('homologacion', 'produccion')),
  cuit TEXT NOT NULL CHECK (cuit ~ '^[0-9]{11}$'),
  punto_venta INTEGER NOT NULL CHECK (punto_venta BETWEEN 1 AND 99999),
  cbte_tipo INTEGER NOT NULL CHECK (cbte_tipo IN (11, 13)),
  cbte_nro INTEGER,
  cbte_fecha TEXT CHECK (cbte_fecha IS NULL OR cbte_fecha ~ '^[0-9]{8}$'),
  status TEXT NOT NULL CHECK (status IN ('authorizing', 'authorized', 'observed', 'rejected', 'uncertain')),
  resultado TEXT CHECK (resultado IN ('A', 'O', 'R')),
  cae TEXT,
  cae_vencimiento TEXT,
  qr_payload JSONB,
  observaciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  related_emission_id UUID REFERENCES public.arca_emisiones(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arca_emisiones_sequence
  ON public.arca_emisiones (environment, cuit, punto_venta, cbte_tipo, cbte_nro);
CREATE INDEX IF NOT EXISTS idx_arca_emisiones_user_created
  ON public.arca_emisiones (created_by, created_at DESC);

ALTER TABLE public.arca_emisiones ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.arca_emisiones TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Permitir todo en arca_emisiones" ON public.arca_emisiones;
CREATE POLICY "Permitir todo en arca_emisiones" ON public.arca_emisiones FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabla y funciones para autenticación por username
CREATE TABLE IF NOT EXISTS public.app_login_credentials (
  profile_id INTEGER PRIMARY KEY REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE CHECK (username = LOWER(username) AND username ~ '^[a-z0-9._-]{3,40}$'),
  auth_user_id UUID NOT NULL UNIQUE,
  auth_email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 20),
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_login_credentials ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.app_login_credentials TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Permitir credenciales login" ON public.app_login_credentials;
CREATE POLICY "Permitir credenciales login" ON public.app_login_credentials FOR ALL TO public USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.provision_app_username_login(
  p_profile_id INTEGER,
  p_username TEXT,
  p_password TEXT,
  p_auth_user_id UUID,
  p_auth_email TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_password IS NULL OR length(p_password) < 4 OR length(p_password) > 128 THEN
    RAISE EXCEPTION 'Invalid credential length';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id_usuario = p_profile_id) THEN
    RAISE EXCEPTION 'Profile does not exist';
  END IF;

  INSERT INTO public.app_login_credentials (
    profile_id, username, auth_user_id, auth_email, password_hash,
    failed_attempts, locked_until, updated_at
  ) VALUES (
    p_profile_id,
    LOWER(TRIM(p_username)),
    p_auth_user_id,
    LOWER(TRIM(p_auth_email)),
    crypt(p_password, gen_salt('bf', 12)),
    0,
    NULL,
    NOW()
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    username = EXCLUDED.username,
    auth_user_id = EXCLUDED.auth_user_id,
    auth_email = EXCLUDED.auth_email,
    password_hash = EXCLUDED.password_hash,
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW();

  UPDATE public.usuarios
  SET auth_user_id = p_auth_user_id,
      mail = LOWER(TRIM(p_auth_email)),
      username = LOWER(TRIM(p_username)),
      activo = TRUE
  WHERE id_usuario = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_app_username_login(
  p_username TEXT,
  p_password TEXT
) RETURNS TABLE (auth_user_id UUID, auth_email TEXT, profile_id INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  credential public.app_login_credentials%ROWTYPE;
  next_failed_attempts INTEGER;
BEGIN
  SELECT c.* INTO credential
  FROM public.app_login_credentials c
  WHERE c.username = LOWER(TRIM(p_username))
  FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM pg_sleep(0.35);
    RETURN;
  END IF;

  IF credential.locked_until IS NOT NULL AND credential.locked_until > NOW() THEN
    PERFORM pg_sleep(0.35);
    RETURN;
  END IF;

  IF credential.password_hash = crypt(p_password, credential.password_hash) THEN
    UPDATE public.app_login_credentials c
    SET failed_attempts = 0,
        locked_until = NULL,
        last_attempt_at = NOW(),
        updated_at = NOW()
    WHERE c.profile_id = credential.profile_id;

    RETURN QUERY
    SELECT credential.auth_user_id, credential.auth_email, credential.profile_id;
    RETURN;
  END IF;

  next_failed_attempts := credential.failed_attempts + 1;
  UPDATE public.app_login_credentials c
  SET failed_attempts = next_failed_attempts,
      locked_until = CASE
        WHEN next_failed_attempts >= 10 THEN NOW() + INTERVAL '1 hour'
        WHEN next_failed_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
        ELSE NULL
      END,
      last_attempt_at = NOW(),
      updated_at = NOW()
  WHERE c.profile_id = credential.profile_id;

  PERFORM pg_sleep(0.35);
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_app_username_login(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.provision_app_username_login(INTEGER, TEXT, TEXT, UUID, TEXT) TO anon, authenticated, service_role;

-- =============================================================================
-- 8. HABILITAR SUPABASE REALTIME EN TODAS LAS TABLAS DEL RESTAURANTE
-- =============================================================================
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY['mesas', 'productos_menu', 'categorias', 'arca_config', 'facturas'];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
