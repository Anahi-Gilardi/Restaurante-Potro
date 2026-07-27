-- Endurece las nuevas credenciales sin bloquear el acceso de usuarios existentes.
-- Las claves heredadas siguen pudiendo verificarse; al cambiarlas deben cumplir
-- la nueva longitud mínima.

CREATE OR REPLACE FUNCTION public.provision_app_username_login(
  p_profile_id INTEGER,
  p_username TEXT,
  p_password TEXT,
  p_auth_user_id UUID,
  p_auth_email TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_password IS NULL OR length(p_password) < 12 OR length(p_password) > 128 THEN
    RAISE EXCEPTION 'Credential must contain between 12 and 128 characters';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id_usuario = p_profile_id) THEN
    RAISE EXCEPTION 'Profile does not exist';
  END IF;

  INSERT INTO public.app_login_credentials (
    profile_id, username, auth_user_id, auth_email, password_hash,
    failed_attempts, locked_until, updated_at
  ) VALUES (
    p_profile_id,
    LOWER(TRIM(p_username)),
    p_auth_user_id,
    LOWER(TRIM(p_auth_email)),
    crypt(p_password, gen_salt('bf', 12)),
    0,
    NULL,
    NOW()
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    username = EXCLUDED.username,
    auth_user_id = EXCLUDED.auth_user_id,
    auth_email = EXCLUDED.auth_email,
    password_hash = EXCLUDED.password_hash,
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW();

  UPDATE public.usuarios
  SET auth_user_id = p_auth_user_id,
      mail = LOWER(TRIM(p_auth_email)),
      username = LOWER(TRIM(p_username)),
      activo = TRUE
  WHERE id_usuario = p_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_app_username_login(INTEGER, TEXT, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_app_username_login(INTEGER, TEXT, TEXT, UUID, TEXT)
  TO service_role;

COMMENT ON FUNCTION public.provision_app_username_login(INTEGER, TEXT, TEXT, UUID, TEXT) IS
  'Provisiona credenciales internas bcrypt. Desde 2026-07-27 exige entre 12 y 128 caracteres.';
