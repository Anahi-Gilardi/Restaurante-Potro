-- ===============================================================
-- El Patrón Pro — Optimizaciones Supabase/PostgreSQL (Corregido)
-- Ejecutar en el SQL Editor del panel de Supabase
-- ===============================================================

-- 1. ÍNDICES PARA TABLAS CRÍTICAS
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos_cabecera(estado_comanda);
CREATE INDEX IF NOT EXISTS idx_pedidos_mesa ON public.pedidos_cabecera(id_mesa);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON public.pedidos_cabecera(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_insumos_categoria ON public.insumos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_menu_categoria ON public.productos_menu(categoria);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON public.facturas(fecha_emision DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_recetas_producto ON public.recetas_escandallo(id_producto);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON public.auditoria_eventos(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_mesa_estado ON public.pedidos_cabecera(id_mesa, estado_comanda);
CREATE INDEX IF NOT EXISTS idx_insumos_stock ON public.insumos(stock_actual) WHERE stock_actual <= stock_minimo;

-- 2. FUNCIÓN PARA VERIFICAR INTEGRIDAD
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE (check_name TEXT, status TEXT, count BIGINT) AS $$
BEGIN
  -- Stock negativo
  RETURN QUERY SELECT 'stock_negativo'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END,
    COUNT(*)::BIGINT
  FROM public.insumos WHERE stock_actual < 0;

  -- Pedidos huérfanos (sin mesa)
  RETURN QUERY SELECT 'pedidos_sin_mesa'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COUNT(*)::BIGINT
  FROM public.pedidos_cabecera WHERE id_mesa IS NULL AND estado_comanda != 'cancelado';

  -- Facturas sin pedido emitidas
  RETURN QUERY SELECT 'facturas_sin_pedido'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COUNT(*)::BIGINT
  FROM public.facturas WHERE id_pedido IS NULL;
END;
$$ LANGUAGE plpgsql;
