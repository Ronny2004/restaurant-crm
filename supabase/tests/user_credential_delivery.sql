BEGIN;

SELECT id AS admin_id FROM public.profiles
WHERE role = 'admin' AND account_status = 'active'
ORDER BY created_at LIMIT 1 \gset

SELECT id AS employee_id FROM public.profiles
WHERE role <> 'admin' AND account_status = 'active'
ORDER BY created_at LIMIT 1 \gset

SELECT set_config('test.admin_id', :'admin_id', false);
SELECT set_config('test.employee_id', :'employee_id', false);

DO $$
BEGIN
    IF has_function_privilege(
        'authenticated',
        'public.revoke_managed_user_sessions(uuid,uuid)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'Authenticated no debe revocar sesiones administrativamente';
    END IF;

    BEGIN
        PERFORM public.revoke_managed_user_sessions(
            current_setting('test.employee_id')::uuid,
            current_setting('test.employee_id')::uuid
        );
        RAISE EXCEPTION 'Un empleado no debió regenerar accesos';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE 'Solo un administrador activo%' THEN RAISE; END IF;
    END;

    BEGIN
        PERFORM public.revoke_managed_user_sessions(
            current_setting('test.admin_id')::uuid,
            current_setting('test.admin_id')::uuid
        );
        RAISE EXCEPTION 'Un administrador no debió regenerar su propio acceso';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE 'Usa tu perfil de seguridad%' THEN RAISE; END IF;
    END;
END;
$$;

SELECT public.revoke_managed_user_sessions(:'employee_id'::uuid, :'admin_id'::uuid);

ROLLBACK;
