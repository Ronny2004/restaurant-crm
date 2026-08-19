import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
    CampaignDraw,
    CampaignDrawWinner,
    CampaignWinnerStatus,
} from "@/types/campaign-raffle";

type RawWinner = Omit<CampaignDrawWinner, "response"> & {
    campaign_responses: CampaignDrawWinner["response"];
};

export async function listCampaignDraws(campaignId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("campaign_draws")
        .select(`
            id,
            campaign_id,
            eligible_count,
            winner_count,
            status,
            created_at,
            campaign_draw_winners(
                id,
                position,
                contact_status,
                contacted_at,
                delivered_at,
                created_at,
                campaign_responses(id,full_name,email,phone)
            )
        `)
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((draw) => ({
        id: draw.id,
        campaign_id: draw.campaign_id,
        eligible_count: draw.eligible_count,
        winner_count: draw.winner_count,
        status: draw.status,
        created_at: draw.created_at,
        winners: ((draw.campaign_draw_winners || []) as unknown as RawWinner[])
            .sort((a, b) => a.position - b.position)
            .map((winner) => ({
                ...winner,
                campaign_responses: undefined,
                response: winner.campaign_responses,
            })),
    })) as CampaignDraw[];
}

export async function runCampaignDraw(input: {
    campaignId: string;
    winnerCount: number;
    actorId: string;
}) {
    const admin = createAdminClient();
    const { error } = await admin.rpc("run_campaign_draw", {
        p_campaign_id: input.campaignId,
        p_winner_count: input.winnerCount,
        p_actor_id: input.actorId,
    });
    if (error) throw new Error(error.message);
    return listCampaignDraws(input.campaignId);
}

export async function updateWinnerStatus(input: {
    campaignId: string;
    winnerId: string;
    status: CampaignWinnerStatus;
}) {
    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
        .from("campaign_draw_winners")
        .select("id,contacted_at,campaign_draws!inner(campaign_id)")
        .eq("id", input.winnerId)
        .eq("campaign_draws.campaign_id", input.campaignId)
        .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existing) return null;

    const now = new Date().toISOString();
    const update = input.status === "pending"
        ? { contact_status: "pending", contacted_at: null, delivered_at: null }
        : input.status === "contacted"
            ? { contact_status: "contacted", contacted_at: now, delivered_at: null }
            : {
                contact_status: "delivered",
                contacted_at: existing.contacted_at || now,
                delivered_at: now,
            };

    const { data, error } = await admin
        .from("campaign_draw_winners")
        .update(update)
        .eq("id", input.winnerId)
        .select("id")
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

export async function getWinnerContactContext(input: {
    campaignId: string;
    winnerId: string;
}) {
    const admin = createAdminClient();
    const [{ data: winner, error: winnerError }, { data: campaign, error: campaignError }] =
        await Promise.all([
            admin
                .from("campaign_draw_winners")
                .select(`
                    id,
                    campaign_draws!inner(campaign_id),
                    campaign_responses(id,full_name,email,phone)
                `)
                .eq("id", input.winnerId)
                .eq("campaign_draws.campaign_id", input.campaignId)
                .maybeSingle(),
            admin
                .from("campaigns")
                .select("id,reward")
                .eq("id", input.campaignId)
                .maybeSingle(),
        ]);

    if (winnerError || campaignError) {
        throw new Error(winnerError?.message || campaignError?.message);
    }
    if (!winner || !campaign) return null;

    const response = winner.campaign_responses as unknown as CampaignDrawWinner["response"];
    if (!response?.email) return null;

    return {
        winnerId: winner.id,
        reward: campaign.reward,
        response,
    };
}
