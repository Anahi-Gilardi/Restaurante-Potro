-- =============================================================================
-- MIGRACIÓN: Catálogo Completo de Bebidas, Cava y Coctelería de "El Patrón"
-- Fecha: 2026-09-16
-- Incluye: Vinos tintos, blancos/rosados, espumantes, cervezas, destilados y tragos.
-- =============================================================================

-- 1. Asegurar columna 'unidad_medida' en 'productos_menu'
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS unidad_medida TEXT;
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS es_bebida_directa BOOLEAN DEFAULT false;

-- 2. Asegurar nuevas categorías en la tabla 'categorias'
INSERT INTO public.categorias (id, nombre, slug, orden, activa, icono) VALUES
('cat_vinos_tintos', 'Vinos Tintos', 'vinos-tintos', 6.1, true, 'Wine'),
('cat_vinos_blancos_rosados', 'Vinos Blancos y Rosados', 'vinos-blancos-y-rosados', 6.2, true, 'Wine'),
('cat_espumantes', 'Espumantes', 'espumantes', 6.3, true, 'Wine'),
('cat_cervezas', 'Cervezas', 'cervezas', 6.4, true, 'Beer'),
('cat_destilados', 'Destilados', 'destilados', 6.5, true, 'Wine'),
('cat_tragos_cocteleria', 'Tragos y Coctelería', 'tragos-y-cocteleria', 6.6, true, 'Wine')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  slug = EXCLUDED.slug,
  orden = EXCLUDED.orden,
  activa = EXCLUDED.activa,
  icono = EXCLUDED.icono;

-- 3. Inserción de INSUMOS con stock inicial de bodega y barra
INSERT INTO public.insumos (id_insumo, nombre, stock_actual, stock_minimo, unidad_medida, categoria, subcategoria, proveedor, costo_unitario, es_bebida_directa) VALUES
-- Planilla Adjunta
('ins_vin_cobos_felino_malbec', 'Viña Cobos Felino Malbec Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Viña Cobos', 'Viña Cobos', 0.0, true),
('ins_vin_cobos_felino_cabernet', 'Viña Cobos Felino Cabernet Sauvignon Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Viña Cobos', 'Viña Cobos', 0.0, true),
('ins_vin_cobos_bramare_malbec', 'Viña Cobos Bramare Valle de Uco Malbec Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Viña Cobos', 'Viña Cobos', 0.0, true),
('ins_vin_septima_gran_reserva', 'Séptima Gran Reserva Blend Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Bodega Séptima', 'Bodega Séptima', 0.0, true),
('ins_vin_bressia_lagrima_canela', 'Bressia Lágrima Canela Blanco Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Bodega Bressia', 'Bodega Bressia', 0.0, true),
('ins_vin_hermandad_malbec', 'La Hermandad Malbec Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Bodega La Hermandad', 'Bodega La Hermandad', 0.0, true),
('ins_vin_hermandad_blend', 'La Hermandad Blend Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Bodega La Hermandad', 'Bodega La Hermandad', 0.0, true),

-- Cervezas y Destilados
('ins_cerveza_stella_lata_475', 'Cerveza Stella Artois Lata 475cc', 24.0, 6.0, 'unidades', 'bodega', 'Cervezas', 'Cervecería y Maltería Quilmes', 0.0, true),
('ins_cerveza_corona_porron_330', 'Cerveza Corona Porrón 330cc', 12.0, 4.0, 'unidades', 'bodega', 'Cervezas', 'AB InBev', 0.0, true),
('ins_gin_beefeater_750', 'Gin Beefeater London Dry 750ml', 1.0, 0.2, 'unidades', 'bodega', 'Gin', 'Pernod Ricard', 0.0, true),
('ins_gin_bombay_750', 'Gin Bombay Sapphire London Dry 750ml', 1.0, 0.2, 'unidades', 'bodega', 'Gin', 'Bacardi', 0.0, true),
('ins_whisky_jw_red_750', 'Whisky Johnnie Walker Red Label 750ml', 1.0, 0.2, 'unidades', 'bodega', 'Whisky', 'Diageo', 0.0, true),
('ins_whisky_jw_black_750', 'Whisky Johnnie Walker Black Label 12 Años 750ml', 1.0, 0.2, 'unidades', 'bodega', 'Whisky', 'Diageo', 0.0, true),
('ins_whisky_jack_daniels_750', 'Whiskey Jack Daniel''s Old No. 7 Tennessee 750ml', 1.0, 0.2, 'unidades', 'bodega', 'Whisky', 'Brown-Forman', 0.0, true),
('ins_whisky_jameson_750', 'Whiskey Jameson Irish Triple Distilled 750ml', 1.0, 0.2, 'unidades', 'bodega', 'Whisky', 'Pernod Ricard', 0.0, true),

