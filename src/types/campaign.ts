export const CAMPAIGN_STATUSES = ["active", "closed"] as const;
export type CampaignStatus = typeof CAMPAIGN_STATUSES[number];

export const CAMPAIGN_SECTORS = [
    "calderon",
    "moran",
    "san_juan",
    "carapungo",
    "otros",
] as const;
export type CampaignSector = typeof CAMPAIGN_SECTORS[number];

export const CAMPAIGN_SECTOR_LABELS: Record<CampaignSector, string> = {
    calderon: "Calderón",
    moran: "Morán",
    san_juan: "San Juan",
    carapungo: "Carapungo",
    otros: "Otros",
};

export type Campaign = {
    id: string;
    slug: string;
    title: string;
    description: string;
    reward: string;
    status: CampaignStatus;
    created_by: string;
    created_at: string;
    updated_at: string;
    response_count?: number;
};

export type CampaignResponse = {
    id: string;
    campaign_id: string;
    full_name: string;
    email: string;
    phone: string;
    favorite_product_id: string | null;
    favorite_product_name: string;
    sector: CampaignSector;
    other_sector: string | null;
    suggestions: string | null;
    consent_at: string;
    created_at: string;
};

export type CampaignProduct = {
    id: string;
    name: string;
};

export type CampaignDetail = Campaign & {
    responses: CampaignResponse[];
};
