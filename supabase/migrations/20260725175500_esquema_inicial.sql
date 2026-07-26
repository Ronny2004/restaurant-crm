


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_detalles" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_usuario TEXT;
    v_detalles_str TEXT;
BEGIN
    SELECT username INTO v_usuario FROM public.profiles WHERE id = auth.uid();

    -- Transformar el JSONB a un string concatenado usando la cantidad nueva
    SELECT string_agg(x.producto || ' (x' || x.nue || ')', ' - ')
    INTO v_detalles_str
    FROM jsonb_to_recordset(p_detalles) AS x(producto text, ant int, nue int);

    -- Insertar un solo registro
    INSERT INTO public.auditoria_pedidos (usuario, mesa, pedido_id, estado_pedido, detalles)
    VALUES (
        COALESCE(v_usuario, 'Sistema'),
        p_mesa,
        p_pedido_id,
        'Actualizado',
        COALESCE(v_detalles_str, 'Sin cambios')
    );
END;
$$;


ALTER FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_detalles" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_items_anteriores" "text", "p_items_cambiados" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_usuario TEXT;
BEGIN
    -- Obtenemos el usuario
    SELECT full_name INTO v_usuario FROM public.profiles WHERE id = auth.uid();

    -- Insertamos el historial
    INSERT INTO public.auditoria_pedidos (usuario, mesa, pedido_id, items_anteriores, items_cambiados, estado_pedido)
    VALUES (COALESCE(v_usuario, 'Sistema'), p_mesa, p_pedido_id, p_items_anteriores, p_items_cambiados, 'Actualizado');
END;
$$;


ALTER FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_items_anteriores" "text", "p_items_cambiados" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auditar_eliminacion_pedido"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_usuario TEXT;
    v_pedido_original TEXT;
BEGIN
    -- Obtenemos el usuario que está borrando
    SELECT username INTO v_usuario FROM public.profiles WHERE id = auth.uid();

    -- Construimos el texto del pedido original
    SELECT string_agg(p.name || ' (x' || oi.quantity || ')', ', ')
    INTO v_pedido_original
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = OLD.id;

    -- A. LÓGICA TABLA LIMPIA (auditoria_pedidos) - Actualiza o Inserta 1 sola fila
    IF EXISTS (SELECT 1 FROM public.auditoria_pedidos WHERE pedido_id = OLD.id) THEN
        UPDATE public.auditoria_pedidos
        SET estado_pedido = 'Cancelado / Eliminado',
            pedido_original = COALESCE(v_pedido_original, 'Sin productos'),
            pedido_actualizado = 'Orden eliminada completamente',
            usuario = COALESCE(v_usuario, 'Sistema'),
            fecha_hora = NOW()
        WHERE pedido_id = OLD.id;
    ELSE
        INSERT INTO public.auditoria_pedidos (
            usuario, mesa, pedido_id, estado_pedido, pedido_original, pedido_actualizado
        )
        VALUES (
            COALESCE(v_usuario, 'Sistema'),
            OLD.table_number,
            OLD.id,
            'Cancelado / Eliminado',
            COALESCE(v_pedido_original, 'Sin productos'),
            'Orden eliminada completamente'
        );
    END IF;

    -- B. LÓGICA NUEVA TABLA HISTORIAL (historial_auditoria_pedidos) - SIEMPRE Inserta una fila nueva
    INSERT INTO public.historial_auditoria_pedidos (
        usuario, mesa, pedido_id, estado_pedido, pedido_original, pedido_actualizado
    )
    VALUES (
        COALESCE(v_usuario, 'Sistema'),
        OLD.table_number,
        OLD.id,
        'Cancelado / Eliminado',
        COALESCE(v_pedido_original, 'Sin productos'),
        'Orden eliminada completamente'
    );

    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."auditar_eliminacion_pedido"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_full_order"("p_table_number" "text", "p_user_id" "uuid", "p_items" "jsonb", "p_total" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_order_id uuid;
    item record;
