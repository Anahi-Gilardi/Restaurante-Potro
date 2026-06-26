-- =======================================================================
-- MIGRACIÓN: Habilitación de Replicación en Tiempo Real (Supabase Realtime)
-- =======================================================================

-- Agregar las tablas a la publicación de tiempo real de Supabase
alter publication supabase_realtime add table public.pedidos_cabecera;
alter publication supabase_realtime add table public.pedido_detalle;
alter publication supabase_realtime add table public.mesas;
