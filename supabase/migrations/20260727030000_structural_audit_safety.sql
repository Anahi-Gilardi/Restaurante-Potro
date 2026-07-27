BEGIN;

-- Protect table allocation against concurrent reservation operators.
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS telefono TEXT,
  ADD COLUMN IF NOT EXISTS nombre_mesa TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS observaciones TEXT,
  ADD COLUMN IF NOT EXISTS lista_espera BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prioridad_espera BIGINT,
  ADD COLUMN IF NOT EXISTS entrada_lista_espera TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.prevent_reservation_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMP;
BEGIN
  IF NEW.id_mesa IS NULL
     OR COALESCE(NEW.lista_espera, false)
     OR NEW.estado IN ('cancelada', 'completada') THEN
    RETURN NEW;
  END IF;

  IF NEW.fecha IS NULL
     OR NEW.hora IS NULL
     OR substring(NEW.hora FROM '([0-2]?[0-9]:[0-5][0-9])') IS NULL THEN
    RAISE EXCEPTION 'La fecha y hora de la reserva no son validas.'
      USING ERRCODE = '22023';
  END IF;

  v_start := NEW.fecha::TIMESTAMP
    + substring(NEW.hora FROM '([0-2]?[0-9]:[0-5][0-9])')::TIME;

  PERFORM pg_advisory_xact_lock(NEW.id_mesa, hashtext(NEW.fecha::TEXT));

  IF EXISTS (
    SELECT 1
    FROM public.reservas existing
    WHERE existing.id_mesa = NEW.id_mesa
      AND existing.id_reserva <> NEW.id_reserva
      AND existing.fecha = NEW.fecha
      AND COALESCE(existing.lista_espera, false) = false
      AND existing.estado NOT IN ('cancelada', 'completada')
      AND substring(existing.hora FROM '([0-2]?[0-9]:[0-5][0-9])') IS NOT NULL
      AND (
        existing.fecha::TIMESTAMP
          + substring(existing.hora FROM '([0-2]?[0-9]:[0-5][0-9])')::TIME
      ) < v_start + INTERVAL '2 hours'
      AND (
        existing.fecha::TIMESTAMP
          + substring(existing.hora FROM '([0-2]?[0-9]:[0-5][0-9])')::TIME
          + INTERVAL '2 hours'
      ) > v_start
  ) THEN
    RAISE EXCEPTION 'RESERVA_SOLAPADA: la mesa ya tiene una reserva dentro de esa franja.'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservas_prevent_overlap ON public.reservas;
CREATE TRIGGER reservas_prevent_overlap
BEFORE INSERT OR UPDATE OF id_mesa, fecha, hora, estado, lista_espera
ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.prevent_reservation_overlap();

-- Persist the authenticated KDS actor and structured transition metadata.
ALTER TABLE public.auditoria_eventos
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS terminal TEXT,
  ADD COLUMN IF NOT EXISTS entidad_id TEXT,
  ADD COLUMN IF NOT EXISTS estado_anterior TEXT,
  ADD COLUMN IF NOT EXISTS estado_nuevo TEXT,
  ADD COLUMN IF NOT EXISTS duracion_segundos INTEGER;

ALTER TABLE public.auditoria_eventos
  DROP CONSTRAINT IF EXISTS auditoria_duracion_no_negativa;
ALTER TABLE public.auditoria_eventos
  ADD CONSTRAINT auditoria_duracion_no_negativa
  CHECK (duracion_segundos IS NULL OR duracion_segundos >= 0) NOT VALID;

-- Append-only cash ledger and database-calculated reconciliation.
CREATE TABLE IF NOT EXISTS public.caja_ledger (
  id_evento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo_evento TEXT NOT NULL,
  origen_tabla TEXT NOT NULL,
  origen_id TEXT NOT NULL,
  id_factura TEXT,
  id_cierre TEXT,
  monto NUMERIC(14, 2),
  metodo TEXT,
  datos JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by UUID DEFAULT auth.uid(),
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  hash_evento TEXT NOT NULL,
  UNIQUE (origen_tabla, origen_id, tipo_evento, hash_evento)
);

CREATE OR REPLACE FUNCTION public.append_caja_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data JSONB := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_origin_id TEXT;
  v_event_type TEXT;
  v_amount NUMERIC(14, 2);
BEGIN
  v_origin_id := COALESCE(
    v_data->>'id_factura',
    v_data->>'id_pago',
    v_data->>'id_cierre',
    v_data->>'id_movimiento'
  );
  IF v_origin_id IS NULL OR trim(v_origin_id) = '' THEN
    RAISE EXCEPTION 'No se pudo identificar el movimiento contable.';
  END IF;

  v_event_type := lower(TG_TABLE_NAME || '_' || TG_OP);
  BEGIN
    v_amount := COALESCE(
      NULLIF(v_data->>'total', '')::NUMERIC,
      NULLIF(v_data->>'monto', '')::NUMERIC,
      NULLIF(v_data->>'monto_real', '')::NUMERIC,
      NULLIF(v_data->>'monto_ventas', '')::NUMERIC
    );
  EXCEPTION WHEN OTHERS THEN
    v_amount := NULL;
  END;

  INSERT INTO public.caja_ledger (
    tipo_evento,
    origen_tabla,
    origen_id,
    id_factura,
    id_cierre,
    monto,
    metodo,
    datos,
    created_by,
    hash_evento
  ) VALUES (
    v_event_type,
    TG_TABLE_NAME,
    v_origin_id,
    v_data->>'id_factura',
    v_data->>'id_cierre',
    v_amount,
    COALESCE(v_data->>'metodo', v_data->>'metodo_pago'),
    v_data,
    auth.uid(),
    md5(TG_TABLE_NAME || '|' || TG_OP || '|' || v_origin_id || '|' || v_data::TEXT)
  )
  ON CONFLICT DO NOTHING;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_caja_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'El libro de caja es inmutable; registre un evento compensatorio.'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS caja_ledger_immutable ON public.caja_ledger;
