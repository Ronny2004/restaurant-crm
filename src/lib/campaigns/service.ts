import "server-only";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
    Campaign,
    CampaignDetail,
    CampaignProduct,
    CampaignResponse,
    CampaignSector,
    CampaignStatus,
} from "@/types/campaign";

function slugify(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 52) || "campana";
}

export function createCampaignSlug(title: string) {
    return `${slugify(title)}-${randomBytes(5).toString("hex")}`;
}

export async function listCampaigns(archived = false) {
    const admin = createAdminClient();
    let query = admin
        .from("campaigns")
        .select("*, campaign_responses(count)")
        .order("created_at", { ascending: false });

    query = archived
        ? query.not("archived_at", "is", null)
        : query.is("archived_at", null);

    const { data: campaigns, error } = await query;

    if (error) {
        throw new Error(error.message || "No se pudieron consultar las campañas");
    }

    return (campaigns || []).map((campaign) => ({
        ...campaign,
        campaign_responses: undefined,
        response_count: campaign.campaign_responses?.[0]?.count || 0,
    })) as Campaign[];
}

export async function getCampaignDetail(id: string) {
    const admin = createAdminClient();
    const [{ data: campaign, error }, { data: responses, error: responseError }] =
        await Promise.all([
            admin.from("campaigns").select("*").eq("id", id).maybeSingle(),
            admin
                .from("campaign_responses")
                .select("*")
                .eq("campaign_id", id)
                .order("created_at", { ascending: false }),
        ]);

    if (error || responseError) {
        throw new Error(error?.message || responseError?.message);
    }
    if (!campaign) {
        return null;
    }

    return {
        ...campaign,
        response_count: responses?.length || 0,
        responses: responses || [],
    } as CampaignDetail;
}

export async function createCampaign(input: {
    title: string;
    description: string;
    reward: string;
    actorId: string;
}) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("campaigns")
        .insert({
            slug: createCampaignSlug(input.title),
            title: input.title,
            description: input.description,
            reward: input.reward,
            status: "active",
            created_by: input.actorId,
        })
        .select("*")
        .single();

    if (error || !data) {
        throw new Error(error?.message || "No se pudo crear la campaña");
    }
    return data as Campaign;
}

export async function updateCampaign(
    id: string,
    input: {
        title: string;
        description: string;
        reward: string;
        status: CampaignStatus;
    },
) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("campaigns")
        .update(input)
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }
    return data as Campaign | null;
}

export async function setCampaignArchived(id: string, archived: boolean) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("campaigns")
        .update({
            archived_at: archived ? new Date().toISOString() : null,
            ...(archived ? { status: "closed" } : {}),
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }
    return data as Campaign | null;
}

export async function deleteCampaignPermanently(id: string, actorId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("delete_campaign_admin", {
        p_campaign_id: id,
        p_actor_id: actorId,
    });
    if (error) throw new Error(error.message);
    return data;
}

export async function getPublicCampaign(slug: string) {
    const admin = createAdminClient();
    const [{ data: campaign, error }, { data: products, error: productError }] =
        await Promise.all([
            admin
                .from("campaigns")
                .select("id,slug,title,description,reward,status")
                .eq("slug", slug)
                .eq("status", "active")
                .is("archived_at", null)
                .maybeSingle(),
            admin
                .from("products")
                .select("id,name")
                .ilike("category", "platos")
                .order("name"),
        ]);

    if (error || productError) {
        throw new Error(error?.message || productError?.message);
    }

    return {
        campaign: campaign as Pick<
            Campaign,
            "id" | "slug" | "title" | "description" | "reward" | "status"
        > | null,
        products: (products || []) as CampaignProduct[],
    };
}

export async function saveCampaignResponse(input: {
    campaignId: string;
    fullName: string;
    email: string;
    phone: string;
    favoriteProductId: string;
    sector: CampaignSector;
    otherSector: string | null;
    suggestions: string | null;
    ipAddress: string | null;
    userAgent: string | null;
}) {
    const admin = createAdminClient();
    const { data: product, error: productError } = await admin
        .from("products")
        .select("id,name,category")
        .eq("id", input.favoriteProductId)
        .ilike("category", "platos")
        .maybeSingle();

    if (productError || !product) {
        throw new Error("El plato seleccionado no es válido");
    }

    const { data, error } = await admin
        .from("campaign_responses")
        .insert({
            campaign_id: input.campaignId,
            full_name: input.fullName,
            email: input.email,
            phone: input.phone,
            favorite_product_id: product.id,
            favorite_product_name: product.name,
            sector: input.sector,
            other_sector: input.otherSector,
            suggestions: input.suggestions,
            consent_at: new Date().toISOString(),
            ip_address: input.ipAddress,
            user_agent: input.userAgent,
        })
        .select("*")
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error("Este correo ya participó en la campaña");
        }
        throw new Error(error.message);
    }
    return data as CampaignResponse;
}
