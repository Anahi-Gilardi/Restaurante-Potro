-- ========================================================
-- SCRIPT DE ACTUALIZACIÓN DE STOCK DE BEBIDAS - EL PATRÓN
-- ========================================================

-- 1. Asegurar columnas de stock en productos_menu
ALTER TABLE public.productos_menu 
  ADD COLUMN IF NOT EXISTS stock_actual integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_minimo integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS controla_stock boolean NOT NULL DEFAULT true;

-- 2. Actualización de existencias de bebidas

INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cham_baron_b_brut_nature',
  'Baron B Brut Nature',
  'Bodega',
  'Brut Nature',
  'bebida',
  32000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cham_baron_b_extra_brut',
  'Baron B Extra Brut',
  'Bodega',
  'Extra Brut',
  'bebida',
  32000,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cham_alyda_extra_brut',
  'Alyda Extra Brut',
  'Bodega',
  'Extra Brut',
  'bebida',
  19000,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cham_las_perdices_extra_brut',
  'Las Perdices Extra Brut',
  'Bodega',
  'Extra Brut',
  'bebida',
  16500,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cham_salentein_extra_brut',
  'Salentein Extra Brut',
  'Bodega',
  'Extra Brut',
  'bebida',
  17500,
  4,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cham_d_v_nature',
  'D.V Nature',
  'Bodega',
  'Nature',
  'bebida',
  28000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cham_chandon_extra_brut',
  'Chandon Extra Brut',
  'Bodega',
  'Extra Brut',
  'bebida',
  18000,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_fernet_branca',
  'Fernet Branca',
  'Bebidas con Alcohol',
  'Branca',
  'bebida',
  5500,
  13,
  3,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_gancia_americano',
  'Gancia Americano',
  'Bebidas con Alcohol',
  'Americano',
  'bebida',
  4500,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_campari_bitter',
  'Campari Bitter',
  'Bebidas con Alcohol',
  'Bitter',
  'bebida',
  4800,
  1,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_carpano_rosso_vermut',
  'Carpano Rosso Vermut',
  'Bebidas con Alcohol',
  'Vermut',
  'bebida',
  4500,
  28,
  5,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_carpano_bianco_vermut',
  'Carpano Bianco Vermut',
  'Bebidas con Alcohol',
  'Vermut',
  'bebida',
  4500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_aperol_spritz',
  'Aperol Spritz',
  'Bebidas con Alcohol',
  'Spritz',
  'bebida',
  4900,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_blu_spirito_aperitivo',
  'Blu Spirito Aperitivo',
  'Bebidas con Alcohol',
  'Aperitivo',
  'bebida',
  4500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_bombay_gin_sapphire',
  'Bombay Gin Sapphire',
  'Bebidas con Alcohol',
  'Gin Sapphire',
  'bebida',
  6500,
  1,
  1,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_beefeater_gin_london_dry',
  'Beefeater Gin London Dry',
  'Bebidas con Alcohol',
  'Gin London Dry',
  'bebida',
  5800,
  1,
  1,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_antica_formula_vermut_carpano',
  'Antica Formula Vermut Carpano',
  'Bebidas con Alcohol',
  'Vermut Carpano',
  'bebida',
  7500,
  1,
  1,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_black_label_whisky_johnnie_walker',
  'Black Label Whisky Johnnie Walker',
  'Bebidas con Alcohol',
  'Whisky Johnnie Walker',
  'bebida',
  8500,
  1,
  1,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_jack_daniels_tennessee_whiskey_old_no_7',
  'Jack Daniels Tennessee Whiskey Old No. 7',
  'Bebidas con Alcohol',
  'Tennessee Whiskey Old No. 7',
  'bebida',
  8500,
  1,
  1,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_trag_jameson_irish_whiskey',
  'Jameson Irish Whiskey',
  'Bebidas con Alcohol',
  'Irish Whiskey',
  'bebida',
  7000,
  1,
  1,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__coca_cola_original_350cc',
  'Coca Cola Original 350cc',
  'Bebidas sin Alcohol',
  'Original 350cc',
  'bebida',
  4000,
  0,
  12,
  true,
  'Lata 350cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__coca_cero_sin_azucar_350cc',
  'Coca Cero Sin Azúcar 350cc',
  'Bebidas sin Alcohol',
  'Sin Azúcar 350cc',
  'bebida',
  4000,
  48,
  12,
  true,
  'Lata 350cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__fanta_naranja_350cc',
  'Fanta Naranja 350cc',
  'Bebidas sin Alcohol',
  'Naranja 350cc',
  'bebida',
  4000,
  0,
  12,
  true,
  'Lata 350cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__sprite_limon_350cc',
  'Sprite Limón 350cc',
  'Bebidas sin Alcohol',
  'Limón 350cc',
  'bebida',
  4000,
  0,
  12,
  true,
  'Lata 350cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__tonica_lata_310cc',
  'Tónica Lata 310cc',
  'Bebidas sin Alcohol',
  'Lata 310cc',
  'bebida',
  4000,
  0,
  12,
  true,
  'Lata 310cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__pomelo_lata_350cc',
  'Pomelo Lata 350cc',
  'Bebidas sin Alcohol',
  'Lata 350cc',
  'bebida',
  4000,
  0,
  12,
  true,
  'Lata 350cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__s_naranja_saborizada_500cc',
  'S. Naranja Saborizada 500cc',
  'Bebidas sin Alcohol',
  'Saborizada 500cc',
  'bebida',
  3800,
  0,
  6,
  true,
  'Botella 500cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__s_pomelo_saborizada_500cc',
  'S. Pomelo Saborizada 500cc',
  'Bebidas sin Alcohol',
  'Saborizada 500cc',
  'bebida',
  3800,
  0,
  6,
  true,
  'Botella 500cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__s_manzana_saborizada_500cc',
  'S. Manzana Saborizada 500cc',
  'Bebidas sin Alcohol',
  'Saborizada 500cc',
  'bebida',
  3800,
  0,
  6,
  true,
  'Botella 500cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__s_limonada_saborizada_500cc',
  'S. Limonada Saborizada 500cc',
  'Bebidas sin Alcohol',
  'Saborizada 500cc',
  'bebida',
  3800,
  0,
  6,
  true,
  'Botella 500cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__s_pera_saborizada_500cc',
  'S. Pera Saborizada 500cc',
  'Bebidas sin Alcohol',
  'Saborizada 500cc',
  'bebida',
  3800,
  0,
  6,
  true,
  'Botella 500cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__agua_mineral_600cc',
  'Agua Mineral 600cc',
  'Bebidas sin Alcohol',
  'Mineral 600cc',
  'bebida',
  3500,
  48,
  12,
  true,
  'Botella 600cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__soda_sifon_botella_600cc',
  'Soda Sifón / Botella 600cc',
  'Bebidas sin Alcohol',
  'Sifón / Botella 600cc',
  'bebida',
  3500,
  48,
  12,
  true,
  'Botella 600cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cerv_stella_artois_rubia_475cc',
  'Stella Artois Rubia 475cc',
  'Bebidas con Alcohol',
  'Rubia 475cc',
  'bebida',
  4800,
  0,
  6,
  true,
  'Lata 475cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cerv_stella_artois_negra_noire_475cc',
  'Stella Artois Negra (Noire) 475cc',
  'Bebidas con Alcohol',
  'Negra (Noire) 475cc',
  'bebida',
  4800,
  0,
  6,
  true,
  'Lata 475cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_cerv_stella_artois_sin_alcohol_475cc',
  'Stella Artois Sin Alcohol 475cc',
  'Bebidas con Alcohol',
  'Sin Alcohol 475cc',
  'bebida',
  4800,
  0,
  6,
  true,
  'Lata 475cc',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_sin__gancia_sin_alcohol',
  'Gancia Sin Alcohol',
  'Bebidas sin Alcohol',
  'Sin Alcohol',
  'bebida',
  4200,
  6,
  2,
  true,
  'Botella',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_trumpeter_malbec',
  'Trumpeter Malbec',
  'Bodega',
  'Malbec',
  'vino',
  12500,
  8,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_trumpeter_chardonnay',
  'Trumpeter Chardonnay',
  'Bodega',
  'Chardonnay',
  'vino',
  12500,
  4,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_trumpeter_doux',
  'Trumpeter Doux',
  'Bodega',
  'Doux',
  'vino',
  12500,
  4,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_trumpeter_reserva_blend',
  'Trumpeter Reserva Blend',
  'Bodega',
  'Reserva Blend',
  'vino',
  14500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_rutini_malbec',
  'Rutini Malbec',
  'Bodega',
  'Malbec',
  'vino',
  26500,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_rutini_merlot',
  'Rutini Merlot',
  'Bodega',
  'Merlot',
  'vino',
  26500,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_escorihuela_gascon_malbec',
  'Escorihuela Gascón Malbec',
  'Bodega',
  'Malbec',
  'vino',
  15500,
  12,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_escorihuela_gascon_cabernet_sauvignon',
  'Escorihuela Gascón Cabernet Sauvignon',
  'Bodega',
  'Cabernet Sauvignon',
  'vino',
  15500,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_escorihuela_gascon_sauvignon_blanc',
  'Escorihuela Gascón Sauvignon Blanc',
  'Bodega',
  'Sauvignon Blanc',
  'vino',
  15500,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_e_g_gran_reserva_malbec',
  'E.G Gran Reserva Malbec',
  'Bodega',
  'Malbec',
  'vino',
  24000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_e_g_gran_reserva_chardonnay',
  'E.G Gran Reserva Chardonnay',
  'Bodega',
  'Chardonnay',
  'vino',
  24000,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_pequenas_producciones_malbec',
  'Pequeñas Producciones Malbec',
  'Bodega',
  'Malbec',
  'vino',
  34000,
  4,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_pequenas_producciones_cabernet_franc',
  'Pequeñas Producciones Cabernet Franc',
  'Bodega',
  'Cabernet Franc',
  'vino',
  34000,
  4,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_alamos_red_blend',
  'Alamos Red Blend',
  'Bodega',
  'Red Blend',
  'vino',
  11000,
  0,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_alamos_reserva_malbec',
  'Alamos Reserva Malbec',
  'Bodega',
  'Reserva Malbec',
  'vino',
  12500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_saint_felicien_malbec',
  'Saint Felicien Malbec',
  'Bodega',
  'Malbec',
  'vino',
  16500,
  9,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_saint_felicien_cabernet_franc',
  'Saint Felicien Cabernet Franc',
  'Bodega',
  'Cabernet Franc',
  'vino',
  16500,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_saint_felicien_pinot_noir',
  'Saint Felicien Pinot Noir',
  'Bodega',
  'Pinot Noir',
  'vino',
  17500,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_saint_felicien_sauvignon_blanc',
  'Saint Felicien Sauvignon Blanc',
  'Bodega',
  'Sauvignon Blanc',
  'vino',
  16500,
  9,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_nicasia_rb_malbec',
  'Nicasia RB Malbec',
  'Bodega',
  'RB Malbec',
  'vino',
  16000,
  7,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_nicasia_cabernet_franc',
  'Nicasia Cabernet Franc',
  'Bodega',
  'Cabernet Franc',
  'vino',
  16000,
  4,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_nicasia_blend_historico',
  'Nicasia Blend Histórico',
  'Bodega',
  'Blend Histórico',
  'vino',
  16000,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_nicasia_blanc_de_blancs_viognier',
  'Nicasia Blanc de Blancs Viognier',
  'Bodega',
  'Blanc de Blancs Viognier',
  'vino',
  16000,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_dv_catena_malbec_malbec',
  'DV Catena Malbec - Malbec',
  'Bodega',
  'Malbec - Malbec',
  'vino',
  29500,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_dv_catena_malbec_cabernet',
  'DV Catena Malbec - Cabernet',
  'Bodega',
  'Malbec - Cabernet',
  'vino',
  29500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_dv_catena_pinot_noir_pinot_noir',
  'DV Catena Pinot Noir - Pinot Noir',
  'Bodega',
  'Pinot Noir - Pinot Noir',
  'vino',
  31000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_la_posta_malbec',
  'La Posta Malbec',
  'Bodega',
  'Malbec',
  'vino',
  16500,
  4,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_la_posta_bonarda',
  'La Posta Bonarda',
  'Bodega',
  'Bonarda',
  'vino',
  16500,
  9,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_la_posta_rosado',
  'La Posta Rosado',
  'Bodega',
  'Rosado',
  'vino',
  16500,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_la_posta_pinot_noir',
  'La Posta Pinot Noir',
  'Bodega',
  'Pinot Noir',
  'vino',
  17500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_tical_malbec',
  'Tical Malbec',
  'Bodega',
  'Malbec',
  'vino',
  24000,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_angelica_zapata_malbec_alta',
  'Angelica Zapata Malbec Alta',
  'Bodega',
  'Malbec Alta',
  'vino',
  45000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_catena_zapata_argentino_malbec',
  'Catena Zapata Argentino Malbec',
  'Bodega',
  'Malbec',
  'vino',
  78000,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_luca_malbec',
  'Luca Malbec',
  'Bodega',
  'Malbec',
  'vino',
  29000,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_luca_chardonnay',
  'Luca Chardonnay',
  'Bodega',
  'Chardonnay',
  'vino',
  29000,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_malbec_750ml',
  'Las Perdices Malbec 750ml',
  'Bodega',
  'Malbec 750ml',
  'vino',
  13500,
  9,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_cabernet_sauvignon_750ml',
  'Las Perdices Cabernet Sauvignon 750ml',
  'Bodega',
  'Cabernet Sauvignon 750ml',
  'vino',
  13500,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_malbec_375ml',
  'Las Perdices Malbec 375ml',
  'Bodega',
  'Malbec 375ml',
  'vino',
  8900,
  16,
  6,
  true,
  'Botella 375ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_sauvignon_blanc_750ml',
  'Las Perdices Sauvignon Blanc 750ml',
  'Bodega',
  'Sauvignon Blanc 750ml',
  'vino',
  13500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_sauvignon_blanc_375ml',
  'Las Perdices Sauvignon Blanc 375ml',
  'Bodega',
  'Sauvignon Blanc 375ml',
  'vino',
  8900,
  17,
  6,
  true,
  'Botella 375ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_torrontes',
  'Las Perdices Torrontés',
  'Bodega',
  'Torrontés',
  'vino',
  13500,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_torrontes_dulce',
  'Las Perdices Torrontés Dulce',
  'Bodega',
  'Torrontés Dulce',
  'vino',
  13500,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_reserva_malbec',
  'Las Perdices Reserva Malbec',
  'Bodega',
  'Malbec',
  'vino',
  17500,
  7,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_reserva_pinot_noir',
  'Las Perdices Reserva Pinot Noir',
  'Bodega',
  'Pinot Noir',
  'vino',
  18500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_reserva_cabernet_sauvignon',
  'Las Perdices Reserva Cabernet Sauvignon',
  'Bodega',
  'Cabernet Sauvignon',
  'vino',
  17500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_reserva_chardonnay',
  'Las Perdices Reserva Chardonnay',
  'Bodega',
  'Chardonnay',
  'vino',
  17500,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_don_juan_malbec',
  'Don Juan Malbec',
  'Bodega',
  'Malbec',
  'vino',
  45000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_exploracion_mb_chacayes',
  'Las Perdices Exploración MB Chacayes',
  'Bodega',
  'MB Chacayes',
  'vino',
  22000,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_exploracion_mb_la_consulta',
  'Las Perdices Exploración MB La Consulta',
  'Bodega',
  'MB La Consulta',
  'vino',
  22000,
  8,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_exploracion_albarino',
  'Las Perdices Exploración Albariño',
  'Bodega',
  'Albariño',
  'vino',
  21000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_exploracion_viognier_tardio',
  'Las Perdices Exploración Viognier Tardío',
  'Bodega',
  'Viognier Tardío',
  'vino',
  21000,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_exploracion_gewurztraminer',
  'Las Perdices Exploración Gewürztraminer',
  'Bodega',
  'Gewürztraminer',
  'vino',
  21000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_las_perdices_exploracion_riesling',
  'Las Perdices Exploración Riesling',
  'Bodega',
  'Riesling',
  'vino',
  21000,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_ala_colorada_ancellotta',
  'Ala Colorada Ancellotta',
  'Bodega',
  'Ancellotta',
  'vino',
  23500,
  4,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_ala_colorada_cabernet_franc',
  'Ala Colorada Cabernet Franc',
  'Bodega',
  'Cabernet Franc',
  'vino',
  23500,
  1,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_ala_colorada_tannat',
  'Ala Colorada Tannat',
  'Bodega',
  'Tannat',
  'vino',
  23500,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_ala_colorada_petit_verdot',
  'Ala Colorada Petit Verdot',
  'Bodega',
  'Petit Verdot',
  'vino',
  23500,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_alae_gran_blend_icono',
  'Alae Gran Blend Icono',
  'Bodega',
  'Gran Blend Icono',
  'vino',
  62000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_portillo_malbec',
  'Portillo Malbec',
  'Bodega',
  'Malbec',
  'vino',
  9500,
  16,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_portillo_sauvignon_blanc',
  'Portillo Sauvignon Blanc',
  'Bodega',
  'Sauvignon Blanc',
  'vino',
  9500,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_salentein_reserva_malbec_750ml',
  'Salentein Reserva Malbec 750ml',
  'Bodega',
  'Malbec 750ml',
  'vino',
  16500,
  13,
  4,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_salentein_reserva_malbec_375ml',
  'Salentein Reserva Malbec 375ml',
  'Bodega',
  'Malbec 375ml',
  'vino',
  9900,
  7,
  4,
  true,
  'Botella 375ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_salentein_reserva_pinot_noir',
  'Salentein Reserva Pinot Noir',
  'Bodega',
  'Pinot Noir',
  'vino',
  17500,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_salentein_reserva_sauvignon_blanc',
  'Salentein Reserva Sauvignon Blanc',
  'Bodega',
  'Sauvignon Blanc',
  'vino',
  16500,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_salentein_reserva_chardonnay',
  'Salentein Reserva Chardonnay',
  'Bodega',
  'Chardonnay',
  'vino',
  16500,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_pyros_syrah',
  'Pyros Syrah',
  'Bodega',
  'Syrah',
  'vino',
  22000,
  6,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_numina_malbec',
  'Numina Malbec',
  'Bodega',
  'Malbec',
  'vino',
  26000,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_numina_cabernet_franc',
  'Numina Cabernet Franc',
  'Bodega',
  'Cabernet Franc',
  'vino',
  26000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_primus_malbec',
  'Primus Malbec',
  'Bodega',
  'Malbec',
  'vino',
  68000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_hermandad_malbec',
  'Hermandad Malbec',
  'Bodega',
  'Malbec',
  'vino',
  24000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_hermandad_blend',
  'Hermandad Blend',
  'Bodega',
  'Blend',
  'vino',
  24000,
  2,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_felino_malbec',
  'Felino Malbec',
  'Bodega',
  'Malbec',
  'vino',
  28000,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_bramare_malbec',
  'Bramare Malbec',
  'Bodega',
  'Malbec',
  'vino',
  58000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_profundo_malbec_blend',
  'Profundo Malbec Blend',
  'Bodega',
  'Malbec Blend',
  'vino',
  38000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_lagrima_canela_blanco_blend',
  'Lágrima Canela Blanco Blend',
  'Bodega',
  'Blanco Blend',
  'vino',
  38000,
  5,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_septima_gran_reserva_blend',
  'Séptima Gran Reserva Blend',
  'Bodega',
  'Blend',
  'vino',
  26000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_petite_fleur_cabernet_franc',
  'Petite Fleur Cabernet Franc',
  'Bodega',
  'Cabernet Franc',
  'vino',
  23000,
  3,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;


INSERT INTO public.productos_menu (id_producto, nombre, categoria, subcategoria, tipo, precio_venta, stock_actual, stock_minimo, controla_stock, unidad_medida, activo)
VALUES (
  'prod_vino_petite_fleur_blend',
  'Petite Fleur Blend',
  'Bodega',
  'Blend',
  'vino',
  23000,
  4,
  2,
  true,
  'Botella 750ml',
  true
)
ON CONFLICT (id_producto) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  controla_stock = true,
  precio_venta = CASE WHEN public.productos_menu.precio_venta > 0 THEN public.productos_menu.precio_venta ELSE EXCLUDED.precio_venta END;
