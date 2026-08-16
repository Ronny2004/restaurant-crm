-- Auditoría y revocación de sesiones para entrega administrativa de accesos.

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
            'emergency_code_created',
            'credentials_regenerated'
        )
    );

CREATE OR REPLACE FUNCTION public.revoke_managed_user_sessions(
    p_user_id uuid,
    p_actor_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_deleted integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_actor_id
          AND role = 'admin'
          AND account_status = 'active'
    ) THEN
        RAISE EXCEPTION 'Solo un administrador activo puede regenerar accesos';
    END IF;

    IF p_user_id = p_actor_id THEN
        RAISE EXCEPTION 'Usa tu perfil de seguridad para cambiar tus credenciales';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
    DELETE FROM auth.sessions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

ALTER FUNCTION public.revoke_managed_user_sessions(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.revoke_managed_user_sessions(uuid, uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_managed_user_sessions(uuid, uuid)
    TO service_role;

COMMENT ON FUNCTION public.revoke_managed_user_sessions(uuid, uuid) IS
    'Revoca sesiones antes de regenerar credenciales; solo service_role y un actor admin activo.';