BEGIN
    -- Insertar la cabecera de la orden usando status_id = 1 (pending) en lugar de status
    INSERT INTO public.orders (table_number, total, created_by, status_id, is_paid)
    VALUES (p_table_number, p_total, p_user_id, 1, false)
    RETURNING id INTO v_order_id;

    -- Procesar cada ítem del JSON
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items)
        AS x(product_id uuid, quantity int, price numeric)
    LOOP
        INSERT INTO public.order_items (order_id, product_id, quantity, price)
        VALUES (v_order_id, item.product_id, item.quantity, item.price);
    END LOOP;

    RETURN v_order_id;
END;
$$;


ALTER FUNCTION "public"."create_full_order"("p_table_number" "text", "p_user_id" "uuid", "p_items" "jsonb", "p_total" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_username"("p_username" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Usamos ILIKE en lugar de = para ignorar mayúsculas/minúsculas
    SELECT email INTO v_email
    FROM public.profiles
    WHERE username ILIKE p_username;

    RETURN v_email;
END;
$$;


ALTER FUNCTION "public"."get_email_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        'waiter', -- Default role
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_stock_on_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Al agregar un plato (Ya sea orden nueva o agregando en el edit)
    IF (TG_OP = 'INSERT') THEN
        UPDATE products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
        RETURN NEW;

    -- Al quitar un plato (Borrar orden o quitar del edit)
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE products SET stock = stock + OLD.quantity WHERE id = OLD.product_id;
        RETURN OLD;

    -- Al cambiar la cantidad en el edit (Resta la cantidad vieja y suma la nueva)
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE products SET stock = stock + OLD.quantity - NEW.quantity WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_stock_on_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."auditoria_pedidos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "fecha_hora" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    "usuario" "text",
    "mesa" "text",
    "pedido_id" "uuid",
    "estado_pedido" "text",
    "pedido_original" "text",
    "pedido_actualizado" "text"
);


ALTER TABLE "public"."auditoria_pedidos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historial_auditoria_pedidos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "fecha_hora" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    "usuario" "text",
    "mesa" "text",
    "pedido_id" "uuid",
    "estado_pedido" "text",
    "pedido_original" "text",
    "pedido_actualizado" "text"
);


ALTER TABLE "public"."historial_auditoria_pedidos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    "product_name" "text",
    CONSTRAINT "order_items_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "table_number" "text" NOT NULL,
    "total" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    "updated_at" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    "is_paid" boolean DEFAULT false,
    "status_id" integer DEFAULT 1 NOT NULL,
    "payment_type_id" integer,
    CONSTRAINT "orders_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_resets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:15:00'::interval),
    "used" boolean DEFAULT false
);


ALTER TABLE "public"."password_resets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_type" (
    "id" integer NOT NULL,
    "type" "text" NOT NULL,
    "description" "text" NOT NULL
);


ALTER TABLE "public"."payment_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "category" "text" NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    "updated_at" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    CONSTRAINT "products_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "products_stock_check" CHECK (("stock" >= 0))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    "updated_at" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    "username" "text" NOT NULL,
    "phone" "text",
    "gender" "text",
    "birth_date" "date",
    "avatar_url" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'waiter'::"text", 'chef'::"text", 'cashier'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registro_sesiones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "registro_sesiones_tipo_check" CHECK (("tipo" = ANY (ARRAY['login'::"text", 'logout'::"text"])))
);


ALTER TABLE "public"."registro_sesiones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reporte_ventas" (
    "pedido_id" "uuid" NOT NULL,
    "fecha_hora" timestamp with time zone DEFAULT (("now"() AT TIME ZONE 'UTC'::"text") AT TIME ZONE 'America/Guayaquil'::"text"),
    "mesa" character varying(50),
    "mesero" character varying(100) DEFAULT '-'::character varying,
    "cocinero" character varying(100) DEFAULT '-'::character varying,
    "cajero" character varying(100) DEFAULT '-'::character varying,
    "cancelado_por" character varying(100) DEFAULT '-'::character varying,
    "estado" character varying(50),
    "monto" numeric(10,2) DEFAULT 0.00,
    "tipo_pago" character varying(50) DEFAULT '-'::character varying
);


