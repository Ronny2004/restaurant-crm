-- Eliminación administrativa transaccional de campañas y recursos QR.
-- No habilita DELETE directo: las operaciones solo se ejecutan con service_role
-- y vuelven a validar que el actor recibido sea un administrador activo.

CREATE TABLE IF NOT EXISTS public.admin_resource_deletion_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    entity_label text NOT NULL,
    deleted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    deletion_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    deleted_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT admin_resource_deletion_audit_type_check
        CHECK (entity_type IN ('campaign', 'restaurant_table', 'table_qr')),
    CONSTRAINT admin_resource_deletion_audit_label_check
        CHECK (char_length(btrim(entity_label)) BETWEEN 1 AND 200),
    CONSTRAINT admin_resource_deletion_audit_summary_check
        CHECK (jsonb_typeof(deletion_summary) = 'object')
);

CREATE INDEX IF NOT EXISTS admin_resource_deletion_audit_deleted_at_idx
    ON public.admin_resource_deletion_audit (deleted_at DESC);
CREATE INDEX IF NOT EXISTS admin_resource_deletion_audit_actor_idx
    ON public.admin_resource_deletion_audit (deleted_by, deleted_at DESC);

ALTER TABLE public.admin_resource_deletion_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active admins can view resource deletion audit"
    ON public.admin_resource_deletion_audit
    FOR SELECT TO authenticated
    USING (public.current_user_is_admin());

REVOKE ALL ON TABLE public.admin_resource_deletion_audit FROM anon, authenticated;
GRANT SELECT ON TABLE public.admin_resource_deletion_audit TO authenticated;
GRANT SELECT ON TABLE public.admin_resource_deletion_audit TO service_role;

CREATE OR REPLACE FUNCTION public.delete_campaign_admin(
    p_campaign_id uuid,
    p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_campaign public.campaigns%ROWTYPE;
    v_response_count integer;
    v_draw_count integer;
    v_winner_count integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = p_actor_id
          AND p.role = 'admin'
          AND p.account_status = 'active'
    ) THEN
        RAISE EXCEPTION 'Solo un administrador activo puede eliminar campañas';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_campaign_id::text, 0));

    SELECT * INTO v_campaign
    FROM public.campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaña no encontrada';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.table_qr_codes
        WHERE campaign_id = p_campaign_id
    ) THEN
        RAISE EXCEPTION 'La campaña está asociada a un QR de mesa. Cambia o elimina ese QR antes de borrar la campaña';
    END IF;

    SELECT count(*)::integer INTO v_response_count
    FROM public.campaign_responses WHERE campaign_id = p_campaign_id;
    SELECT count(*)::integer INTO v_draw_count
    FROM public.campaign_draws WHERE campaign_id = p_campaign_id;
    SELECT count(*)::integer INTO v_winner_count
    FROM public.campaign_draw_winners w
    JOIN public.campaign_draws d ON d.id = w.draw_id
    WHERE d.campaign_id = p_campaign_id;

    INSERT INTO public.admin_resource_deletion_audit (
        entity_type, entity_id, entity_label, deleted_by, deletion_summary
    ) VALUES (
        'campaign', v_campaign.id, v_campaign.title, p_actor_id,
        jsonb_build_object(
            'slug', v_campaign.slug,
            'responses_deleted', v_response_count,
            'draws_deleted', v_draw_count,
            'winners_deleted', v_winner_count
        )
    );

    DELETE FROM public.campaign_draw_winners w
    USING public.campaign_draws d
    WHERE w.draw_id = d.id AND d.campaign_id = p_campaign_id;
    DELETE FROM public.campaign_draws WHERE campaign_id = p_campaign_id;
    DELETE FROM public.campaign_responses WHERE campaign_id = p_campaign_id;
    DELETE FROM public.campaigns WHERE id = p_campaign_id;

    RETURN jsonb_build_object(
        'campaign_id', p_campaign_id,
        'responses_deleted', v_response_count,
        'draws_deleted', v_draw_count,
        'winners_deleted', v_winner_count
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_table_qr_admin(
    p_qr_id uuid,
    p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_qr public.table_qr_codes%ROWTYPE;
    v_scan_count integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = p_actor_id
          AND p.role = 'admin'
          AND p.account_status = 'active'
    ) THEN
        RAISE EXCEPTION 'Solo un administrador activo puede eliminar códigos QR';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_qr_id::text, 0));
    SELECT * INTO v_qr FROM public.table_qr_codes WHERE id = p_qr_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'QR no encontrado'; END IF;

    SELECT count(*)::integer INTO v_scan_count
    FROM public.table_qr_scan_events WHERE qr_code_id = p_qr_id;

    INSERT INTO public.admin_resource_deletion_audit (
        entity_type, entity_id, entity_label, deleted_by, deletion_summary
    ) VALUES (
        'table_qr', v_qr.id, v_qr.name, p_actor_id,
        jsonb_build_object(
            'restaurant_table_id', v_qr.restaurant_table_id,
            'public_token', v_qr.public_token,
            'scans_deleted', v_scan_count
        )
    );

    DELETE FROM public.table_qr_scan_events WHERE qr_code_id = p_qr_id;
    DELETE FROM public.table_qr_codes WHERE id = p_qr_id;

    RETURN jsonb_build_object('qr_id', p_qr_id, 'scans_deleted', v_scan_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_restaurant_table_admin(
    p_table_id uuid,
    p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_table public.restaurant_tables%ROWTYPE;
    v_qr_count integer;
    v_scan_count integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = p_actor_id
          AND p.role = 'admin'
          AND p.account_status = 'active'
    ) THEN
        RAISE EXCEPTION 'Solo un administrador activo puede eliminar mesas';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_table_id::text, 0));
    SELECT * INTO v_table FROM public.restaurant_tables WHERE id = p_table_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Mesa no encontrada'; END IF;

    SELECT count(*)::integer INTO v_qr_count
    FROM public.table_qr_codes WHERE restaurant_table_id = p_table_id;
    SELECT count(*)::integer INTO v_scan_count
    FROM public.table_qr_scan_events e
    JOIN public.table_qr_codes q ON q.id = e.qr_code_id
    WHERE q.restaurant_table_id = p_table_id;

    INSERT INTO public.admin_resource_deletion_audit (
        entity_type, entity_id, entity_label, deleted_by, deletion_summary
    ) VALUES (
        'restaurant_table', v_table.id, v_table.name, p_actor_id,
        jsonb_build_object('qr_deleted', v_qr_count, 'scans_deleted', v_scan_count)
    );

    DELETE FROM public.table_qr_scan_events e
    USING public.table_qr_codes q
    WHERE e.qr_code_id = q.id AND q.restaurant_table_id = p_table_id;
    DELETE FROM public.table_qr_codes WHERE restaurant_table_id = p_table_id;
    DELETE FROM public.restaurant_tables WHERE id = p_table_id;

    RETURN jsonb_build_object(
        'table_id', p_table_id,
        'qr_deleted', v_qr_count,
        'scans_deleted', v_scan_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_campaign_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_table_qr_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_restaurant_table_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_campaign_admin(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_table_qr_admin(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_restaurant_table_admin(uuid, uuid) TO service_role;

COMMENT ON TABLE public.admin_resource_deletion_audit IS
    'Auditoría inmutable de eliminaciones definitivas realizadas por administradores.';
