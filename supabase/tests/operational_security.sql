\set ON_ERROR_STOP on

BEGIN;

-- Usuarios temporales. El trigger crea profiles con rol waiter.
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
    (
        '00000000-0000-4000-8000-000000000701',
        'waiter.transaction.test@example.com',
        jsonb_build_object('username', 'waiter_transaction_test')
    ),
    (
        '00000000-0000-4000-8000-000000000702',
        'chef.transaction.test@example.com',
        jsonb_build_object('username', 'chef_transaction_test')
    ),
    (
        '00000000-0000-4000-8000-000000000703',
        'cashier.transaction.test@example.com',
        jsonb_build_object('username', 'cashier_transaction_test')
    );

UPDATE public.profiles
SET account_status = 'active',
    activated_at = now(),
    role = CASE id
    WHEN '00000000-0000-4000-8000-000000000702'::uuid THEN 'chef'
    WHEN '00000000-0000-4000-8000-000000000703'::uuid THEN 'cashier'
    ELSE role
END
WHERE id IN (
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000702',
    '00000000-0000-4000-8000-000000000703'
);

INSERT INTO public.products (id, name, price, category, stock)
VALUES
    (
        '10000000-0000-4000-8000-000000000701',
        'Producto transaccional A',
        2.50,
        'Pruebas',
        10
    ),
    (
        '10000000-0000-4000-8000-000000000702',
        'Producto transaccional B',
        1.25,
        'Pruebas',
        8
    ),
    (
        '10000000-0000-4000-8000-000000000703',
        'Producto eliminable',
        1.00,
        'Pruebas',
        1
    );

-- Los clientes no tienen mutaciones directas ni acceso a funciones antiguas.
DO $test$
BEGIN
    IF has_table_privilege('anon', 'public.orders', 'DELETE')
       OR has_table_privilege('authenticated', 'public.orders', 'UPDATE')
       OR has_table_privilege('authenticated', 'public.order_items', 'INSERT')
       OR has_table_privilege('authenticated', 'public.reporte_ventas', 'UPDATE')
       OR has_table_privilege('anon', 'public.password_resets', 'SELECT') THEN
        RAISE EXCEPTION 'Persisten permisos directos inseguros';
    END IF;

    IF to_regprocedure('public.create_full_order(text,uuid,jsonb,numeric)') IS NOT NULL THEN
        RAISE EXCEPTION 'La función create_full_order todavía existe';
    END IF;
END;
$test$;

-- Creación: ignora cualquier precio enviado y calcula el total en servidor.
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000701',
    true
);

SELECT public.create_order_transaction(
    'Mesa prueba',
    jsonb_build_array(
        jsonb_build_object(
            'product_id', '10000000-0000-4000-8000-000000000701',
            'quantity', 2,
            'price', 0.01
        ),
        jsonb_build_object(
            'product_id', '10000000-0000-4000-8000-000000000702',
            'quantity', 1,
            'price', 9999
        )
    )
) AS paid_order_id
\gset

SELECT set_config('test.paid_order_id', :'paid_order_id', true);

RESET ROLE;

DO $test$
DECLARE
    v_total numeric;
    v_stock_a integer;
    v_stock_b integer;
    v_report_total numeric;
BEGIN
    SELECT total INTO v_total
    FROM public.orders
    WHERE id = current_setting('test.paid_order_id')::uuid;

    SELECT stock INTO v_stock_a
    FROM public.products
    WHERE id = '10000000-0000-4000-8000-000000000701';

    SELECT stock INTO v_stock_b
    FROM public.products
    WHERE id = '10000000-0000-4000-8000-000000000702';

    -- Reportes no son visibles para meseros; se comprueban después como admin.
    IF v_total <> 6.25 OR v_stock_a <> 8 OR v_stock_b <> 7 THEN
        RAISE EXCEPTION 'La creación no calculó correctamente total o stock';
    END IF;

    BEGIN
        PERFORM public.create_order_transaction(
            'Sin stock',
            jsonb_build_array(
                jsonb_build_object(
                    'product_id', '10000000-0000-4000-8000-000000000701',
                    'quantity', 999
                )
            )
        );
        RAISE EXCEPTION 'Se permitió crear un pedido sin stock';
    EXCEPTION
        WHEN check_violation THEN
            NULL;
    END;

    SELECT monto INTO v_report_total
    FROM public.reporte_ventas
    WHERE pedido_id = current_setting('test.paid_order_id')::uuid;

    -- SECURITY DEFINER permite que la comprobación interna vea el reporte.
    IF v_report_total IS DISTINCT FROM 6.25 THEN
        RAISE EXCEPTION 'El reporte inicial no coincide con el pedido';
    END IF;
