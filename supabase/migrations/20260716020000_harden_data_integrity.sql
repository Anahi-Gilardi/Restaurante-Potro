-- Limpieza conservadora e integridad relacional para las tablas operativas.
-- Los datos financieros huérfanos se preservan en una cola de conciliación.

BEGIN;

CREATE TABLE IF NOT EXISTS public.pagos_integridad_revision (
  id_pago TEXT PRIMARY KEY,
  id_factura_original TEXT,
  monto NUMERIC NOT NULL,
  metodo TEXT NOT NULL,
  fecha_original TIMESTAMPTZ,
  motivo TEXT NOT NULL,
  datos_originales JSONB NOT NULL DEFAULT '{}'::JSONB,
  detectado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revisado BOOLEAN NOT NULL DEFAULT false,
  observaciones TEXT
);

COMMENT ON TABLE public.pagos_integridad_revision IS
  'Pagos preservados fuera de la operatoria por carecer de comprobante asociado; requieren conciliacion administrativa.';

INSERT INTO public.pagos_integridad_revision (
  id_pago,
  id_factura_original,
  monto,
  metodo,
  fecha_original,
  motivo,
  datos_originales
)
SELECT
  p.id_pago,
  p.id_factura,
  p.monto,
  p.metodo,
  p.fecha,
  'Factura o ticket interno inexistente al ejecutar la auditoria de integridad',
  to_jsonb(p)
FROM public.pagos p
LEFT JOIN public.facturas f ON f.id_factura = p.id_factura
WHERE p.id_factura IS NOT NULL
  AND f.id_factura IS NULL
ON CONFLICT (id_pago) DO NOTHING;

DELETE FROM public.pagos p
USING public.pagos_integridad_revision r
WHERE r.id_pago = p.id_pago;

-- Este registro de semilla descontaba queso azul dos veces. Se elimina la
-- segunda fila incorrecta; el insumo nueces debe darse de alta con stock real
-- antes de incorporarlo al escandallo.
DELETE FROM public.recetas_escandallo
WHERE id_receta = 'esc_ent_peras_nuec'
  AND id_producto = 'prod_ent_peras_quesoazul'
  AND id_insumo = 'ins_queso_azul'
  AND cantidad_a_descontar = 20;

-- Conserva el producto legado para trazabilidad, pero evita que aparezca dos
-- veces en la carta cuando existe el producto canónico con receta de stock.
UPDATE public.productos_menu legacy
SET activo = false
WHERE legacy.id_producto = 'prod_vin_trumpeter_botella'
  AND EXISTS (
    SELECT 1
    FROM public.productos_menu canonical
    JOIN public.recetas_escandallo recipe
      ON recipe.id_producto = canonical.id_producto
    WHERE canonical.id_producto = 'prod_vin_trumpeter_malbec'
      AND lower(trim(canonical.nombre)) = lower(trim(legacy.nombre))
      AND canonical.precio_venta = legacy.precio_venta
  );

ALTER TABLE public.productos_menu
  DROP CONSTRAINT IF EXISTS productos_menu_nombre_no_vacio,
  DROP CONSTRAINT IF EXISTS productos_menu_precio_no_negativo,
  ADD CONSTRAINT productos_menu_nombre_no_vacio CHECK (length(trim(nombre)) > 0),
  ADD CONSTRAINT productos_menu_precio_no_negativo CHECK (precio_venta >= 0);

ALTER TABLE public.insumos
  DROP CONSTRAINT IF EXISTS insumos_nombre_no_vacio,
  DROP CONSTRAINT IF EXISTS insumos_stock_no_negativo,
  DROP CONSTRAINT IF EXISTS insumos_minimo_no_negativo,
  DROP CONSTRAINT IF EXISTS insumos_costo_no_negativo,
  ADD CONSTRAINT insumos_nombre_no_vacio CHECK (length(trim(nombre)) > 0),
  ADD CONSTRAINT insumos_stock_no_negativo CHECK (stock_actual >= 0),
  ADD CONSTRAINT insumos_minimo_no_negativo CHECK (stock_minimo >= 0),
  ADD CONSTRAINT insumos_costo_no_negativo CHECK (costo_unitario IS NULL OR costo_unitario >= 0);

ALTER TABLE public.recetas_escandallo
  DROP CONSTRAINT IF EXISTS recetas_cantidad_positiva,
  DROP CONSTRAINT IF EXISTS recetas_producto_fkey,
  DROP CONSTRAINT IF EXISTS recetas_insumo_fkey,
  ADD CONSTRAINT recetas_cantidad_positiva CHECK (cantidad_a_descontar > 0),
  ADD CONSTRAINT recetas_producto_fkey FOREIGN KEY (id_producto)
    REFERENCES public.productos_menu(id_producto) ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT recetas_insumo_fkey FOREIGN KEY (id_insumo)
    REFERENCES public.insumos(id_insumo) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS recetas_producto_insumo_unique
  ON public.recetas_escandallo (id_producto, id_insumo);

ALTER TABLE public.mesas
  DROP CONSTRAINT IF EXISTS mesas_capacidad_positiva,
  DROP CONSTRAINT IF EXISTS mesas_comensales_validos,
  ADD CONSTRAINT mesas_capacidad_positiva CHECK (capacidad >= 1),
  ADD CONSTRAINT mesas_comensales_validos CHECK (
    COALESCE(comensales_actuales, 0) >= 0
    AND COALESCE(comensales_actuales, 0) <= capacidad
  );

ALTER TABLE public.pagos
  DROP CONSTRAINT IF EXISTS pagos_id_factura_fkey,
  DROP CONSTRAINT IF EXISTS pagos_monto_positivo,
  ADD CONSTRAINT pagos_id_factura_fkey FOREIGN KEY (id_factura)
    REFERENCES public.facturas(id_factura) ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT pagos_monto_positivo CHECK (monto > 0);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_normalized_unique
  ON public.usuarios (lower(trim(username)))
  WHERE username IS NOT NULL AND length(trim(username)) > 0;

ALTER TABLE public.pagos_integridad_revision ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pagos_integridad_revision FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON TABLE public.pagos_integridad_revision TO authenticated;
DROP POLICY IF EXISTS app_authenticated_access ON public.pagos_integridad_revision;
CREATE POLICY app_authenticated_access
  ON public.pagos_integridad_revision
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
