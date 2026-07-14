-- Endurecimiento del circuito fiscal ARCA.
-- Las tablas de esta migracion son exclusivamente de backend (service_role).

ALTER TABLE public.arca_config
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS commercial_address TEXT,
  ADD COLUMN IF NOT EXISTS gross_income_number TEXT,
  ADD COLUMN IF NOT EXISTS activity_start_date DATE;

ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS fiscal_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (fiscal_status IN ('draft', 'authorizing', 'authorized', 'observed', 'rejected', 'uncertain', 'credited')),
  ADD COLUMN IF NOT EXISTS arca_emission_id UUID,
  ADD COLUMN IF NOT EXISTS afip_cbte_tipo INTEGER,
  ADD COLUMN IF NOT EXISTS afip_pto_vta INTEGER,
  ADD COLUMN IF NOT EXISTS afip_cbte_nro INTEGER,
  ADD COLUMN IF NOT EXISTS afip_observaciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS arca_emisor JSONB,
  ADD COLUMN IF NOT EXISTS condicion_iva_receptor INTEGER;

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
REVOKE ALL ON TABLE public.arca_emisiones FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.arca_sequence_leases (
  lock_key TEXT PRIMARY KEY,
  lease_owner UUID NOT NULL,
  leased_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.arca_sequence_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arca_sequence_leases FROM anon, authenticated;

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

REVOKE ALL ON FUNCTION public.claim_arca_sequence_lease(TEXT, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_arca_sequence_lease(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_arca_sequence_lease(TEXT, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_arca_sequence_lease(TEXT, UUID) TO service_role;

COMMENT ON TABLE public.arca_emisiones IS
  'Auditoria fiscal inmutable para idempotencia, correlatividad y reconciliacion ARCA.';
