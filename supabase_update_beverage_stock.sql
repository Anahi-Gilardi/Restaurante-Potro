-- =============================================================================
-- REEMPLAZO DEFINITIVO DE BEBIDAS Y STOCK - RESTAURANTE EL PATRÓN
-- =============================================================================

-- 1. Asegurar columnas de stock en productos_menu
ALTER TABLE public.productos_menu 
  ADD COLUMN IF NOT EXISTS stock_actual integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_minimo integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS controla_stock boolean NOT NULL DEFAULT true;

-- 2. Eliminar todas las bebidas obsoletas o duplicadas (Agua genérica, gaseosas antiguas, etc.)
--    Conservamos intactos todos los platos de cocina (Entradas, Pastas, Carnes, Pescados, Postres).
DELETE FROM public.productos_menu 
WHERE tipo IN ('vino', 'bebida')
   OR categoria IN ('Bodega', 'Bebidas con Alcohol', 'Bebidas sin Alcohol', 'Vinos', 'Vinos Tintos', 'Vinos Blancos y Rosados');

-- 3. Insertar las 115 bebidas oficiales del stock del local con sus cantidades exactas

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cham_baron_b_brut_nature',
  'Baron B Brut Nature',
  'Baron B - Brut Nature. Control de stock físico.',
  32000,
  'Bodega',
  'Espumantes / Champagne',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cham_baron_b_extra_brut',
  'Baron B Extra Brut',
  'Baron B - Extra Brut. Control de stock físico.',
  32000,
  'Bodega',
  'Espumantes / Champagne',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cham_alyda_extra_brut',
  'Alyda Extra Brut',
  'Alyda - Extra Brut. Control de stock físico.',
  19000,
  'Bodega',
  'Espumantes / Champagne',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cham_las_perdices_extra_brut',
  'Las Perdices Extra Brut',
  'Las Perdices - Extra Brut. Control de stock físico.',
  16500,
  'Bodega',
  'Espumantes / Champagne',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cham_salentein_extra_brut',
  'Salentein Extra Brut',
  'Salentein - Extra Brut. Control de stock físico.',
  17500,
  'Bodega',
  'Espumantes / Champagne',
  'vino',
  4,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cham_d_v_catena_nature',
  'D.V Catena Nature',
  'Catena Zapata - Nature. Control de stock físico.',
  28000,
  'Bodega',
  'Espumantes / Champagne',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cham_chandon_extra_brut',
  'Chandon Extra Brut',
  'Chandon - Extra Brut. Control de stock físico.',
  18000,
  'Bodega',
  'Espumantes / Champagne',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_fernet_branca',
  'Fernet Branca',
  'Fratelli Branca - Aperitivo / Trago. Control de stock físico.',
  5500,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  13,
  3,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_gancia_americano',
  'Gancia Americano',
  'Gancia - Aperitivo. Control de stock físico.',
  4500,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  2,
  2,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_campari_bitter',
  'Campari Bitter',
  'Campari - Aperitivo. Control de stock físico.',
  4800,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  1,
  2,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_carpano_rosso',
  'Carpano Rosso',
  'Carpano - Vermut. Control de stock físico.',
  4500,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  28,
  5,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_carpano_bianco',
  'Carpano Bianco',
  'Carpano - Vermut. Control de stock físico.',
  4500,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  6,
  2,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_aperol_spritz',
  'Aperol Spritz',
  'Aperol - Aperitivo. Control de stock físico.',
  4900,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  3,
  2,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_blu_spirito',
  'Blu Spirito',
  'Blu Spirito - Aperitivo. Control de stock físico.',
  4500,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  6,
  2,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_gin_bombay_sapphire',
  'Gin Bombay Sapphire',
  'Bombay - Gin. Control de stock físico.',
  6500,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  1,
  1,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_gin_beefeater_london_dry',
  'Gin Beefeater London Dry',
  'Beefeater - Gin. Control de stock físico.',
  5800,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  1,
  1,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_vermut_antica_formula',
  'Vermut Antica Formula',
  'Carpano - Vermut Premium. Control de stock físico.',
  7500,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  1,
  1,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_whisky_johnnie_walker_black_label',
  'Whisky Johnnie Walker Black Label',
  'Johnnie Walker - Whisky. Control de stock físico.',
  8500,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  1,
  1,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_whiskey_jack_daniels_old_no_7',
  'Whiskey Jack Daniels Old No. 7',
  'Jack Daniels - Whiskey. Control de stock físico.',
  8500,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  1,
  1,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_trag_whiskey_jameson_irish',
  'Whiskey Jameson Irish',
  'Jameson - Whiskey. Control de stock físico.',
  7000,
  'Bebidas con Alcohol',
  'Tragos / Destilados',
  'bebida',
  1,
  1,
  true,
  'Botella / Medida',
  true,
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__coca_cola_350cc',
  'Coca Cola 350cc',
  'Coca Cola - Original. Control de stock físico.',
  4000,
  'Bebidas sin Alcohol',
  'Gaseosas',
  'bebida',
  0,
  12,
  true,
  'Lata 350cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__coca_cero_350cc',
  'Coca Cero 350cc',
  'Coca Cola - Sin Azúcar. Control de stock físico.',
  4000,
  'Bebidas sin Alcohol',
  'Gaseosas',
  'bebida',
  48,
  12,
  true,
  'Lata 350cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__fanta_naranja_350cc',
  'Fanta Naranja 350cc',
  'Coca Cola - Naranja. Control de stock físico.',
  4000,
  'Bebidas sin Alcohol',
  'Gaseosas',
  'bebida',
  0,
  12,
  true,
  'Lata 350cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__sprite_limon_350cc',
  'Sprite Limón 350cc',
  'Coca Cola - Limón. Control de stock físico.',
  4000,
  'Bebidas sin Alcohol',
  'Gaseosas',
  'bebida',
  0,
  12,
  true,
  'Lata 350cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__agua_tonica_310cc',
  'Agua Tónica 310cc',
  'Schweppes - Tónica. Control de stock físico.',
  4000,
  'Bebidas sin Alcohol',
  'Gaseosas',
  'bebida',
  0,
  12,
  true,
  'Lata 310cc',
  true,
  'https://images.unsplash.com/photo-1616118132534-381148898bb4?w=400&q=80',
  'https://images.unsplash.com/photo-1616118132534-381148898bb4?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__gaseosa_pomelo_350cc',
  'Gaseosa Pomelo 350cc',
  'Schweppes - Pomelo. Control de stock físico.',
  4000,
  'Bebidas sin Alcohol',
  'Gaseosas',
  'bebida',
  0,
  12,
  true,
  'Lata 350cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__saborizada_naranja_500cc',
  'Saborizada Naranja 500cc',
  'Aquarius - Naranja. Control de stock físico.',
  3800,
  'Bebidas sin Alcohol',
  'Aguas Saborizadas',
  'bebida',
  0,
  6,
  true,
  'Botella 500cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__saborizada_pomelo_500cc',
  'Saborizada Pomelo 500cc',
  'Aquarius - Pomelo. Control de stock físico.',
  3800,
  'Bebidas sin Alcohol',
  'Aguas Saborizadas',
  'bebida',
  0,
  6,
  true,
  'Botella 500cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__saborizada_manzana_500cc',
  'Saborizada Manzana 500cc',
  'Aquarius - Manzana. Control de stock físico.',
  3800,
  'Bebidas sin Alcohol',
  'Aguas Saborizadas',
  'bebida',
  0,
  6,
  true,
  'Botella 500cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__saborizada_limonada_500cc',
  'Saborizada Limonada 500cc',
  'Aquarius - Limonada. Control de stock físico.',
  3800,
  'Bebidas sin Alcohol',
  'Aguas Saborizadas',
  'bebida',
  0,
  6,
  true,
  'Botella 500cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__saborizada_pera_500cc',
  'Saborizada Pera 500cc',
  'Aquarius - Pera. Control de stock físico.',
  3800,
  'Bebidas sin Alcohol',
  'Aguas Saborizadas',
  'bebida',
  0,
  6,
  true,
  'Botella 500cc',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__agua_mineral_600cc',
  'Agua Mineral 600cc',
  'Glaciar - Sin Gas. Control de stock físico.',
  3500,
  'Bebidas sin Alcohol',
  'Aguas',
  'bebida',
  48,
  12,
  true,
  'Botella 600cc',
  true,
  'https://images.unsplash.com/photo-1616118132534-381148898bb4?w=400&q=80',
  'https://images.unsplash.com/photo-1616118132534-381148898bb4?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__soda_agua_con_gas_600cc',
  'Soda / Agua con Gas 600cc',
  'Glaciar - Con Gas. Control de stock físico.',
  3500,
  'Bebidas sin Alcohol',
  'Aguas',
  'bebida',
  48,
  12,
  true,
  'Botella 600cc',
  true,
  'https://images.unsplash.com/photo-1616118132534-381148898bb4?w=400&q=80',
  'https://images.unsplash.com/photo-1616118132534-381148898bb4?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cerv_cerveza_stella_artois_rubia_475cc',
  'Cerveza Stella Artois Rubia 475cc',
  'Stella Artois - Rubia. Control de stock físico.',
  4800,
  'Bebidas con Alcohol',
  'Cervezas',
  'bebida',
  0,
  6,
  true,
  'Lata 475cc',
  true,
  'https://images.unsplash.com/photo-1608270190977-83d8a7c29367?w=400&q=80',
  'https://images.unsplash.com/photo-1608270190977-83d8a7c29367?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cerv_cerveza_stella_artois_noire_475cc',
  'Cerveza Stella Artois Noire 475cc',
  'Stella Artois - Negra (Noire). Control de stock físico.',
  4800,
  'Bebidas con Alcohol',
  'Cervezas',
  'bebida',
  0,
  6,
  true,
  'Lata 475cc',
  true,
  'https://images.unsplash.com/photo-1608270190977-83d8a7c29367?w=400&q=80',
  'https://images.unsplash.com/photo-1608270190977-83d8a7c29367?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_cerv_cerveza_stella_artois_sin_alcohol_4',
  'Cerveza Stella Artois Sin Alcohol 475cc',
  'Stella Artois - Sin Alcohol. Control de stock físico.',
  4800,
  'Bebidas con Alcohol',
  'Cervezas',
  'bebida',
  0,
  6,
  true,
  'Lata 475cc',
  true,
  'https://images.unsplash.com/photo-1608270190977-83d8a7c29367?w=400&q=80',
  'https://images.unsplash.com/photo-1608270190977-83d8a7c29367?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_sin__gancia_sin_alcohol',
  'Gancia Sin Alcohol',
  'Gancia - Sin Alcohol. Control de stock físico.',
  4200,
  'Bebidas sin Alcohol',
  'Aperitivos',
  'bebida',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_trumpeter_malbec',
  'Trumpeter Malbec',
  'La Rural - Malbec. Control de stock físico.',
  12500,
  'Bodega',
  'Vinos tintos',
  'vino',
  8,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_trumpeter_chardonnay',
  'Trumpeter Chardonnay',
  'La Rural - Chardonnay. Control de stock físico.',
  12500,
  'Bodega',
  'Vinos blancos',
  'vino',
  4,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_trumpeter_doux',
  'Trumpeter Doux',
  'La Rural - Doux. Control de stock físico.',
  12500,
  'Bodega',
  'Vinos blancos',
  'vino',
  4,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_trumpeter_reserva_blend',
  'Trumpeter Reserva Blend',
  'La Rural - Reserva Blend. Control de stock físico.',
  14500,
  'Bodega',
  'Vinos tintos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_rutini_malbec',
  'Rutini Malbec',
  'La Rural - Malbec. Control de stock físico.',
  26500,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_rutini_merlot',
  'Rutini Merlot',
  'La Rural - Merlot. Control de stock físico.',
  26500,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_escorihuela_gascon_malbec',
  'Escorihuela Gascón Malbec',
  'Escorihuela Gascón - Malbec. Control de stock físico.',
  15500,
  'Bodega',
  'Vinos tintos',
  'vino',
  12,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_escorihuela_gascon_cabernet_sauvign',
  'Escorihuela Gascón Cabernet Sauvignon',
  'Escorihuela Gascón - Cabernet Sauvignon. Control de stock físico.',
  15500,
  'Bodega',
  'Vinos tintos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_escorihuela_gascon_sauvignon_blanc',
  'Escorihuela Gascón Sauvignon Blanc',
  'Escorihuela Gascón - Sauvignon Blanc. Control de stock físico.',
  15500,
  'Bodega',
  'Vinos blancos',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_e_g_gran_reserva_malbec',
  'E.G Gran Reserva Malbec',
  'Escorihuela Gascón - Malbec. Control de stock físico.',
  24000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_e_g_gran_reserva_chardonnay',
  'E.G Gran Reserva Chardonnay',
  'Escorihuela Gascón - Chardonnay. Control de stock físico.',
  24000,
  'Bodega',
  'Vinos blancos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_pequenas_producciones_malbec',
  'Pequeñas Producciones Malbec',
  'Escorihuela Gascón - Malbec. Control de stock físico.',
  34000,
  'Bodega',
  'Vinos tintos',
  'vino',
  4,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_pequenas_producciones_cabernet_fran',
  'Pequeñas Producciones Cabernet Franc',
  'Escorihuela Gascón - Cabernet Franc. Control de stock físico.',
  34000,
  'Bodega',
  'Vinos tintos',
  'vino',
  4,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_alamos_red_blend',
  'Alamos Red Blend',
  'Catena Zapata - Red Blend. Control de stock físico.',
  11000,
  'Bodega',
  'Vinos tintos',
  'vino',
  0,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_alamos_reserva_malbec',
  'Alamos Reserva Malbec',
  'Catena Zapata - Reserva Malbec. Control de stock físico.',
  12500,
  'Bodega',
  'Vinos tintos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_saint_felicien_malbec',
  'Saint Felicien Malbec',
  'Catena Zapata - Malbec. Control de stock físico.',
  16500,
  'Bodega',
  'Vinos tintos',
  'vino',
  9,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_saint_felicien_cabernet_franc',
  'Saint Felicien Cabernet Franc',
  'Catena Zapata - Cabernet Franc. Control de stock físico.',
  16500,
  'Bodega',
  'Vinos tintos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_saint_felicien_pinot_noir',
  'Saint Felicien Pinot Noir',
  'Catena Zapata - Pinot Noir. Control de stock físico.',
  17500,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_saint_felicien_sauvignon_blanc',
  'Saint Felicien Sauvignon Blanc',
  'Catena Zapata - Sauvignon Blanc. Control de stock físico.',
  16500,
  'Bodega',
  'Vinos blancos',
  'vino',
  9,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_nicasia_red_blend_malbec',
  'Nicasia Red Blend Malbec',
  'Catena Zapata - RB Malbec. Control de stock físico.',
  16000,
  'Bodega',
  'Vinos tintos',
  'vino',
  7,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_nicasia_cabernet_franc',
  'Nicasia Cabernet Franc',
  'Catena Zapata - Cabernet Franc. Control de stock físico.',
  16000,
  'Bodega',
  'Vinos tintos',
  'vino',
  4,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_nicasia_blend_historico',
  'Nicasia Blend Histórico',
  'Catena Zapata - Blend Histórico. Control de stock físico.',
  16000,
  'Bodega',
  'Vinos tintos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_nicasia_blanc_de_blancs_viognier',
  'Nicasia Blanc de Blancs Viognier',
  'Catena Zapata - Blanc de Blancs Viognier. Control de stock físico.',
  16000,
  'Bodega',
  'Vinos blancos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_d_v_catena_malbec_malbec',
  'D.V. Catena Malbec - Malbec',
  'Catena Zapata - Malbec - Malbec. Control de stock físico.',
  29500,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_d_v_catena_malbec_cabernet',
  'D.V. Catena Malbec - Cabernet',
  'Catena Zapata - Malbec - Cabernet. Control de stock físico.',
  29500,
  'Bodega',
  'Vinos tintos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_d_v_catena_pinot_noir_pinot_noir',
  'D.V. Catena Pinot Noir - Pinot Noir',
  'Catena Zapata - Pinot Noir - Pinot Noir. Control de stock físico.',
  31000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_la_posta_malbec',
  'La Posta Malbec',
  'Catena Zapata - Malbec. Control de stock físico.',
  16500,
  'Bodega',
  'Vinos tintos',
  'vino',
  4,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_la_posta_bonarda',
  'La Posta Bonarda',
  'Catena Zapata - Bonarda. Control de stock físico.',
  16500,
  'Bodega',
  'Vinos tintos',
  'vino',
  9,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_la_posta_rosado',
  'La Posta Rosado',
  'Catena Zapata - Rosado. Control de stock físico.',
  16500,
  'Bodega',
  'Vinos rosados',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_la_posta_pinot_noir',
  'La Posta Pinot Noir',
  'Catena Zapata - Pinot Noir. Control de stock físico.',
  17500,
  'Bodega',
  'Vinos tintos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_tikal_natural_malbec',
  'Tikal Natural Malbec',
  'Catena Zapata - Malbec. Control de stock físico.',
  24000,
  'Bodega',
  'Vinos tintos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_angelica_zapata_malbec_alta',
  'Angélica Zapata Malbec Alta',
  'Catena Zapata - Malbec Alta. Control de stock físico.',
  45000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_catena_zapata_argentino_malbec',
  'Catena Zapata Argentino Malbec',
  'Catena Zapata - Malbec. Control de stock físico.',
  78000,
  'Bodega',
  'Vinos tintos',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_luca_malbec',
  'Luca Malbec',
  'Catena Zapata - Malbec. Control de stock físico.',
  29000,
  'Bodega',
  'Vinos tintos',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_luca_chardonnay',
  'Luca Chardonnay',
  'Catena Zapata - Chardonnay. Control de stock físico.',
  29000,
  'Bodega',
  'Vinos blancos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_malbec_750ml',
  'Las Perdices Malbec 750ml',
  'Las Perdices - Malbec. Control de stock físico.',
  13500,
  'Bodega',
  'Vinos tintos',
  'vino',
  9,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_cabernet_sauvignon_750',
  'Las Perdices Cabernet Sauvignon 750ml',
  'Las Perdices - Cabernet Sauvignon. Control de stock físico.',
  13500,
  'Bodega',
  'Vinos tintos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_malbec_375ml',
  'Las Perdices Malbec 375ml',
  'Las Perdices - Malbec 375ml. Control de stock físico.',
  8900,
  'Bodega',
  'Vinos tintos',
  'vino',
  16,
  6,
  true,
  'Botella 375ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_sauvignon_blanc_750ml',
  'Las Perdices Sauvignon Blanc 750ml',
  'Las Perdices - Sauvignon Blanc. Control de stock físico.',
  13500,
  'Bodega',
  'Vinos blancos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_sauvignon_blanc_375ml',
  'Las Perdices Sauvignon Blanc 375ml',
  'Las Perdices - Sauvignon Blanc 375ml. Control de stock físico.',
  8900,
  'Bodega',
  'Vinos blancos',
  'vino',
  17,
  6,
  true,
  'Botella 375ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_torrontes',
  'Las Perdices Torrontés',
  'Las Perdices - Torrontés. Control de stock físico.',
  13500,
  'Bodega',
  'Vinos blancos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_torrontes_dulce',
  'Las Perdices Torrontés Dulce',
  'Las Perdices - Torrontés Dulce. Control de stock físico.',
  13500,
  'Bodega',
  'Vinos blancos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_reserva_malbec',
  'Las Perdices Reserva Malbec',
  'Las Perdices - Malbec. Control de stock físico.',
  17500,
  'Bodega',
  'Vinos tintos',
  'vino',
  7,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_reserva_pinot_noir',
  'Las Perdices Reserva Pinot Noir',
  'Las Perdices - Pinot Noir. Control de stock físico.',
  18500,
  'Bodega',
  'Vinos tintos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_reserva_cabernet_sauvi',
  'Las Perdices Reserva Cabernet Sauvignon',
  'Las Perdices - Cabernet Sauvignon. Control de stock físico.',
  17500,
  'Bodega',
  'Vinos tintos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_reserva_chardonnay',
  'Las Perdices Reserva Chardonnay',
  'Las Perdices - Chardonnay. Control de stock físico.',
  17500,
  'Bodega',
  'Vinos blancos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_don_juan_nahuel_malbec',
  'Don Juan Nahuel Malbec',
  'Las Perdices - Malbec. Control de stock físico.',
  45000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_exploracion_chacayes_m',
  'Las Perdices Exploración Chacayes Malbec',
  'Las Perdices - MB Chacayes. Control de stock físico.',
  22000,
  'Bodega',
  'Vinos tintos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_exploracion_la_consult',
  'Las Perdices Exploración La Consulta Malbec',
  'Las Perdices - MB La Consulta. Control de stock físico.',
  22000,
  'Bodega',
  'Vinos tintos',
  'vino',
  8,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_exploracion_albarino',
  'Las Perdices Exploración Albariño',
  'Las Perdices - Albariño. Control de stock físico.',
  21000,
  'Bodega',
  'Vinos blancos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_exploracion_viognier_t',
  'Las Perdices Exploración Viognier Tardío',
  'Las Perdices - Viognier Tardío. Control de stock físico.',
  21000,
  'Bodega',
  'Vinos blancos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_exploracion_gewurztram',
  'Las Perdices Exploración Gewürztraminer',
  'Las Perdices - Gewürztraminer. Control de stock físico.',
  21000,
  'Bodega',
  'Vinos blancos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_exploracion_riesling',
  'Las Perdices Exploración Riesling',
  'Las Perdices - Riesling. Control de stock físico.',
  21000,
  'Bodega',
  'Vinos blancos',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_ala_colorada_ancellott',
  'Las Perdices Ala Colorada Ancellotta',
  'Las Perdices - Ancellotta. Control de stock físico.',
  23500,
  'Bodega',
  'Vinos tintos',
  'vino',
  4,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_ala_colorada_cabernet_',
  'Las Perdices Ala Colorada Cabernet Franc',
  'Las Perdices - Cabernet Franc. Control de stock físico.',
  23500,
  'Bodega',
  'Vinos tintos',
  'vino',
  1,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_ala_colorada_tannat',
  'Las Perdices Ala Colorada Tannat',
  'Las Perdices - Tannat. Control de stock físico.',
  23500,
  'Bodega',
  'Vinos tintos',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_ala_colorada_petit_ver',
  'Las Perdices Ala Colorada Petit Verdot',
  'Las Perdices - Petit Verdot. Control de stock físico.',
  23500,
  'Bodega',
  'Vinos tintos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_las_perdices_alae_gran_icono',
  'Las Perdices Alae Gran Icono',
  'Las Perdices - Gran Blend. Control de stock físico.',
  62000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_portillo_malbec',
  'Portillo Malbec',
  'Salentein - Malbec. Control de stock físico.',
  9500,
  'Bodega',
  'Vinos tintos',
  'vino',
  16,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_portillo_sauvignon_blanc',
  'Portillo Sauvignon Blanc',
  'Salentein - Sauvignon Blanc. Control de stock físico.',
  9500,
  'Bodega',
  'Vinos blancos',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_salentein_reserva_malbec_750ml',
  'Salentein Reserva Malbec 750ml',
  'Salentein - Malbec. Control de stock físico.',
  16500,
  'Bodega',
  'Vinos tintos',
  'vino',
  13,
  4,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_salentein_reserva_malbec_375ml',
  'Salentein Reserva Malbec 375ml',
  'Salentein - Malbec 375ml. Control de stock físico.',
  9900,
  'Bodega',
  'Vinos tintos',
  'vino',
  7,
  4,
  true,
  'Botella 375ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_salentein_reserva_pinot_noir',
  'Salentein Reserva Pinot Noir',
  'Salentein - Pinot Noir. Control de stock físico.',
  17500,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_salentein_reserva_sauvignon_blanc',
  'Salentein Reserva Sauvignon Blanc',
  'Salentein - Sauvignon Blanc. Control de stock físico.',
  16500,
  'Bodega',
  'Vinos blancos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_salentein_reserva_chardonnay',
  'Salentein Reserva Chardonnay',
  'Salentein - Chardonnay. Control de stock físico.',
  16500,
  'Bodega',
  'Vinos blancos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_pyros_syrah',
  'Pyros Syrah',
  'Salentein - Syrah. Control de stock físico.',
  22000,
  'Bodega',
  'Vinos tintos',
  'vino',
  6,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_salentein_numina_malbec',
  'Salentein Numina Malbec',
  'Salentein - Malbec. Control de stock físico.',
  26000,
  'Bodega',
  'Vinos tintos',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_salentein_numina_cabernet_franc',
  'Salentein Numina Cabernet Franc',
  'Salentein - Cabernet Franc. Control de stock físico.',
  26000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_salentein_primus_malbec',
  'Salentein Primus Malbec',
  'Salentein - Malbec. Control de stock físico.',
  68000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_hermandad_malbec',
  'Hermandad Malbec',
  'Familia Falasco - Malbec. Control de stock físico.',
  24000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_hermandad_blend',
  'Hermandad Blend',
  'Familia Falasco - Blend. Control de stock físico.',
  24000,
  'Bodega',
  'Vinos tintos',
  'vino',
  2,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_vina_cobos_felino_malbec',
  'Viña Cobos Felino Malbec',
  'Viña Cobos - Malbec. Control de stock físico.',
  28000,
  'Bodega',
  'Vinos tintos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_vina_cobos_bramare_malbec',
  'Viña Cobos Bramare Malbec',
  'Viña Cobos - Malbec. Control de stock físico.',
  58000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_bressia_profundo_malbec',
  'Bressia Profundo Malbec',
  'Bressia - Malbec Blend. Control de stock físico.',
  38000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_bressia_lagrima_canela',
  'Bressia Lágrima Canela',
  'Bressia - Blanco Blend. Control de stock físico.',
  38000,
  'Bodega',
  'Vinos blancos',
  'vino',
  5,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_septima_gran_reserva_blend',
  'Séptima Gran Reserva Blend',
  'Séptima - Blend. Control de stock físico.',
  26000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_monteviejo_petite_fleur_cabernet_fr',
  'Monteviejo Petite Fleur Cabernet Franc',
  'Monteviejo - Cabernet Franc. Control de stock físico.',
  23000,
  'Bodega',
  'Vinos tintos',
  'vino',
  3,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);

INSERT INTO public.productos_menu (
  id_producto, nombre, descripcion, precio_venta, categoria, subcategoria, tipo, stock_actual, stock_minimo, controla_stock, unidad_medida, activo, imagen, url_imagen, requiere_cocina
) VALUES (
  'prod_vino_monteviejo_petite_fleur_blend',
  'Monteviejo Petite Fleur Blend',
  'Monteviejo - Blend. Control de stock físico.',
  23000,
  'Bodega',
  'Vinos tintos',
  'vino',
  4,
  2,
  true,
  'Botella 750ml',
  true,
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
  false
);
