-- Endurece la administración de perfiles y registra todos sus cambios.
-- La creación de identidades continúa siendo responsabilidad de Supabase Auth;
-- el trigger on_auth_user_created crea el perfil correspondiente.

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
    );
$function$;

ALTER FUNCTION public.current_user_is_admin() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO service_role;

DROP POLICY IF EXISTS "Enable update for users based on user_id"
    ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil"
    ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles"
    ON public.profiles;

CREATE POLICY "Admins can update profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());

-- La lectura de perfiles se mantiene para el funcionamiento interno actual.
-- Ningún cliente anónimo puede consultar ni modificar la tabla.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM authenticated;

GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (
    role,
    full_name,
    username,
    phone,
    gender,
    birth_date,
    avatar_url
) ON TABLE public.profiles TO authenticated;

GRANT ALL PRIVILEGES ON TABLE public.profiles TO service_role;

CREATE TABLE IF NOT EXISTS public.user_management_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL
        CHECK (action IN ('created', 'updated', 'deleted')),
    actor_user_id uuid,
    actor_username text,
    actor_role text,
    target_user_id uuid NOT NULL,
    target_email text,
    target_username text,
    changed_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
    old_data jsonb,
    new_data jsonb,
    source text NOT NULL
        CHECK (source IN ('authenticated_admin', 'admin_api', 'system')),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_management_audit OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_user_management_audit_target
    ON public.user_management_audit (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_management_audit_actor
    ON public.user_management_audit (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_management_audit_created_at
    ON public.user_management_audit (created_at DESC);

ALTER TABLE public.user_management_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view user management audit"
    ON public.user_management_audit;

CREATE POLICY "Admins can view user management audit"
    ON public.user_management_audit
    FOR SELECT
    TO authenticated
    USING (public.current_user_is_admin());

-- Las inserciones se realizan exclusivamente mediante el trigger de auditoría.
-- Los registros no se pueden modificar ni eliminar desde el cliente.
REVOKE ALL PRIVILEGES ON TABLE public.user_management_audit FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.user_management_audit FROM authenticated;
GRANT SELECT ON TABLE public.user_management_audit TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.user_management_audit TO service_role;

CREATE OR REPLACE FUNCTION public.audit_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_action text;
    v_actor_id uuid;
    v_actor_username text;
    v_actor_role text;
    v_target_id uuid;
    v_target_email text;
    v_target_username text;
    v_old_data jsonb;
    v_new_data jsonb;
    v_changed_fields text[] := ARRAY[]::text[];
    v_source text := 'system';
BEGIN
    v_actor_id := auth.uid();

    IF v_actor_id IS NOT NULL THEN
        v_source := 'authenticated_admin';
    ELSIF TG_OP = 'INSERT' THEN
        -- El futuro endpoint administrativo enviará created_by mediante
        -- app_metadata. Solo se acepta si identifica a un admin real.
        SELECT actor.id
        INTO v_actor_id
        FROM auth.users AS target
        JOIN public.profiles AS actor
          ON actor.id::text = target.raw_app_meta_data->>'created_by'
        WHERE target.id = NEW.id
          AND actor.role = 'admin'
        LIMIT 1;

        IF v_actor_id IS NOT NULL THEN
            v_source := 'admin_api';
        END IF;
    END IF;

    IF v_actor_id IS NOT NULL THEN
        SELECT username, role
        INTO v_actor_username, v_actor_role
        FROM public.profiles
        WHERE id = v_actor_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_target_id := NEW.id;
        v_target_email := NEW.email;
        v_target_username := NEW.username;
        v_new_data := to_jsonb(NEW);

        SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[])
        INTO v_changed_fields
        FROM jsonb_object_keys(v_new_data - ARRAY['created_at', 'updated_at']) AS key;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'updated';
        v_target_id := NEW.id;
        v_target_email := NEW.email;
        v_target_username := NEW.username;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        SELECT COALESCE(array_agg(new_value.key ORDER BY new_value.key), ARRAY[]::text[])
        INTO v_changed_fields
        FROM jsonb_each(v_new_data - ARRAY['created_at', 'updated_at']) AS new_value
        WHERE (v_old_data -> new_value.key) IS DISTINCT FROM new_value.value;
    ELSE
        v_action := 'deleted';
        v_target_id := OLD.id;
        v_target_email := OLD.email;
        v_target_username := OLD.username;
        v_old_data := to_jsonb(OLD);

        SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[])
        INTO v_changed_fields
        FROM jsonb_object_keys(v_old_data - ARRAY['created_at', 'updated_at']) AS key;
    END IF;

    INSERT INTO public.user_management_audit (
        action,
        actor_user_id,
        actor_username,
        actor_role,
        target_user_id,
        target_email,
        target_username,
        changed_fields,
        old_data,
        new_data,
        source
    )
    VALUES (
        v_action,
        v_actor_id,
        v_actor_username,
        v_actor_role,
        v_target_id,
        v_target_email,
        v_target_username,
        v_changed_fields,
        v_old_data,
        v_new_data,
        v_source
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.audit_profile_change() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.audit_profile_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_profile_change() FROM anon;
REVOKE ALL ON FUNCTION public.audit_profile_change() FROM authenticated;
REVOKE ALL ON FUNCTION public.audit_profile_change() FROM service_role;

DROP TRIGGER IF EXISTS audit_profile_changes ON public.profiles;

CREATE TRIGGER audit_profile_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_profile_change();