END;
$test$;

-- El mesero no puede saltarse el flujo ni escribir tablas directamente.
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000701',
    true
);

DO $test$
BEGIN
    BEGIN
        UPDATE public.orders
        SET total = 0
        WHERE id = current_setting('test.paid_order_id')::uuid;
        RAISE EXCEPTION 'El mesero obtuvo UPDATE directo sobre orders';
    EXCEPTION
        WHEN insufficient_privilege THEN
            NULL;
    END;

    BEGIN
        PERFORM public.update_order_status_transaction(
            current_setting('test.paid_order_id')::uuid,
            'served'
        );
        RAISE EXCEPTION 'El mesero pudo saltar de pending a served';
    EXCEPTION
        WHEN insufficient_privilege THEN
            NULL;
    END;
END;
$test$;

SELECT updated_at AS original_updated_at
FROM public.orders
WHERE id = current_setting('test.paid_order_id')::uuid
\gset

SELECT set_config('test.original_updated_at', :'original_updated_at', true);

-- Edición válida y control de concurrencia optimista.
SELECT public.update_order_transaction(
    current_setting('test.paid_order_id')::uuid,
    jsonb_build_array(
        jsonb_build_object(
            'product_id', '10000000-0000-4000-8000-000000000701',
            'quantity', 1
        ),
        jsonb_build_object(
            'product_id', '10000000-0000-4000-8000-000000000702',
            'quantity', 2
        )
    ),
    current_setting('test.original_updated_at')::timestamp with time zone
);

DO $test$
DECLARE
    v_total numeric;
    v_stock_a integer;
    v_stock_b integer;
BEGIN
    SELECT total INTO v_total
    FROM public.orders
    WHERE id = current_setting('test.paid_order_id')::uuid;

    SELECT stock INTO v_stock_a
    FROM public.products
    WHERE id = '10000000-0000-4000-8000-000000000701';

    SELECT stock INTO v_stock_b
    FROM public.products
    WHERE id = '10000000-0000-4000-8000-000000000702';

    IF v_total <> 5.00 OR v_stock_a <> 9 OR v_stock_b <> 6 THEN
        RAISE EXCEPTION 'La edición no recalculó correctamente total o stock';
    END IF;

    BEGIN
        PERFORM public.update_order_transaction(
            current_setting('test.paid_order_id')::uuid,
            jsonb_build_array(
                jsonb_build_object(
                    'product_id', '10000000-0000-4000-8000-000000000701',
                    'quantity', 3
                )
            ),
            current_setting('test.original_updated_at')::timestamp with time zone
        );
        RAISE EXCEPTION 'No se detectó una edición concurrente';
    EXCEPTION
        WHEN serialization_failure THEN
            NULL;
    END;

    IF (
        SELECT total
        FROM public.orders
        WHERE id = current_setting('test.paid_order_id')::uuid
    ) <> 5.00 THEN
        RAISE EXCEPTION 'El rollback de concurrencia alteró el pedido';
    END IF;
END;
$test$;

-- Cocina procesa el pedido.
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000702',
    true
);
SELECT public.update_order_status_transaction(
    current_setting('test.paid_order_id')::uuid,
    'preparing'
);
SELECT public.update_order_status_transaction(
    current_setting('test.paid_order_id')::uuid,
    'served'
);

-- El mesero confirma que fue servido.
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000701',
    true
);
SELECT public.update_order_status_transaction(
    current_setting('test.paid_order_id')::uuid,
    'ready'
);

