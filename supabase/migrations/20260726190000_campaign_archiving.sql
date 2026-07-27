-- Archivado reversible de campañas.
-- El estado active/closed controla el formulario público; archived_at controla
-- únicamente si la campaña aparece en la bandeja principal o en el archivo.

ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS campaigns_archived_created_at_idx
    ON public.campaigns (archived_at, created_at DESC);

COMMENT ON COLUMN public.campaigns.archived_at IS
    'Fecha de archivado administrativo. NULL indica que la campaña está visible en la bandeja principal.';
