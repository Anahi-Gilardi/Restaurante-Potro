-- La autenticación operativa se administra exclusivamente desde el backend.
-- Nunca se conservan ni exponen contraseñas en public.usuarios.

UPDATE public.usuarios
SET password = '', pin = NULL, contrasena = NULL;

REVOKE SELECT ON TABLE public.usuarios FROM anon, authenticated;
GRANT SELECT (id_usuario, nombre, apellido, username, rol, activo, mail, auth_user_id)
  ON TABLE public.usuarios TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.usuarios FROM anon, authenticated;

COMMENT ON COLUMN public.usuarios.password IS
  'Columna heredada sin secretos. Las claves se almacenan con bcrypt en app_login_credentials.';
