-- Seguridad e integridad operacional para pedidos, inventario, reportes y
-- auditoría. Todas las mutaciones relacionadas con pedidos pasan por RPC
-- transaccionales y los precios/totales se calculan en PostgreSQL.

-- ---------------------------------------------------------------------------
-- Catálogos requeridos por la aplicación
-- ---------------------------------------------------------------------------

INSERT INTO public.status_order (id, status, description)
VALUES
    (1, 'pending', 'El mesero anotó una orden y el cocinero no acepta la orden'),
    (2, 'preparing', 'El cocinero aceptó la orden y la está cocinando'),
    (3, 'served', 'El pedido está listo para servir al cliente'),
    (4, 'ready', 'El pedido ya fue servido y está en espera de ser pagado'),
    (5, 'paid', 'El pedido ha sido pagado y la mesa está cerrada'),
    (6, 'editing', 'El pedido está siendo modificado por un mesero y está temporalmente bloqueado para otros roles.')
ON CONFLICT (status) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO public.payment_type (id, type, description)
VALUES
    (1, 'efectivo', 'El cliente paga con dinero físico'),
    (2, 'transferencia', 'El cliente paga mediante transferencia o código QR')
ON CONFLICT (type) DO UPDATE
SET description = EXCLUDED.description;

-- Las inserciones de pedidos se hacen mediante create_order_transaction.
ALTER TABLE public.orders ALTER COLUMN status_id DROP DEFAULT;

-- timestamptz almacena un instante UTC. La zona se aplica solo al presentar.
ALTER TABLE public.auditoria_pedidos
    ALTER COLUMN fecha_hora SET DEFAULT now();
ALTER TABLE public.historial_auditoria_pedidos
    ALTER COLUMN fecha_hora SET DEFAULT now();
ALTER TABLE public.order_items
    ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.orders
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.products
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.profiles
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.registro_sesiones
    ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.reporte_ventas
    ALTER COLUMN fecha_hora SET DEFAULT now();

-- ---------------------------------------------------------------------------
-- Helpers de autorización
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid();
$function$;

ALTER FUNCTION public.current_user_role() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.current_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT COALESCE(username, full_name, email, 'Sistema')
    FROM public.profiles
    WHERE id = auth.uid();
$function$;

ALTER FUNCTION public.current_username() OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- Auditoría de pedidos
-- ---------------------------------------------------------------------------

-- Conserva en el historial cualquier resumen duplicado antes de imponer una
-- sola fila actual por pedido.
WITH ranked AS (
    SELECT
        a.*,
        row_number() OVER (
            PARTITION BY a.pedido_id
            ORDER BY a.fecha_hora DESC NULLS LAST, a.id DESC
        ) AS position
    FROM public.auditoria_pedidos AS a
)
INSERT INTO public.historial_auditoria_pedidos (
    fecha_hora,
    usuario,
    mesa,
    pedido_id,
    estado_pedido,
    pedido_original,
    pedido_actualizado
)
SELECT
    fecha_hora,
    usuario,
    mesa,
    pedido_id,
    estado_pedido,
    pedido_original,
    pedido_actualizado
FROM ranked
WHERE position > 1 OR pedido_id IS NULL;

WITH ranked AS (
    SELECT
        id,
        pedido_id,
        row_number() OVER (
            PARTITION BY pedido_id
            ORDER BY fecha_hora DESC NULLS LAST, id DESC
        ) AS position
    FROM public.auditoria_pedidos
)
DELETE FROM public.auditoria_pedidos AS audit
USING ranked
WHERE audit.id = ranked.id
  AND (ranked.position > 1 OR ranked.pedido_id IS NULL);

ALTER TABLE public.auditoria_pedidos
    ALTER COLUMN pedido_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auditoria_pedidos_pedido_id
    ON public.auditoria_pedidos (pedido_id);

CREATE INDEX IF NOT EXISTS idx_historial_auditoria_pedido_fecha
    ON public.historial_auditoria_pedidos (pedido_id, fecha_hora DESC);

