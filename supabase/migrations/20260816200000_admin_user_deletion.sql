-- Eliminación definitiva y auditada de usuarios administrados.
-- La identidad desaparece de Auth, pero los datos operativos históricos se conservan.

ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_created_by_fkey;
ALTER TABLE public.orders
    ADD CONSTRAINT orders_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.registro_sesiones
    DROP CONSTRAINT IF EXISTS registro_sesiones_user_id_fkey;
ALTER TABLE public.registro_sesiones
    ADD CONSTRAINT registro_sesiones_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.campaigns ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_created_by_fkey;
ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.restaurant_tables ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.restaurant_tables DROP CONSTRAINT IF EXISTS restaurant_tables_created_by_fkey;
ALTER TABLE public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.table_qr_codes ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.table_qr_codes DROP CONSTRAINT IF EXISTS table_qr_codes_created_by_fkey;
ALTER TABLE public.table_qr_codes
    ADD CONSTRAINT table_qr_codes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.campaign_draws ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.campaign_draws DROP CONSTRAINT IF EXISTS campaign_draws_created_by_fkey;
ALTER TABLE public.campaign_draws
    ADD CONSTRAINT campaign_draws_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.campaign_draws DROP CONSTRAINT IF EXISTS campaign_draws_voided_by_fkey;
ALTER TABLE public.campaign_draws
    ADD CONSTRAINT campaign_draws_voided_by_fkey
    FOREIGN KEY (voided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.admin_resource_deletion_audit ALTER COLUMN deleted_by DROP NOT NULL;
ALTER TABLE public.admin_resource_deletion_audit
    DROP CONSTRAINT IF EXISTS admin_resource_deletion_audit_deleted_by_fkey;
ALTER TABLE public.admin_resource_deletion_audit
    ADD CONSTRAINT admin_resource_deletion_audit_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.delete_managed_user_admin(
    p_user_id uuid,
    p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_actor public.profiles%ROWTYPE;
    v_target public.profiles%ROWTYPE;
    v_summary jsonb;
    v_deleted integer;
BEGIN
    IF p_user_id IS NULL OR p_actor_id IS NULL THEN
        RAISE EXCEPTION 'Usuario y administrador son obligatorios';
    END IF;

    SELECT * INTO v_actor
    FROM public.profiles
    WHERE id = p_actor_id
      AND role = 'admin'
      AND account_status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solo un administrador activo puede eliminar usuarios';
    END IF;

    IF p_user_id = p_actor_id THEN
        RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

    SELECT * INTO v_target
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    SELECT jsonb_build_object(
        'orders_preserved', (SELECT count(*) FROM public.orders WHERE created_by = p_user_id),
        'campaigns_preserved', (SELECT count(*) FROM public.campaigns WHERE created_by = p_user_id),
        'tables_preserved', (SELECT count(*) FROM public.restaurant_tables WHERE created_by = p_user_id),
        'qr_preserved', (SELECT count(*) FROM public.table_qr_codes WHERE created_by = p_user_id),
        'draws_preserved', (SELECT count(*) FROM public.campaign_draws WHERE created_by = p_user_id),
        'sessions_deleted', (SELECT count(*) FROM public.registro_sesiones WHERE user_id = p_user_id)
    ) INTO v_summary;

    -- Las auditorías previas mantienen una copia del administrador eliminado
    -- aunque la relación deleted_by deba quedar nula al borrar su perfil.
    UPDATE public.admin_resource_deletion_audit
    SET deletion_summary = deletion_summary || jsonb_build_object(
        'deleted_actor', jsonb_build_object(
            'id', v_target.id,
            'username', v_target.username,
            'email', v_target.email,
            'role', v_target.role
        )
    )
    WHERE deleted_by = p_user_id;

    -- audit_profile_change usa auth.uid(); este contexto permite que la baja
    -- transaccional conserve al administrador real como actor de la auditoría.
    PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);

    DELETE FROM auth.users WHERE id = p_user_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    IF v_deleted <> 1 THEN
        RAISE EXCEPTION 'No se pudo eliminar la identidad del usuario';
    END IF;

    RETURN jsonb_build_object(
        'profile', jsonb_build_object(
            'id', v_target.id,
            'email', v_target.email,
            'role', v_target.role,
            'full_name', v_target.full_name,
            'username', v_target.username,
            'phone', v_target.phone,
            'gender', v_target.gender,
            'birth_date', v_target.birth_date,
            'avatar_url', v_target.avatar_url,
            'account_status', v_target.account_status,
            'activated_at', v_target.activated_at,
            'deactivated_at', v_target.deactivated_at,
            'deactivation_reason', v_target.deactivation_reason,
            'created_at', v_target.created_at,
            'updated_at', v_target.updated_at
        ),
        'summary', v_summary
    );
END;
$$;

ALTER FUNCTION public.delete_managed_user_admin(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_managed_user_admin(uuid, uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_managed_user_admin(uuid, uuid)
    TO service_role;

COMMENT ON FUNCTION public.delete_managed_user_admin(uuid, uuid) IS
    'Elimina transaccionalmente Auth, perfil y credenciales; conserva datos históricos y audita al administrador actor.';