CREATE TRIGGER caja_ledger_immutable
BEFORE UPDATE OR DELETE ON public.caja_ledger
FOR EACH ROW EXECUTE FUNCTION public.reject_caja_ledger_mutation();

DROP TRIGGER IF EXISTS facturas_append_ledger ON public.facturas;
CREATE TRIGGER facturas_append_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.facturas
FOR EACH ROW EXECUTE FUNCTION public.append_caja_ledger();

DROP TRIGGER IF EXISTS pagos_append_ledger ON public.pagos;
CREATE TRIGGER pagos_append_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.append_caja_ledger();

DROP TRIGGER IF EXISTS cierres_append_ledger ON public.cierres_caja;
CREATE TRIGGER cierres_append_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.cierres_caja
FOR EACH ROW EXECUTE FUNCTION public.append_caja_ledger();

DROP TRIGGER IF EXISTS movimientos_caja_append_ledger ON public.movimientos_caja_chica;
CREATE TRIGGER movimientos_caja_append_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.movimientos_caja_chica
FOR EACH ROW EXECUTE FUNCTION public.append_caja_ledger();

INSERT INTO public.caja_ledger (
  tipo_evento, origen_tabla, origen_id, id_factura, monto, metodo, datos, hash_evento
)
SELECT
  'facturas_backfill',
  'facturas',
  f.id_factura,
  f.id_factura,
  round(f.total, 2),
  f.metodo_pago,
  to_jsonb(f),
  md5('facturas|BACKFILL|' || f.id_factura || '|' || to_jsonb(f)::TEXT)
FROM public.facturas f
ON CONFLICT DO NOTHING;

INSERT INTO public.caja_ledger (
  tipo_evento, origen_tabla, origen_id, id_factura, monto, metodo, datos, hash_evento
)
SELECT
  'pagos_backfill',
  'pagos',
  p.id_pago,
  p.id_factura,
  round(p.monto, 2),
  p.metodo,
  to_jsonb(p),
  md5('pagos|BACKFILL|' || p.id_pago || '|' || to_jsonb(p)::TEXT)
FROM public.pagos p
ON CONFLICT DO NOTHING;

CREATE OR REPLACE VIEW public.v_conciliacion_facturas
WITH (security_invoker = true)
AS
SELECT
  f.id_factura,
  f.numero_factura,
  round(f.total, 2) AS total_factura,
  round(COALESCE(sum(p.monto), 0), 2) AS total_pagos,
  round(COALESCE(sum(p.monto), 0) - f.total, 2) AS diferencia,
  count(p.id_pago) AS cantidad_pagos,
  CASE
    WHEN abs(round(COALESCE(sum(p.monto), 0) - f.total, 2)) <= 0.01
      THEN 'conciliada'
    ELSE 'requiere_revision'
  END AS estado_conciliacion
FROM public.facturas f
LEFT JOIN public.pagos p ON p.id_factura = f.id_factura
GROUP BY f.id_factura, f.numero_factura, f.total;

CREATE OR REPLACE VIEW public.v_cierres_caja_diagnostico
WITH (security_invoker = true)
AS
WITH movimientos AS (
  SELECT
    id_cierre,
    COALESCE(sum(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
    COALESCE(sum(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) AS egresos
  FROM public.movimientos_caja_chica
  GROUP BY id_cierre
)
SELECT
  c.id_cierre,
  c.fecha_apertura,
  c.fecha_cierre,
  round(c.monto_apertura, 2) AS monto_apertura,
  round(c.monto_ventas, 2) AS monto_ventas,
  round(COALESCE(m.ingresos, 0), 2) AS ingresos_manuales,
  round(COALESCE(m.egresos, 0), 2) AS egresos_manuales,
  c.monto_real,
  c.diferencia AS diferencia_guardada,
  CASE
    WHEN c.monto_real IS NULL THEN NULL
    ELSE round(
      c.monto_real
      - (c.monto_apertura + c.monto_ventas + COALESCE(m.ingresos, 0) - COALESCE(m.egresos, 0)),
      2
    )
  END AS diferencia_calculada,
  CASE
    WHEN c.fecha_cierre IS NOT NULL AND c.fecha_cierre < c.fecha_apertura
      THEN 'fecha_inconsistente'
    WHEN c.monto_apertura < 0 OR c.monto_ventas < 0 OR COALESCE(c.monto_real, 0) < 0
      THEN 'importe_invalido'
    WHEN c.monto_real IS NOT NULL
      AND abs(
        round(
          c.monto_real
          - (c.monto_apertura + c.monto_ventas + COALESCE(m.ingresos, 0) - COALESCE(m.egresos, 0)),
          2
        ) - COALESCE(c.diferencia, 0)
      ) > 0.01
      THEN 'diferencia_inconsistente'
    ELSE 'ok'
  END AS diagnostico
FROM public.cierres_caja c
LEFT JOIN movimientos m ON m.id_cierre = c.id_cierre;

ALTER TABLE public.caja_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.caja_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.caja_ledger TO authenticated;

DROP POLICY IF EXISTS caja_ledger_admin_read ON public.caja_ledger;
CREATE POLICY caja_ledger_admin_read
ON public.caja_ledger
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND u.rol IN ('superadmin', 'administrador')
  )
);

GRANT SELECT ON public.v_conciliacion_facturas TO authenticated;
GRANT SELECT ON public.v_cierres_caja_diagnostico TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
