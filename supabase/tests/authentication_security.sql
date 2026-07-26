\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
    '00000000-0000-4000-8000-000000000801',
    'auth.module.test@example.com',
    jsonb_build_object(
        'username', 'auth_module_test',
        'full_name', 'Usuario de autenticación'
    )
);

DO $test$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_credentials public.user_credentials%ROWTYPE;
BEGIN
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = '00000000-0000-4000-8000-000000000801';

    SELECT * INTO v_credentials
    FROM public.user_credentials
    WHERE user_id = '00000000-0000-4000-8000-000000000801';

    IF v_profile.account_status <> 'provisioning'
       OR v_profile.role <> 'waiter'
       OR v_credentials.user_id IS NULL
       OR NOT v_credentials.must_change_pin
       OR NOT v_credentials.must_change_password THEN
        RAISE EXCEPTION 'El aprovisionamiento inicial es inconsistente';
    END IF;

    IF has_table_privilege('anon', 'public.user_credentials', 'SELECT')
       OR has_table_privilege('authenticated', 'public.user_credentials', 'SELECT')
       OR has_table_privilege('authenticated', 'public.temporary_access_codes', 'SELECT')
       OR has_table_privilege('authenticated', 'public.auth_challenges', 'SELECT')
       OR has_table_privilege('authenticated', 'public.auth_rate_limits', 'SELECT')
       OR has_function_privilege(
           'authenticated',
           'public.consume_auth_rate_limit(text,text,integer,integer,integer)',
           'EXECUTE'
       )
       OR has_function_privilege(
           'anon',
           'public.get_email_by_username(text)',
           'EXECUTE'
       ) THEN
        RAISE EXCEPTION 'Existen permisos públicos sobre secretos de autenticación';
    END IF;
END;
$test$;

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000801',
    true
);

DO $test$
BEGIN
    IF public.current_user_role() IS NOT NULL
       OR public.current_user_is_active() THEN
        RAISE EXCEPTION 'Una cuenta provisioning obtuvo autorización';
    END IF;
END;
$test$;

RESET ROLE;

UPDATE public.profiles
SET account_status = 'active',
    activated_at = now()
WHERE id = '00000000-0000-4000-8000-000000000801';

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000801',
    true
);

DO $test$
BEGIN
    IF public.current_user_role() <> 'waiter'
       OR NOT public.current_user_is_active() THEN
        RAISE EXCEPTION 'Una cuenta activa no obtuvo su autorización';
    END IF;
END;
$test$;

RESET ROLE;

UPDATE public.profiles
SET account_status = 'disabled',
    deactivated_at = now()
WHERE id = '00000000-0000-4000-8000-000000000801';

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000801',
    true
);

DO $test$
BEGIN
    IF public.current_user_role() IS NOT NULL
       OR public.current_user_is_active() THEN
        RAISE EXCEPTION 'Una cuenta desactivada conservó autorización';
    END IF;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
    IF NOT public.consume_auth_rate_limit(
        'test-action',
        'test-identifier',
        2,
        60,
        60
    ) THEN
        RAISE EXCEPTION 'El primer intento fue bloqueado';
    END IF;

    IF NOT public.consume_auth_rate_limit(
        'test-action',
        'test-identifier',
        2,
        60,
        60
    ) THEN
        RAISE EXCEPTION 'El segundo intento fue bloqueado';
    END IF;

    IF public.consume_auth_rate_limit(
        'test-action',
        'test-identifier',
        2,
        60,
        60
    ) THEN
        RAISE EXCEPTION 'El límite de intentos no bloqueó el tercer intento';
    END IF;
END;
$test$;

ROLLBACK;
