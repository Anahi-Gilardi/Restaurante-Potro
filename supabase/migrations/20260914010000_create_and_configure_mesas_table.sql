-- =============================================================================
-- MIGRACIÓN SUPABASE: CREACIÓN Y CONFIGURACIÓN COMPLETA DE TABLA 'mesas'
-- Sistema Gestor Gastronómico - El Patrón / Bella Oriana
-- =============================================================================

-- 1. CREACIÓN DE LA TABLA 'mesas'
CREATE TABLE IF NOT EXISTS public.mesas (
  id_mesa INT PRIMARY KEY,
  numero_mesa TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'libre' CHECK (estado IN ('libre', 'ocupada', 'esperando_cuenta', 'reservada', 'limpiando', 'unida', 'sucia')),
  comensales INT DEFAULT NULL,
  comensales_actuales INT DEFAULT NULL,
  capacidad INT NOT NULL DEFAULT 2,
  zona TEXT NOT NULL DEFAULT 'salon' CHECK (zona IN ('comedor', 'salon')),
  sector TEXT DEFAULT 'salon' CHECK (sector IN ('patio', 'comedor', 'salon', 'terraza', 'vip')),
  x NUMERIC DEFAULT 0,
  y NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 80,
  height NUMERIC DEFAULT 80,
  rx NUMERIC DEFAULT 8,
  forma TEXT DEFAULT 'rectangular' CHECK (forma IN ('redonda', 'rectangular')),
  mesas_unidas JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_id INT REFERENCES public.mesas(id_mesa) ON DELETE SET NULL,
  reserva_cliente TEXT DEFAULT NULL,
  reserva_hora TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía previamente incompleta
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS comensales INT DEFAULT NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS comensales_actuales INT DEFAULT NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS capacidad INT NOT NULL DEFAULT 2;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS zona TEXT NOT NULL DEFAULT 'salon';
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'salon';
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS x NUMERIC DEFAULT 0;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS y NUMERIC DEFAULT 0;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS width NUMERIC DEFAULT 80;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS height NUMERIC DEFAULT 80;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS rx NUMERIC DEFAULT 8;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS forma TEXT DEFAULT 'rectangular';
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS mesas_unidas JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES public.mesas(id_mesa) ON DELETE SET NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS reserva_cliente TEXT DEFAULT NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS reserva_hora TEXT DEFAULT NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Índices de optimización
CREATE INDEX IF NOT EXISTS idx_mesas_estado ON public.mesas (estado);
CREATE INDEX IF NOT EXISTS idx_mesas_parent_id ON public.mesas (parent_id);

-- -----------------------------------------------------------------------------
-- 2. TRIGGER PARA SINCRONIZAR COMENSALES Y UPDATED_AT
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_sync_mesas_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Mantener sincronizados comensales y comensales_actuales
  IF NEW.comensales IS NOT NULL AND NEW.comensales_actuales IS NULL THEN
    NEW.comensales_actuales := NEW.comensales;
  ELSIF NEW.comensales_actuales IS NOT NULL AND NEW.comensales IS NULL THEN
    NEW.comensales := NEW.comensales_actuales;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mesas_sync ON public.mesas;
CREATE TRIGGER trg_mesas_sync
BEFORE INSERT OR UPDATE ON public.mesas
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_mesas_fields();

-- -----------------------------------------------------------------------------
-- 3. PERMISOS Y POLÍTICAS DE SEGURIDAD (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.mesas TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Permitir todo en mesas a anon y authenticated" ON public.mesas;
CREATE POLICY "Permitir todo en mesas a anon y authenticated"
  ON public.mesas
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. REALTIME (Para ver cambios instantáneos entre mozos y salón)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'mesas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Si la publicación realtime no existe o no tiene permisos, continuar
END $$;

-- -----------------------------------------------------------------------------
-- 5. FUNCIONES OPERATIVAS (RPC) PARA MOZOS, CAJA Y SALÓN
-- -----------------------------------------------------------------------------

-- Función A: Liberar Mesa
CREATE OR REPLACE FUNCTION public.liberar_mesa(p_id_mesa INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Si era una mesa secundaria unida a otra, quitarla del array de la mesa principal
  UPDATE public.mesas
  SET mesas_unidas = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(mesas_unidas) AS elem
    WHERE elem::text::int <> p_id_mesa
  )
  WHERE id_mesa IN (
    SELECT parent_id FROM public.mesas WHERE id_mesa = p_id_mesa AND parent_id IS NOT NULL
  );

  -- 2. Si tenía mesas secundarias unidas a ella, liberarlas también
  UPDATE public.mesas
  SET 
    estado = 'libre',
    comensales = NULL,
    comensales_actuales = NULL,
    parent_id = NULL,
    mesas_unidas = '[]'::jsonb
  WHERE parent_id = p_id_mesa;

  -- 3. Liberar la mesa indicada
  UPDATE public.mesas
  SET 
    estado = 'libre',
    comensales = NULL,
    comensales_actuales = NULL,
    parent_id = NULL,
    mesas_unidas = '[]'::jsonb,
    reserva_cliente = NULL,
    reserva_hora = NULL
  WHERE id_mesa = p_id_mesa;
END;
$$;

-- Función B: Ocupar Mesa
CREATE OR REPLACE FUNCTION public.ocupar_mesa(p_id_mesa INT, p_comensales INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.mesas
  SET 
    estado = 'ocupada',
    comensales = p_comensales,
    comensales_actuales = p_comensales
  WHERE id_mesa = p_id_mesa;
END;
$$;

-- Función C: Pedir Cuenta en Mesa
CREATE OR REPLACE FUNCTION public.pedir_cuenta_mesa(p_id_mesa INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.mesas
  SET estado = 'esperando_cuenta'
  WHERE id_mesa = p_id_mesa;
END;
$$;

-- Función D: Unir Mesas (ej. unir mesa 14 a mesa 1)
CREATE OR REPLACE FUNCTION public.unir_mesas(
  p_id_mesa_principal INT,
  p_ids_mesas_secundarias INT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secundaria INT;
BEGIN
  -- 1. Marcar las secundarias como unidas a la principal
  FOREACH v_secundaria IN ARRAY p_ids_mesas_secundarias
  LOOP
    UPDATE public.mesas
    SET 
      estado = 'unida',
      parent_id = p_id_mesa_principal,
      comensales = NULL,
      comensales_actuales = NULL
    WHERE id_mesa = v_secundaria;
  END LOOP;

  -- 2. Agregar los IDs al arreglo mesas_unidas de la principal
  UPDATE public.mesas
  SET 
    estado = 'ocupada',
    mesas_unidas = (
      SELECT jsonb_agg(DISTINCT elem)
      FROM (
        SELECT jsonb_array_elements_text(mesas_unidas)::int AS elem FROM public.mesas WHERE id_mesa = p_id_mesa_principal
        UNION
        SELECT unnest(p_ids_mesas_secundarias) AS elem
      ) sub
    )
  WHERE id_mesa = p_id_mesa_principal;
END;
$$;

-- Función E: Desunir Mesas
CREATE OR REPLACE FUNCTION public.desunir_mesas(p_id_mesa_principal INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Liberar todas las secundarias
  UPDATE public.mesas
  SET 
    estado = 'libre',
    parent_id = NULL,
    comensales = NULL,
    comensales_actuales = NULL
  WHERE parent_id = p_id_mesa_principal;

  -- Limpiar la principal
  UPDATE public.mesas
  SET 
    mesas_unidas = '[]'::jsonb
  WHERE id_mesa = p_id_mesa_principal;
END;
$$;

-- Otorgar permisos de ejecución de funciones a los roles web
GRANT EXECUTE ON FUNCTION public.liberar_mesa(INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ocupar_mesa(INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pedir_cuenta_mesa(INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unir_mesas(INT, INT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.desunir_mesas(INT) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. DATOS INICIALES (14 MESAS DEL RESTAURANTE)
-- -----------------------------------------------------------------------------
INSERT INTO public.mesas (id_mesa, numero_mesa, estado, capacidad, zona, sector, x, y, width, height, forma)
VALUES
  (1,  'Mesa 1',  'libre', 2, 'salon', 'salon', 40,  40,  70, 70, 'rectangular'),
  (2,  'Mesa 2',  'libre', 2, 'salon', 'salon', 130, 40,  70, 70, 'rectangular'),
  (3,  'Mesa 3',  'libre', 2, 'salon', 'salon', 220, 40,  70, 70, 'rectangular'),
  (4,  'Mesa 4',  'libre', 2, 'salon', 'salon', 310, 40,  70, 70, 'rectangular'),
  (5,  'Mesa 5',  'libre', 4, 'salon', 'salon', 40,  150, 90, 70, 'rectangular'),
  (6,  'Mesa 6',  'libre', 4, 'salon', 'salon', 150, 150, 90, 70, 'rectangular'),
  (7,  'Mesa 7',  'libre', 4, 'salon', 'salon', 260, 150, 90, 70, 'rectangular'),
  (8,  'Mesa 8',  'libre', 4, 'salon', 'salon', 40,  260, 90, 70, 'rectangular'),
  (9,  'Mesa 9',  'libre', 4, 'salon', 'salon', 150, 260, 90, 70, 'rectangular'),
  (10, 'Mesa 10', 'libre', 4, 'salon', 'salon', 260, 260, 90, 70, 'rectangular'),
  (11, 'Mesa 11', 'libre', 6, 'salon', 'salon', 380, 150, 110, 70, 'rectangular'),
  (12, 'Mesa 12', 'libre', 6, 'salon', 'salon', 380, 260, 110, 70, 'rectangular'),
  (13, 'Mesa 13', 'libre', 4, 'salon', 'salon', 40,  370, 90, 70, 'rectangular'),
  (14, 'Mesa 14', 'libre', 6, 'salon', 'salon', 150, 370, 110, 70, 'rectangular')
ON CONFLICT (id_mesa) DO UPDATE SET
  numero_mesa = EXCLUDED.numero_mesa,
  capacidad = EXCLUDED.capacidad,
  zona = EXCLUDED.zona;
