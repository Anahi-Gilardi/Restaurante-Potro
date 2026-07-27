BEGIN;

ALTER TABLE public.pedido_detalle
  DROP CONSTRAINT IF EXISTS pedido_detalle_id_pedido_fkey;
ALTER TABLE public.facturas
  DROP CONSTRAINT IF EXISTS facturas_id_pedido_fkey;

ALTER TABLE public.pedidos_cabecera
  ALTER COLUMN id_pedido TYPE BIGINT USING id_pedido::BIGINT;
ALTER TABLE public.pedido_detalle
  ALTER COLUMN id_pedido TYPE BIGINT USING id_pedido::BIGINT;
ALTER TABLE public.movimientos_inventario
  ALTER COLUMN id_pedido TYPE BIGINT USING id_pedido::BIGINT;

-- Preserve issued invoices while repairing historical references left by
-- manually removed orders. Orphan detail rows cannot participate in an order.
UPDATE public.facturas AS f
SET id_pedido = NULL
WHERE f.id_pedido IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.pedidos_cabecera AS p
    WHERE p.id_pedido = f.id_pedido
  );

DELETE FROM public.pedido_detalle AS d
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pedidos_cabecera AS p
  WHERE p.id_pedido = d.id_pedido
);

ALTER TABLE public.pedido_detalle
  ADD CONSTRAINT pedido_detalle_id_pedido_fkey
  FOREIGN KEY (id_pedido) REFERENCES public.pedidos_cabecera(id_pedido)
  ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.facturas
  ADD CONSTRAINT facturas_id_pedido_fkey
  FOREIGN KEY (id_pedido) REFERENCES public.pedidos_cabecera(id_pedido)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.pedidos_cabecera
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS fecha_inicio_cocina TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_listo TIMESTAMPTZ;

