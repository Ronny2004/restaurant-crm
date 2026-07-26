-- Impide que una sesión ya emitida conserve acceso operativo después de que
-- el administrador desactive la cuenta.

CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND account_status = 'active'
    );
$function$;

ALTER FUNCTION public.current_user_is_active() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.current_user_is_active()
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_active()
    TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT COALESCE(username, full_name, email, 'Sistema')
    FROM public.profiles
    WHERE id = auth.uid()
      AND account_status = 'active';
$function$;

ALTER FUNCTION public.current_username() OWNER TO postgres;

DROP POLICY IF EXISTS "Authenticated users can view products"
    ON public.products;
CREATE POLICY "Active users can view products"
    ON public.products
    FOR SELECT TO authenticated
    USING (public.current_user_is_active());

DROP POLICY IF EXISTS "Authenticated users can view orders"
    ON public.orders;
CREATE POLICY "Active users can view orders"
    ON public.orders
    FOR SELECT TO authenticated
    USING (public.current_user_is_active());

DROP POLICY IF EXISTS "Authenticated users can view order items"
    ON public.order_items;
CREATE POLICY "Active users can view order items"
    ON public.order_items
    FOR SELECT TO authenticated
    USING (public.current_user_is_active());

DROP POLICY IF EXISTS "Enable read access for authenticated users"
    ON public.profiles;
CREATE POLICY "Active users can view profiles"
    ON public.profiles
    FOR SELECT TO authenticated
    USING (public.current_user_is_active());

DROP POLICY IF EXISTS "Permitir lectura de estados a todos"
    ON public.status_order;
CREATE POLICY "Active users can view order statuses"
    ON public.status_order
    FOR SELECT TO authenticated
    USING (public.current_user_is_active());

DROP POLICY IF EXISTS "Permitir lectura de tipos de pago a todos"
    ON public.payment_type;
CREATE POLICY "Active users can view payment types"
    ON public.payment_type
    FOR SELECT TO authenticated
    USING (public.current_user_is_active());

DROP POLICY IF EXISTS "Users can insert their own sessions"
    ON public.registro_sesiones;
CREATE POLICY "Active users can insert their own sessions"
    ON public.registro_sesiones
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.current_user_is_active()
    );

DROP POLICY IF EXISTS "Users can read their own sessions"
    ON public.registro_sesiones;
CREATE POLICY "Active users can read their own sessions"
    ON public.registro_sesiones
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        AND public.current_user_is_active()
    );

-- La comparación de usuario y correo debe ser insensible a mayúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
    ON public.profiles (lower(username));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_key
    ON public.profiles (lower(email));
