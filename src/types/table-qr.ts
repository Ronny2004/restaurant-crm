export type TableQrDestinationType = "campaign" | "url";

export type TableQrCampaignOption = {
    id: string;
    title: string;
    slug: string;
    status: "active" | "closed";
    archived_at: string | null;
};

export type TableQrCode = {
    id: string;
    restaurant_table_id: string;
    name: string;
    public_token: string;
    destination_type: TableQrDestinationType;
    campaign_id: string | null;
    destination_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    archived_at: string | null;
    campaign: TableQrCampaignOption | null;
    total_scans: number;
    scans_7d: number;
    scans_30d: number;
    last_scanned_at: string | null;
};

export type RestaurantTableConfig = {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    archived_at: string | null;
    qr_codes: TableQrCode[];
};

export type TableQrDashboard = {
    tables: RestaurantTableConfig[];
    campaigns: TableQrCampaignOption[];
};
