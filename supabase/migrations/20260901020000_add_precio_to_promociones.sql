-- Agregar columna de precio a promociones
ALTER TABLE public.promociones
  ADD COLUMN IF NOT EXISTS precio NUMERIC DEFAULT 0;
