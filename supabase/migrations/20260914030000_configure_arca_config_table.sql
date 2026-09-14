-- =============================================================================
-- CONFIGURACIÓN Y CONEXIÓN COMPLETA DE 'arca_config' EN SUPABASE
-- Sistema Gestor Gastronómico - El Patrón / Bella Oriana
-- CUIT: 27426946136 | Punto de Venta: 2 (Producción Monotributo)
-- =============================================================================

-- 1. CREACIÓN DE LA TABLA 'arca_config'
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

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.arca_config ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.arca_config ADD COLUMN IF NOT EXISTS trade_name TEXT;
ALTER TABLE public.arca_config ADD COLUMN IF NOT EXISTS commercial_address TEXT;
ALTER TABLE public.arca_config ADD COLUMN IF NOT EXISTS gross_income_number TEXT;
ALTER TABLE public.arca_config ADD COLUMN IF NOT EXISTS activity_start_date TEXT;
ALTER TABLE public.arca_config ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.arca_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. OTORGAR PERMISOS A LA APLICACIÓN WEB (anon, authenticated, service_role)
GRANT ALL ON TABLE public.arca_config TO anon, authenticated, service_role;

-- 3. POLÍTICA DE SEGURIDAD ROW LEVEL SECURITY (RLS)
ALTER TABLE public.arca_config ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas restrictivas previas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'arca_config'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.arca_config', pol.policyname);
  END LOOP;
END $$;

-- Permitir acceso completo a la aplicación
CREATE POLICY "Permitir todo en arca_config"
  ON public.arca_config
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 4. HABILITAR SUPABASE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'arca_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arca_config;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 5. INSERTAR / ACTUALIZAR DATOS FISCALES OFICIALES DE PRODUCCIÓN
INSERT INTO public.arca_config (
  id,
  cuit,
  punto_venta,
  environment,
  tax_profile,
  secret_ciphertext,
  secret_iv,
  secret_tag,
  certificate_subject,
  certificate_serial,
  certificate_valid_from,
  certificate_valid_to,
  legal_name,
  trade_name,
  commercial_address,
  gross_income_number,
  activity_start_date,
  updated_at
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
  '2026-07-14 17:31:19+00',
  '2028-07-13 17:31:19+00',
  'BELLA ORIANA',
  'El Patron',
  'FOTHERINGHAM 33, CP 5800, RIO CUARTO, CORDOBA',
  '289734805',
  '2026-06-01',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
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

-- 6. HABILITAR PERMISOS EN 'arca_emisiones' (para registro de comprobantes fiscales)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'arca_emisiones') THEN
    GRANT ALL ON TABLE public.arca_emisiones TO anon, authenticated, service_role;
    ALTER TABLE public.arca_emisiones ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir todo en arca_emisiones" ON public.arca_emisiones;
    CREATE POLICY "Permitir todo en arca_emisiones" ON public.arca_emisiones FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;
