-- Configuración independiente de mesas y QR dinámicos.
-- Sorteos auditables para campañas existentes, sin alterar sus tablas actuales.

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    archived_at timestamp with time zone,
    CONSTRAINT restaurant_tables_name_length_check
        CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
    CONSTRAINT restaurant_tables_archived_inactive_check
        CHECK (archived_at IS NULL OR is_active = false)
);

CREATE TABLE IF NOT EXISTS public.table_qr_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_table_id uuid NOT NULL
        REFERENCES public.restaurant_tables(id) ON DELETE RESTRICT,
    name text NOT NULL,
    public_token text NOT NULL UNIQUE,
    destination_type text NOT NULL,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    destination_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    archived_at timestamp with time zone,
    CONSTRAINT table_qr_codes_name_length_check
        CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
    CONSTRAINT table_qr_codes_token_format_check
        CHECK (public_token ~ '^qr_[a-f0-9]{24}$'),
    CONSTRAINT table_qr_codes_destination_type_check
        CHECK (destination_type IN ('campaign', 'url')),
    CONSTRAINT table_qr_codes_destination_check
        CHECK (
            (
                destination_type = 'campaign'
                AND campaign_id IS NOT NULL
                AND destination_url IS NULL
            )
            OR (
                destination_type = 'url'
                AND campaign_id IS NULL
                AND destination_url ~ '^https://[^[:space:]]+$'
                AND char_length(destination_url) <= 2048
            )
        ),
    CONSTRAINT table_qr_codes_archived_inactive_check
        CHECK (archived_at IS NULL OR is_active = false)
);

CREATE TABLE IF NOT EXISTS public.table_qr_scan_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id uuid NOT NULL
        REFERENCES public.table_qr_codes(id) ON DELETE RESTRICT,
    visitor_hash text NOT NULL,
    scanned_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT table_qr_scan_events_visitor_hash_check
        CHECK (visitor_hash ~ '^[a-f0-9]{64}$')
);

CREATE TABLE IF NOT EXISTS public.campaign_draws (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    eligible_count integer NOT NULL,
    winner_count integer NOT NULL,
    status text NOT NULL DEFAULT 'completed',
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    voided_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
    voided_at timestamp with time zone,
    void_reason text,
    CONSTRAINT campaign_draws_counts_check
        CHECK (
            eligible_count > 0
            AND winner_count > 0
            AND winner_count <= eligible_count
            AND winner_count <= 20
        ),
    CONSTRAINT campaign_draws_status_check
        CHECK (status IN ('completed', 'voided')),
    CONSTRAINT campaign_draws_void_check
        CHECK (
            (status = 'completed' AND voided_by IS NULL AND voided_at IS NULL AND void_reason IS NULL)
            OR (
                status = 'voided'
                AND voided_by IS NOT NULL
                AND voided_at IS NOT NULL
                AND char_length(btrim(void_reason)) BETWEEN 5 AND 500
            )
        )
);

CREATE TABLE IF NOT EXISTS public.campaign_draw_winners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id uuid NOT NULL REFERENCES public.campaign_draws(id) ON DELETE RESTRICT,
    campaign_response_id uuid NOT NULL
        REFERENCES public.campaign_responses(id) ON DELETE RESTRICT,
    position integer NOT NULL,
    contact_status text NOT NULL DEFAULT 'pending',
    contacted_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT campaign_draw_winners_position_check CHECK (position > 0),
    CONSTRAINT campaign_draw_winners_contact_status_check
        CHECK (contact_status IN ('pending', 'contacted', 'delivered')),
    CONSTRAINT campaign_draw_winners_contact_dates_check
        CHECK (
            (contact_status = 'pending' AND contacted_at IS NULL AND delivered_at IS NULL)
            OR (contact_status = 'contacted' AND contacted_at IS NOT NULL AND delivered_at IS NULL)
            OR (contact_status = 'delivered' AND contacted_at IS NOT NULL AND delivered_at IS NOT NULL)
        ),
    UNIQUE (draw_id, campaign_response_id),
    UNIQUE (draw_id, position)
);

CREATE INDEX IF NOT EXISTS restaurant_tables_active_idx
    ON public.restaurant_tables (archived_at, is_active, name);
