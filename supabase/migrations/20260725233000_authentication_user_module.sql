-- Autenticación de empleados y administración segura de usuarios.
-- Esta migración mantiene Supabase Auth como emisor de sesiones y agrega
-- credenciales operativas (PIN), recuperación, rate limiting y auditoría.

-- ---------------------------------------------------------------------------
-- Estado de las cuentas
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS account_status text,
    ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS activated_by uuid,
    ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS deactivated_by uuid,
    ADD COLUMN IF NOT EXISTS deactivation_reason text;

UPDATE public.profiles
SET account_status = 'active',
    activated_at = COALESCE(activated_at, created_at, now())
WHERE account_status IS NULL;

ALTER TABLE public.profiles
    ALTER COLUMN account_status SET DEFAULT 'provisioning',
    ALTER COLUMN account_status SET NOT NULL;

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_account_status_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_account_status_check
    CHECK (account_status IN ('provisioning', 'active', 'disabled'));

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_activated_by_fkey,
    DROP CONSTRAINT IF EXISTS profiles_deactivated_by_fkey;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_activated_by_fkey
        FOREIGN KEY (activated_by) REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    ADD CONSTRAINT profiles_deactivated_by_fkey
        FOREIGN KEY (deactivated_by) REFERENCES public.profiles(id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status
    ON public.profiles (account_status);

-- ---------------------------------------------------------------------------
-- Credenciales y políticas de expiración
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_credentials (
    user_id uuid PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,
    pin_lookup text UNIQUE,
    pin_hash text,
    pin_changed_at timestamp with time zone,
    pin_expires_at timestamp with time zone,
    password_changed_at timestamp with time zone,
    password_expires_at timestamp with time zone,
    must_change_pin boolean NOT NULL DEFAULT true,
    must_change_password boolean NOT NULL DEFAULT false,
    failed_pin_attempts integer NOT NULL DEFAULT 0
        CHECK (failed_pin_attempts >= 0),
    pin_locked_until timestamp with time zone,
    last_pin_login_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_credentials_pin_pair_check CHECK (
        (pin_lookup IS NULL AND pin_hash IS NULL)
        OR (pin_lookup IS NOT NULL AND pin_hash IS NOT NULL)
    )
);

ALTER TABLE public.user_credentials OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_user_credentials_pin_expires
    ON public.user_credentials (pin_expires_at)
    WHERE pin_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_credentials_password_expires
    ON public.user_credentials (password_expires_at)
    WHERE password_expires_at IS NOT NULL;

INSERT INTO public.user_credentials (
    user_id,
    password_changed_at,
    password_expires_at,
    must_change_pin,
    must_change_password
)
SELECT
    profile.id,
    CASE WHEN profile.role = 'admin' THEN NULL ELSE now() END,
    CASE WHEN profile.role = 'admin' THEN NULL ELSE now() + interval '30 days' END,
    profile.role <> 'admin',
    false
FROM public.profiles AS profile
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_user_credential_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    INSERT INTO public.user_credentials (
        user_id,
        password_changed_at,
        password_expires_at,
        must_change_pin,
        must_change_password
    )
    VALUES (
        NEW.id,
        CASE WHEN NEW.role = 'admin' THEN NULL ELSE now() END,
        CASE WHEN NEW.role = 'admin' THEN NULL ELSE now() + interval '30 days' END,
        NEW.role <> 'admin',
        NEW.role <> 'admin'
    )
    ON CONFLICT (user_id) DO NOTHING;

    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
        IF NEW.role = 'admin' THEN
            UPDATE public.user_credentials
            SET password_changed_at = NULL,
                password_expires_at = NULL,
                pin_expires_at = NULL,
                must_change_password = false,
                must_change_pin = false,
                updated_at = now()
            WHERE user_id = NEW.id;
        ELSIF OLD.role = 'admin' THEN
            UPDATE public.user_credentials
            SET password_changed_at = now(),
                password_expires_at = now() + interval '30 days',
                pin_changed_at = NULL,
                pin_expires_at = NULL,
                pin_lookup = NULL,
                pin_hash = NULL,
                must_change_password = true,
                must_change_pin = true,
                updated_at = now()
            WHERE user_id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.sync_user_credential_policy() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.sync_user_credential_policy()
    FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS sync_user_credential_policy
    ON public.profiles;

CREATE TRIGGER sync_user_credential_policy
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_credential_policy();

-- ---------------------------------------------------------------------------
-- Códigos temporales y challenges de cambio obligatorio
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.temporary_access_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,
    purpose text NOT NULL
        CHECK (purpose IN ('pin_recovery', 'admin_emergency')),
    code_lookup text NOT NULL UNIQUE,
    code_hash text NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    used_at timestamp with time zone,
    revoked_at timestamp with time zone,
    failed_attempts integer NOT NULL DEFAULT 0
        CHECK (failed_attempts >= 0),
    locked_until timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT temporary_access_codes_expiry_check
        CHECK (expires_at > created_at)
);

