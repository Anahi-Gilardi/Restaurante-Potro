-- =============================================================================
-- HABILITACIÓN Y CONEXIÓN COMPLETA DE 'productos_menu' EN SUPABASE
-- Sistema Gestor Gastronómico - El Patrón / Bella Oriana
-- =============================================================================

-- 1. ASEGURAR COLUMNAS COMPLETAS EN LA TABLA EXISTENTE 'productos_menu'
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS subcategoria TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS tiempo_preparacion_estimado INT DEFAULT 15;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS requiere_cocina BOOLEAN DEFAULT true;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS imagen TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS url_imagen TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS pasos_preparacion JSONB;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS alergenos JSONB;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS consejo_emplatado TEXT;
ALTER TABLE public.productos_menu ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. ELIMINAR RESTRICCIONES ANTIGUAS DE CATEGORÍA
-- Permite que convivan todas las categorías (Carnes, Comidas Criollas, Bebidas, etc.)
ALTER TABLE public.productos_menu DROP CONSTRAINT IF EXISTS productos_menu_categoria_check;
ALTER TABLE public.productos_menu DROP CONSTRAINT IF EXISTS chk_categoria_productos;

-- 3. PERMISOS DE ACCESO PARA EL CLIENTE WEB (anon, authenticated, service_role)
GRANT ALL ON TABLE public.productos_menu TO anon, authenticated, service_role;

-- 4. POLÍTICA DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- Asegura que RLS esté activo pero permita leer y actualizar al frontend
ALTER TABLE public.productos_menu ENABLE ROW LEVEL SECURITY;

-- Limpiar cualquier política previa que estuviese bloqueando el acceso público
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'productos_menu'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.productos_menu', pol.policyname);
  END LOOP;
END $$;

-- Crear política permisiva para que el sistema web lea y edite los 151 productos
CREATE POLICY "Permitir todo en productos_menu"
  ON public.productos_menu
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 5. HABILITAR SUPABASE REALTIME
-- Para que los cambios de precios o productos se actualicen en vivo en terminales mozo y caja
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'productos_menu'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.productos_menu;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 6. HABILITAR PERMISOS COMPLEMENTARIOS (categorias y recetas_escandallo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categorias') THEN
    GRANT ALL ON TABLE public.categorias TO anon, authenticated, service_role;
    ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir todo en categorias" ON public.categorias;
    CREATE POLICY "Permitir todo en categorias" ON public.categorias FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recetas_escandallo') THEN
    GRANT ALL ON TABLE public.recetas_escandallo TO anon, authenticated, service_role;
    ALTER TABLE public.recetas_escandallo ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir todo en recetas_escandallo" ON public.recetas_escandallo;
    CREATE POLICY "Permitir todo en recetas_escandallo" ON public.recetas_escandallo FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;
