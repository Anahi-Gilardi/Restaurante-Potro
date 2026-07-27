BEGIN;

-- Caja y facturacion requieren un rol operativo propio. Los mozos conservan
-- acceso a comandas y mesas, pero ya no pueden registrar cobros ni cierres.
ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('superadmin', 'administrador', 'cajero', 'mozo', 'cocina'));

DO $$
DECLARE
  table_name TEXT;
  roles_literal TEXT := quote_literal(ARRAY['superadmin', 'administrador', 'cajero']::TEXT[]::TEXT);
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'facturas',
    'pagos',
    'cierres_caja',
    'movimientos_caja_chica',
    'clientes'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS app_insert_roles ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_update_roles ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_delete_roles ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY app_insert_roles ON public.%I FOR INSERT TO authenticated WITH CHECK (public.app_has_any_role(%s::TEXT[]))',
      table_name,
      roles_literal
    );
    EXECUTE format(
      'CREATE POLICY app_update_roles ON public.%I FOR UPDATE TO authenticated USING (public.app_has_any_role(%s::TEXT[])) WITH CHECK (public.app_has_any_role(%s::TEXT[]))',
      table_name,
      roles_literal,
      roles_literal
    );
    EXECUTE format(
      'CREATE POLICY app_delete_roles ON public.%I FOR DELETE TO authenticated USING (public.app_has_any_role(%s::TEXT[]))',
      table_name,
      roles_literal
    );
  END LOOP;
END
$$;

COMMIT;
