export type CampaignWinnerStatus = "pending" | "contacted" | "delivered";

export type CampaignDrawWinner = {
    id: string;
    position: number;
    contact_status: CampaignWinnerStatus;
    contacted_at: string | null;
    delivered_at: string | null;
    created_at: string;
    response: {
        id: string;
        full_name: string;
        email: string;
        phone: string;
    };
};

export type CampaignDraw = {
    id: string;
    campaign_id: string;
    eligible_count: number;
    winner_count: number;
    status: "completed" | "voided";
    created_at: string;
    winners: CampaignDrawWinner[];
};
