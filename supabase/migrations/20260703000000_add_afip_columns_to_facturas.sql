-- Migración para añadir columnas de AFIP / ARCA a la tabla de facturas
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS afip_cae TEXT;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS afip_vto TEXT;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS afip_qr TEXT;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS afip_resultado TEXT;
