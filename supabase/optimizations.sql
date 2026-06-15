-- ===============================================================
-- El Patrón Pro — Optimizaciones Supabase/PostgreSQL
-- Ejecutar en el SQL Editor del panel de Supabase
-- ===============================================================

-- 1. ÍNDICES PARA TABLAS CRÍTICAS
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado_comanda);
CREATE INDEX IF NOT EXISTS idx_pedidos_mesa ON pedidos(id_mesa);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_insumos_categoria ON insumos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_menu_categoria ON productos_menu(categoria);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha_emision DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_recetas_producto ON recetas_escandallo(id_producto);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs_sistema(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_mesa_estado ON pedidos(id_mesa, estado_comanda);
CREATE INDEX IF NOT EXISTS idx_insumos_stock ON insumos(stock_actual) WHERE stock_actual <= stock_minimo;

-- 2. FUNCIÓN PARA VERIFICAR INTEGRIDAD
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE (check_name TEXT, status TEXT, count BIGINT) AS $$
BEGIN
  -- Stock negativo
  RETURN QUERY SELECT 'stock_negativo'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END,
    COUNT(*)::BIGINT
  FROM insumos WHERE stock_actual < 0;

  -- Pedidos huérfanos (sin mesa)
  RETURN QUERY SELECT 'pedidos_sin_mesa'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COUNT(*)::BIGINT
  FROM pedidos WHERE id_mesa IS NULL AND estado_comanda != 'cancelado';

  -- Facturas sin pedido emitidas
  RETURN QUERY SELECT 'facturas_sin_pedido'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COUNT(*)::BIGINT
  FROM facturas WHERE id_pedido IS NULL AND estado = 'emitido';
END;
$$ LANGUAGE plpgsql;

-- 3. POLÍTICAS RLS (opcional, habilitar según necesidad)
-- Descomentar y ejecutar si se desea RLS
/*
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backups_super_admin_only" ON backups
  FOR ALL USING (
    auth.jwt() ->> 'rol' = 'super_admi'
  );

CREATE POLICY "facturas_admin_all" ON facturas
  FOR ALL USING (
    auth.jwt() ->> 'rol' IN ('super_admi', 'administrador')
  );

CREATE POLICY "config_admin_all" ON configuracion
  FOR ALL USING (
    auth.jwt() ->> 'rol' IN ('super_admi', 'administrador')
  );
*/
