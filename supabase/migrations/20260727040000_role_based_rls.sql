BEGIN;

-- Resolve the application role from the Supabase Auth identity. SECURITY
-- DEFINER avoids recursive RLS evaluation on usuarios while returning only a
-- boolean permission decision.
CREATE OR REPLACE FUNCTION public.app_has_any_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND u.rol = ANY(allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.app_has_any_role(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_has_any_role(TEXT[]) TO authenticated;

DO $$
DECLARE
  table_name TEXT;
  readable_tables CONSTANT TEXT[] := ARRAY[
    'categorias',
    'usuarios',
    'mesas',
    'insumos',
    'productos_menu',
    'recetas_escandallo',
    'pedidos_cabecera',
    'pedido_detalle',
    'mermas',
    'proveedores',
    'promociones',
    'reservas',
    'facturas',
    'pagos',
    'cierres_caja',
    'movimientos_inventario',
    'clientes',
    'movimientos_caja_chica',
    'historial_costos_insumos'
  ];
BEGIN
  FOREACH table_name IN ARRAY readable_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_authenticated_access ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_read_authenticated ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY app_read_authenticated ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)',
      table_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  rule RECORD;
  roles_literal TEXT;
BEGIN
  FOR rule IN
    SELECT *
    FROM (
      VALUES
        ('categorias', ARRAY['superadmin', 'administrador']::TEXT[]),
        ('usuarios', ARRAY['superadmin', 'administrador']::TEXT[]),
        ('mesas', ARRAY['superadmin', 'administrador', 'mozo']::TEXT[]),
        ('insumos', ARRAY['superadmin', 'administrador', 'cocina']::TEXT[]),
        ('productos_menu', ARRAY['superadmin', 'administrador']::TEXT[]),
        ('recetas_escandallo', ARRAY['superadmin', 'administrador']::TEXT[]),
        ('pedidos_cabecera', ARRAY['superadmin', 'administrador', 'mozo', 'cocina']::TEXT[]),
        ('pedido_detalle', ARRAY['superadmin', 'administrador', 'mozo', 'cocina']::TEXT[]),
        ('mermas', ARRAY['superadmin', 'administrador', 'cocina']::TEXT[]),
        ('proveedores', ARRAY['superadmin', 'administrador']::TEXT[]),
        ('promociones', ARRAY['superadmin', 'administrador']::TEXT[]),
        ('reservas', ARRAY['superadmin', 'administrador', 'mozo']::TEXT[]),
        ('facturas', ARRAY['superadmin', 'administrador', 'mozo']::TEXT[]),
        ('pagos', ARRAY['superadmin', 'administrador', 'mozo']::TEXT[]),
        ('cierres_caja', ARRAY['superadmin', 'administrador', 'mozo']::TEXT[]),
        ('movimientos_inventario', ARRAY['superadmin', 'administrador', 'cocina']::TEXT[]),
        ('clientes', ARRAY['superadmin', 'administrador', 'mozo']::TEXT[]),
        ('movimientos_caja_chica', ARRAY['superadmin', 'administrador', 'mozo']::TEXT[]),
        ('historial_costos_insumos', ARRAY['superadmin', 'administrador', 'cocina']::TEXT[])
    ) AS rules(table_name, allowed_roles)
  LOOP
    IF to_regclass(format('public.%I', rule.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    roles_literal := quote_literal(rule.allowed_roles::TEXT);
    EXECUTE format('DROP POLICY IF EXISTS app_insert_roles ON public.%I', rule.table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_update_roles ON public.%I', rule.table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_delete_roles ON public.%I', rule.table_name);
    EXECUTE format(
      'CREATE POLICY app_insert_roles ON public.%I FOR INSERT TO authenticated WITH CHECK (public.app_has_any_role(%s::TEXT[]))',
      rule.table_name,
      roles_literal
    );
    EXECUTE format(
      'CREATE POLICY app_update_roles ON public.%I FOR UPDATE TO authenticated USING (public.app_has_any_role(%s::TEXT[])) WITH CHECK (public.app_has_any_role(%s::TEXT[]))',
      rule.table_name,
      roles_literal,
      roles_literal
    );
    EXECUTE format(
      'CREATE POLICY app_delete_roles ON public.%I FOR DELETE TO authenticated USING (public.app_has_any_role(%s::TEXT[]))',
      rule.table_name,
      roles_literal
    );
  END LOOP;
END
$$;

-- Audit events are appendable by every active operator, but only management
-- can read, correct or remove them.
ALTER TABLE public.auditoria_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_authenticated_access ON public.auditoria_eventos;
DROP POLICY IF EXISTS app_read_authenticated ON public.auditoria_eventos;
DROP POLICY IF EXISTS app_insert_roles ON public.auditoria_eventos;
DROP POLICY IF EXISTS app_update_roles ON public.auditoria_eventos;
DROP POLICY IF EXISTS app_delete_roles ON public.auditoria_eventos;
DROP POLICY IF EXISTS app_audit_read ON public.auditoria_eventos;
DROP POLICY IF EXISTS app_audit_insert ON public.auditoria_eventos;
DROP POLICY IF EXISTS app_audit_update ON public.auditoria_eventos;
DROP POLICY IF EXISTS app_audit_delete ON public.auditoria_eventos;

CREATE POLICY app_audit_read
ON public.auditoria_eventos
FOR SELECT TO authenticated
USING (public.app_has_any_role(ARRAY['superadmin', 'administrador']));

CREATE POLICY app_audit_insert
ON public.auditoria_eventos
FOR INSERT TO authenticated
WITH CHECK (
  public.app_has_any_role(ARRAY['superadmin', 'administrador', 'mozo', 'cocina'])
  AND (created_by IS NULL OR created_by = auth.uid())
);

CREATE POLICY app_audit_update
ON public.auditoria_eventos
FOR UPDATE TO authenticated
USING (public.app_has_any_role(ARRAY['superadmin', 'administrador']))
WITH CHECK (public.app_has_any_role(ARRAY['superadmin', 'administrador']));

CREATE POLICY app_audit_delete
ON public.auditoria_eventos
FOR DELETE TO authenticated
USING (public.app_has_any_role(ARRAY['superadmin', 'administrador']));

-- Backups and configuration are management-only in both directions.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['backups', 'configuracion'] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_authenticated_access ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_management_only ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY app_management_only ON public.%I FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY[''superadmin'', ''administrador''])) WITH CHECK (public.app_has_any_role(ARRAY[''superadmin'', ''administrador'']))',
      table_name
    );
  END LOOP;