ALTER TABLE "public"."reporte_ventas" OWNER TO "postgres";


COMMENT ON TABLE "public"."reporte_ventas" IS 'Tabla plana e independiente para almacenar el historial y reporte de ventas con los usuarios responsables.';



CREATE TABLE IF NOT EXISTS "public"."status_order" (
    "id" integer NOT NULL,
    "status" "text" NOT NULL,
    "description" "text" NOT NULL
);


ALTER TABLE "public"."status_order" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_auditoria" WITH ("security_invoker"='on') AS
 WITH "desglosado" AS (
         SELECT "auditoria_pedidos"."id" AS "audit_id",
            "auditoria_pedidos"."pedido_id",
            "auditoria_pedidos"."fecha_hora",
            "auditoria_pedidos"."usuario",
            "auditoria_pedidos"."mesa",
            "auditoria_pedidos"."estado_pedido",
            "string_to_array"("auditoria_pedidos"."pedido_original", ', '::"text") AS "arr_orig",
            "string_to_array"("auditoria_pedidos"."pedido_actualizado", ', '::"text") AS "arr_upd"
           FROM "public"."auditoria_pedidos"
        )
 SELECT
        CASE
            WHEN ("gs"."i" = 1) THEN "d"."pedido_id"
            ELSE NULL::"uuid"
        END AS "pedido_id",
        CASE
            WHEN ("gs"."i" = 1) THEN "d"."fecha_hora"
            ELSE NULL::timestamp with time zone
        END AS "fecha_hora",
        CASE
            WHEN ("gs"."i" = 1) THEN "d"."usuario"
            ELSE NULL::"text"
        END AS "usuario",
        CASE
            WHEN ("gs"."i" = 1) THEN "d"."mesa"
            ELSE NULL::"text"
        END AS "mesa",
        CASE
            WHEN ("gs"."i" = 1) THEN "d"."estado_pedido"
            ELSE NULL::"text"
        END AS "estado_pedido",
    "d"."arr_orig"["gs"."i"] AS "pedido_original",
        CASE
            WHEN ("d"."estado_pedido" = 'Cancelado / Eliminado'::"text") THEN 'Orden eliminada completamente'::"text"
            ELSE "d"."arr_upd"["gs"."i"]
        END AS "pedido_actualizado"
   FROM ("desglosado" "d"
     CROSS JOIN LATERAL "generate_series"(1, GREATEST(COALESCE("array_length"("d"."arr_orig", 1), 1), COALESCE("array_length"("d"."arr_upd", 1), 1))) "gs"("i"))
  ORDER BY "d"."fecha_hora" DESC, "d"."audit_id", "gs"."i";


ALTER VIEW "public"."vista_auditoria" OWNER TO "postgres";


ALTER TABLE ONLY "public"."auditoria_pedidos"
    ADD CONSTRAINT "auditoria_pedidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historial_auditoria_pedidos"
    ADD CONSTRAINT "historial_auditoria_pedidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_resets"
    ADD CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_type"
    ADD CONSTRAINT "payment_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_type"
    ADD CONSTRAINT "payment_type_type_key" UNIQUE ("type");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."registro_sesiones"
    ADD CONSTRAINT "registro_sesiones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reporte_ventas"
    ADD CONSTRAINT "reporte_ventas_pkey" PRIMARY KEY ("pedido_id");



ALTER TABLE ONLY "public"."status_order"
    ADD CONSTRAINT "status_order_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."status_order"
    ADD CONSTRAINT "status_order_status_key" UNIQUE ("status");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "tr_auditar_eliminacion" BEFORE DELETE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."auditar_eliminacion_pedido"();



CREATE OR REPLACE TRIGGER "tr_update_stock" AFTER INSERT OR DELETE OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_stock_on_order"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_payment_type_id_fkey" FOREIGN KEY ("payment_type_id") REFERENCES "public"."payment_type"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."status_order"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registro_sesiones"
    ADD CONSTRAINT "registro_sesiones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Authenticated users can view order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view products" ON "public"."products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for users based on user_id" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Only admins can delete products" ON "public"."products" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can insert products" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can update products" ON "public"."products" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Permitir acceso total a usuarios autenticados" ON "public"."reporte_ventas" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir actualizar auditoria" ON "public"."auditoria_pedidos" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Permitir eliminar order_items" ON "public"."auditoria_pedidos" FOR DELETE USING (true);



