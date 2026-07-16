-- Fusion manual y atomica de insumos duplicados. El stock final siempre lo
-- informa el responsable luego del conteo fisico; nunca se suma implicitamente.

CREATE OR REPLACE FUNCTION public.merge_duplicate_ingredients(
  p_canonical_id TEXT,
  p_duplicate_ids TEXT[],
  p_final_stock NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canonical public.insumos%ROWTYPE;
  v_expected INTEGER;
  v_found INTEGER;
  v_product_id TEXT;
  v_keeper_id TEXT;
  v_quantity NUMERIC;
  v_recipe_rows INTEGER := 0;
  v_movement_rows INTEGER := 0;
  v_waste_rows INTEGER := 0;
  v_cost_rows INTEGER := 0;
  v_deleted_rows INTEGER := 0;
BEGIN
  p_canonical_id := btrim(COALESCE(p_canonical_id, ''));
  v_expected := COALESCE(array_length(p_duplicate_ids, 1), 0);

  IF p_canonical_id = '' OR v_expected = 0 THEN
    RAISE EXCEPTION 'Debe elegir un insumo principal y al menos un duplicado.' USING ERRCODE = '22023';
  END IF;
  IF p_final_stock IS NULL OR p_final_stock < 0 OR p_final_stock::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'El stock fisico final es invalido.' USING ERRCODE = '22023';
  END IF;
  IF p_canonical_id = ANY(p_duplicate_ids) THEN
    RAISE EXCEPTION 'El insumo principal no puede estar entre los duplicados.' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM unnest(p_duplicate_ids) item) <>
     (SELECT count(DISTINCT item) FROM unnest(p_duplicate_ids) item) THEN
    RAISE EXCEPTION 'La lista de duplicados contiene identificadores repetidos.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_canonical
  FROM public.insumos
  WHERE id_insumo = p_canonical_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El insumo principal no existe.' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.insumos
  WHERE id_insumo = ANY(p_duplicate_ids)
  ORDER BY id_insumo
  FOR UPDATE;

  SELECT count(*) INTO v_found
  FROM public.insumos
  WHERE id_insumo = ANY(p_duplicate_ids)
    AND lower(btrim(nombre)) = lower(btrim(v_canonical.nombre))
    AND unidad_medida = v_canonical.unidad_medida;
  IF v_found <> v_expected THEN
    RAISE EXCEPTION 'Los registros elegidos no representan el mismo insumo y unidad.' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_recipe_rows
  FROM public.recetas_escandallo
  WHERE id_insumo = ANY(p_duplicate_ids);

  FOR v_product_id IN
    SELECT DISTINCT id_producto
    FROM public.recetas_escandallo
    WHERE id_insumo = ANY(p_duplicate_ids)
  LOOP
    SELECT id_receta, cantidad_a_descontar
    INTO v_keeper_id, v_quantity
    FROM public.recetas_escandallo
    WHERE id_producto = v_product_id
      AND (id_insumo = p_canonical_id OR id_insumo = ANY(p_duplicate_ids))
    ORDER BY (id_insumo = p_canonical_id) DESC, id_receta
    LIMIT 1;

    SELECT max(cantidad_a_descontar)
    INTO v_quantity
    FROM public.recetas_escandallo
    WHERE id_producto = v_product_id
      AND (id_insumo = p_canonical_id OR id_insumo = ANY(p_duplicate_ids));

    DELETE FROM public.recetas_escandallo
    WHERE id_producto = v_product_id
      AND (id_insumo = p_canonical_id OR id_insumo = ANY(p_duplicate_ids))
      AND id_receta <> v_keeper_id;

    UPDATE public.recetas_escandallo
    SET id_insumo = p_canonical_id,
        cantidad_a_descontar = v_quantity
    WHERE id_receta = v_keeper_id;
  END LOOP;

  UPDATE public.movimientos_inventario
  SET id_insumo = p_canonical_id
  WHERE id_insumo = ANY(p_duplicate_ids);
  GET DIAGNOSTICS v_movement_rows = ROW_COUNT;

  IF to_regclass('public.mermas') IS NOT NULL THEN
    EXECUTE 'UPDATE public.mermas SET id_insumo = $1, nombre_insumo = $2 WHERE id_insumo = ANY($3)'
      USING p_canonical_id, v_canonical.nombre, p_duplicate_ids;
    GET DIAGNOSTICS v_waste_rows = ROW_COUNT;
  END IF;

  IF to_regclass('public.historial_costos_insumos') IS NOT NULL THEN
    EXECUTE 'UPDATE public.historial_costos_insumos SET id_insumo = $1, nombre_insumo = $2 WHERE id_insumo = ANY($3)'
      USING p_canonical_id, v_canonical.nombre, p_duplicate_ids;
    GET DIAGNOSTICS v_cost_rows = ROW_COUNT;
  END IF;

  DELETE FROM public.insumos
  WHERE id_insumo = ANY(p_duplicate_ids);
  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  IF v_deleted_rows <> v_expected THEN
    RAISE EXCEPTION 'No se pudieron retirar todos los duplicados.' USING ERRCODE = '23514';
  END IF;

  UPDATE public.insumos
  SET stock_actual = p_final_stock
  WHERE id_insumo = p_canonical_id;

  INSERT INTO public.auditoria_eventos (id, tipo, mensaje, timestamp)
  VALUES (
    'integrity_merge_' || txid_current()::TEXT,
    'sistema',
    format(
      'INTEGRIDAD: %s duplicados fusionados en %s. Stock fisico final: %s %s.',
      v_deleted_rows,
      p_canonical_id,
      p_final_stock,
      v_canonical.unidad_medida
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'canonicalId', p_canonical_id,
    'removedIds', to_jsonb(p_duplicate_ids),
    'finalStock', p_final_stock,
    'recipeRowsReviewed', v_recipe_rows,
    'movementRowsMoved', v_movement_rows,
    'wasteRowsMoved', v_waste_rows,
    'costRowsMoved', v_cost_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_duplicate_ingredients(TEXT, TEXT[], NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_ingredients(TEXT, TEXT[], NUMERIC) TO service_role;

COMMENT ON FUNCTION public.merge_duplicate_ingredients(TEXT, TEXT[], NUMERIC) IS
  'Fusion atomica de insumos duplicados con stock fisico explicito y conservacion de relaciones.';
