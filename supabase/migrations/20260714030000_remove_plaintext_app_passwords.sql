-- Las credenciales de acceso pertenecen a Supabase Auth.
-- Eliminar claves heredadas almacenadas en texto plano en la tabla de perfiles.

UPDATE public.usuarios SET password = NULL WHERE password IS NOT NULL AND password <> '';
UPDATE public.usuarios SET contrasena = NULL WHERE contrasena IS NOT NULL AND contrasena <> '';

COMMENT ON COLUMN public.usuarios.password IS
  'Obsoleto: no almacenar contrasenas. Usar Supabase Auth.';
COMMENT ON COLUMN public.usuarios.contrasena IS
  'Obsoleto: no almacenar contrasenas. Usar Supabase Auth.';
