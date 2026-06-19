-- =======================================================================
-- MIGRACIÓN OPTIMIZADA DE TABLAS FALTANTES Y LOGS AUTOMÁTICOS
-- Tablas: clientes, movimientos_caja_chica, historial_costos_insumos
-- =======================================================================

-- Habilitar extensión UUID por seguridad si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Historial de Costos de Insumos (Con Integridad Referencial)
CREATE TABLE IF NOT EXISTS public.historial_costos_insumos (
    id_historial TEXT PRIMARY KEY DEFAULT 'hc_' || replace(uuid_generate_v4()::text, '-', ''),
    id_insumo TEXT NOT NULL REFERENCES public.insumos(id_insumo) ON DELETE CASCADE,
    nombre_insumo TEXT NOT NULL,
    costo_anterior NUMERIC NOT NULL DEFAULT 0.0,
    costo_nuevo NUMERIC NOT NULL DEFAULT 0.0,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Clientes (Fidelización y Puntos con valor único de DNI)
CREATE TABLE IF NOT EXISTS public.clientes (
    id_cliente TEXT PRIMARY KEY DEFAULT 'cli_' || replace(uuid_generate_v4()::text, '-', ''),
    dni_cuit TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    puntos NUMERIC NOT NULL DEFAULT 0 CONSTRAINT chk_puntos_no_negativos CHECK (puntos >= 0),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla de Movimientos de Caja Chica (Con validaciones de montos)
CREATE TABLE IF NOT EXISTS public.movimientos_caja_chica (
    id_movimiento TEXT PRIMARY KEY DEFAULT 'mov_' || replace(uuid_generate_v4()::text, '-', ''),
    id_cierre TEXT REFERENCES public.cierres_caja(id_cierre) ON DELETE CASCADE,
    tipo TEXT NOT NULL CONSTRAINT chk_tipo_caja_chica CHECK (tipo IN ('ingreso', 'egreso')),
    monto NUMERIC NOT NULL CONSTRAINT chk_monto_positivo CHECK (monto > 0),
    concepto TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Índices para Búsquedas y Consultas Históricas Rápidas
CREATE INDEX IF NOT EXISTS idx_mov_caja_chica_cierre ON public.movimientos_caja_chica(id_cierre);
CREATE INDEX IF NOT EXISTS idx_historial_costos_insumo ON public.historial_costos_insumos(id_insumo);
CREATE INDEX IF NOT EXISTS idx_historial_costos_fecha ON public.historial_costos_insumos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_dni ON public.clientes(dni_cuit);

-- 5. TRIGGER AUTOMÁTICO: Registrar cambios de costo de insumos en la base de datos
-- Evita tener que hacer inserts manuales desde la app cuando se actualiza el costo de un insumo
CREATE OR REPLACE FUNCTION public.log_insumo_cost_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.costo_unitario IS DISTINCT FROM NEW.costo_unitario) THEN
        INSERT INTO public.historial_costos_insumos (id_insumo, nombre_insumo, costo_anterior, costo_nuevo, fecha)
        VALUES (
            NEW.id_insumo,
            NEW.nombre,
            COALESCE(OLD.costo_unitario, 0.0),
            NEW.costo_unitario,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_insumo_cost_change ON public.insumos;
CREATE TRIGGER trg_log_insumo_cost_change
AFTER UPDATE OF costo_unitario ON public.insumos
FOR EACH ROW
EXECUTE FUNCTION public.log_insumo_cost_change();

-- 6. Habilitación de Seguridad RLS
ALTER TABLE public.historial_costos_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja_chica ENABLE ROW LEVEL SECURITY;

-- 7. Políticas Abiertas Demo (Lectura/Escritura libre para desarrollo/producción)
DROP POLICY IF EXISTS permitir_todo_demo_historial_costos_insumos ON public.historial_costos_insumos;
CREATE POLICY permitir_todo_demo_historial_costos_insumos ON public.historial_costos_insumos FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permitir_todo_demo_clientes ON public.clientes;
CREATE POLICY permitir_todo_demo_clientes ON public.clientes FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permitir_todo_demo_movimientos_caja_chica ON public.movimientos_caja_chica;
CREATE POLICY permitir_todo_demo_movimientos_caja_chica ON public.movimientos_caja_chica FOR ALL TO public USING (true) WITH CHECK (true);
