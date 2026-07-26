import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import {
    getCampaignDetail,
    updateCampaign,
} from "@/lib/campaigns/service";
import { parseCampaignInput } from "@/lib/campaigns/validation";
import { jsonError, safeJson } from "@/lib/auth/responses";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ campaignId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    try {
        const { campaignId } = await context.params;
        const campaign = await getCampaignDetail(campaignId);
        if (!campaign) {
            return jsonError("Campaña no encontrada", 404);
        }
        return NextResponse.json({ ok: true, campaign });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo consultar la campaña",
            500,
        );
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    const input = parseCampaignInput(await safeJson(request));
    if (!input) {
        return jsonError("Revisa los datos de la campaña");
    }

    try {
        const { campaignId } = await context.params;
        const campaign = await updateCampaign(campaignId, input);
        if (!campaign) {
            return jsonError("Campaña no encontrada", 404);
        }
        return NextResponse.json({ ok: true, campaign });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo actualizar la campaña",
            409,
        );
    }
}
