-- =============================================================================
-- TABLA 'mesas' - RESTAURANTE EL PATRÓN / BELLA ORIANA
-- Script definitivo de estructura, permisos, RLS y Realtime para Supabase
-- =============================================================================

-- 1. Crear tabla con todas las columnas necesarias si no existe
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
  parent_id INT,
  reserva_cliente TEXT DEFAULT NULL,
  reserva_hora TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Asegurar que existan todas las columnas si la tabla ya había sido creada
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
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS parent_id INT;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS reserva_cliente TEXT DEFAULT NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS reserva_hora TEXT DEFAULT NULL;
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Quitar restricciones que puedan bloquear la unión de mesas
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_estado_check;
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_zona_check;
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_sector_check;
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_forma_check;
ALTER TABLE public.mesas DROP CONSTRAINT IF EXISTS mesas_numero_mesa_key;

-- Agregar restricción de estado que incluye 'unida'
ALTER TABLE public.mesas ADD CONSTRAINT mesas_estado_check 
  CHECK (estado IN ('libre', 'ocupada', 'esperando_cuenta', 'reservada', 'limpiando', 'unida', 'sucia'));

-- 4. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_mesas_estado ON public.mesas (estado);
CREATE INDEX IF NOT EXISTS idx_mesas_parent_id ON public.mesas (parent_id);

-- 5. Trigger para sincronizar comensales y updated_at automáticamente
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

-- 6. PERMISOS Y POLÍTICAS RLS (Habilita lectura, inserción y actualización abierta para anon y authenticated)
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.mesas TO anon, authenticated, service_role, postgres;

DROP POLICY IF EXISTS "Permitir todo en mesas" ON public.mesas;
CREATE POLICY "Permitir todo en mesas"
  ON public.mesas
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 7. Cargar o actualizar las 14 mesas del salón
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

-- 8. Habilitar Supabase Realtime para que los cambios en mesas se sincronicen en vivo entre dispositivos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'mesas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