CREATE POLICY "Permitir eliminar order_items" ON "public"."order_items" FOR DELETE USING (true);



CREATE POLICY "Permitir eliminar orders" ON "public"."orders" FOR DELETE USING (true);



CREATE POLICY "Permitir insertar en auditoria" ON "public"."auditoria_pedidos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Permitir insertar en historial" ON "public"."historial_auditoria_pedidos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Permitir lectura de estados a todos" ON "public"."status_order" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir lectura de tipos de pago a todos" ON "public"."payment_type" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir leer auditoria" ON "public"."auditoria_pedidos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir leer historial" ON "public"."historial_auditoria_pedidos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff can update orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['chef'::"text", 'cashier'::"text", 'admin'::"text", 'waiter'::"text"]))))));



CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Usuarios pueden insertar sus registros" ON "public"."registro_sesiones" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios pueden ver sus propios registros" ON "public"."registro_sesiones" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Waiters and admins can create order items" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['waiter'::"text", 'admin'::"text"]))))));



CREATE POLICY "Waiters and admins can create orders" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['waiter'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."auditoria_pedidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historial_auditoria_pedidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registro_sesiones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reporte_ventas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."status_order" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."auditoria_pedidos";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."order_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."products";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."reporte_ventas";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_detalles" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_detalles" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_detalles" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_items_anteriores" "text", "p_items_cambiados" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_items_anteriores" "text", "p_items_cambiados" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auditar_edicion_pedido"("p_pedido_id" "uuid", "p_mesa" "text", "p_items_anteriores" "text", "p_items_cambiados" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auditar_eliminacion_pedido"() TO "anon";
GRANT ALL ON FUNCTION "public"."auditar_eliminacion_pedido"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auditar_eliminacion_pedido"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_full_order"("p_table_number" "text", "p_user_id" "uuid", "p_items" "jsonb", "p_total" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."create_full_order"("p_table_number" "text", "p_user_id" "uuid", "p_items" "jsonb", "p_total" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_full_order"("p_table_number" "text", "p_user_id" "uuid", "p_items" "jsonb", "p_total" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_stock_on_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_stock_on_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_stock_on_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."auditoria_pedidos" TO "anon";
GRANT ALL ON TABLE "public"."auditoria_pedidos" TO "authenticated";
GRANT ALL ON TABLE "public"."auditoria_pedidos" TO "service_role";



GRANT ALL ON TABLE "public"."historial_auditoria_pedidos" TO "anon";
GRANT ALL ON TABLE "public"."historial_auditoria_pedidos" TO "authenticated";
GRANT ALL ON TABLE "public"."historial_auditoria_pedidos" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."password_resets" TO "anon";
GRANT ALL ON TABLE "public"."password_resets" TO "authenticated";
GRANT ALL ON TABLE "public"."password_resets" TO "service_role";



GRANT ALL ON TABLE "public"."payment_type" TO "anon";
GRANT ALL ON TABLE "public"."payment_type" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_type" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."registro_sesiones" TO "anon";
GRANT ALL ON TABLE "public"."registro_sesiones" TO "authenticated";
GRANT ALL ON TABLE "public"."registro_sesiones" TO "service_role";



GRANT ALL ON TABLE "public"."reporte_ventas" TO "anon";
GRANT ALL ON TABLE "public"."reporte_ventas" TO "authenticated";
GRANT ALL ON TABLE "public"."reporte_ventas" TO "service_role";



GRANT ALL ON TABLE "public"."status_order" TO "anon";
GRANT ALL ON TABLE "public"."status_order" TO "authenticated";
GRANT ALL ON TABLE "public"."status_order" TO "service_role";



GRANT ALL ON TABLE "public"."vista_auditoria" TO "anon";
GRANT ALL ON TABLE "public"."vista_auditoria" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_auditoria" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
