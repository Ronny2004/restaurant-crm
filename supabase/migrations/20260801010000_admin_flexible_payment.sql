-- El administrador puede cobrar un pedido en cualquier estado operativo.
-- El cajero conserva la obligación de esperar hasta el estado ready.

-- Normaliza pagos históricos creados antes de que status_id e is_paid
-- quedaran sincronizados transaccionalmente.
DO $migration$
DECLARE
    v_paid_status_id integer;
BEGIN
    SELECT id
    INTO v_paid_status_id
    FROM public.status_order
    WHERE status = 'paid';

    IF v_paid_status_id IS NULL THEN
        RAISE EXCEPTION 'No existe el estado paid';
    END IF;

    UPDATE public.orders
    SET status_id = v_paid_status_id
    WHERE is_paid = true
      AND status_id IS DISTINCT FROM v_paid_status_id;

    UPDATE public.reporte_ventas AS report
    SET estado = 'paid'
    FROM public.orders AS orders
    WHERE orders.id = report.pedido_id
      AND orders.is_paid = true
      AND report.estado IS DISTINCT FROM 'paid';
END;
$migration$;

CREATE OR REPLACE FUNCTION public.pay_order_transaction(
    p_order_id uuid,
    p_payment_type_id integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text;
    v_username text;
    v_current_status text;
    v_is_paid boolean;
    v_payment_type text;
    v_paid_status_id integer;
BEGIN
    SELECT role, COALESCE(username, full_name, email)
    INTO v_role, v_username
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_user_id IS NULL OR v_role NOT IN ('cashier', 'admin') THEN
        RAISE EXCEPTION 'No tienes permisos para cobrar pedidos'
            USING ERRCODE = '42501';
    END IF;

    SELECT status_row.status, orders.is_paid
    INTO v_current_status, v_is_paid
    FROM public.orders AS orders
    JOIN public.status_order AS status_row ON status_row.id = orders.status_id
    WHERE orders.id = p_order_id
    FOR UPDATE OF orders;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido no existe'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_is_paid THEN
        RAISE EXCEPTION 'El pedido ya fue pagado'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_role = 'cashier' AND v_current_status <> 'ready' THEN
        RAISE EXCEPTION 'El pedido debe estar servido antes de cobrar'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT type
    INTO v_payment_type
    FROM public.payment_type
    WHERE id = p_payment_type_id;

    IF v_payment_type IS NULL THEN
        RAISE EXCEPTION 'Método de pago inválido'
            USING ERRCODE = '22023';
    END IF;

    SELECT id
    INTO v_paid_status_id
    FROM public.status_order
    WHERE status = 'paid';

    IF v_paid_status_id IS NULL THEN
        RAISE EXCEPTION 'No existe el estado paid'
            USING ERRCODE = '23503';
    END IF;

    UPDATE public.orders
    SET
        is_paid = true,
        payment_type_id = p_payment_type_id,
        status_id = v_paid_status_id
    WHERE id = p_order_id;

    UPDATE public.reporte_ventas
    SET
        estado = 'paid',
        cajero = COALESCE(v_username, 'Desconocido'),
        tipo_pago = v_payment_type
    WHERE pedido_id = p_order_id;

    RETURN p_order_id;
END;
$function$;

COMMENT ON FUNCTION public.pay_order_transaction(uuid, integer) IS
    'Cobra pedidos de forma transaccional. Cashier requiere ready; admin puede cobrar en cualquier estado.';
