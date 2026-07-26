-- Corrige la creación automática del perfil para usuarios creados desde Auth.
-- La migración inicial exige profiles.username, pero el trigger original no
-- proporcionaba ningún valor para esa columna.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_base_username text;
    v_username text;
    v_email text;
BEGIN
    v_email := COALESCE(
        NULLIF(btrim(NEW.email), ''),
        NEW.id::text || '@local.invalid'
    );

    v_base_username := COALESCE(
        NULLIF(btrim(NEW.raw_user_meta_data->>'username'), ''),
        NULLIF(split_part(v_email, '@', 1), ''),
        'user'
    );

    -- Normaliza el identificador para que también pueda usarse en el inicio
    -- de sesión de la aplicación.
    v_base_username := lower(
        regexp_replace(v_base_username, '[^a-zA-Z0-9._-]+', '_', 'g')
    );
    v_base_username := trim(both '_' from v_base_username);

    IF v_base_username = '' THEN
        v_base_username := 'user';
    END IF;

    v_username := v_base_username;

    IF EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE username = v_username
    ) THEN
        v_username := v_base_username
            || '_'
            || substr(replace(NEW.id::text, '-', ''), 1, 8);
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        role,
        full_name,
        username
    )
    VALUES (
        NEW.id,
        v_email,
        'waiter',
        COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''), ''),
        v_username
    );

    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
