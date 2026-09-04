-- Permitir lectura pública (anon y authenticated) de promociones activas para la portada publicitaria
DROP POLICY IF EXISTS app_read_public_promociones ON public.promociones;
CREATE POLICY app_read_public_promociones ON public.promociones
  FOR SELECT TO anon, authenticated USING (true);