-- Bodega La Rural
('ins_vin_trumpeter_malbec', 'Trumpeter Malbec Botella 750ml', 12.0, 3.0, 'unidades', 'bodega', 'La Rural', 'La Rural Winery', 0.0, true),
('ins_vin_trumpeter_red_blend', 'Trumpeter Red Blend Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'La Rural', 'La Rural Winery', 0.0, true),
('ins_vin_trumpeter_chardonnay', 'Trumpeter Chardonnay Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'La Rural', 'La Rural Winery', 0.0, true),
('ins_vin_trumpeter_doux', 'Trumpeter Doux Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'La Rural', 'La Rural Winery', 0.0, true),
('ins_vin_rutini_malbec', 'Rutini Malbec Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'La Rural', 'La Rural Winery', 0.0, true),
('ins_vin_rutini_merlot', 'Rutini Merlot Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'La Rural', 'La Rural Winery', 0.0, true),

-- Bodega Escorihuela Gascón
('ins_vin_escorihuela_malbec', 'Escorihuela Gascón Malbec Botella 750ml', 12.0, 3.0, 'unidades', 'bodega', 'Escorihuela Gascón', 'Escorihuela Gascón', 0.0, true),
('ins_vin_escorihuela_cabernet', 'Escorihuela Gascón Cabernet Sauvignon Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Escorihuela Gascón', 'Escorihuela Gascón', 0.0, true),
('ins_vin_escorihuela_pinot_noir', 'Escorihuela Gascón Pinot Noir Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Escorihuela Gascón', 'Escorihuela Gascón', 0.0, true),
('ins_vin_escorihuela_chardonnay', 'Escorihuela Gascón Chardonnay Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Escorihuela Gascón', 'Escorihuela Gascón', 0.0, true),
('ins_vin_escorihuela_sauvignon', 'Escorihuela Gascón Sauvignon Blanc Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Escorihuela Gascón', 'Escorihuela Gascón', 0.0, true),
('ins_vin_escorihuela_gran_res_malbec', 'Escorihuela Gascón Gran Reserva Malbec Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Escorihuela Gascón', 'Escorihuela Gascón', 0.0, true),
('ins_vin_escorihuela_peq_prod_malbec', 'Escorihuela Pequeñas Producciones Malbec Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Escorihuela Gascón', 'Escorihuela Gascón', 0.0, true),
('ins_vin_escorihuela_peq_prod_cab_franc', 'Escorihuela Pequeñas Producciones Cabernet Franc Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Escorihuela Gascón', 'Escorihuela Gascón', 0.0, true),

-- Bodega Catena Zapata
('ins_vin_saint_felicien_malbec', 'Saint Felicien Malbec Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_saint_felicien_cab_franc', 'Saint Felicien Cabernet Franc Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_saint_felicien_pinot_noir', 'Saint Felicien Pinot Noir Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_saint_felicien_sauvignon', 'Saint Felicien Sauvignon Blanc Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_nicasia_malbec', 'Nicasia Malbec Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_nicasia_cab_franc', 'Nicasia Cabernet Franc Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_nicasia_red_blend', 'Nicasia Red Blend / Garnacha Blend Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_dv_catena_malbec', 'D.V. Catena Malbec Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_dv_catena_malbec_cab', 'D.V. Catena Malbec-Cabernet Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_dv_catena_pinot_noir', 'D.V. Catena Pinot Noir Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_la_posta_bonarda', 'La Posta Bonarda Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_la_posta_rose', 'La Posta Rosé Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_tikal_malbec', 'Tikal Malbec Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_angelica_zapata_malbec', 'Angélica Zapata Malbec Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_angelica_zapata_merlot', 'Angélica Zapata Merlot Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_angelica_zapata_chardonnay', 'Angélica Zapata Chardonnay Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_catena_zapata_malbec_arg', 'Catena Zapata Malbec Argentino Botella 750ml', 2.0, 1.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_luca_malbec', 'Luca Malbec Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_vin_luca_chardonnay', 'Luca Chardonnay Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),

-- Bodega Las Perdices
('ins_vin_perdices_malbec_750', 'Las Perdices Malbec Botella 750ml', 18.0, 4.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_cabernet_750', 'Las Perdices Cabernet Sauvignon Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_malbec_375', 'Las Perdices Malbec Botella 375ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_sauvignon_750', 'Las Perdices Sauvignon Blanc Botella 750ml', 12.0, 3.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_sauvignon_375', 'Las Perdices Sauvignon Blanc Botella 375ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_torrontes', 'Las Perdices Torrontés Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_torrontes_dulce', 'Las Perdices Torrontés Dulce Botella 750ml', 12.0, 3.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_reserva_malbec', 'Las Perdices Reserva Malbec Botella 750ml', 12.0, 3.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_reserva_cabernet', 'Las Perdices Reserva Cabernet Sauvignon Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_reserva_pinot_noir', 'Las Perdices Reserva Pinot Noir Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_reserva_chardonnay', 'Las Perdices Reserva Chardonnay Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_reserva_sauvignon', 'Las Perdices Reserva Sauvignon Blanc Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_don_juan_nahuel_malbec', 'Don Juan Nahuel Malbec Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_exp_cabernet', 'Las Perdices Exploración Cabernet Sauvignon Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_exp_charbono', 'Las Perdices Exploración Charbono Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_exp_albarino', 'Las Perdices Exploración Albariño Botella 750ml', 4.0, 1.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_exp_riesling', 'Las Perdices Exploración Riesling Botella 750ml', 4.0, 1.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_exp_gewurztraminer', 'Las Perdices Exploración Gewürztraminer Botella 750ml', 4.0, 1.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_exp_viognier_dulce', 'Las Perdices Exploración Viognier Dulce Botella 750ml', 4.0, 1.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_ala_col_ancellotta', 'Las Perdices Ala Colorada Ancellotta Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_ala_col_cab_franc', 'Las Perdices Ala Colorada Cabernet Franc Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_ala_col_tannat', 'Las Perdices Ala Colorada Tannat Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_vin_perdices_ala_col_petit_verdot', 'Las Perdices Ala Colorada Petit Verdot Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),

-- Bodega Salentein & Pyros
('ins_vin_portillo_malbec_750', 'Portillo Malbec Botella 750ml', 18.0, 4.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_portillo_sauvignon_750', 'Portillo Sauvignon Blanc Botella 750ml', 12.0, 3.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_salentein_res_malbec_750', 'Salentein Reserva Malbec Botella 750ml', 12.0, 3.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_salentein_res_malbec_375', 'Salentein Reserva Malbec Botella 375ml', 6.0, 2.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_salentein_res_pinot_noir', 'Salentein Reserva Pinot Noir Botella 750ml', 12.0, 3.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_salentein_res_chardonnay', 'Salentein Reserva Chardonnay Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_salentein_res_sauvignon', 'Salentein Reserva Sauvignon Blanc Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_pyros_syrah', 'Pyros Syrah Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Pyros Wines', 0.0, true),
('ins_vin_salentein_numina_malbec', 'Salentein Numina Malbec Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_salentein_numina_cab_franc', 'Salentein Numina Cabernet Franc Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_salentein_numina_pinot_noir', 'Salentein Numina Pinot Noir Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_vin_salentein_primus_malbec', 'Salentein Primus Malbec Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),

-- Espumantes / Champagne
('ins_esp_baron_b_brut_nature', 'Barón B Brut Nature Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Barón B', 'Moët Hennessy', 0.0, true),
('ins_esp_baron_b_extra_brut', 'Barón B Extra Brut Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Barón B', 'Moët Hennessy', 0.0, true),
('ins_esp_alyda_extra_brut', 'Alyda Van Salentein Extra Brut Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_esp_perdices_extra_brut', 'Las Perdices Espumante Extra Brut Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Las Perdices', 'Las Perdices S.A.', 0.0, true),
('ins_esp_salentein_extra_brut', 'Salentein Espumante Extra Brut Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Salentein & Pyros', 'Salentein S.A.', 0.0, true),
('ins_esp_dv_catena_nature', 'D.V. Catena Nature Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Catena Zapata', 'Catena Zapata', 0.0, true),
('ins_esp_chandon_extra_brut', 'Chandon Extra Brut Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Chandon', 'Moët Hennessy', 0.0, true),

-- Botellas de Barra y Aperitivos
('ins_fernet_branca_bot', 'Fernet Branca Botella 750ml / 1L', 12.0, 3.0, 'unidades', 'bodega', 'Aperitivos y Digestivos', 'Fratelli Branca', 0.0, true),
('ins_gancia_americano_bot', 'Gancia Americano Botella 950ml', 2.0, 1.0, 'unidades', 'bodega', 'Aperitivos', 'Gancia', 0.0, true),
('ins_campari_bot', 'Campari Milano Botella 750ml', 3.0, 1.0, 'unidades', 'bodega', 'Aperitivos', 'Campari Group', 0.0, true),
('ins_carpano_rosso_bot', 'Carpano Rosso Vermut Botella 950ml', 12.0, 3.0, 'unidades', 'bodega', 'Vermut', 'Fratelli Branca', 0.0, true),
('ins_carpano_bianco_bot', 'Carpano Bianco Vermut Botella 950ml', 6.0, 2.0, 'unidades', 'bodega', 'Vermut', 'Fratelli Branca', 0.0, true),
('ins_aperol_bot', 'Aperol Botella 750ml', 6.0, 2.0, 'unidades', 'bodega', 'Aperitivos', 'Campari Group', 0.0, true),
('ins_martini_rosso_bot', 'Martini Rosso Botella 1L', 3.0, 1.0, 'unidades', 'bodega', 'Vermut', 'Bacardi', 0.0, true),
('ins_martini_bianco_bot', 'Martini Bianco Botella 1L', 3.0, 1.0, 'unidades', 'bodega', 'Vermut', 'Bacardi', 0.0, true),
('ins_martini_extra_dry_bot', 'Martini Extra Dry Botella 1L', 3.0, 1.0, 'unidades', 'bodega', 'Vermut', 'Bacardi', 0.0, true),
('ins_gin_spirito_blu_bot', 'Gin Spirito Blu Botella 750ml', 4.0, 1.0, 'unidades', 'bodega', 'Gin', 'Destilería Spirito', 0.0, true),
('ins_vodka_sernova_bot', 'Vodka Sernova Botella 700ml', 4.0, 1.0, 'unidades', 'bodega', 'Vodka', 'Fratelli Branca', 0.0, true)
ON CONFLICT (id_insumo) DO UPDATE SET
  stock_actual = EXCLUDED.stock_actual,
  stock_minimo = EXCLUDED.stock_minimo,
  unidad_medida = EXCLUDED.unidad_medida,
  subcategoria = EXCLUDED.subcategoria,
  es_bebida_directa = true;

-- 4. Inserción de PRODUCTOS EN 'productos_menu'
INSERT INTO public.productos_menu (
  id_producto, nombre, precio_venta, categoria, subcategoria, unidad_medida, activo, imagen, tipo, requiere_cocina, tiempo_preparacion_estimado, descripcion
) VALUES
-- Planilla Adjunta
('prod_vin_cobos_felino_malbec', 'Viña Cobos Felino Malbec', 0.00, 'Vinos Tintos', 'Viña Cobos', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Viña Cobos. Expresivo, frutado y de gran balance.'),
('prod_vin_cobos_felino_cabernet', 'Viña Cobos Felino Cabernet Sauvignon', 0.00, 'Vinos Tintos', 'Viña Cobos', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Viña Cobos. Notas a grosellas maduras y especias finas.'),
('prod_vin_cobos_bramare_malbec', 'Viña Cobos Bramare Valle de Uco Malbec', 0.00, 'Vinos Tintos', 'Viña Cobos', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Viña Cobos. Complejo, estructurado y de persistencia distinguida.'),
('prod_vin_septima_gran_reserva', 'Séptima Gran Reserva Blend', 0.00, 'Vinos Tintos', 'Bodega Séptima', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Séptima. Blend de corte exclusivo criado en barricas de roble francés.'),
('prod_vin_bressia_lagrima_canela', 'Bressia Lágrima Canela Blanco', 0.00, 'Vinos Blancos y Rosados', 'Bodega Bressia', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodega Bressia. Elegante blend blanco fermentado y criado en roble.'),
('prod_vin_hermandad_malbec', 'La Hermandad Malbec', 0.00, 'Vinos Tintos', 'Bodega La Hermandad', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega La Hermandad. Malbec de altura con taninos sedosos y frutos negros.'),
('prod_vin_hermandad_blend', 'La Hermandad Blend', 0.00, 'Vinos Tintos', 'Bodega La Hermandad', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega La Hermandad. Corte de alta gama con perfil especiado y cacao.'),

-- Cervezas y Destilados
('prod_cerveza_stella_lata_475', 'Cerveza Stella Artois Lata 475cc', 0.00, 'Cervezas', 'Stella Artois', 'Lata 475ml', true, 'https://images.unsplash.com/photo-1608270190587-f8369654fa0f?w=400&q=80', 'bebida', false, 2, 'Lager europea prémium, servida helada.'),
('prod_cerveza_corona_porron_330', 'Cerveza Corona Porrón 330cc', 0.00, 'Cervezas', 'Corona', 'Porrón 330ml', true, 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80', 'bebida', false, 2, 'Cerveza clara mexicana acompañada con rodaja de lima.'),
('prod_dest_beefeater_750', 'Gin Beefeater London Dry', 0.00, 'Destilados', 'Gin', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80', 'bebida', false, 2, 'Gin londinense tradicional con notas a enebro y cítricos.'),
('prod_dest_bombay_750', 'Gin Bombay Sapphire London Dry', 0.00, 'Destilados', 'Gin', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80', 'bebida', false, 2, 'Vapor infused de 10 botánicos seleccionados a mano.'),
('prod_dest_jw_red_750', 'Whisky Johnnie Walker Red Label', 0.00, 'Destilados', 'Whisky', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Blended Scotch Whisky con carácter ahumado y dinámico.'),
('prod_dest_jw_black_750', 'Whisky Johnnie Walker Black Label 12 Años', 0.00, 'Destilados', 'Whisky', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Whisky escocés 12 años añejado, rico y complejo.'),
('prod_dest_jack_daniels_750', 'Whiskey Jack Daniel''s Old No. 7 Tennessee', 0.00, 'Destilados', 'Whisky', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Tennessee Whiskey filtrado gota a gota por carbón de arce.'),
('prod_dest_jameson_750', 'Whiskey Jameson Irish Triple Distilled', 0.00, 'Destilados', 'Whisky', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Whiskey irlandés triple destilado de suavidad excepcional.'),

-- Bodega La Rural
('prod_vin_trumpeter_malbec', 'Trumpeter Malbec', 0.00, 'Vinos Tintos', 'La Rural', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega La Rural. Malbec clásico mendocino, frutado y redondo.'),
('prod_vin_trumpeter_red_blend', 'Trumpeter Red Blend', 0.00, 'Vinos Tintos', 'La Rural', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega La Rural. Armonioso corte de variedades tintas.'),
('prod_vin_trumpeter_chardonnay', 'Trumpeter Chardonnay', 0.00, 'Vinos Blancos y Rosados', 'La Rural', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodega La Rural. Notas a frutas tropicales y toque sutil de vainilla.'),
('prod_vin_trumpeter_doux', 'Trumpeter Doux', 0.00, 'Vinos Blancos y Rosados', 'La Rural', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodega La Rural. Blanco dulce natural, aromático y fresco.'),
('prod_vin_rutini_malbec', 'Rutini Malbec', 0.00, 'Vinos Tintos', 'La Rural', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega La Rural. Línea insignia con crianza en roble francés y gran estructura.'),
('prod_vin_rutini_merlot', 'Rutini Merlot', 0.00, 'Vinos Tintos', 'La Rural', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega La Rural. Merlot distinguido con aromas a ciruela y notas tostadas.'),

-- Bodega Escorihuela Gascón
('prod_vin_escorihuela_malbec', 'Escorihuela Gascón Malbec', 0.00, 'Vinos Tintos', 'Escorihuela Gascón', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Escorihuela Gascón. Clásico Malbec con tipicidad varietal.'),
('prod_vin_escorihuela_cabernet', 'Escorihuela Gascón Cabernet Sauvignon', 0.00, 'Vinos Tintos', 'Escorihuela Gascón', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Escorihuela Gascón. Pimiento rojo dulce, pimienta negra y madera.'),
('prod_vin_escorihuela_pinot_noir', 'Escorihuela Gascón Pinot Noir', 0.00, 'Vinos Tintos', 'Escorihuela Gascón', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Escorihuela Gascón. Elegante y fresco con perfil de frutos rojos.'),
('prod_vin_escorihuela_chardonnay', 'Escorihuela Gascón Chardonnay', 0.00, 'Vinos Blancos y Rosados', 'Escorihuela Gascón', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodega Escorihuela Gascón. Manzana verde, ananá y paso cremoso.'),
('prod_vin_escorihuela_sauvignon', 'Escorihuela Gascón Sauvignon Blanc', 0.00, 'Vinos Blancos y Rosados', 'Escorihuela Gascón', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodega Escorihuela Gascón. Cítrico, ruda y vibrante acidez.'),
('prod_vin_escorihuela_gran_res_malbec', 'Escorihuela Gascón Gran Reserva Malbec', 0.00, 'Vinos Tintos', 'Escorihuela Gascón', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Escorihuela Gascón. Malbec de guarda, concentrado y señorial.'),
('prod_vin_escorihuela_peq_prod_malbec', 'Escorihuela Pequeñas Producciones Malbec', 0.00, 'Vinos Tintos', 'Escorihuela Gascón', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Escorihuela Gascón. Partida limitada de parcelas seleccionadas.'),
('prod_vin_escorihuela_peq_prod_cab_franc', 'Escorihuela Pequeñas Producciones Cabernet Franc', 0.00, 'Vinos Tintos', 'Escorihuela Gascón', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Escorihuela Gascón. Exponente supremo de Cabernet Franc mendocino.'),

-- Bodega Catena Zapata
('prod_vin_saint_felicien_malbec', 'Saint Felicien Malbec', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Malbec histórico, elegante y balanceado.'),
('prod_vin_saint_felicien_cab_franc', 'Saint Felicien Cabernet Franc', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Aromas especiados con taninos de gran finura.'),
('prod_vin_saint_felicien_pinot_noir', 'Saint Felicien Pinot Noir', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Frutos del bosque y elegante complejidad terrosa.'),
('prod_vin_saint_felicien_sauvignon', 'Saint Felicien Sauvignon Blanc', 0.00, 'Vinos Blancos y Rosados', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Frescura mineral y notas herbáceas intensas.'),
('prod_vin_nicasia_malbec', 'Nicasia Malbec', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Viñedo Nicasia, Altamira. Concentración pura.'),
('prod_vin_nicasia_cab_franc', 'Nicasia Cabernet Franc', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Pimiento dulce, especias y madera noble.'),
('prod_vin_nicasia_red_blend', 'Nicasia Red Blend / Garnacha Blend', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Blend contemporáneo vivaz y seductor.'),
('prod_vin_dv_catena_malbec', 'D.V. Catena Malbec', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Blend de terroirs Angélica y La Pirámide.'),
('prod_vin_dv_catena_malbec_cab', 'D.V. Catena Malbec-Cabernet', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. El ensamble clásico argentino por excelencia.'),
('prod_vin_dv_catena_pinot_noir', 'D.V. Catena Pinot Noir', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Pinot Noir de viñedos de altura, sedoso y aromático.'),
('prod_vin_la_posta_bonarda', 'La Posta Bonarda', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata / Laura Catena. Bonarda jugosa de pequeños productores.'),
('prod_vin_la_posta_rose', 'La Posta Rosé', 0.00, 'Vinos Blancos y Rosados', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Rosado delicado con frescura primaveral.'),
('prod_vin_tikal_malbec', 'Tikal Malbec', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Ernesto Catena Selections. Expresión intensa y moderna del Malbec.'),
('prod_vin_angelica_zapata_malbec', 'Angélica Zapata Malbec', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Malbec Alta con prolongada crianza en barrica.'),
('prod_vin_angelica_zapata_merlot', 'Angélica Zapata Merlot', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Merlot de gran alcurnia y untuosidad.'),
('prod_vin_angelica_zapata_chardonnay', 'Angélica Zapata Chardonnay', 0.00, 'Vinos Blancos y Rosados', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodega Catena Zapata. Gran Chardonnay untuoso con notas tostadas y miel.'),
('prod_vin_catena_zapata_malbec_arg', 'Catena Zapata Malbec Argentino', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Ícono mundial del vino argentino. Historia viva en una botella.'),
('prod_vin_luca_malbec', 'Luca Malbec', 0.00, 'Vinos Tintos', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Laura Catena. Malbec de viñedos viejos de Uco, potente y definido.'),
('prod_vin_luca_chardonnay', 'Luca Chardonnay', 0.00, 'Vinos Blancos y Rosados', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Laura Catena. Chardonnay de Gualtallary de sobresaliente mineralidad.'),

-- Bodega Las Perdices
('prod_vin_perdices_malbec_750', 'Las Perdices Malbec 750ml', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices, Agrelo. Fruta roja madura y taninos dóciles.'),
('prod_vin_perdices_cabernet_750', 'Las Perdices Cabernet Sauvignon 750ml', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. Notas especiadas y estructura clásica.'),
('prod_vin_perdices_malbec_375', 'Las Perdices Malbec 375ml', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 375ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Media botella de Las Perdices Malbec, ideal para 1 comensal.'),
('prod_vin_perdices_sauvignon_750', 'Las Perdices Sauvignon Blanc 750ml', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. Exuberante perfil cítrico y pomelo rosado.'),
('prod_vin_perdices_sauvignon_375', 'Las Perdices Sauvignon Blanc 375ml', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 375ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Media botella de Sauvignon Blanc fresco y frutado.'),
('prod_vin_perdices_torrontes', 'Las Perdices Torrontés', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. Aromas a flores blancas y jazmín.'),
('prod_vin_perdices_torrontes_dulce', 'Las Perdices Torrontés Dulce', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. Dulzor equilibrado con excelente frescor.'),
('prod_vin_perdices_reserva_malbec', 'Las Perdices Reserva Malbec', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. 12 meses en barricas de roble americano y francés.'),
('prod_vin_perdices_reserva_cabernet', 'Las Perdices Reserva Cabernet Sauvignon', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. Cuerpo medio-alto con recuerdos a moca y pimienta.'),
('prod_vin_perdices_reserva_pinot_noir', 'Las Perdices Reserva Pinot Noir', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. Taninos sutiles y aromas a cereza madura.'),
('prod_vin_perdices_reserva_chardonnay', 'Las Perdices Reserva Chardonnay', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. Blanco con cuerpo y delicado tostado.'),
('prod_vin_perdices_reserva_sauvignon', 'Las Perdices Reserva Sauvignon Blanc', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. Complejidad aromática con crianza cuidada.'),
('prod_vin_don_juan_nahuel_malbec', 'Don Juan Nahuel Malbec', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Viña Las Perdices. Vino de autor homenaje al fundador.'),
('prod_vin_perdices_exp_cabernet', 'Las Perdices Exploración Cabernet Sauvignon', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Línea Exploración de terroirs no tradicionales.'),
('prod_vin_perdices_exp_charbono', 'Las Perdices Exploración Charbono', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Rareza varietal tinta de profundo color y jugosidad.'),
('prod_vin_perdices_exp_albarino', 'Las Perdices Exploración Albariño', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Albariño cultivado en Mendoza con vibrante salinidad.'),
('prod_vin_perdices_exp_riesling', 'Las Perdices Exploración Riesling', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Blanco aromático con notas florales y acidez filosa.'),
('prod_vin_perdices_exp_gewurztraminer', 'Las Perdices Exploración Gewürztraminer', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Notas especiadas, lychee y pétalos de rosa.'),
('prod_vin_perdices_exp_viognier_dulce', 'Las Perdices Exploración Viognier Dulce', 0.00, 'Vinos Blancos y Rosados', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Dulce natural delicado, notas a durazno blanco y damasco.'),
('prod_vin_perdices_ala_col_ancellotta', 'Las Perdices Ala Colorada Ancellotta', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Gama Ala Colorada. Taninos marcados y gran concentración de color.'),
('prod_vin_perdices_ala_col_cab_franc', 'Las Perdices Ala Colorada Cabernet Franc', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Gama Ala Colorada. Expresión madura de frutos rojos y tabaco.'),
('prod_vin_perdices_ala_col_tannat', 'Las Perdices Ala Colorada Tannat', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Gama Ala Colorada. Tannat mendocino potente pero amable al paladar.'),
('prod_vin_perdices_ala_col_petit_verdot', 'Las Perdices Ala Colorada Petit Verdot', 0.00, 'Vinos Tintos', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Gama Ala Colorada. Intensidad floral y frutos negros de fondo.'),

-- Bodega Salentein & Pyros
('prod_vin_portillo_malbec_750', 'Portillo Malbec', 0.00, 'Vinos Tintos', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodegas Salentein, Valle de Uco. Joven, fresco y frutado.'),
('prod_vin_portillo_sauvignon_750', 'Portillo Sauvignon Blanc', 0.00, 'Vinos Blancos y Rosados', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodegas Salentein. Blanco vivaz con notas a pomelo y hierbas.'),
('prod_vin_salentein_res_malbec_750', 'Salentein Reserva Malbec', 0.00, 'Vinos Tintos', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodegas Salentein. Malbec pionero de Uco con paso por roble.'),
('prod_vin_salentein_res_malbec_375', 'Salentein Reserva Malbec 375ml', 0.00, 'Vinos Tintos', 'Salentein & Pyros', 'Botella 375ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Media botella de Salentein Reserva Malbec.'),
('prod_vin_salentein_res_pinot_noir', 'Salentein Reserva Pinot Noir', 0.00, 'Vinos Tintos', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Bodegas Salentein. Pinot Noir de altura con gran finura aromática.'),
('prod_vin_salentein_res_chardonnay', 'Salentein Reserva Chardonnay', 0.00, 'Vinos Blancos y Rosados', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodegas Salentein. Frutas blancas maduras, manteca y vainilla.'),
('prod_vin_salentein_res_sauvignon', 'Salentein Reserva Sauvignon Blanc', 0.00, 'Vinos Blancos y Rosados', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1558001373-a75d5069b24a?w=400&q=80', 'vino', false, 3, 'Bodegas Salentein. Sauvignon de gran intensidad cítrica y mineral.'),
('prod_vin_pyros_syrah', 'Pyros Syrah', 0.00, 'Vinos Tintos', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Valle de Pedernal, San Juan. Syrah mineral de terroir extremo.'),
('prod_vin_salentein_numina_malbec', 'Salentein Numina Malbec', 0.00, 'Vinos Tintos', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Gama Numina. Uvas de las parcelas más antiguas de Finca La Pampa.'),
('prod_vin_salentein_numina_cab_franc', 'Salentein Numina Cabernet Franc', 0.00, 'Vinos Tintos', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Gama Numina. Carácter especiado con taninos maduros y redondos.'),
('prod_vin_salentein_numina_pinot_noir', 'Salentein Numina Pinot Noir', 0.00, 'Vinos Tintos', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Gama Numina. Pinot Noir sofisticado de altura privilegiada.'),
('prod_vin_salentein_primus_malbec', 'Salentein Primus Malbec', 0.00, 'Vinos Tintos', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', 'vino', false, 3, 'Vino ícono de Salentein. Selección manual y crianza prolongada.'),

-- Espumantes / Champagne
('prod_esp_baron_b_brut_nature', 'Barón B Brut Nature', 0.00, 'Espumantes', 'Barón B', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&q=80', 'vino', false, 3, 'Espumante de extrema elegancia y pureza. Cero dosaje.'),
('prod_esp_baron_b_extra_brut', 'Barón B Extra Brut', 0.00, 'Espumantes', 'Barón B', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&q=80', 'vino', false, 3, 'El clásico ícono del método tradicional en Argentina.'),
('prod_esp_alyda_extra_brut', 'Alyda Van Salentein Extra Brut', 0.00, 'Espumantes', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&q=80', 'vino', false, 3, 'Método tradicional de Bodegas Salentein con burbuja persistente.'),
('prod_esp_perdices_extra_brut', 'Las Perdices Espumante Extra Brut', 0.00, 'Espumantes', 'Las Perdices', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&q=80', 'vino', false, 3, 'Corte Chardonnay-Pinot Noir fresco y aromático.'),
('prod_esp_salentein_extra_brut', 'Salentein Espumante Extra Brut', 0.00, 'Espumantes', 'Salentein & Pyros', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&q=80', 'vino', false, 3, 'Espumante de gran frescor y notas a pan tostado.'),
('prod_esp_dv_catena_nature', 'D.V. Catena Nature', 0.00, 'Espumantes', 'Catena Zapata', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&q=80', 'vino', false, 3, 'Cuveé Prestige de viñedos de altura Catena Zapata.'),
('prod_esp_chandon_extra_brut', 'Chandon Extra Brut', 0.00, 'Espumantes', 'Chandon', 'Botella 750ml', true, 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&q=80', 'vino', false, 3, 'El espumante más elegido de la gastronomía argentina.'),

-- Botellas de Barra y Aperitivos
('prod_dest_fernet_branca_servicio', 'Fernet Branca (Servicio / Medida)', 0.00, 'Destilados', 'Aperitivos y Digestivos', 'Medida', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Medida de Fernet Branca italiano puro o con hielo.'),
('prod_dest_gancia_americano_servicio', 'Gancia Americano', 0.00, 'Destilados', 'Aperitivos', 'Medida', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Aperitivo herbáceo servido con limón y hielo.'),
('prod_dest_campari_servicio', 'Campari Milano', 0.00, 'Destilados', 'Aperitivos', 'Medida', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Aperitivo amargo rojo característico.'),
('prod_dest_carpano_rosso_servicio', 'Carpano Rosso Vermut', 0.00, 'Destilados', 'Vermut', 'Medida', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Vermut di Torino original dulce e intenso.'),
('prod_dest_carpano_bianco_servicio', 'Carpano Bianco Vermut', 0.00, 'Destilados', 'Vermut', 'Medida', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Vermut blanco aromático y perfumado.'),
('prod_dest_aperol_servicio', 'Aperol', 0.00, 'Destilados', 'Aperitivos', 'Medida', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Aperitivo italiano con notas a naranja amarga y ruibarbo.'),
('prod_dest_martini_rosso_servicio', 'Martini Rosso', 0.00, 'Destilados', 'Vermut', 'Medida', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Vermouth rojo italiano clásico.'),
('prod_dest_martini_bianco_servicio', 'Martini Bianco', 0.00, 'Destilados', 'Vermut', 'Medida', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Vermouth blanco dulce con notas a vainilla.'),
('prod_dest_martini_extra_dry_servicio', 'Martini Extra Dry', 0.00, 'Destilados', 'Vermut', 'Medida', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Vermouth seco base de coctelería.'),

-- Cócteles para Carta / Comandas
('prod_coctel_fernet_cola', 'Fernet Branca con Coca Cola', 0.00, 'Tragos y Coctelería', 'Coctelería Clásica', 'Vaso Trago Largo', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Fernet Branca servido con Coca-Cola y hielo al estilo argentino (70/30).'),
('prod_coctel_vermut_carpano_rosso', 'Vermut Carpano Rosso (con naranja y soda)', 0.00, 'Tragos y Coctelería', 'Aperitivos y Vermut', 'Copa / Vaso', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Carpano Rosso, rodaja de naranja fresca y toque de soda sifón.'),
('prod_coctel_carpano_bianco_tonic', 'Carpano Bianco Tonic', 0.00, 'Tragos y Coctelería', 'Aperitivos y Vermut', 'Copa / Vaso', true, 'https://images.unsplash.com/photo-1514218247612-9c1122aa4f7a?w=400&q=80', 'bebida', false, 2, 'Carpano Bianco, agua tónica prémium y rodaja de limón.'),
('prod_coctel_blu_gin_tonic', 'Blu Gin Tonic', 0.00, 'Tragos y Coctelería', 'Gin & Tonic', 'Copa Balón', true, 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80', 'bebida', false, 2, 'Gin Spirito Blu, agua tónica, bayas de enebro y rodaja de limón fresco.'),
('prod_coctel_vodka_sernova_sprite', 'Vodka Sernova con Sprite', 0.00, 'Tragos y Coctelería', 'Coctelería Directa', 'Vaso Trago Largo', true, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80', 'bebida', false, 2, 'Vodka Sernova servido con gaseosa lima-limón Sprite y abundante hielo.')
ON CONFLICT (id_producto) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  categoria = EXCLUDED.categoria,
  subcategoria = EXCLUDED.subcategoria,
  unidad_medida = EXCLUDED.unidad_medida,
  activo = EXCLUDED.activo,
  tipo = EXCLUDED.tipo,
  requiere_cocina = false;

-- 5. Inserción de RECETAS / ESCANDALLO (Conexión producto -> insumo)
INSERT INTO public.recetas_escandallo (id_receta, id_producto, id_insumo, cantidad_a_descontar, unidad_medida) VALUES
-- Planilla Adjunta
('esc_vin_cobos_felino_malbec', 'prod_vin_cobos_felino_malbec', 'ins_vin_cobos_felino_malbec', 1.00, 'unidades'),
('esc_vin_cobos_felino_cabernet', 'prod_vin_cobos_felino_cabernet', 'ins_vin_cobos_felino_cabernet', 1.00, 'unidades'),
('esc_vin_cobos_bramare_malbec', 'prod_vin_cobos_bramare_malbec', 'ins_vin_cobos_bramare_malbec', 1.00, 'unidades'),
('esc_vin_septima_gran_reserva', 'prod_vin_septima_gran_reserva', 'ins_vin_septima_gran_reserva', 1.00, 'unidades'),
('esc_vin_bressia_lagrima_canela', 'prod_vin_bressia_lagrima_canela', 'ins_vin_bressia_lagrima_canela', 1.00, 'unidades'),
('esc_vin_hermandad_malbec', 'prod_vin_hermandad_malbec', 'ins_vin_hermandad_malbec', 1.00, 'unidades'),
('esc_vin_hermandad_blend', 'prod_vin_hermandad_blend', 'ins_vin_hermandad_blend', 1.00, 'unidades'),

-- Cervezas y Destilados
('esc_cerveza_stella_lata_475', 'prod_cerveza_stella_lata_475', 'ins_cerveza_stella_lata_475', 1.00, 'unidades'),
('esc_cerveza_corona_porron_330', 'prod_cerveza_corona_porron_330', 'ins_cerveza_corona_porron_330', 1.00, 'unidades'),
('esc_dest_beefeater_750', 'prod_dest_beefeater_750', 'ins_gin_beefeater_750', 1.00, 'unidades'),
('esc_dest_bombay_750', 'prod_dest_bombay_750', 'ins_gin_bombay_750', 1.00, 'unidades'),
('esc_dest_jw_red_750', 'prod_dest_jw_red_750', 'ins_whisky_jw_red_750', 1.00, 'unidades'),
('esc_dest_jw_black_750', 'prod_dest_jw_black_750', 'ins_whisky_jw_black_750', 1.00, 'unidades'),
('esc_dest_jack_daniels_750', 'prod_dest_jack_daniels_750', 'ins_whisky_jack_daniels_750', 1.00, 'unidades'),
('esc_dest_jameson_750', 'prod_dest_jameson_750', 'ins_whisky_jameson_750', 1.00, 'unidades'),

-- Bodega La Rural
('esc_vin_trumpeter_malbec', 'prod_vin_trumpeter_malbec', 'ins_vin_trumpeter_malbec', 1.00, 'unidades'),
('esc_vin_trumpeter_red_blend', 'prod_vin_trumpeter_red_blend', 'ins_vin_trumpeter_red_blend', 1.00, 'unidades'),
('esc_vin_trumpeter_chardonnay', 'prod_vin_trumpeter_chardonnay', 'ins_vin_trumpeter_chardonnay', 1.00, 'unidades'),
('esc_vin_trumpeter_doux', 'prod_vin_trumpeter_doux', 'ins_vin_trumpeter_doux', 1.00, 'unidades'),
('esc_vin_rutini_malbec', 'prod_vin_rutini_malbec', 'ins_vin_rutini_malbec', 1.00, 'unidades'),
('esc_vin_rutini_merlot', 'prod_vin_rutini_merlot', 'ins_vin_rutini_merlot', 1.00, 'unidades'),

-- Bodega Escorihuela Gascón
('esc_vin_escorihuela_malbec', 'prod_vin_escorihuela_malbec', 'ins_vin_escorihuela_malbec', 1.00, 'unidades'),
('esc_vin_escorihuela_cabernet', 'prod_vin_escorihuela_cabernet', 'ins_vin_escorihuela_cabernet', 1.00, 'unidades'),
('esc_vin_escorihuela_pinot_noir', 'prod_vin_escorihuela_pinot_noir', 'ins_vin_escorihuela_pinot_noir', 1.00, 'unidades'),
('esc_vin_escorihuela_chardonnay', 'prod_vin_escorihuela_chardonnay', 'ins_vin_escorihuela_chardonnay', 1.00, 'unidades'),
('esc_vin_escorihuela_sauvignon', 'prod_vin_escorihuela_sauvignon', 'ins_vin_escorihuela_sauvignon', 1.00, 'unidades'),
('esc_vin_escorihuela_gran_res_malbec', 'prod_vin_escorihuela_gran_res_malbec', 'ins_vin_escorihuela_gran_res_malbec', 1.00, 'unidades'),
('esc_vin_escorihuela_peq_prod_malbec', 'prod_vin_escorihuela_peq_prod_malbec', 'ins_vin_escorihuela_peq_prod_malbec', 1.00, 'unidades'),
('esc_vin_escorihuela_peq_prod_cab_franc', 'prod_vin_escorihuela_peq_prod_cab_franc', 'ins_vin_escorihuela_peq_prod_cab_franc', 1.00, 'unidades'),

-- Bodega Catena Zapata
('esc_vin_saint_felicien_malbec', 'prod_vin_saint_felicien_malbec', 'ins_vin_saint_felicien_malbec', 1.00, 'unidades'),
('esc_vin_saint_felicien_cab_franc', 'prod_vin_saint_felicien_cab_franc', 'ins_vin_saint_felicien_cab_franc', 1.00, 'unidades'),
('esc_vin_saint_felicien_pinot_noir', 'prod_vin_saint_felicien_pinot_noir', 'ins_vin_saint_felicien_pinot_noir', 1.00, 'unidades'),
('esc_vin_saint_felicien_sauvignon', 'prod_vin_saint_felicien_sauvignon', 'ins_vin_saint_felicien_sauvignon', 1.00, 'unidades'),
('esc_vin_nicasia_malbec', 'prod_vin_nicasia_malbec', 'ins_vin_nicasia_malbec', 1.00, 'unidades'),
('esc_vin_nicasia_cab_franc', 'prod_vin_nicasia_cab_franc', 'ins_vin_nicasia_cab_franc', 1.00, 'unidades'),
('esc_vin_nicasia_red_blend', 'prod_vin_nicasia_red_blend', 'ins_vin_nicasia_red_blend', 1.00, 'unidades'),
('esc_vin_dv_catena_malbec', 'prod_vin_dv_catena_malbec', 'ins_vin_dv_catena_malbec', 1.00, 'unidades'),
('esc_vin_dv_catena_malbec_cab', 'prod_vin_dv_catena_malbec_cab', 'ins_vin_dv_catena_malbec_cab', 1.00, 'unidades'),
('esc_vin_dv_catena_pinot_noir', 'prod_vin_dv_catena_pinot_noir', 'ins_vin_dv_catena_pinot_noir', 1.00, 'unidades'),
('esc_vin_la_posta_bonarda', 'prod_vin_la_posta_bonarda', 'ins_vin_la_posta_bonarda', 1.00, 'unidades'),
('esc_vin_la_posta_rose', 'prod_vin_la_posta_rose', 'ins_vin_la_posta_rose', 1.00, 'unidades'),
('esc_vin_tikal_malbec', 'prod_vin_tikal_malbec', 'ins_vin_tikal_malbec', 1.00, 'unidades'),
('esc_vin_angelica_zapata_malbec', 'prod_vin_angelica_zapata_malbec', 'ins_vin_angelica_zapata_malbec', 1.00, 'unidades'),
('esc_vin_angelica_zapata_merlot', 'prod_vin_angelica_zapata_merlot', 'ins_vin_angelica_zapata_merlot', 1.00, 'unidades'),
('esc_vin_angelica_zapata_chardonnay', 'prod_vin_angelica_zapata_chardonnay', 'ins_vin_angelica_zapata_chardonnay', 1.00, 'unidades'),
('esc_vin_catena_zapata_malbec_arg', 'prod_vin_catena_zapata_malbec_arg', 'ins_vin_catena_zapata_malbec_arg', 1.00, 'unidades'),
('esc_vin_luca_malbec', 'prod_vin_luca_malbec', 'ins_vin_luca_malbec', 1.00, 'unidades'),
('esc_vin_luca_chardonnay', 'prod_vin_luca_chardonnay', 'ins_vin_luca_chardonnay', 1.00, 'unidades'),

-- Bodega Las Perdices
('esc_vin_perdices_malbec_750', 'prod_vin_perdices_malbec_750', 'ins_vin_perdices_malbec_750', 1.00, 'unidades'),
('esc_vin_perdices_cabernet_750', 'prod_vin_perdices_cabernet_750', 'ins_vin_perdices_cabernet_750', 1.00, 'unidades'),
('esc_vin_perdices_malbec_375', 'prod_vin_perdices_malbec_375', 'ins_vin_perdices_malbec_375', 1.00, 'unidades'),
('esc_vin_perdices_sauvignon_750', 'prod_vin_perdices_sauvignon_750', 'ins_vin_perdices_sauvignon_750', 1.00, 'unidades'),
('esc_vin_perdices_sauvignon_375', 'prod_vin_perdices_sauvignon_375', 'ins_vin_perdices_sauvignon_375', 1.00, 'unidades'),
('esc_vin_perdices_torrontes', 'prod_vin_perdices_torrontes', 'ins_vin_perdices_torrontes', 1.00, 'unidades'),
('esc_vin_perdices_torrontes_dulce', 'prod_vin_perdices_torrontes_dulce', 'ins_vin_perdices_torrontes_dulce', 1.00, 'unidades'),
('esc_vin_perdices_reserva_malbec', 'prod_vin_perdices_reserva_malbec', 'ins_vin_perdices_reserva_malbec', 1.00, 'unidades'),
('esc_vin_perdices_reserva_cabernet', 'prod_vin_perdices_reserva_cabernet', 'ins_vin_perdices_reserva_cabernet', 1.00, 'unidades'),
('esc_vin_perdices_reserva_pinot_noir', 'prod_vin_perdices_reserva_pinot_noir', 'ins_vin_perdices_reserva_pinot_noir', 1.00, 'unidades'),
('esc_vin_perdices_reserva_chardonnay', 'prod_vin_perdices_reserva_chardonnay', 'ins_vin_perdices_reserva_chardonnay', 1.00, 'unidades'),
('esc_vin_perdices_reserva_sauvignon', 'prod_vin_perdices_reserva_sauvignon', 'ins_vin_perdices_reserva_sauvignon', 1.00, 'unidades'),
('esc_vin_don_juan_nahuel_malbec', 'prod_vin_don_juan_nahuel_malbec', 'ins_vin_don_juan_nahuel_malbec', 1.00, 'unidades'),
('esc_vin_perdices_exp_cabernet', 'prod_vin_perdices_exp_cabernet', 'ins_vin_perdices_exp_cabernet', 1.00, 'unidades'),
('esc_vin_perdices_exp_charbono', 'prod_vin_perdices_exp_charbono', 'ins_vin_perdices_exp_charbono', 1.00, 'unidades'),
('esc_vin_perdices_exp_albarino', 'prod_vin_perdices_exp_albarino', 'ins_vin_perdices_exp_albarino', 1.00, 'unidades'),
('esc_vin_perdices_exp_riesling', 'prod_vin_perdices_exp_riesling', 'ins_vin_perdices_exp_riesling', 1.00, 'unidades'),
('esc_vin_perdices_exp_gewurztraminer', 'prod_vin_perdices_exp_gewurztraminer', 'ins_vin_perdices_exp_gewurztraminer', 1.00, 'unidades'),
('esc_vin_perdices_exp_viognier_dulce', 'prod_vin_perdices_exp_viognier_dulce', 'ins_vin_perdices_exp_viognier_dulce', 1.00, 'unidades'),
('esc_vin_perdices_ala_col_ancellotta', 'prod_vin_perdices_ala_col_ancellotta', 'ins_vin_perdices_ala_col_ancellotta', 1.00, 'unidades'),
('esc_vin_perdices_ala_col_cab_franc', 'prod_vin_perdices_ala_col_cab_franc', 'ins_vin_perdices_ala_col_cab_franc', 1.00, 'unidades'),
('esc_vin_perdices_ala_col_tannat', 'prod_vin_perdices_ala_col_tannat', 'ins_vin_perdices_ala_col_tannat', 1.00, 'unidades'),
('esc_vin_perdices_ala_col_petit_verdot', 'prod_vin_perdices_ala_col_petit_verdot', 'ins_vin_perdices_ala_col_petit_verdot', 1.00, 'unidades'),

-- Bodega Salentein & Pyros
('esc_vin_portillo_malbec_750', 'prod_vin_portillo_malbec_750', 'ins_vin_portillo_malbec_750', 1.00, 'unidades'),
('esc_vin_portillo_sauvignon_750', 'prod_vin_portillo_sauvignon_750', 'ins_vin_portillo_sauvignon_750', 1.00, 'unidades'),
('esc_vin_salentein_res_malbec_750', 'prod_vin_salentein_res_malbec_750', 'ins_vin_salentein_res_malbec_750', 1.00, 'unidades'),
('esc_vin_salentein_res_malbec_375', 'prod_vin_salentein_res_malbec_375', 'ins_vin_salentein_res_malbec_375', 1.00, 'unidades'),
('esc_vin_salentein_res_pinot_noir', 'prod_vin_salentein_res_pinot_noir', 'ins_vin_salentein_res_pinot_noir', 1.00, 'unidades'),
('esc_vin_salentein_res_chardonnay', 'prod_vin_salentein_res_chardonnay', 'ins_vin_salentein_res_chardonnay', 1.00, 'unidades'),
('esc_vin_salentein_res_sauvignon', 'prod_vin_salentein_res_sauvignon', 'ins_vin_salentein_res_sauvignon', 1.00, 'unidades'),
('esc_vin_pyros_syrah', 'prod_vin_pyros_syrah', 'ins_vin_pyros_syrah', 1.00, 'unidades'),
('esc_vin_salentein_numina_malbec', 'prod_vin_salentein_numina_malbec', 'ins_vin_salentein_numina_malbec', 1.00, 'unidades'),
('esc_vin_salentein_numina_cab_franc', 'prod_vin_salentein_numina_cab_franc', 'ins_vin_salentein_numina_cab_franc', 1.00, 'unidades'),
('esc_vin_salentein_numina_pinot_noir', 'prod_vin_salentein_numina_pinot_noir', 'ins_vin_salentein_numina_pinot_noir', 1.00, 'unidades'),
('esc_vin_salentein_primus_malbec', 'prod_vin_salentein_primus_malbec', 'ins_vin_salentein_primus_malbec', 1.00, 'unidades'),

-- Espumantes / Champagne
('esc_esp_baron_b_brut_nature', 'prod_esp_baron_b_brut_nature', 'ins_esp_baron_b_brut_nature', 1.00, 'unidades'),
('esc_esp_baron_b_extra_brut', 'prod_esp_baron_b_extra_brut', 'ins_esp_baron_b_extra_brut', 1.00, 'unidades'),
('esc_esp_alyda_extra_brut', 'prod_esp_alyda_extra_brut', 'ins_esp_alyda_extra_brut', 1.00, 'unidades'),
('esc_esp_perdices_extra_brut', 'prod_esp_perdices_extra_brut', 'ins_esp_perdices_extra_brut', 1.00, 'unidades'),
('esc_esp_salentein_extra_brut', 'prod_esp_salentein_extra_brut', 'ins_esp_salentein_extra_brut', 1.00, 'unidades'),
('esc_esp_dv_catena_nature', 'prod_esp_dv_catena_nature', 'ins_esp_dv_catena_nature', 1.00, 'unidades'),
('esc_esp_chandon_extra_brut', 'prod_esp_chandon_extra_brut', 'ins_esp_chandon_extra_brut', 1.00, 'unidades'),

-- Botellas de Barra y Aperitivos
('esc_dest_fernet_branca_servicio', 'prod_dest_fernet_branca_servicio', 'ins_fernet_branca_bot', 0.07, 'unidades'),
('esc_dest_gancia_americano_servicio', 'prod_dest_gancia_americano_servicio', 'ins_gancia_americano_bot', 0.08, 'unidades'),
('esc_dest_campari_servicio', 'prod_dest_campari_servicio', 'ins_campari_bot', 0.08, 'unidades'),
('esc_dest_carpano_rosso_servicio', 'prod_dest_carpano_rosso_servicio', 'ins_carpano_rosso_bot', 0.08, 'unidades'),
('esc_dest_carpano_bianco_servicio', 'prod_dest_carpano_bianco_servicio', 'ins_carpano_bianco_bot', 0.08, 'unidades'),
('esc_dest_aperol_servicio', 'prod_dest_aperol_servicio', 'ins_aperol_bot', 0.08, 'unidades'),
('esc_dest_martini_rosso_servicio', 'prod_dest_martini_rosso_servicio', 'ins_martini_rosso_bot', 0.08, 'unidades'),
('esc_dest_martini_bianco_servicio', 'prod_dest_martini_bianco_servicio', 'ins_martini_bianco_bot', 0.08, 'unidades'),
('esc_dest_martini_extra_dry_servicio', 'prod_dest_martini_extra_dry_servicio', 'ins_martini_extra_dry_bot', 0.08, 'unidades'),

-- Cócteles para Carta / Comandas
('esc_coctel_fernet_cola', 'prod_coctel_fernet_cola', 'ins_fernet_branca_bot', 0.10, 'unidades'),
('esc_coctel_vermut_carpano_rosso', 'prod_coctel_vermut_carpano_rosso', 'ins_carpano_rosso_bot', 0.10, 'unidades'),
('esc_coctel_carpano_bianco_tonic', 'prod_coctel_carpano_bianco_tonic', 'ins_carpano_bianco_bot', 0.10, 'unidades'),
('esc_coctel_blu_gin_tonic', 'prod_coctel_blu_gin_tonic', 'ins_gin_spirito_blu_bot', 0.08, 'unidades'),
('esc_coctel_vodka_sernova_sprite', 'prod_coctel_vodka_sernova_sprite', 'ins_vodka_sernova_bot', 0.08, 'unidades')
ON CONFLICT (id_receta) DO UPDATE SET
  cantidad_a_descontar = EXCLUDED.cantidad_a_descontar,
  unidad_medida = EXCLUDED.unidad_medida;