CREATE INDEX IF NOT EXISTS idx_reporte_ventas_fecha
    ON public.reporte_ventas (fecha_hora DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
    ON public.orders (status_id, created_at DESC);

DROP FUNCTION IF EXISTS public.auditar_edicion_pedido(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.auditar_edicion_pedido(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.auditar_eliminacion_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_username text;
    v_original text;
BEGIN
    v_username := COALESCE(public.current_username(), 'Sistema');

    SELECT COALESCE(
        string_agg(
            product_name || ' (x' || quantity::text || ')',
            ', ' ORDER BY product_name
        ),
        'Sin productos'
    )
    INTO v_original
    FROM (
        SELECT
            COALESCE(p.name, oi.product_name, 'Producto') AS product_name,
            sum(oi.quantity)::integer AS quantity
        FROM public.order_items AS oi
        LEFT JOIN public.products AS p ON p.id = oi.product_id
        WHERE oi.order_id = OLD.id
        GROUP BY oi.product_id, p.name, oi.product_name
    ) AS items;

    INSERT INTO public.auditoria_pedidos (
        fecha_hora,
        usuario,
        mesa,
        pedido_id,
        estado_pedido,
        pedido_original,
        pedido_actualizado
    )
    VALUES (
        now(),
        v_username,
        OLD.table_number,
        OLD.id,
        'Cancelado / Eliminado',
        v_original,
        'Orden eliminada completamente'
    )
    ON CONFLICT (pedido_id) DO UPDATE
    SET
        fecha_hora = EXCLUDED.fecha_hora,
        usuario = EXCLUDED.usuario,
        mesa = EXCLUDED.mesa,
        estado_pedido = EXCLUDED.estado_pedido,
        pedido_original = EXCLUDED.pedido_original,
        pedido_actualizado = EXCLUDED.pedido_actualizado;

    INSERT INTO public.historial_auditoria_pedidos (
        fecha_hora,
        usuario,
        mesa,
        pedido_id,
        estado_pedido,
        pedido_original,
        pedido_actualizado
    )
    VALUES (
        now(),
        v_username,
        OLD.table_number,
        OLD.id,
        'Cancelado / Eliminado',
        v_original,
        'Orden eliminada completamente'
    );

    RETURN OLD;
END;
$function$;

ALTER FUNCTION public.auditar_eliminacion_pedido() OWNER TO postgres;

DROP TRIGGER IF EXISTS tr_auditar_eliminacion ON public.orders;

CREATE TRIGGER tr_auditar_eliminacion
    BEFORE DELETE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.auditar_eliminacion_pedido();

-- ---------------------------------------------------------------------------
-- Inventario
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.products
        SET stock = stock - NEW.quantity
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.products
        SET stock = stock + OLD.quantity
        WHERE id = OLD.product_id;
        RETURN OLD;
    ELSIF OLD.product_id = NEW.product_id THEN
        UPDATE public.products
        SET stock = stock + OLD.quantity - NEW.quantity
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSE
        UPDATE public.products
        SET stock = stock + OLD.quantity
        WHERE id = OLD.product_id;

        UPDATE public.products
        SET stock = stock - NEW.quantity
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
END;
$function$;

ALTER FUNCTION public.update_stock_on_order() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- RPC transaccionales
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_full_order(text, uuid, jsonb, numeric);

CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_table_number text,
    p_items jsonb
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
    v_status_id integer;
    v_order_id uuid;
    v_item_count integer;
    v_distinct_count integer;
    v_found_count integer;
    v_total numeric;
    v_unavailable_product text;
BEGIN
    SELECT role, COALESCE(username, full_name, email)
    INTO v_role, v_username
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_user_id IS NULL OR v_role NOT IN ('waiter', 'admin') THEN
        RAISE EXCEPTION 'No tienes permisos para crear pedidos'
            USING ERRCODE = '42501';
    END IF;

    IF NULLIF(btrim(p_table_number), '') IS NULL THEN
        RAISE EXCEPTION 'El número de mesa es obligatorio'
            USING ERRCODE = '22023';
    END IF;

    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe contener al menos un producto'
            USING ERRCODE = '22023';
    END IF;

    v_item_count := jsonb_array_length(p_items);

    SELECT count(*), count(DISTINCT product_id)
    INTO v_found_count, v_distinct_count
    FROM jsonb_to_recordset(p_items)
        AS item(product_id uuid, quantity integer);

    IF v_found_count <> v_item_count
       OR v_distinct_count <> v_item_count
       OR EXISTS (
            SELECT 1
            FROM jsonb_to_recordset(p_items)
                AS item(product_id uuid, quantity integer)
            WHERE product_id IS NULL OR quantity IS NULL OR quantity <= 0
       ) THEN
        RAISE EXCEPTION 'Los productos del pedido son inválidos o están duplicados'
            USING ERRCODE = '22023';
    END IF;

    PERFORM product.id
    FROM public.products AS product
    JOIN jsonb_to_recordset(p_items)
        AS item(product_id uuid, quantity integer)
      ON item.product_id = product.id
    ORDER BY product.id
    FOR UPDATE OF product;

    SELECT count(*)
    INTO v_found_count
    FROM public.products AS product
    JOIN jsonb_to_recordset(p_items)
        AS item(product_id uuid, quantity integer)
      ON item.product_id = product.id;

    IF v_found_count <> v_item_count THEN
        RAISE EXCEPTION 'Uno o más productos no existen'
            USING ERRCODE = '22023';
    END IF;

    SELECT product.name
    INTO v_unavailable_product
    FROM public.products AS product
    JOIN jsonb_to_recordset(p_items)
        AS item(product_id uuid, quantity integer)
      ON item.product_id = product.id
    WHERE product.stock < item.quantity
    ORDER BY product.name
    LIMIT 1;

    IF v_unavailable_product IS NOT NULL THEN
        RAISE EXCEPTION 'Stock insuficiente para %', v_unavailable_product
            USING ERRCODE = '23514';
    END IF;

    SELECT sum(product.price * item.quantity)
    INTO v_total
    FROM public.products AS product
    JOIN jsonb_to_recordset(p_items)
        AS item(product_id uuid, quantity integer)
      ON item.product_id = product.id;

    SELECT id
    INTO v_status_id
    FROM public.status_order
    WHERE status = 'pending';

    IF v_status_id IS NULL THEN
        RAISE EXCEPTION 'No existe el estado pending'
            USING ERRCODE = '23503';
    END IF;

    INSERT INTO public.orders (
        table_number,
        total,
        created_by,
        status_id,
        is_paid
    )
    VALUES (
        btrim(p_table_number),
        v_total,
        v_user_id,
        v_status_id,
        false
    )
    RETURNING id INTO v_order_id;

    INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        price,
        product_name
    )
    SELECT
        v_order_id,
        product.id,
        item.quantity,
        product.price,
        product.name
    FROM public.products AS product
    JOIN jsonb_to_recordset(p_items)
        AS item(product_id uuid, quantity integer)
      ON item.product_id = product.id;

    INSERT INTO public.reporte_ventas (
        pedido_id,
        fecha_hora,
        mesa,
        mesero,
        estado,
        monto
    )
    VALUES (
        v_order_id,
        now(),
        btrim(p_table_number),
        COALESCE(v_username, 'Desconocido'),
        'pending',
        v_total
    );

    RETURN v_order_id;
END;
$function$;

ALTER FUNCTION public.create_order_transaction(text, jsonb) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.update_order_transaction(
    p_order_id uuid,
    p_items jsonb,
    p_expected_updated_at timestamp with time zone DEFAULT NULL
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
    v_order public.orders%ROWTYPE;
    v_status text;
    v_item_count integer;
    v_distinct_count integer;
    v_found_count integer;
    v_total numeric;
    v_unavailable_product text;
    v_original_state jsonb;
    v_updated_state jsonb;
    v_original_text text;
    v_updated_text text;
BEGIN
    SELECT role, COALESCE(username, full_name, email)
    INTO v_role, v_username
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_user_id IS NULL OR v_role NOT IN ('waiter', 'admin') THEN
        RAISE EXCEPTION 'No tienes permisos para editar pedidos'
            USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido no existe'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT status
    INTO v_status
    FROM public.status_order
    WHERE id = v_order.status_id;

    IF v_role = 'waiter' AND v_order.created_by IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'Solo el mesero que creó el pedido puede editarlo'
            USING ERRCODE = '42501';
    END IF;

    IF v_order.is_paid OR v_status <> 'pending' THEN
        RAISE EXCEPTION 'Solo se pueden editar pedidos pendientes y no pagados'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_expected_updated_at IS NOT NULL
       AND v_order.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RAISE EXCEPTION 'El pedido cambió mientras estaba abierto. Recarga e inténtalo nuevamente'
            USING ERRCODE = '40001';
    END IF;

    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe contener al menos un producto'
            USING ERRCODE = '22023';
    END IF;

    v_item_count := jsonb_array_length(p_items);

    SELECT count(*), count(DISTINCT product_id)
    INTO v_found_count, v_distinct_count
    FROM jsonb_to_recordset(p_items)
        AS item(product_id uuid, quantity integer);

    IF v_found_count <> v_item_count
       OR v_distinct_count <> v_item_count
       OR EXISTS (
            SELECT 1
            FROM jsonb_to_recordset(p_items)
                AS item(product_id uuid, quantity integer)
            WHERE product_id IS NULL OR quantity IS NULL OR quantity <= 0
       ) THEN
        RAISE EXCEPTION 'Los productos del pedido son inválidos o están duplicados'
            USING ERRCODE = '22023';
    END IF;

    PERFORM product.id
    FROM public.products AS product
    WHERE product.id IN (
        SELECT oi.product_id
        FROM public.order_items AS oi
        WHERE oi.order_id = p_order_id
        UNION
        SELECT item.product_id
        FROM jsonb_to_recordset(p_items)
            AS item(product_id uuid, quantity integer)
    )
    ORDER BY product.id
    FOR UPDATE;

    SELECT count(*)
    INTO v_found_count
    FROM public.products AS product
    JOIN jsonb_to_recordset(p_items)
        AS item(product_id uuid, quantity integer)
      ON item.product_id = product.id;

    IF v_found_count <> v_item_count THEN
        RAISE EXCEPTION 'Uno o más productos no existen'
            USING ERRCODE = '22023';
    END IF;

    SELECT product.name
    INTO v_unavailable_product
    FROM jsonb_to_recordset(p_items)
        AS requested(product_id uuid, quantity integer)
    JOIN public.products AS product ON product.id = requested.product_id
    LEFT JOIN (
        SELECT product_id, sum(quantity)::integer AS quantity
        FROM public.order_items
        WHERE order_id = p_order_id
        GROUP BY product_id
    ) AS current_items ON current_items.product_id = requested.product_id
    WHERE requested.quantity > product.stock + COALESCE(current_items.quantity, 0)
    ORDER BY product.name
    LIMIT 1;

    IF v_unavailable_product IS NOT NULL THEN
        RAISE EXCEPTION 'Stock insuficiente para %', v_unavailable_product
            USING ERRCODE = '23514';
    END IF;

    SELECT
        COALESCE(
            jsonb_object_agg(product_id::text, quantity),
            '{}'::jsonb
        ),
        COALESCE(
            string_agg(product_name || ' (x' || quantity::text || ')', ', ' ORDER BY product_name),
            'Sin productos'
        )
    INTO v_original_state, v_original_text
    FROM (
        SELECT
            oi.product_id,
            sum(oi.quantity)::integer AS quantity,
            COALESCE(p.name, max(oi.product_name), 'Producto') AS product_name
        FROM public.order_items AS oi
        LEFT JOIN public.products AS p ON p.id = oi.product_id
        WHERE oi.order_id = p_order_id
        GROUP BY oi.product_id, p.name
    ) AS original_items;

    SELECT
        jsonb_object_agg(requested.product_id::text, requested.quantity),
        string_agg(
            product.name || ' (x' || requested.quantity::text || ')',
            ', ' ORDER BY product.name
        ),
        sum(product.price * requested.quantity)
    INTO v_updated_state, v_updated_text, v_total
    FROM jsonb_to_recordset(p_items)
        AS requested(product_id uuid, quantity integer)
    JOIN public.products AS product ON product.id = requested.product_id;

    DELETE FROM public.order_items
    WHERE order_id = p_order_id;

    INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        price,
        product_name
    )
    SELECT
        p_order_id,
        product.id,
        requested.quantity,
        product.price,
        product.name
    FROM jsonb_to_recordset(p_items)
        AS requested(product_id uuid, quantity integer)
    JOIN public.products AS product ON product.id = requested.product_id;

    UPDATE public.orders
    SET total = v_total
    WHERE id = p_order_id;

    UPDATE public.reporte_ventas
    SET monto = v_total
    WHERE pedido_id = p_order_id;

    IF v_original_state IS DISTINCT FROM v_updated_state THEN
        INSERT INTO public.auditoria_pedidos (
            fecha_hora,
            usuario,
            mesa,
            pedido_id,
            estado_pedido,
            pedido_original,
            pedido_actualizado
        )
        VALUES (
            now(),
            COALESCE(v_username, 'Desconocido'),
            v_order.table_number,
            p_order_id,
            'Editado',
            v_original_text,
            v_updated_text
        )
        ON CONFLICT (pedido_id) DO UPDATE
        SET
            fecha_hora = EXCLUDED.fecha_hora,
            usuario = EXCLUDED.usuario,
            mesa = EXCLUDED.mesa,
            estado_pedido = EXCLUDED.estado_pedido,
            pedido_original = EXCLUDED.pedido_original,
            pedido_actualizado = EXCLUDED.pedido_actualizado;

        INSERT INTO public.historial_auditoria_pedidos (
            fecha_hora,
            usuario,
            mesa,
            pedido_id,
            estado_pedido,
            pedido_original,
            pedido_actualizado
        )
        VALUES (
            now(),
            COALESCE(v_username, 'Desconocido'),
            v_order.table_number,
            p_order_id,
            'Editado',
            v_original_text,
            v_updated_text
        );
    END IF;

    RETURN p_order_id;
END;
$function$;

ALTER FUNCTION public.update_order_transaction(uuid, jsonb, timestamp with time zone)
    OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.cancel_order_transaction(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text;
    v_username text;
    v_order public.orders%ROWTYPE;
    v_status text;
BEGIN
    SELECT role, COALESCE(username, full_name, email)
    INTO v_role, v_username
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_user_id IS NULL OR v_role NOT IN ('waiter', 'admin') THEN
        RAISE EXCEPTION 'No tienes permisos para cancelar pedidos'
            USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido no existe'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT status
    INTO v_status
    FROM public.status_order
    WHERE id = v_order.status_id;

    IF v_order.is_paid THEN
        RAISE EXCEPTION 'No se puede cancelar un pedido pagado'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_role = 'waiter'
       AND (
            v_order.created_by IS DISTINCT FROM v_user_id
            OR v_status <> 'pending'
       ) THEN
        RAISE EXCEPTION 'Solo puedes cancelar tus propios pedidos pendientes'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.reporte_ventas
    SET
        estado = 'canceled',
        cancelado_por = COALESCE(v_username, 'Desconocido')
    WHERE pedido_id = p_order_id;

    DELETE FROM public.orders
    WHERE id = p_order_id;

    RETURN p_order_id;
END;
$function$;

ALTER FUNCTION public.cancel_order_transaction(uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.update_order_status_transaction(
    p_order_id uuid,
    p_status text
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
    v_target_status_id integer;
    v_is_paid boolean;
    v_allowed boolean := false;
BEGIN
    SELECT role, COALESCE(username, full_name, email)
    INTO v_role, v_username
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_user_id IS NULL OR v_role IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión'
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

    SELECT id
    INTO v_target_status_id
    FROM public.status_order
    WHERE status = p_status;

    IF v_target_status_id IS NULL OR p_status = 'paid' THEN
        RAISE EXCEPTION 'Estado de pedido inválido'
            USING ERRCODE = '22023';
    END IF;

    v_allowed := CASE
        WHEN v_role = 'admin' THEN
            p_status IN ('pending', 'preparing', 'served', 'ready', 'editing')
            AND p_status <> v_current_status
        WHEN v_role = 'chef' THEN
            (v_current_status = 'pending' AND p_status = 'preparing')
            OR (v_current_status = 'preparing' AND p_status = 'served')
        WHEN v_role = 'waiter' THEN
            v_current_status = 'served' AND p_status = 'ready'
        ELSE false
    END;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'Transición no permitida de % a % para el rol %',
            v_current_status, p_status, v_role
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.orders
    SET status_id = v_target_status_id
    WHERE id = p_order_id;

    UPDATE public.reporte_ventas
    SET
        estado = p_status,
        cocinero = CASE
            WHEN p_status IN ('preparing', 'served')
                THEN COALESCE(v_username, cocinero)
            ELSE cocinero
        END
    WHERE pedido_id = p_order_id;

    RETURN p_order_id;
END;
$function$;

ALTER FUNCTION public.update_order_status_transaction(uuid, text)
    OWNER TO postgres;

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

    IF v_current_status <> 'ready' THEN
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

ALTER FUNCTION public.pay_order_transaction(uuid, integer)
    OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.delete_product_transaction(p_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_role text := public.current_user_role();
BEGIN
    IF auth.uid() IS NULL OR v_role <> 'admin' THEN
        RAISE EXCEPTION 'Solo un administrador puede eliminar productos'
            USING ERRCODE = '42501';
    END IF;

    PERFORM 1
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto no existe'
            USING ERRCODE = 'P0002';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.order_items
        WHERE product_id = p_product_id
    ) THEN
        RAISE EXCEPTION 'No se puede eliminar un producto con historial de ventas'
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM public.products
    WHERE id = p_product_id;

    RETURN p_product_id;
END;
$function$;

ALTER FUNCTION public.delete_product_transaction(uuid) OWNER TO postgres;

-- Inicio de sesión por username. Se mantiene por compatibilidad con la UI,
-- con search_path seguro y comparación normalizada.
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT email
    FROM public.profiles
    WHERE lower(username) = lower(btrim(p_username))
    LIMIT 1;
$function$;

ALTER FUNCTION public.get_email_by_username(text) OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- RLS y permisos mínimos
-- ---------------------------------------------------------------------------

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir actualizar auditoria"
    ON public.auditoria_pedidos;
DROP POLICY IF EXISTS "Permitir eliminar order_items"
    ON public.auditoria_pedidos;
DROP POLICY IF EXISTS "Permitir insertar en auditoria"
    ON public.auditoria_pedidos;
DROP POLICY IF EXISTS "Permitir leer auditoria"
    ON public.auditoria_pedidos;
DROP POLICY IF EXISTS "Admins can read order audit"
    ON public.auditoria_pedidos;

CREATE POLICY "Admins can read order audit"
    ON public.auditoria_pedidos
    FOR SELECT TO authenticated
    USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Permitir insertar en historial"
    ON public.historial_auditoria_pedidos;
DROP POLICY IF EXISTS "Permitir leer historial"
    ON public.historial_auditoria_pedidos;
DROP POLICY IF EXISTS "Admins can read order audit history"
    ON public.historial_auditoria_pedidos;

CREATE POLICY "Admins can read order audit history"
    ON public.historial_auditoria_pedidos
    FOR SELECT TO authenticated
    USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Permitir eliminar order_items"
    ON public.order_items;
DROP POLICY IF EXISTS "Waiters and admins can create order items"
    ON public.order_items;

DROP POLICY IF EXISTS "Permitir eliminar orders"
    ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders"
    ON public.orders;
DROP POLICY IF EXISTS "Waiters and admins can create orders"
    ON public.orders;

DROP POLICY IF EXISTS "Permitir acceso total a usuarios autenticados"
    ON public.reporte_ventas;
DROP POLICY IF EXISTS "Admins can read sales reports"
    ON public.reporte_ventas;

CREATE POLICY "Admins can read sales reports"
    ON public.reporte_ventas
    FOR SELECT TO authenticated
    USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Only admins can delete products"
    ON public.products;
DROP POLICY IF EXISTS "Only admins can insert products"
    ON public.products;
DROP POLICY IF EXISTS "Only admins can update products"
    ON public.products;

CREATE POLICY "Only admins can insert products"
    ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Only admins can update products"
    ON public.products
    FOR UPDATE TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Usuarios pueden insertar sus registros"
    ON public.registro_sesiones;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios registros"
    ON public.registro_sesiones;
DROP POLICY IF EXISTS "Users can insert their own sessions"
    ON public.registro_sesiones;
DROP POLICY IF EXISTS "Users can read their own sessions"
    ON public.registro_sesiones;

CREATE POLICY "Users can insert their own sessions"
    ON public.registro_sesiones
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own sessions"
    ON public.registro_sesiones
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Revoca los GRANT ALL heredados del esquema inicial.
REVOKE ALL PRIVILEGES ON TABLE public.auditoria_pedidos
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.historial_auditoria_pedidos
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.order_items
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.orders
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.password_resets
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.payment_type
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.products
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.registro_sesiones
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.reporte_ventas
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.status_order
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.vista_auditoria
    FROM anon, authenticated;

GRANT SELECT ON TABLE public.products TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.products TO authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;
GRANT SELECT ON TABLE public.status_order TO authenticated;
GRANT SELECT ON TABLE public.payment_type TO authenticated;
GRANT SELECT ON TABLE public.auditoria_pedidos TO authenticated;
GRANT SELECT ON TABLE public.historial_auditoria_pedidos TO authenticated;
GRANT SELECT ON TABLE public.reporte_ventas TO authenticated;
GRANT SELECT, INSERT ON TABLE public.registro_sesiones TO authenticated;

GRANT ALL PRIVILEGES ON TABLE public.auditoria_pedidos TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.historial_auditoria_pedidos TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.order_items TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.orders TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.password_resets TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.payment_type TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.products TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.registro_sesiones TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.reporte_ventas TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.status_order TO service_role;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
    FROM anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text)
    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_transaction(text, jsonb)
    TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_transaction(
    uuid,
    jsonb,
    timestamp with time zone
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_transaction(uuid)
    TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status_transaction(uuid, text)
    TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_order_transaction(uuid, integer)
    TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product_transaction(uuid)
    TO authenticated;

GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Evita que futuras tablas y funciones vuelvan a heredar permisos amplios.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

DO $block$
BEGIN
    IF pg_has_role(current_user, 'supabase_admin', 'MEMBER') THEN
        ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
            REVOKE ALL ON TABLES FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
            REVOKE ALL ON SEQUENCES FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
            REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
    END IF;
END;
$block$;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

-- order_items ya no se publica: cada RPC toca orders al final y ese evento
-- provoca una única recarga autoritativa del pedido completo.
DO $block$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime
            DROP TABLE public.order_items;
    END IF;
END;
$block$;
