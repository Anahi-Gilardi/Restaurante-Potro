-- Crear tabla para el Menú del Día Semanal (Rotación Diaria Lunes a Domingo)
CREATE TABLE IF NOT EXISTS public.menu_diario (
  dia TEXT PRIMARY KEY,
  nombre_dia TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Comidas Criollas',
  precio NUMERIC NOT NULL DEFAULT 0,
  descripcion TEXT DEFAULT '',
  imagen_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.menu_diario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_read_public_menu_diario ON public.menu_diario;
CREATE POLICY app_read_public_menu_diario ON public.menu_diario
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS app_write_menu_diario ON public.menu_diario;
CREATE POLICY app_write_menu_diario ON public.menu_diario
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);
