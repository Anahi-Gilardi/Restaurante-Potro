-- Agregar columna de imagen opcional a promociones
ALTER TABLE public.promociones
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;