CREATE INDEX IF NOT EXISTS table_qr_codes_table_idx
    ON public.table_qr_codes (restaurant_table_id, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS table_qr_codes_campaign_idx
    ON public.table_qr_codes (campaign_id)
    WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS table_qr_scan_events_qr_scanned_idx
    ON public.table_qr_scan_events (qr_code_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS table_qr_scan_events_dedupe_idx
    ON public.table_qr_scan_events (qr_code_id, visitor_hash, scanned_at DESC);
CREATE INDEX IF NOT EXISTS campaign_draws_campaign_created_idx
    ON public.campaign_draws (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_draw_winners_response_idx
    ON public.campaign_draw_winners (campaign_response_id);

DROP TRIGGER IF EXISTS update_restaurant_tables_updated_at
    ON public.restaurant_tables;
CREATE TRIGGER update_restaurant_tables_updated_at
    BEFORE UPDATE ON public.restaurant_tables
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_table_qr_codes_updated_at
    ON public.table_qr_codes;
CREATE TRIGGER update_table_qr_codes_updated_at
    BEFORE UPDATE ON public.table_qr_codes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_qr_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_draw_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active admins can view restaurant tables"
    ON public.restaurant_tables FOR SELECT TO authenticated
    USING (public.current_user_is_admin());
CREATE POLICY "Active admins can create restaurant tables"
    ON public.restaurant_tables FOR INSERT TO authenticated
    WITH CHECK (public.current_user_is_admin() AND created_by = auth.uid());
CREATE POLICY "Active admins can update restaurant tables"
    ON public.restaurant_tables FOR UPDATE TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Active admins can view table QR codes"
    ON public.table_qr_codes FOR SELECT TO authenticated
    USING (public.current_user_is_admin());
CREATE POLICY "Active admins can create table QR codes"
    ON public.table_qr_codes FOR INSERT TO authenticated
    WITH CHECK (public.current_user_is_admin() AND created_by = auth.uid());
CREATE POLICY "Active admins can update table QR codes"
    ON public.table_qr_codes FOR UPDATE TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Active admins can view table QR scans"
    ON public.table_qr_scan_events FOR SELECT TO authenticated
    USING (public.current_user_is_admin());
CREATE POLICY "Active admins can view campaign draws"
    ON public.campaign_draws FOR SELECT TO authenticated
    USING (public.current_user_is_admin());
CREATE POLICY "Active admins can view campaign draw winners"
    ON public.campaign_draw_winners FOR SELECT TO authenticated
    USING (public.current_user_is_admin());

REVOKE ALL ON TABLE public.restaurant_tables FROM anon, authenticated;
REVOKE ALL ON TABLE public.table_qr_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.table_qr_scan_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_draws FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_draw_winners FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.restaurant_tables TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.table_qr_codes TO authenticated;
GRANT SELECT ON TABLE public.table_qr_scan_events TO authenticated;
GRANT SELECT ON TABLE public.campaign_draws TO authenticated;
GRANT SELECT ON TABLE public.campaign_draw_winners TO authenticated;

GRANT ALL ON TABLE public.restaurant_tables TO service_role;
GRANT ALL ON TABLE public.table_qr_codes TO service_role;
GRANT ALL ON TABLE public.table_qr_scan_events TO service_role;
GRANT ALL ON TABLE public.campaign_draws TO service_role;
GRANT ALL ON TABLE public.campaign_draw_winners TO service_role;

CREATE OR REPLACE FUNCTION public.record_table_qr_scan(
    p_qr_code_id uuid,
    p_visitor_hash text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    IF p_visitor_hash !~ '^[a-f0-9]{64}$' THEN
        RAISE EXCEPTION 'Identificador de visita inválido';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.table_qr_codes q
        JOIN public.restaurant_tables t ON t.id = q.restaurant_table_id
        WHERE q.id = p_qr_code_id
          AND q.is_active
          AND q.archived_at IS NULL
          AND t.is_active
          AND t.archived_at IS NULL
    ) THEN
        RETURN false;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.table_qr_scan_events e
        WHERE e.qr_code_id = p_qr_code_id
          AND e.visitor_hash = p_visitor_hash
          AND e.scanned_at >= now() - interval '30 minutes'
    ) THEN
        RETURN false;
    END IF;

    INSERT INTO public.table_qr_scan_events (qr_code_id, visitor_hash)
    VALUES (p_qr_code_id, p_visitor_hash);
    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_table_qr_scan(uuid, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_table_qr_scan(uuid, text)
    TO service_role;

CREATE OR REPLACE FUNCTION public.run_campaign_draw(
    p_campaign_id uuid,
    p_winner_count integer,
    p_actor_id uuid
) RETURNS TABLE (
    draw_id uuid,
    winner_id uuid,
    winner_position integer,
    response_id uuid,
    full_name text,
    email text,
    phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_draw_id uuid;
    v_eligible_count integer;
    v_campaign_status text;
    v_archived_at timestamp with time zone;
BEGIN
    IF p_winner_count < 1 OR p_winner_count > 20 THEN
        RAISE EXCEPTION 'La cantidad de ganadores debe estar entre 1 y 20';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_actor_id
          AND p.role = 'admin'
          AND p.account_status = 'active'
    ) THEN
        RAISE EXCEPTION 'Solo un administrador activo puede realizar sorteos';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_campaign_id::text, 0));

    SELECT c.status, c.archived_at
    INTO v_campaign_status, v_archived_at
    FROM public.campaigns c
    WHERE c.id = p_campaign_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaña no encontrada';
    END IF;
    IF v_campaign_status <> 'closed' OR v_archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cierra la campaña antes de realizar el sorteo';
    END IF;

    SELECT count(*)::integer
    INTO v_eligible_count
    FROM public.campaign_responses r
    WHERE r.campaign_id = p_campaign_id
      AND NOT EXISTS (
          SELECT 1
          FROM public.campaign_draw_winners w
          JOIN public.campaign_draws d ON d.id = w.draw_id
          WHERE w.campaign_response_id = r.id
            AND d.campaign_id = p_campaign_id
            AND d.status = 'completed'
      );

    IF v_eligible_count < p_winner_count THEN
        RAISE EXCEPTION 'No existen suficientes participantes elegibles';
    END IF;

    INSERT INTO public.campaign_draws (
        campaign_id,
        eligible_count,
        winner_count,
        created_by
    ) VALUES (
        p_campaign_id,
        v_eligible_count,
        p_winner_count,
        p_actor_id
    ) RETURNING id INTO v_draw_id;

    WITH selected_responses AS (
        SELECT r.id
        FROM public.campaign_responses r
        WHERE r.campaign_id = p_campaign_id
          AND NOT EXISTS (
              SELECT 1
              FROM public.campaign_draw_winners w
              JOIN public.campaign_draws d ON d.id = w.draw_id
              WHERE w.campaign_response_id = r.id
                AND d.campaign_id = p_campaign_id
                AND d.status = 'completed'
          )
        ORDER BY gen_random_bytes(16)
        LIMIT p_winner_count
    ), numbered AS (
        SELECT id, row_number() OVER ()::integer AS position
        FROM selected_responses
    )
    INSERT INTO public.campaign_draw_winners (
        draw_id,
        campaign_response_id,
        position
    )
    SELECT v_draw_id, id, position
    FROM numbered;

    RETURN QUERY
    SELECT
        v_draw_id,
        w.id,
        w.position,
        r.id,
        r.full_name,
        r.email,
        r.phone
    FROM public.campaign_draw_winners w
    JOIN public.campaign_responses r ON r.id = w.campaign_response_id
    WHERE w.draw_id = v_draw_id
    ORDER BY w.position;
END;
$$;

REVOKE ALL ON FUNCTION public.run_campaign_draw(uuid, integer, uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_campaign_draw(uuid, integer, uuid)
    TO service_role;

COMMENT ON TABLE public.restaurant_tables IS
    'Catálogo independiente de mesas físicas usadas por la configuración de QR.';
COMMENT ON TABLE public.table_qr_codes IS
    'QR físicos permanentes; varios pueden permanecer activos para una misma mesa.';
COMMENT ON TABLE public.table_qr_scan_events IS
    'Visitas deduplicadas por QR y visitante anónimo durante ventanas de 30 minutos.';
COMMENT ON TABLE public.campaign_draws IS
    'Ejecuciones auditables de sorteos de campañas cerradas.';
COMMENT ON TABLE public.campaign_draw_winners IS
    'Ganadores persistidos y estado manual de contacto o entrega del premio.';
