BEGIN;

SELECT id AS admin_id FROM public.profiles
WHERE role = 'admin' AND account_status = 'active' LIMIT 1 \gset
SELECT id AS waiter_id FROM public.profiles
WHERE role = 'waiter' AND account_status = 'active' LIMIT 1 \gset
SELECT set_config('test.admin_id', :'admin_id', false);
SELECT set_config('test.waiter_id', :'waiter_id', false);

DO $$
BEGIN
    IF has_function_privilege('authenticated', 'public.delete_campaign_admin(uuid,uuid)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.delete_table_qr_admin(uuid,uuid)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.delete_restaurant_table_admin(uuid,uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Authenticated no debe ejecutar funciones de eliminación directamente';
    END IF;
END;
$$;

INSERT INTO public.campaigns (id, slug, title, description, reward, status, created_by)
VALUES (
    '10000000-0000-4000-8000-000000000951',
    'campaign-delete-test-951',
    'Campaña para eliminar',
    'Datos de prueba',
    'Premio de prueba',
    'closed',
    :'admin_id'::uuid
);

INSERT INTO public.campaign_responses (
    id, campaign_id, full_name, email, phone, favorite_product_name,
    sector, consent_at
) VALUES
    ('20000000-0000-4000-8000-000000000951', '10000000-0000-4000-8000-000000000951', 'Persona Uno', 'delete1@example.com', '0999999951', 'Plato Uno', 'moran', now()),
    ('20000000-0000-4000-8000-000000000952', '10000000-0000-4000-8000-000000000951', 'Persona Dos', 'delete2@example.com', '0999999952', 'Plato Dos', 'calderon', now());

SELECT * FROM public.run_campaign_draw(
    '10000000-0000-4000-8000-000000000951', 1,
    :'admin_id'::uuid
);

INSERT INTO public.restaurant_tables (id, name, created_by)
VALUES ('30000000-0000-4000-8000-000000000951', 'Mesa Delete Test 951', :'admin_id'::uuid);

INSERT INTO public.table_qr_codes (
    id, restaurant_table_id, name, public_token, destination_type,
    campaign_id, created_by
) VALUES (
    '40000000-0000-4000-8000-000000000951',
    '30000000-0000-4000-8000-000000000951',
    'QR campaña test', 'qr_000000000000000000000951', 'campaign',
    '10000000-0000-4000-8000-000000000951',
    :'admin_id'::uuid
);

DO $$
BEGIN
    BEGIN
        PERFORM public.delete_campaign_admin(
            '10000000-0000-4000-8000-000000000951',
            current_setting('test.admin_id')::uuid
        );
        RAISE EXCEPTION 'La campaña asociada a un QR no debió eliminarse';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE 'La campaña está asociada a un QR%' THEN RAISE; END IF;
    END;
END;
$$;

SELECT public.delete_table_qr_admin(
    '40000000-0000-4000-8000-000000000951',
    :'admin_id'::uuid
);
SELECT public.delete_campaign_admin(
    '10000000-0000-4000-8000-000000000951',
    :'admin_id'::uuid
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.campaigns WHERE id = '10000000-0000-4000-8000-000000000951')
       OR EXISTS (SELECT 1 FROM public.campaign_responses WHERE campaign_id = '10000000-0000-4000-8000-000000000951')
       OR EXISTS (SELECT 1 FROM public.campaign_draws WHERE campaign_id = '10000000-0000-4000-8000-000000000951') THEN
        RAISE EXCEPTION 'La eliminación transaccional de campaña quedó incompleta';
    END IF;
END;
$$;

INSERT INTO public.table_qr_codes (
    id, restaurant_table_id, name, public_token, destination_type,
    destination_url, created_by
) VALUES (
    '40000000-0000-4000-8000-000000000952',
    '30000000-0000-4000-8000-000000000951',
    'QR mesa test', 'qr_000000000000000000000952', 'url',
    'https://example.com/', :'admin_id'::uuid
);
INSERT INTO public.table_qr_scan_events (qr_code_id, visitor_hash)
VALUES ('40000000-0000-4000-8000-000000000952', repeat('a', 64));

DO $$
BEGIN
    BEGIN
        PERFORM public.delete_restaurant_table_admin(
            '30000000-0000-4000-8000-000000000951',
            current_setting('test.waiter_id')::uuid
        );
        RAISE EXCEPTION 'Un mesero no debió eliminar la mesa';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE 'Solo un administrador activo%' THEN RAISE; END IF;
    END;
END;
$$;

SELECT public.delete_restaurant_table_admin(
    '30000000-0000-4000-8000-000000000951',
    :'admin_id'::uuid
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.restaurant_tables WHERE id = '30000000-0000-4000-8000-000000000951')
       OR EXISTS (SELECT 1 FROM public.table_qr_codes WHERE restaurant_table_id = '30000000-0000-4000-8000-000000000951')
       OR EXISTS (SELECT 1 FROM public.table_qr_scan_events WHERE qr_code_id = '40000000-0000-4000-8000-000000000952') THEN
        RAISE EXCEPTION 'La eliminación transaccional de mesa quedó incompleta';
    END IF;

    IF (SELECT count(*) FROM public.admin_resource_deletion_audit
        WHERE entity_id IN (
            '10000000-0000-4000-8000-000000000951',
            '30000000-0000-4000-8000-000000000951',
            '40000000-0000-4000-8000-000000000951'
        )) <> 3 THEN
        RAISE EXCEPTION 'No se registraron todas las auditorías esperadas';
    END IF;
END;
$$;

ROLLBACK;