ALTER TABLE public.temporary_access_codes OWNER TO postgres;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_access_code
    ON public.temporary_access_codes (user_id, purpose)
    WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_temporary_access_codes_expiry
    ON public.temporary_access_codes (expires_at)
    WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.auth_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,
    purpose text NOT NULL
        CHECK (
            purpose IN (
                'reset_pin',
                'change_expired_pin',
                'change_expired_password',
                'initial_pin',
                'initial_password'
            )
        ),
    challenge_hash text NOT NULL UNIQUE,
    source_code_id uuid
        REFERENCES public.temporary_access_codes(id) ON DELETE SET NULL,
    bound_ip_hash text,
    bound_user_agent_hash text,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT auth_challenges_expiry_check
        CHECK (expires_at > created_at)
);

ALTER TABLE public.auth_challenges OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_auth_challenges_expiry
    ON public.auth_challenges (expires_at)
    WHERE consumed_at IS NULL;

-- ---------------------------------------------------------------------------
-- Eventos de autenticación y límites de intentos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.authentication_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type text NOT NULL
        CHECK (
            event_type IN (
                'login_success',
                'login_failed',
                'logout',
                'pin_recovery_requested',
                'pin_recovery_sent',
                'pin_recovery_failed',
                'pin_changed',
                'password_changed',
                'account_locked',
                'emergency_code_created',
                'emergency_code_used'
            )
        ),
    auth_method text
        CHECK (
            auth_method IS NULL OR auth_method IN (
                'pin',
                'password',
                'admin_password',
                'recovery_pin',
                'emergency_code'
            )
        ),
    success boolean NOT NULL,
    ip_address inet,
    user_agent text,
    country_code text,
    region text,
    city text,
    location_source text
        CHECK (
            location_source IS NULL
            OR location_source IN ('ip_geo', 'browser', 'unavailable')
        ),
    failure_code text,
    request_id text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.authentication_events OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_authentication_events_user
    ON public.authentication_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_authentication_events_created
    ON public.authentication_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_authentication_events_failures
    ON public.authentication_events (ip_address, created_at DESC)
    WHERE success = false;

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    identifier_hash text NOT NULL,
    attempt_count integer NOT NULL DEFAULT 0
        CHECK (attempt_count >= 0),
    window_started_at timestamp with time zone NOT NULL DEFAULT now(),
    blocked_until timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (action, identifier_hash)
);

ALTER TABLE public.auth_rate_limits OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked
    ON public.auth_rate_limits (blocked_until)
    WHERE blocked_until IS NOT NULL;

