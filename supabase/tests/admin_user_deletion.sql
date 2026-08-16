BEGIN;

SELECT id AS admin_id
FROM public.profiles
WHERE role = 'admin' AND account_status = 'active'
ORDER BY created_at
LIMIT 1 \gset

SELECT id AS employee_id
FROM public.profiles
WHERE role <> 'admin' AND account_status = 'active'
ORDER BY created_at
LIMIT 1 \gset

SELECT set_config('test.admin_id', :'admin_id', false);
SELECT set_config('test.employee_id', :'employee_id', false);

DO $$
BEGIN
    IF has_function_privilege(
        'authenticated',
        'public.delete_managed_user_admin(uuid,uuid)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'Authenticated no debe ejecutar el borrado de usuarios';
    END IF;
END;
$$;

DO $$
BEGIN
    BEGIN
        PERFORM public.delete_managed_user_admin(
            current_setting('test.employee_id')::uuid,
            current_setting('test.employee_id')::uuid
        );
        RAISE EXCEPTION 'Un empleado no debió poder eliminar usuarios';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE 'Solo un administrador activo%' THEN RAISE; END IF;
    END;
END;
$$;

DO $$
BEGIN
    BEGIN
        PERFORM public.delete_managed_user_admin(
            current_setting('test.admin_id')::uuid,
            current_setting('test.admin_id')::uuid
        );
        RAISE EXCEPTION 'El administrador no debió poder eliminarse a sí mismo';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE 'No puedes eliminar tu propia cuenta%' THEN RAISE; END IF;
    END;
END;
$$;

SELECT public.delete_managed_user_admin(:'employee_id'::uuid, :'admin_id'::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = current_setting('test.employee_id')::uuid)
       OR EXISTS (SELECT 1 FROM public.profiles WHERE id = current_setting('test.employee_id')::uuid)
       OR EXISTS (SELECT 1 FROM public.user_credentials WHERE user_id = current_setting('test.employee_id')::uuid)
       OR EXISTS (SELECT 1 FROM public.temporary_access_codes WHERE user_id = current_setting('test.employee_id')::uuid) THEN
        RAISE EXCEPTION 'La eliminación del usuario quedó incompleta';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.user_management_audit
        WHERE action = 'deleted'
          AND target_user_id = current_setting('test.employee_id')::uuid
          AND actor_user_id = current_setting('test.admin_id')::uuid
    ) THEN
        RAISE EXCEPTION 'No se registró correctamente la auditoría de eliminación';
    END IF;
END;
$$;

ROLLBACK;
