\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
    (
        '00000000-0000-4000-8000-000000000901',
        'campaign.admin.test@example.com',
        jsonb_build_object('username', 'campaign_admin_test')
    ),
    (
        '00000000-0000-4000-8000-000000000902',
        'campaign.waiter.test@example.com',
        jsonb_build_object('username', 'campaign_waiter_test')
    );

UPDATE public.profiles
SET account_status = 'active',
    activated_at = now(),
    role = CASE
        WHEN id = '00000000-0000-4000-8000-000000000901'::uuid
            THEN 'admin'
        ELSE 'waiter'
    END
WHERE id IN (
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000902'
);

INSERT INTO public.products (id, name, price, category, stock)
VALUES (
    '10000000-0000-4000-8000-000000000901',
    'Plato de campaña',
    3.50,
    'Platos',
    10
);

DO $test$
BEGIN
    IF has_table_privilege('anon', 'public.campaigns', 'SELECT')
       OR has_table_privilege('anon', 'public.campaign_responses', 'INSERT')
       OR has_table_privilege('authenticated', 'public.campaign_responses', 'INSERT')
       OR has_table_privilege('authenticated', 'public.campaigns', 'DELETE') THEN
        RAISE EXCEPTION 'Existen permisos inseguros en campañas';
    END IF;
END;
$test$;

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000901',
    true
);

INSERT INTO public.campaigns (
    id,
    slug,
    title,
    description,
    reward,
    created_by
)
VALUES (
    '20000000-0000-4000-8000-000000000901',
    'campana-prueba-901',
    'Campaña de prueba',
    'Descripción de prueba',
    'Premio de prueba',
    '00000000-0000-4000-8000-000000000901'
);

DO $test$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.campaigns
        WHERE id = '20000000-0000-4000-8000-000000000901'
    ) THEN
        RAISE EXCEPTION 'El admin activo no pudo consultar su campaña';
    END IF;
END;
$test$;

RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000902',
    true
);

DO $test$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.campaigns
        WHERE id = '20000000-0000-4000-8000-000000000901'
    ) THEN
        RAISE EXCEPTION 'Un empleado operativo pudo leer campañas administrativas';
    END IF;
END;
$test$;

RESET ROLE;

SET LOCAL ROLE service_role;

INSERT INTO public.campaign_responses (
    campaign_id,
    full_name,
    email,
    phone,
    favorite_product_id,
    favorite_product_name,
    sector,
    suggestions,
    consent_at
)
VALUES (
    '20000000-0000-4000-8000-000000000901',
    'Cliente de prueba',
    'cliente.campaign.test@example.com',
    '0999999999',
    '10000000-0000-4000-8000-000000000901',
    'Plato de campaña',
    'calderon',
    'Sugerencia de prueba',
    now()
);

DO $test$
BEGIN
    IF (
        SELECT count(*)
        FROM public.campaign_responses
        WHERE campaign_id = '20000000-0000-4000-8000-000000000901'
    ) <> 1 THEN
        RAISE EXCEPTION 'La respuesta server-side no fue almacenada';
    END IF;
END;
$test$;

RESET ROLE;

ROLLBACK;
