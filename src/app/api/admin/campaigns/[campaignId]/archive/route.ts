import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { jsonError, safeJson } from "@/lib/auth/responses";
import { setCampaignArchived } from "@/lib/campaigns/service";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ campaignId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    const body = await safeJson(request);
    if (typeof body?.archived !== "boolean") {
        return jsonError("Indica si la campaña debe archivarse o restaurarse");
    }

    try {
        const { campaignId } = await context.params;
        const campaign = await setCampaignArchived(campaignId, body.archived);
        if (!campaign) {
            return jsonError("Campaña no encontrada", 404);
        }
        return NextResponse.json({ ok: true, campaign });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo actualizar el archivo",
            409,
        );
    }
}
