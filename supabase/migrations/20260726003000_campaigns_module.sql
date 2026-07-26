-- Campañas públicas para recopilación consentida de datos de clientes.
-- La administración se limita a cuentas admin activas y las respuestas
-- públicas se escriben exclusivamente mediante Route Handlers server-side.

CREATE TABLE IF NOT EXISTS public.campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    description text NOT NULL,
    reward text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT campaigns_slug_format_check
        CHECK (slug ~ '^[a-z0-9][a-z0-9-]{7,79}$'),
    CONSTRAINT campaigns_title_length_check
        CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
    CONSTRAINT campaigns_description_length_check
        CHECK (char_length(btrim(description)) BETWEEN 3 AND 1200),
    CONSTRAINT campaigns_reward_length_check
        CHECK (char_length(btrim(reward)) BETWEEN 2 AND 300),
    CONSTRAINT campaigns_status_check
        CHECK (status IN ('active', 'closed'))
);

CREATE TABLE IF NOT EXISTS public.campaign_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL
        REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    favorite_product_id uuid
        REFERENCES public.products(id) ON DELETE SET NULL,
    favorite_product_name text NOT NULL,
    sector text NOT NULL,
    other_sector text,
    suggestions text,
    consent_at timestamp with time zone NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT campaign_responses_name_length_check
        CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
    CONSTRAINT campaign_responses_email_length_check
        CHECK (char_length(btrim(email)) BETWEEN 3 AND 254),
    CONSTRAINT campaign_responses_phone_length_check
        CHECK (char_length(btrim(phone)) BETWEEN 7 AND 30),
    CONSTRAINT campaign_responses_product_name_length_check
        CHECK (char_length(btrim(favorite_product_name)) BETWEEN 1 AND 160),
    CONSTRAINT campaign_responses_sector_check
        CHECK (sector IN ('calderon', 'moran', 'san_juan', 'carapungo', 'otros')),
    CONSTRAINT campaign_responses_other_sector_check
        CHECK (
            (sector = 'otros' AND char_length(btrim(other_sector)) BETWEEN 2 AND 100)
            OR (sector <> 'otros' AND other_sector IS NULL)
        ),
    CONSTRAINT campaign_responses_suggestions_length_check
        CHECK (suggestions IS NULL OR char_length(suggestions) <= 1500)
);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_responses_campaign_email_unique
    ON public.campaign_responses (campaign_id, lower(email));

CREATE INDEX IF NOT EXISTS campaigns_status_created_at_idx
    ON public.campaigns (status, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_responses_campaign_created_at_idx
    ON public.campaign_responses (campaign_id, created_at DESC);

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins can view campaigns"
    ON public.campaigns;
CREATE POLICY "Active admins can view campaigns"
    ON public.campaigns
    FOR SELECT
    TO authenticated
    USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Active admins can create campaigns"
    ON public.campaigns;
CREATE POLICY "Active admins can create campaigns"
    ON public.campaigns
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_is_admin()
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Active admins can update campaigns"
    ON public.campaigns;
CREATE POLICY "Active admins can update campaigns"
    ON public.campaigns
    FOR UPDATE
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Active admins can view campaign responses"
    ON public.campaign_responses;
CREATE POLICY "Active admins can view campaign responses"
    ON public.campaign_responses
    FOR SELECT
    TO authenticated
    USING (public.current_user_is_admin());

REVOKE ALL ON TABLE public.campaigns FROM anon;
REVOKE ALL ON TABLE public.campaign_responses FROM anon;
REVOKE ALL ON TABLE public.campaigns FROM authenticated;
REVOKE ALL ON TABLE public.campaign_responses FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.campaigns TO authenticated;
GRANT SELECT ON TABLE public.campaign_responses TO authenticated;
GRANT ALL ON TABLE public.campaigns TO service_role;
GRANT ALL ON TABLE public.campaign_responses TO service_role;

COMMENT ON TABLE public.campaigns IS
    'Encabezados editables y enlaces únicos de campañas de recopilación de datos.';
COMMENT ON TABLE public.campaign_responses IS
    'Respuestas consentidas; no admite acceso anónimo directo ni borrado desde la aplicación.';
