-- =======================================================================
-- MIGRACIÓN: Creación de la tabla 'categorias' y Carga de Valores Iniciales
-- =======================================================================

CREATE TABLE IF NOT EXISTS public.categorias (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    orden NUMERIC NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT true,
    icono TEXT
);

-- Habilitar RLS por seguridad
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- Política de Acceso Demo Abierta (Lectura/Escritura libre para desarrollo/producción)
DROP POLICY IF EXISTS permitir_todo_demo_categorias ON public.categorias;
CREATE POLICY permitir_todo_demo_categorias ON public.categorias FOR ALL TO public USING (true) WITH CHECK (true);

-- Semillar (Seed) categorías iniciales del restaurante El Patrón
INSERT INTO public.categorias (id, nombre, slug, orden, activa, icono) VALUES
('cat_entradas', 'Entradas', 'entradas', 1, true, 'UtensilsCrossed'),
('cat_pastas', 'Pastas', 'pastas', 2, true, 'UtensilsCrossed'),
('cat_carnes', 'Carnes', 'carnes', 3, true, 'Beef'),
('cat_pescados', 'Pescados', 'pescados', 4, true, 'Fish'),
('cat_criollas', 'Comidas Criollas', 'comidas-criollas', 5, true, 'Utensils'),
('cat_postres', 'Postres', 'postres', 6, true, 'Coffee'),
('cat_bebidas_con_alcohol', 'Bebidas con Alcohol', 'bebidas-con-alcohol', 7, true, 'Wine'),
('cat_bebidas_sin_alcohol', 'Bebidas sin Alcohol', 'bebidas-sin-alcohol', 7.5, true, 'Wine'),
('cat_bodega', 'Bodega', 'bodega', 8, true, 'Wine')
ON CONFLICT (id) DO NOTHING;
