-- Conserva la representacion exacta entregada al cliente y la relacion entre
-- una Factura C y su eventual Nota de Credito C. Es idempotente.

ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS cliente_nombre TEXT,
  ADD COLUMN IF NOT EXISTS cliente_domicilio TEXT,
  ADD COLUMN IF NOT EXISTS documento_tipo_receptor INTEGER,
  ADD COLUMN IF NOT EXISTS items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'PES',
  ADD COLUMN IF NOT EXISTS observaciones TEXT,
  ADD COLUMN IF NOT EXISTS comprobante_asociado TEXT,
  ADD COLUMN IF NOT EXISTS credited_by_factura_id TEXT;

ALTER TABLE public.facturas
  DROP CONSTRAINT IF EXISTS facturas_moneda_check;
ALTER TABLE public.facturas
  ADD CONSTRAINT facturas_moneda_check CHECK (moneda = 'PES');

ALTER TABLE public.facturas
  DROP CONSTRAINT IF EXISTS facturas_documento_tipo_receptor_check;
ALTER TABLE public.facturas
  ADD CONSTRAINT facturas_documento_tipo_receptor_check
    CHECK (documento_tipo_receptor IS NULL OR documento_tipo_receptor IN (80, 96, 99));

CREATE INDEX IF NOT EXISTS idx_facturas_arca_numero
  ON public.facturas (afip_pto_vta, afip_cbte_tipo, afip_cbte_nro);

CREATE UNIQUE INDEX IF NOT EXISTS uq_facturas_arca_numero_autorizado
  ON public.facturas (afip_pto_vta, afip_cbte_tipo, afip_cbte_nro)
  WHERE afip_cae IS NOT NULL;

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

COMMENT ON COLUMN public.facturas.items_json IS
  'Detalle comercial exacto de la representacion grafica entregada al receptor.';
COMMENT ON COLUMN public.facturas.credited_by_factura_id IS
  'Identificador local de la Nota de Credito C que revierte el comprobante.';

NOTIFY pgrst, 'reload schema';
