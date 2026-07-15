-- Cierra las políticas demo que permitían acceso anónimo a datos operativos.
-- Las credenciales ARCA y de login ya tienen políticas más restrictivas y no
-- forman parte de esta lista.

BEGIN;

DO $$
DECLARE
  table_name TEXT;
  policy_record RECORD;
  operational_tables CONSTANT TEXT[] := ARRAY[
    'categorias',
    'usuarios',
    'mesas',
    'insumos',
    'productos_menu',
    'recetas_escandallo',
    'pedidos_cabecera',
    'pedido_detalle',
    'mermas',
    'auditoria_eventos',
    'proveedores',
    'promociones',
    'reservas',
    'facturas',
    'pagos',
    'cierres_caja',
    'movimientos_inventario',
    'backups',
    'clientes',
    'movimientos_caja_chica',
    'historial_costos_insumos',
    'configuracion'
  ];
BEGIN
  FOREACH table_name IN ARRAY operational_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    -- Elimina las políticas históricas "demo" y cualquier variante permisiva.
    FOR policy_record IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        policy_record.policyname,
        table_name
      );
    END LOOP;

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', table_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY app_authenticated_access ON public.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)',
      table_name
    );
  END LOOP;
END
$$;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
