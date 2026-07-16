-- Evita que la operacion cotidiana agregue nuevas inconsistencias sin alterar
-- los duplicados y perfiles historicos que todavia requieren revision humana.

CREATE OR REPLACE FUNCTION public.prevent_new_duplicate_ingredient()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR lower(btrim(NEW.nombre)) IS DISTINCT FROM lower(btrim(OLD.nombre)) THEN
    IF EXISTS (
      SELECT 1
      FROM public.insumos existing
      WHERE existing.id_insumo <> NEW.id_insumo
        AND lower(btrim(existing.nombre)) = lower(btrim(NEW.nombre))
    ) THEN
      RAISE EXCEPTION 'Ya existe un insumo con el mismo nombre.' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_new_duplicate_ingredient ON public.insumos;
CREATE TRIGGER prevent_new_duplicate_ingredient
  BEFORE INSERT OR UPDATE OF nombre ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.prevent_new_duplicate_ingredient();

CREATE OR REPLACE FUNCTION public.prevent_new_unlinked_active_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.activo, true)
     AND NEW.auth_user_id IS NULL
     AND (
       TG_OP = 'INSERT'
       OR NOT COALESCE(OLD.activo, false)
       OR OLD.auth_user_id IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Un usuario activo nuevo necesita una identidad de autenticacion.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_new_unlinked_active_user ON public.usuarios;
CREATE TRIGGER prevent_new_unlinked_active_user
  BEFORE INSERT OR UPDATE OF activo, auth_user_id ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.prevent_new_unlinked_active_user();

REVOKE ALL ON FUNCTION public.prevent_new_duplicate_ingredient() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_new_unlinked_active_user() FROM PUBLIC;

COMMENT ON FUNCTION public.prevent_new_duplicate_ingredient() IS
  'Impide nuevos nombres de insumos duplicados; permite actualizar stock de duplicados historicos.';
COMMENT ON FUNCTION public.prevent_new_unlinked_active_user() IS
  'Impide crear, reactivar o desvincular usuarios activos sin Supabase Auth.';
