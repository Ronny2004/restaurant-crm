\set ON_ERROR_STOP on

BEGIN;

DO $test$
BEGIN
    IF has_table_privilege('anon', 'public.restaurant_tables', 'SELECT')
       OR has_table_privilege('anon', 'public.table_qr_codes', 'INSERT')
       OR has_table_privilege('authenticated', 'public.table_qr_scan_events', 'INSERT')
       OR has_table_privilege('authenticated', 'public.campaign_draws', 'INSERT')
       OR has_function_privilege('authenticated', 'public.run_campaign_draw(uuid, integer, uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Existen permisos inseguros en QR o sorteos';
    END IF;
END;
$test$;

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
    (
        '00000000-0000-4000-8000-000000000911',
        'qr.admin.test@example.com',
        jsonb_build_object('username', 'qr_admin_test')
    ),
    (
        '00000000-0000-4000-8000-000000000912',
        'qr.waiter.test@example.com',
        jsonb_build_object('username', 'qr_waiter_test')
    );

UPDATE public.profiles
SET account_status = 'active',
    activated_at = now(),
    role = CASE
        WHEN id = '00000000-0000-4000-8000-000000000911'::uuid THEN 'admin'
        ELSE 'waiter'
    END
WHERE id IN (
    '00000000-0000-4000-8000-000000000911',
    '00000000-0000-4000-8000-000000000912'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000911', true);

INSERT INTO public.restaurant_tables (id, name, created_by)
VALUES (
    '30000000-0000-4000-8000-000000000911',
    'Mesa de prueba',
    '00000000-0000-4000-8000-000000000911'
);

INSERT INTO public.table_qr_codes (
    id,
    restaurant_table_id,
    name,
    public_token,
    destination_type,
    destination_url,
    created_by
) VALUES (
    '40000000-0000-4000-8000-000000000911',
    '30000000-0000-4000-8000-000000000911',
    'QR de prueba',
    'qr_000000000000000000000911',
    'url',
    'https://example.com/menu',
    '00000000-0000-4000-8000-000000000911'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000912', true);

DO $test$
BEGIN
    IF EXISTS (SELECT 1 FROM public.restaurant_tables WHERE name = 'Mesa de prueba')
       OR EXISTS (SELECT 1 FROM public.table_qr_codes WHERE name = 'QR de prueba') THEN
        RAISE EXCEPTION 'Un usuario operativo pudo consultar Configuración de mesas';
    END IF;
END;
$test$;

RESET ROLE;

SET LOCAL ROLE service_role;

DO $test$
DECLARE
    first_scan boolean;
    repeated_scan boolean;
BEGIN
    SELECT public.record_table_qr_scan(
        '40000000-0000-4000-8000-000000000911',
        repeat('a', 64)
    ) INTO first_scan;
    SELECT public.record_table_qr_scan(
        '40000000-0000-4000-8000-000000000911',
        repeat('a', 64)
    ) INTO repeated_scan;

    IF NOT first_scan OR repeated_scan THEN
        RAISE EXCEPTION 'La deduplicación de escaneos no funciona';
    END IF;
END;
$test$;

INSERT INTO public.products (id, name, price, category, stock)
VALUES (
    '10000000-0000-4000-8000-000000000911',
    'Plato para sorteo',
    4.00,
    'Platos',
    10
);

INSERT INTO public.campaigns (
    id,
    slug,
    title,
    description,
    reward,
    status,
    created_by
) VALUES (
    '20000000-0000-4000-8000-000000000911',
    'sorteo-seguro-911',
    'Sorteo seguro',
    'Campaña cerrada para probar la selección transaccional',
    'Premio de prueba',
    'closed',
    '00000000-0000-4000-8000-000000000911'
);

INSERT INTO public.campaign_responses (
    id,
    campaign_id,
    full_name,
    email,
    phone,
    favorite_product_id,
    favorite_product_name,
    sector,
    consent_at
) VALUES
    (
        '50000000-0000-4000-8000-000000000911',
        '20000000-0000-4000-8000-000000000911',
        'Participante Uno',
        'participante1@example.com',
        '0999999901',
        '10000000-0000-4000-8000-000000000911',
        'Plato para sorteo',
        'moran',
        now()
    ),
    (
        '50000000-0000-4000-8000-000000000912',
        '20000000-0000-4000-8000-000000000911',
        'Participante Dos',
        'participante2@example.com',
        '0999999902',
        '10000000-0000-4000-8000-000000000911',
        'Plato para sorteo',
        'moran',
        now()
    ),
    (
        '50000000-0000-4000-8000-000000000913',
        '20000000-0000-4000-8000-000000000911',
        'Participante Tres',
        'participante3@example.com',
        '0999999903',
        '10000000-0000-4000-8000-000000000911',
        'Plato para sorteo',
        'moran',
        now()
    );

SELECT * FROM public.run_campaign_draw(
    '20000000-0000-4000-8000-000000000911',
    2,
    '00000000-0000-4000-8000-000000000911'
);

DO $test$
BEGIN
    IF (
        SELECT count(*)
        FROM public.campaign_draw_winners w
        JOIN public.campaign_draws d ON d.id = w.draw_id
        WHERE d.campaign_id = '20000000-0000-4000-8000-000000000911'
    ) <> 2 THEN
        RAISE EXCEPTION 'El sorteo no guardó exactamente dos ganadores';
    END IF;

    IF EXISTS (
        SELECT campaign_response_id
        FROM public.campaign_draw_winners
        GROUP BY campaign_response_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'El sorteo repitió un ganador';
    END IF;
END;
$test$;

RESET ROLE;
ROLLBACK;
