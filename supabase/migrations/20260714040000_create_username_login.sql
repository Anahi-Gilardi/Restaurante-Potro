-- Inicio de sesion por nombre de usuario sin exponer credenciales al navegador.
-- El PIN se almacena con bcrypt y los intentos fallidos se bloquean en la base.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_login_credentials (
  profile_id INTEGER PRIMARY KEY REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE CHECK (username = LOWER(username) AND username ~ '^[a-z0-9._-]{3,40}$'),
  auth_user_id UUID NOT NULL UNIQUE,
  auth_email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 20),
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_login_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_login_credentials FROM PUBLIC, anon, authenticated;

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
  IF p_password IS NULL OR length(p_password) < 4 OR length(p_password) > 128 THEN
    RAISE EXCEPTION 'Invalid credential length';
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

CREATE OR REPLACE FUNCTION public.verify_app_username_login(
  p_username TEXT,
  p_password TEXT
) RETURNS TABLE (auth_user_id UUID, auth_email TEXT, profile_id INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  credential public.app_login_credentials%ROWTYPE;
  next_failed_attempts INTEGER;
BEGIN
  SELECT c.* INTO credential
  FROM public.app_login_credentials c
  WHERE c.username = LOWER(TRIM(p_username))
  FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM pg_sleep(0.35);
    RETURN;
  END IF;

  IF credential.locked_until IS NOT NULL AND credential.locked_until > NOW() THEN
    PERFORM pg_sleep(0.35);
    RETURN;
  END IF;

  IF credential.password_hash = crypt(p_password, credential.password_hash) THEN
    UPDATE public.app_login_credentials c
    SET failed_attempts = 0,
        locked_until = NULL,
        last_attempt_at = NOW(),
        updated_at = NOW()
    WHERE c.profile_id = credential.profile_id;

    RETURN QUERY SELECT credential.auth_user_id, credential.auth_email, credential.profile_id;
    RETURN;
  END IF;

  next_failed_attempts := LEAST(credential.failed_attempts + 1, 20);
  UPDATE public.app_login_credentials c
  SET failed_attempts = next_failed_attempts,
      locked_until = CASE
        WHEN next_failed_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
        ELSE NULL
      END,
      last_attempt_at = NOW(),
      updated_at = NOW()
  WHERE c.profile_id = credential.profile_id;

  PERFORM pg_sleep(0.35);
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_app_username_login(INTEGER, TEXT, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_app_username_login(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_app_username_login(INTEGER, TEXT, TEXT, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_app_username_login(TEXT, TEXT)
  TO service_role;

COMMENT ON TABLE public.app_login_credentials IS
  'Credenciales internas con bcrypt y bloqueo de intentos; acceso exclusivo del backend.';