CREATE OR REPLACE FUNCTION public.consume_auth_rate_limit(
    p_action text,
    p_identifier_hash text,
    p_max_attempts integer,
    p_window_seconds integer,
    p_block_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_limit public.auth_rate_limits%ROWTYPE;
    v_now timestamp with time zone := now();
BEGIN
    IF p_max_attempts < 1
       OR p_window_seconds < 1
       OR p_block_seconds < 1
       OR NULLIF(btrim(p_action), '') IS NULL
       OR NULLIF(btrim(p_identifier_hash), '') IS NULL THEN
        RAISE EXCEPTION 'Invalid rate limit configuration';
    END IF;

    INSERT INTO public.auth_rate_limits (
        action,
        identifier_hash,
        attempt_count,
        window_started_at,
        updated_at
    )
    VALUES (
        p_action,
        p_identifier_hash,
        0,
        v_now,
        v_now
    )
    ON CONFLICT (action, identifier_hash) DO NOTHING;

    SELECT *
    INTO v_limit
    FROM public.auth_rate_limits
    WHERE action = p_action
      AND identifier_hash = p_identifier_hash
    FOR UPDATE;

    IF v_limit.blocked_until IS NOT NULL
       AND v_limit.blocked_until > v_now THEN
        RETURN false;
    END IF;

    IF v_limit.window_started_at
       <= v_now - make_interval(secs => p_window_seconds) THEN
        UPDATE public.auth_rate_limits
        SET attempt_count = 1,
            window_started_at = v_now,
            blocked_until = NULL,
            updated_at = v_now
        WHERE id = v_limit.id;
        RETURN true;
    END IF;

    IF v_limit.attempt_count + 1 > p_max_attempts THEN
        UPDATE public.auth_rate_limits
        SET attempt_count = attempt_count + 1,
            blocked_until = v_now + make_interval(secs => p_block_seconds),
            updated_at = v_now
        WHERE id = v_limit.id;
        RETURN false;
    END IF;

    UPDATE public.auth_rate_limits
    SET attempt_count = attempt_count + 1,
        blocked_until = NULL,
        updated_at = v_now
    WHERE id = v_limit.id;

    RETURN true;
END;
$function$;

ALTER FUNCTION public.consume_auth_rate_limit(
    text, text, integer, integer, integer
) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.clear_auth_rate_limit(
    p_action text,
    p_identifier_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
    DELETE FROM public.auth_rate_limits
    WHERE action = p_action
      AND identifier_hash = p_identifier_hash;
$function$;

ALTER FUNCTION public.clear_auth_rate_limit(text, text) OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- Auditoría de administración
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_management_audit
    ADD COLUMN IF NOT EXISTS request_id text,
    ADD COLUMN IF NOT EXISTS ip_address inet,
    ADD COLUMN IF NOT EXISTS user_agent text,
    ADD COLUMN IF NOT EXISTS reason text,
    ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_management_audit
    DROP CONSTRAINT IF EXISTS user_management_audit_action_check;

ALTER TABLE public.user_management_audit
    ADD CONSTRAINT user_management_audit_action_check
    CHECK (
        action IN (
            'created',
            'updated',
            'deleted',
            'activated',
            'deactivated',
            'role_changed',
            'email_changed',
            'emergency_code_created'
        )
    );

-- ---------------------------------------------------------------------------
-- Helpers de autorización y sincronización de Auth
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND account_status = 'active'
    );
$function$;

ALTER FUNCTION public.current_user_is_admin() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
      AND account_status = 'active';
$function$;

ALTER FUNCTION public.current_user_role() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.sync_auth_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        UPDATE public.profiles
        SET email = NEW.email,
            updated_at = now()
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.sync_auth_user_email() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.sync_auth_user_email()
    FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS sync_auth_user_email
    ON auth.users;

CREATE TRIGGER sync_auth_user_email
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_auth_user_email();

-- Las cuentas nuevas se crean en provisioning. El endpoint administrativo
-- establece rol, credenciales y estado activo al finalizar todo el proceso.
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
        WHERE lower(username) = lower(v_username)
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
        username,
        account_status
    )
    VALUES (
        NEW.id,
        v_email,
        'waiter',
        COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''), ''),
        v_username,
        'provisioning'
    );

    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.handle_new_user()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- El username se resuelve exclusivamente en el backend.
REVOKE ALL ON FUNCTION public.get_email_by_username(text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text)
    TO service_role;

-- ---------------------------------------------------------------------------
-- RLS y permisos
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authentication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view authentication events"
    ON public.authentication_events
    FOR SELECT
    TO authenticated
    USING (public.current_user_is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.user_credentials
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.temporary_access_codes
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.auth_challenges
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.authentication_events
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.auth_rate_limits
    FROM anon, authenticated;

GRANT SELECT ON TABLE public.authentication_events TO authenticated;

GRANT ALL PRIVILEGES ON TABLE public.user_credentials TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.temporary_access_codes TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.auth_challenges TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.authentication_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.auth_rate_limits TO service_role;

REVOKE ALL ON FUNCTION public.consume_auth_rate_limit(
    text, text, integer, integer, integer
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_auth_rate_limit(text, text)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_auth_rate_limit(
    text, text, integer, integer, integer
) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_auth_rate_limit(text, text)
    TO service_role;

-- Toda modificación administrativa de perfiles pasará por el backend.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;

COMMENT ON TABLE public.password_resets IS
    'Tabla heredada, sin acceso de cliente. Sustituida por temporary_access_codes para recuperación de PIN.';
