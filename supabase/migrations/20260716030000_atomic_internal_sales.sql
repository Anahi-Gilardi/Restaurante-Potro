-- Persiste el ticket interno y su desglose de pagos dentro de una sola
-- transacción PostgreSQL. Si cualquier validación falla, no se guarda nada.

ALTER TABLE public.facturas
  DROP CONSTRAINT IF EXISTS facturas_id_pedido_fkey;

ALTER TABLE public.facturas
  ALTER COLUMN id_pedido TYPE BIGINT USING id_pedido::BIGINT;

-- Algunas instalaciones historicas no recibieron la migracion AFIP inicial.
-- Estas columnas son aditivas y permiten que el historial fiscal se persista
-- sin depender del orden en que se hayan aplicado migraciones anteriores.
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS afip_cae TEXT,
  ADD COLUMN IF NOT EXISTS afip_vto TEXT,
  ADD COLUMN IF NOT EXISTS afip_qr TEXT,
  ADD COLUMN IF NOT EXISTS afip_resultado TEXT;

ALTER TABLE public.facturas
  ADD CONSTRAINT facturas_id_pedido_fkey FOREIGN KEY (id_pedido)
    REFERENCES public.pedidos_cabecera(id_pedido) ON UPDATE CASCADE ON DELETE SET NULL
    NOT VALID;

CREATE OR REPLACE FUNCTION public.record_internal_sale(
  p_factura JSONB,
  p_pagos JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_factura_id TEXT := trim(COALESCE(p_factura->>'id_factura', ''));
  v_numero TEXT := trim(COALESCE(p_factura->>'numero_factura', ''));
  v_total NUMERIC;
  v_payment_count INTEGER;
  v_unique_payment_count INTEGER;
  v_payment_sum NUMERIC;
  v_existing_total NUMERIC;
  v_existing_number TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesion autenticada.' USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_total := (p_factura->>'total')::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'El total del comprobante es invalido.' USING ERRCODE = '22023';
  END;

  IF v_factura_id = '' OR v_numero = '' OR v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'El comprobante interno es invalido.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_pagos) IS DISTINCT FROM 'array' OR jsonb_array_length(p_pagos) = 0 THEN
    RAISE EXCEPTION 'El comprobante necesita al menos un pago.' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*),
    count(DISTINCT payment->>'id_pago'),
    COALESCE(sum((payment->>'monto')::NUMERIC), 0)
  INTO v_payment_count, v_unique_payment_count, v_payment_sum
  FROM jsonb_array_elements(p_pagos) AS payment
  WHERE trim(COALESCE(payment->>'id_pago', '')) <> ''
    AND trim(COALESCE(payment->>'metodo', '')) <> ''
    AND payment->>'id_factura' = v_factura_id
    AND (payment->>'monto')::NUMERIC > 0;

  IF v_payment_count <> jsonb_array_length(p_pagos)
     OR v_unique_payment_count <> v_payment_count THEN
    RAISE EXCEPTION 'El desglose contiene pagos invalidos o repetidos.' USING ERRCODE = '22023';
  END IF;
  IF abs(round(v_payment_sum, 2) - round(v_total, 2)) > 0.01 THEN
    RAISE EXCEPTION 'La suma de pagos no coincide con el total.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.facturas (
    id_factura,
    id_pedido,
    numero_factura,
    total,
    tipo_comprobante,
    metodo_pago,
    cuit_cliente,
    fecha_emision
  ) VALUES (
    v_factura_id,
    NULLIF(p_factura->>'id_pedido', '')::BIGINT,
    v_numero,
    v_total,
    COALESCE(NULLIF(p_factura->>'tipo_comprobante', ''), 'Ticket Consumo'),
    COALESCE(NULLIF(p_factura->>'metodo_pago', ''), 'Efectivo'),
    NULLIF(p_factura->>'cuit_cliente', ''),
    COALESCE(NULLIF(p_factura->>'fecha_emision', '')::TIMESTAMPTZ, NOW())
  )
  ON CONFLICT (id_factura) DO NOTHING;

  SELECT total, numero_factura
  INTO v_existing_total, v_existing_number
  FROM public.facturas
  WHERE id_factura = v_factura_id
  FOR UPDATE;

  IF v_existing_total IS NULL
     OR round(v_existing_total, 2) <> round(v_total, 2)
     OR v_existing_number <> v_numero THEN
    RAISE EXCEPTION 'El identificador del comprobante ya existe con otros datos.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.pagos (id_pago, id_factura, monto, metodo, fecha)
  SELECT
    payment->>'id_pago',
    v_factura_id,
    (payment->>'monto')::NUMERIC,
    payment->>'metodo',
    COALESCE(NULLIF(payment->>'fecha', '')::TIMESTAMPTZ, NOW())
  FROM jsonb_array_elements(p_pagos) AS payment
  ON CONFLICT (id_pago) DO NOTHING;

  SELECT COALESCE(sum(monto), 0)
  INTO v_payment_sum
  FROM public.pagos
  WHERE id_factura = v_factura_id;

  IF abs(round(v_payment_sum, 2) - round(v_total, 2)) > 0.01 THEN
    RAISE EXCEPTION 'El comprobante no quedo conciliado con sus pagos.' USING ERRCODE = '23514';
  END IF;

  RETURN jsonb_build_object(
    'id_factura', v_factura_id,
    'numero_factura', v_numero,
    'total', v_total,
    'payment_count', v_payment_count,
    'balanced', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_internal_sale(JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_internal_sale(JSONB, JSONB) TO authenticated;

COMMENT ON FUNCTION public.record_internal_sale(JSONB, JSONB) IS
  'Alta atomica e idempotente de ticket interno y pagos; rechaza cobros desbalanceados.';
