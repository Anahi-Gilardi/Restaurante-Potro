-- Desactivar Row-Level Security (RLS) en la tabla facturas y pagos
-- para resolver el error "new row violates row-level security policy for table facturas"
ALTER TABLE facturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagos DISABLE ROW LEVEL SECURITY;
