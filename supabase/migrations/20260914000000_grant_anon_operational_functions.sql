-- Migration: Otorgar permisos a anon para transacciones de comandas y mesas
-- Permite que el sistema opere con Google Sheets y Supabase sin errores de 'permission denied'
GRANT EXECUTE ON FUNCTION public.close_table_orders_transaction(BIGINT[], BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.close_table_orders_transaction(BIGINT[], BOOLEAN) TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_order_transaction(JSONB, INTEGER, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.save_order_transaction(JSONB, INTEGER, BOOLEAN) TO authenticated;

GRANT EXECUTE ON FUNCTION public.transition_order_transaction(BIGINT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.transition_order_transaction(BIGINT, TEXT, BOOLEAN) TO authenticated;
