-- Configuracion fiscal administrada desde Sistema.
-- El certificado y la clave privada llegan ya cifrados con AES-256-GCM desde
-- el backend. La clave maestra permanece solamente en Vercel.

ALTER TABLE IF EXISTS public.usuarios
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id
  ON public.usuarios (auth_user_id);

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
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.arca_config ENABLE ROW LEVEL SECURITY;

-- No se crea ninguna politica para anon/authenticated. Solo el backend con
-- service_role puede leer o modificar estas filas.
REVOKE ALL ON TABLE public.arca_config FROM anon, authenticated;

COMMENT ON TABLE public.arca_config IS
  'Configuracion ARCA cifrada; acceso exclusivo del backend service_role.';
