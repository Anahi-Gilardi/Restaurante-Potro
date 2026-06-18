-- Migración SQL para crear la tabla de configuración
-- Permite persistir los metadatos y preferencias del restaurante dinámicamente

CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Política Demo: Permitir lectura y escritura libre en entorno demo/local
DROP POLICY IF EXISTS permitir_todo_demo_configuracion ON configuracion;
CREATE POLICY permitir_todo_demo_configuracion ON configuracion FOR ALL TO public USING (true) WITH CHECK (true);

-- Sembrar valores iniciales del restaurante El Patrón
INSERT INTO configuracion (clave, valor) VALUES
    ('nombre_comercial', 'El Patrón Restaurante'),
    ('razon_social', 'Gastronomía El Patrón S.A.S.'),
    ('cuit', '30-71649251-4'),
    ('direccion', 'Av. Pres. Figueroa Alcorta 3420, CABA'),
    ('telefono', '+54 11 4802-9988'),
    ('email', 'facturas@elpatronrestaurante.com.ar'),
    ('inicio_actividades', '15/04/2022'),
    ('condicion_iva', 'Responsable Inscripto'),
    ('mensaje_pie', 'Gracias por su visita al verdadero rincón criollo.')
ON CONFLICT (clave) DO NOTHING;