-- Caja cobra.
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000703',
    true
);
SELECT public.pay_order_transaction(
    current_setting('test.paid_order_id')::uuid,
    1
);

RESET ROLE;

DO $test$
DECLARE
    v_order public.orders%ROWTYPE;
    v_status text;
    v_report public.reporte_ventas%ROWTYPE;
    v_audit_count integer;
    v_history_count integer;
BEGIN
    SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = current_setting('test.paid_order_id')::uuid;

    SELECT status
    INTO v_status
    FROM public.status_order
    WHERE id = v_order.status_id;

    SELECT *
    INTO v_report
    FROM public.reporte_ventas
    WHERE pedido_id = current_setting('test.paid_order_id')::uuid;

    SELECT count(*) INTO v_audit_count
    FROM public.auditoria_pedidos
    WHERE pedido_id = current_setting('test.paid_order_id')::uuid
      AND estado_pedido = 'Editado';

    SELECT count(*) INTO v_history_count
    FROM public.historial_auditoria_pedidos
    WHERE pedido_id = current_setting('test.paid_order_id')::uuid
      AND estado_pedido = 'Editado';

    IF NOT v_order.is_paid
       OR v_status <> 'paid'
       OR v_order.payment_type_id <> 1
       OR v_report.estado <> 'paid'
       OR v_report.monto <> 5.00
       OR v_report.tipo_pago <> 'efectivo'
       OR v_report.cocinero <> 'chef_transaction_test'
       OR v_report.cajero <> 'cashier_transaction_test'
       OR v_audit_count <> 1
       OR v_history_count <> 1 THEN
        RAISE EXCEPTION 'El flujo completo o su auditoría es inconsistente';
    END IF;
END;
$test$;

-- Cancelación: se restaura stock, se conserva reporte y se audita.
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000701',
    true
);

SELECT public.create_order_transaction(
    'Mesa cancelación',
    jsonb_build_array(
        jsonb_build_object(
            'product_id', '10000000-0000-4000-8000-000000000701',
            'quantity', 2
        )
    )
) AS canceled_order_id
\gset

SELECT set_config('test.canceled_order_id', :'canceled_order_id', true);

SELECT public.cancel_order_transaction(
    current_setting('test.canceled_order_id')::uuid
);

RESET ROLE;

DO $test$
DECLARE
    v_stock integer;
    v_report_status text;
    v_audit_status text;
BEGIN
    SELECT stock INTO v_stock
    FROM public.products
    WHERE id = '10000000-0000-4000-8000-000000000701';

    SELECT estado INTO v_report_status
    FROM public.reporte_ventas
    WHERE pedido_id = current_setting('test.canceled_order_id')::uuid;

    SELECT estado_pedido INTO v_audit_status
    FROM public.auditoria_pedidos
    WHERE pedido_id = current_setting('test.canceled_order_id')::uuid;

    IF EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = current_setting('test.canceled_order_id')::uuid
    ) OR v_stock <> 9
       OR v_report_status <> 'canceled'
       OR v_audit_status <> 'Cancelado / Eliminado' THEN
        RAISE EXCEPTION 'La cancelación no fue atómica';
    END IF;
END;
$test$;

-- Solo admin elimina productos y nunca aquellos con historial.
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    'c561c123-f7f6-4b23-a19f-e52f1911c48e',
    true
);
SELECT public.delete_product_transaction(
    '10000000-0000-4000-8000-000000000703'
);

DO $test$
BEGIN
    BEGIN
        PERFORM public.delete_product_transaction(
            '10000000-0000-4000-8000-000000000701'
        );
        RAISE EXCEPTION 'Se eliminó un producto con historial';
    EXCEPTION
        WHEN foreign_key_violation THEN
            NULL;
    END;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.products
        WHERE id = '10000000-0000-4000-8000-000000000703'
    ) THEN
        RAISE EXCEPTION 'No se eliminó el producto sin historial';
    END IF;
END;
$test$;

ROLLBACK;
