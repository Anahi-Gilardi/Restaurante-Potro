BEGIN;

ALTER TABLE public.promociones
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'descuento_directo',
  ADD COLUMN IF NOT EXISTS dias_vigentes TEXT NOT NULL DEFAULT 'Todos los días';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.promociones'::regclass
      AND conname = 'promociones_tipo_supported_check'
  ) THEN
    ALTER TABLE public.promociones
      ADD CONSTRAINT promociones_tipo_supported_check
      CHECK (tipo IN ('happy_hour', 'combo', 'descuento_directo')) NOT VALID;
  END IF;
END
$$;

COMMENT ON COLUMN public.promociones.tipo IS
  'Clasificación administrativa. Solo descuento_directo tiene cálculo porcentual operativo.';
COMMENT ON COLUMN public.promociones.dias_vigentes IS
  'Vigencia informativa; no implica aplicación automática en Caja.';

NOTIFY pgrst, 'reload schema';

COMMIT;