END
$$;

-- Reconciliation overrides affect the interpretation of historical payments.
-- Operators may not approve or rewrite those exceptions.
DO $$
BEGIN
  IF to_regclass('public.pagos_integridad_revision') IS NOT NULL THEN
    ALTER TABLE public.pagos_integridad_revision ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.pagos_integridad_revision FROM authenticated;
    GRANT SELECT, UPDATE ON TABLE public.pagos_integridad_revision TO authenticated;

    DROP POLICY IF EXISTS app_authenticated_access
      ON public.pagos_integridad_revision;
    DROP POLICY IF EXISTS app_integrity_review_read
      ON public.pagos_integridad_revision;
    DROP POLICY IF EXISTS app_integrity_review_update
      ON public.pagos_integridad_revision;

    CREATE POLICY app_integrity_review_read
      ON public.pagos_integridad_revision
      FOR SELECT TO authenticated
      USING (public.app_has_any_role(ARRAY['superadmin', 'administrador']));

    CREATE POLICY app_integrity_review_update
      ON public.pagos_integridad_revision
      FOR UPDATE TO authenticated
      USING (public.app_has_any_role(ARRAY['superadmin', 'administrador']))
      WITH CHECK (public.app_has_any_role(ARRAY['superadmin', 'administrador']));
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