ALTER TABLE public.pedido_detalle
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_pedidos_idempotency_key
  ON public.pedidos_cabecera (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pedido_operaciones (
  idempotency_key TEXT PRIMARY KEY,
  id_pedido BIGINT NOT NULL REFERENCES public.pedidos_cabecera(id_pedido)
    ON UPDATE CASCADE ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pedido_operaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pedido_operaciones FROM PUBLIC, anon, authenticated;

ALTER TABLE public.pedidos_cabecera
  DROP CONSTRAINT IF EXISTS chk_estado_comanda,
  DROP CONSTRAINT IF EXISTS pedidos_cabecera_estado_comanda_check;

ALTER TABLE public.pedidos_cabecera
  ADD CONSTRAINT chk_estado_comanda
  CHECK (estado_comanda IN (
    'pendiente',
    'en_cocina',
    'listo',
    'entregado',
    'entregado_cobrado',
    'cancelado'
  ));

CREATE INDEX IF NOT EXISTS idx_pedidos_mesa_activos
  ON public.pedidos_cabecera (id_mesa, fecha_hora DESC)
  WHERE estado_comanda NOT IN ('entregado_cobrado', 'cancelado');

CREATE OR REPLACE FUNCTION public.app_apply_order_stock(
  p_order_id BIGINT,
  p_reverse BOOLEAN,
  p_allow_negative BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.pedidos_cabecera%ROWTYPE;
  v_recipe RECORD;
  v_current NUMERIC;
  v_next NUMERIC;
  v_direction NUMERIC := CASE WHEN p_reverse THEN 1 ELSE -1 END;
BEGIN
  SELECT *
  INTO v_order
  FROM public.pedidos_cabecera
  WHERE id_pedido = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % inexistente.', p_order_id USING ERRCODE = 'P0002';
  END IF;

  IF p_reverse AND NOT v_order.stock_descontado THEN
    RETURN;
  END IF;
  IF NOT p_reverse AND v_order.stock_descontado THEN
    RETURN;
  END IF;

  FOR v_recipe IN
    SELECT
      r.id_insumo,
      min(i.nombre) AS nombre,
      sum(r.cantidad_a_descontar * d.cantidad)::NUMERIC AS cantidad
    FROM public.pedido_detalle d
    JOIN public.recetas_escandallo r ON r.id_producto = d.id_producto
    JOIN public.insumos i ON i.id_insumo = r.id_insumo
    WHERE d.id_pedido = p_order_id
      AND d.estado <> 'cancelado'
    GROUP BY r.id_insumo
    ORDER BY r.id_insumo
  LOOP
    SELECT stock_actual
    INTO v_current
    FROM public.insumos
    WHERE id_insumo = v_recipe.id_insumo
    FOR UPDATE;

    IF NOT p_reverse AND NOT p_allow_negative AND v_current < v_recipe.cantidad THEN
      RAISE EXCEPTION
        'Stock insuficiente para %: disponible %, requerido %.',
        v_recipe.nombre,
        v_current,
        v_recipe.cantidad
        USING ERRCODE = '23514';
    END IF;

    v_next := v_current + (v_direction * v_recipe.cantidad);
    UPDATE public.insumos
    SET stock_actual = v_next
    WHERE id_insumo = v_recipe.id_insumo;

    INSERT INTO public.movimientos_inventario (
      id_movimiento,
      id_insumo,
      tipo_movimiento,
      cantidad,
      stock_anterior,
      stock_nuevo,
      id_pedido,
      fecha,
      motivo,
      observacion
    ) VALUES (
      concat(
        CASE WHEN p_reverse THEN 'rev_' ELSE 'cmd_' END,
        p_order_id,
        '_',
        v_recipe.id_insumo,
        '_',
        txid_current()
      ),
      v_recipe.id_insumo,
      CASE WHEN p_reverse THEN 'entrada' ELSE 'salida_comanda' END,
      v_recipe.cantidad,
      v_current,
      v_next,
      p_order_id,
      now(),
      CASE WHEN p_reverse THEN 'cancelacion_pedido' ELSE 'pedido_en_cocina' END,
      CASE WHEN p_reverse
        THEN 'Reintegro atomico por cancelacion'
        ELSE 'Descuento atomico por receta'
      END
    )
    ON CONFLICT (id_movimiento) DO NOTHING;
  END LOOP;

  UPDATE public.pedidos_cabecera
  SET
    stock_descontado = NOT p_reverse,
    fecha_descuento_stock = CASE WHEN p_reverse THEN NULL ELSE now() END
  WHERE id_pedido = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.app_apply_order_stock(BIGINT, BOOLEAN, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_order_transaction(
  p_order JSONB,
  p_comensales INTEGER DEFAULT 2,
  p_allow_negative BOOLEAN DEFAULT false
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id BIGINT;
  v_requested_id BIGINT;
  v_table_id INTEGER;
  v_state TEXT;
  v_key TEXT;
  v_existing_state TEXT;
BEGIN
  IF NOT public.app_has_any_role(ARRAY['superadmin', 'administrador', 'mozo']) THEN
    RAISE EXCEPTION 'No autorizado para registrar comandas.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_order->'items') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_order->'items') = 0 THEN
    RAISE EXCEPTION 'El pedido debe contener al menos un producto.' USING ERRCODE = '22023';
  END IF;

  v_requested_id := NULLIF(p_order->>'id_pedido', '')::BIGINT;
  v_table_id := NULLIF(p_order->>'id_mesa', '')::INTEGER;
  v_state := COALESCE(NULLIF(p_order->>'estado_comanda', ''), 'pendiente');
  v_key := NULLIF(p_order->>'idempotency_key', '');

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'La mesa es obligatoria.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(v_table_id::BIGINT);

  IF v_key IS NOT NULL THEN
    SELECT operation.id_pedido
    INTO v_order_id
    FROM public.pedido_operaciones operation
    WHERE operation.idempotency_key = v_key
    LIMIT 1;
    IF FOUND THEN
      RETURN v_order_id;
    END IF;
  END IF;

  SELECT id_pedido, estado_comanda
  INTO v_order_id, v_existing_state
  FROM public.pedidos_cabecera
  WHERE id_pedido = v_requested_id
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT id_pedido, estado_comanda
    INTO v_order_id, v_existing_state
    FROM public.pedidos_cabecera
    WHERE id_mesa = v_table_id
      AND estado_comanda = 'pendiente'
    ORDER BY fecha_hora DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_order_id IS NULL THEN
    IF v_requested_id IS NULL THEN
      RAISE EXCEPTION 'El identificador del pedido es obligatorio.' USING ERRCODE = '22023';
    END IF;
    v_order_id := v_requested_id;
    INSERT INTO public.pedidos_cabecera (
      id_pedido,
      idempotency_key,
      id_mesa,
      numero_mesa,
      mozo,
      estado_comanda,
      observaciones,
      fecha_hora,
      minutos_transcurridos,
      origen,
      tiempo_despacho_minutos,
      segundos_en_listo,
      stock_descontado,
      fecha_descuento_stock,
      fecha_inicio_cocina,
      fecha_listo,
      items
    ) VALUES (
      v_order_id,
      v_key,
      v_table_id,
      p_order->>'numero_mesa',
      p_order->>'mozo',
      v_state,
      NULLIF(p_order->>'observaciones', ''),
      COALESCE(NULLIF(p_order->>'fecha_hora', '')::TIMESTAMPTZ, now()),
      COALESCE(NULLIF(p_order->>'minutos_transcurridos', '')::INTEGER, 0),
      COALESCE(NULLIF(p_order->>'origen', ''), 'Mozo'),
      NULLIF(p_order->>'tiempo_despacho_minutos', '')::INTEGER,
      COALESCE(NULLIF(p_order->>'segundos_en_listo', '')::INTEGER, 0),
      false,
      NULL,
      NULLIF(p_order->>'fecha_inicio_cocina', '')::TIMESTAMPTZ,
      NULLIF(p_order->>'fecha_listo', '')::TIMESTAMPTZ,
      (p_order->'items')::TEXT
    );
  ELSE
    IF v_existing_state IN ('entregado_cobrado', 'cancelado') THEN
      RAISE EXCEPTION 'La comanda % ya esta cerrada.', v_order_id USING ERRCODE = '23514';
    END IF;
    UPDATE public.pedidos_cabecera
    SET
      numero_mesa = p_order->>'numero_mesa',
      mozo = p_order->>'mozo',
      observaciones = NULLIF(p_order->>'observaciones', ''),
      items = (p_order->'items')::TEXT
    WHERE id_pedido = v_order_id;
  END IF;

  DELETE FROM public.pedido_detalle WHERE id_pedido = v_order_id;
  INSERT INTO public.pedido_detalle (
    id_detalle,
    id_pedido,
    id_producto,
    nombre,
    cantidad,
    categoria,
    precio_unitario,
    estado,
    fecha_hora
  )
  SELECT
    concat(v_order_id, '_', lpad(item.ordinality::TEXT, 4, '0')),
    v_order_id,
    item.value->>'id_producto',
    item.value->>'nombre',
    GREATEST(1, COALESCE(NULLIF(item.value->>'cantidad', '')::INTEGER, 1)),
    COALESCE(NULLIF(item.value->>'categoria', ''), 'Menu'),
    NULLIF(item.value->>'precio_unitario', '')::NUMERIC,
    COALESCE(NULLIF(item.value->>'estado', ''), 'pendiente'),
    now()
  FROM jsonb_array_elements(p_order->'items') WITH ORDINALITY AS item(value, ordinality);

  UPDATE public.mesas
  SET estado = 'ocupada', comensales = GREATEST(1, COALESCE(p_comensales, 2))
  WHERE id_mesa = v_table_id;

  IF v_state IN ('en_cocina', 'listo', 'entregado', 'entregado_cobrado') THEN
    PERFORM public.app_apply_order_stock(v_order_id, false, p_allow_negative);
  END IF;

  IF v_key IS NOT NULL THEN
    INSERT INTO public.pedido_operaciones (idempotency_key, id_pedido)
    VALUES (v_key, v_order_id)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_order_transaction(JSONB, INTEGER, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_order_transaction(JSONB, INTEGER, BOOLEAN)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_order_transaction(
  p_order_id BIGINT,
  p_new_state TEXT,
  p_allow_negative BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.pedidos_cabecera%ROWTYPE;
BEGIN
  IF NOT public.app_has_any_role(ARRAY['superadmin', 'administrador', 'mozo', 'cocina', 'cajero']) THEN
    RAISE EXCEPTION 'No autorizado para cambiar comandas.' USING ERRCODE = '42501';
  END IF;
  IF p_new_state NOT IN (
    'pendiente', 'en_cocina', 'listo', 'entregado', 'entregado_cobrado', 'cancelado'
  ) THEN
    RAISE EXCEPTION 'Estado de comanda invalido.' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_order
  FROM public.pedidos_cabecera
  WHERE id_pedido = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % inexistente.', p_order_id USING ERRCODE = 'P0002';
  END IF;
  IF v_order.estado_comanda IN ('entregado_cobrado', 'cancelado')
     AND v_order.estado_comanda <> p_new_state THEN
    RAISE EXCEPTION 'El pedido % ya esta cerrado.', p_order_id USING ERRCODE = '23514';
  END IF;

  IF p_new_state = 'en_cocina' THEN
    PERFORM public.app_apply_order_stock(p_order_id, false, p_allow_negative);
  ELSIF p_new_state = 'cancelado' THEN
    PERFORM public.app_apply_order_stock(p_order_id, true, p_allow_negative);
  END IF;

  UPDATE public.pedido_detalle
  SET estado = CASE
    WHEN p_new_state = 'en_cocina' AND estado = 'pendiente' THEN 'en_cocina'
    WHEN p_new_state = 'listo' AND estado IN ('pendiente', 'en_cocina') THEN 'listo'
    WHEN p_new_state IN ('entregado', 'entregado_cobrado')
      AND estado IN ('pendiente', 'en_cocina', 'listo') THEN 'entregado'
    WHEN p_new_state = 'cancelado' THEN 'cancelado'
    ELSE estado
  END
  WHERE id_pedido = p_order_id;

  UPDATE public.pedidos_cabecera
  SET
    estado_comanda = p_new_state,
    fecha_inicio_cocina = CASE
      WHEN p_new_state = 'en_cocina' THEN COALESCE(fecha_inicio_cocina, now())
      ELSE fecha_inicio_cocina
    END,
    fecha_listo = CASE WHEN p_new_state = 'listo' THEN now() ELSE fecha_listo END,
    tiempo_despacho_minutos = CASE
      WHEN p_new_state = 'listo' AND fecha_inicio_cocina IS NOT NULL
        THEN GREATEST(1, round(extract(epoch FROM (now() - fecha_inicio_cocina)) / 60)::INTEGER)
      ELSE tiempo_despacho_minutos
    END,
    segundos_en_listo = CASE WHEN p_new_state = 'listo' THEN 0 ELSE segundos_en_listo END,
    items = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id_producto', d.id_producto,
          'nombre', d.nombre,
          'cantidad', d.cantidad,
          'categoria', d.categoria,
          'precio_unitario', d.precio_unitario,
          'estado', d.estado
        )
        ORDER BY d.id_detalle
      )::TEXT
      FROM public.pedido_detalle d
      WHERE d.id_pedido = p_order_id
    )
  WHERE id_pedido = p_order_id;

  IF p_new_state IN ('entregado_cobrado', 'cancelado') THEN
    UPDATE public.mesas
    SET estado = 'libre', comensales = NULL
    WHERE id_mesa = v_order.id_mesa
      AND NOT EXISTS (
        SELECT 1
        FROM public.pedidos_cabecera other_order
        WHERE other_order.id_mesa = v_order.id_mesa
          AND other_order.id_pedido <> p_order_id
          AND other_order.estado_comanda NOT IN ('entregado_cobrado', 'cancelado')
      );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_order_transaction(BIGINT, TEXT, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_order_transaction(BIGINT, TEXT, BOOLEAN)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.close_table_orders_transaction(
  p_order_ids BIGINT[],
  p_allow_negative BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_id INTEGER;
  v_order_id BIGINT;
  v_found_count INTEGER;
BEGIN
  IF NOT public.app_has_any_role(ARRAY['superadmin', 'administrador', 'cajero']) THEN
    RAISE EXCEPTION 'No autorizado para cerrar mesas.' USING ERRCODE = '42501';
  END IF;
  IF p_order_ids IS NULL OR cardinality(p_order_ids) = 0 THEN
    RAISE EXCEPTION 'No hay pedidos para cerrar.' USING ERRCODE = '22023';
  END IF;

  SELECT id_mesa
  INTO v_table_id
  FROM public.pedidos_cabecera
  WHERE id_pedido = ANY(p_order_ids)
  ORDER BY id_pedido
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontraron pedidos para cerrar.' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(DISTINCT id_pedido)
  INTO v_found_count
  FROM public.pedidos_cabecera
  WHERE id_pedido = ANY(p_order_ids)
    AND id_mesa = v_table_id;
  IF v_found_count <> cardinality(p_order_ids) THEN
    RAISE EXCEPTION 'Los pedidos seleccionados no pertenecen a una unica mesa.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pedidos_cabecera
    WHERE id_mesa = v_table_id
      AND id_pedido <> ALL(p_order_ids)
      AND estado_comanda NOT IN ('entregado_cobrado', 'cancelado')
  ) THEN
    RAISE EXCEPTION 'La mesa conserva comandas activas fuera del cierre.'
      USING ERRCODE = '23514';
  END IF;

  PERFORM 1
  FROM public.pedidos_cabecera
  WHERE id_pedido = ANY(p_order_ids)
  ORDER BY id_pedido
  FOR UPDATE;

  FOR v_order_id IN
    SELECT id_pedido
    FROM public.pedidos_cabecera
    WHERE id_pedido = ANY(p_order_ids)
      AND estado_comanda <> 'cancelado'
    ORDER BY id_pedido
  LOOP
    PERFORM public.app_apply_order_stock(v_order_id, false, p_allow_negative);
  END LOOP;

  UPDATE public.pedido_detalle
  SET estado = 'entregado'
  WHERE id_pedido = ANY(p_order_ids)
    AND estado <> 'cancelado';

  UPDATE public.pedidos_cabecera
  SET estado_comanda = 'entregado_cobrado'
  WHERE id_pedido = ANY(p_order_ids)
    AND estado_comanda <> 'cancelado';

  UPDATE public.mesas
  SET estado = 'libre', comensales = NULL
  WHERE id_mesa = v_table_id;
END;
$$;

REVOKE ALL ON FUNCTION public.close_table_orders_transaction(BIGINT[], BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_table_orders_transaction(BIGINT[], BOOLEAN)
  TO authenticated;

COMMIT;
