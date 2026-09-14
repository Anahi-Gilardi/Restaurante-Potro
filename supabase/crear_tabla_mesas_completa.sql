-- =============================================================================
-- TABLA 'mesas' - RESTAURANTE EL PATRÓN / BELLA ORIANA
-- Script definitivo para habilitar ediciones, altas, bajas, unión de mesas y sincronización en vivo
-- =============================================================================

-- 1. Crear tabla con todas las columnas si no existe
CREATE TABLE IF NOT EXISTS public.mesas (
  id_mesa INT PRIMARY KEY,
  numero_mesa TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'libre',
  comensales INT DEFAULT NULL,
  comensales_actuales INT DEFAULT NULL,
  capacidad INT NOT NULL DEFAULT 2,
  zona TEXT NOT NULL DEFAULT 'salon',
  sector TEXT DEFAULT 'salon',
  x NUMERIC DEFAULT 0,
  y NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 80,
  height NUMERIC DEFAULT 80,
  rx NUMERIC DEFAULT 8,
  forma TEXT DEFAULT 'rectangular',
  mesas_unidas JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_id INT DEFAULT NULL,
  reserva_cliente TEXT DEFAULT NULL,
  reserva_hora TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Asegurar que todas las columnas existan si la tabla ya había sido creada previamente
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
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS parent_id INT DEFAULT NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS reserva_cliente TEXT DEFAULT NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS reserva_hora TEXT DEFAULT NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Crear secuencia para id_mesa automático por si se inserta sin ID explícito
CREATE SEQUENCE IF NOT EXISTS public.mesas_id_seq;
ALTER TABLE public.mesas ALTER COLUMN id_mesa SET DEFAULT nextval('public.mesas_id_seq');
SELECT setval('public.mesas_id_seq', GREATEST(COALESCE((SELECT MAX(id_mesa) FROM public.mesas), 0) + 1, 1), false);

-- 4. Eliminar restricciones CHECK o UNIQUE restrictivas que puedan trabar altas o unión de mesas
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_estado_check;
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_zona_check;
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_sector_check;
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_forma_check;
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_numero_mesa_key;

-- 5. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_mesas_estado ON public.mesas (estado);
CREATE INDEX IF NOT EXISTS idx_mesas_parent_id ON public.mesas (parent_id);

-- 6. Trigger para sincronizar comensales y updated_at automáticamente
CREATE OR REPLACE FUNCTION public.trg_sync_mesas_fields()
RETURNS TRIGGER AS $$
BEGIN
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

-- 7. PERMISOS COMPLETOS: GRANT de schema, tablas y secuencias a todos los roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.mesas TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 8. POLÍTICAS RLS PERMISIVAS: Permitir SELECT, INSERT, UPDATE y DELETE desde el sistema
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en mesas" ON public.mesas;
DROP POLICY IF EXISTS "Enable all access for anon and authenticated" ON public.mesas;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.mesas;
DROP POLICY IF EXISTS "Allow all for anon and auth" ON public.mesas;
DROP POLICY IF EXISTS "Allow anon read" ON public.mesas;
DROP POLICY IF EXISTS "Allow anon insert" ON public.mesas;
DROP POLICY IF EXISTS "Allow anon update" ON public.mesas;
DROP POLICY IF EXISTS "Allow anon delete" ON public.mesas;

CREATE POLICY "Permitir todo en mesas"
  ON public.mesas
  FOR ALL
  TO public, anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 9. REPLICA IDENTITY FULL para que Supabase Realtime difunda el registro entero al editar o borrar
ALTER TABLE public.mesas REPLICA IDENTITY FULL;

-- 10. Publicación en Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'mesas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas;
  END IF;
END $$;

-- 11. Cargar las 14 mesas iniciales (si ya existen, no altera sus estados actuales)
INSERT INTO public.mesas (
  id_mesa, numero_mesa, estado, capacidad, zona, sector,
  x, y, width, height, rx, forma, mesas_unidas, updated_at
) VALUES
  (1, 'Mesa 1', 'libre', 2, 'salon', 'salon', 40, 40, 70, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (2, 'Mesa 2', 'libre', 2, 'salon', 'salon', 130, 40, 70, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (3, 'Mesa 3', 'libre', 2, 'salon', 'salon', 220, 40, 70, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (4, 'Mesa 4', 'libre', 4, 'salon', 'salon', 310, 40, 70, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (5, 'Mesa 5', 'libre', 4, 'salon', 'salon', 40, 150, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (6, 'Mesa 6', 'libre', 4, 'salon', 'salon', 150, 150, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (7, 'Mesa 7', 'libre', 4, 'salon', 'salon', 260, 150, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (8, 'Mesa 8', 'libre', 4, 'salon', 'salon', 40, 260, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (9, 'Mesa 9', 'libre', 4, 'salon', 'salon', 150, 260, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (10, 'Mesa 10', 'libre', 4, 'salon', 'salon', 260, 260, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (11, 'Mesa 11', 'libre', 6, 'salon', 'salon', 380, 150, 110, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (12, 'Mesa 12', 'libre', 6, 'salon', 'salon', 380, 260, 110, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (13, 'Mesa 13', 'libre', 4, 'salon', 'salon', 40, 370, 90, 70, 8, 'rectangular', '[]'::jsonb, NOW()),
  (14, 'Mesa 14', 'libre', 6, 'salon', 'salon', 150, 370, 110, 70, 8, 'rectangular', '[]'::jsonb, NOW())
ON CONFLICT (id_mesa) DO UPDATE SET
  capacidad = EXCLUDED.capacidad,
  zona = EXCLUDED.zona,
  sector = EXCLUDED.sector,
  x = EXCLUDED.x,
  y = EXCLUDED.y,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  rx = EXCLUDED.rx,
  forma = EXCLUDED.forma,
  updated_at = NOW();

-- 12. Actualizar el valor de la secuencia al ID más alto
SELECT setval('public.mesas_id_seq', GREATEST(COALESCE((SELECT MAX(id_mesa) FROM public.mesas), 0) + 1, 1), false);

-- 13. Notificar a PostgREST para recargar el esquema en caliente
NOTIFY pgrst, 'reload schema';
