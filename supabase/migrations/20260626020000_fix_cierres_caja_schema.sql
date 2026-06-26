-- Fix schema for cierres_caja table to add missing columns from initial migrations
ALTER TABLE public.cierres_caja ADD COLUMN IF NOT EXISTS fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.cierres_caja ADD COLUMN IF NOT EXISTS usuario_cajero TEXT NOT NULL DEFAULT 'Cajero';
