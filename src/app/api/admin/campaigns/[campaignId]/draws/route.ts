import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { jsonError, safeJson } from "@/lib/auth/responses";
import {
    listCampaignDraws,
    runCampaignDraw,
} from "@/lib/campaigns/raffle-service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    try {
        const { campaignId } = await context.params;
        return NextResponse.json({ ok: true, draws: await listCampaignDraws(campaignId) });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudieron consultar los sorteos",
            500,
        );
    }
}

export async function POST(request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    const body = await safeJson(request);
    const winnerCount = Number(body?.winnerCount);
    if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > 20) {
        return jsonError("La cantidad de ganadores debe estar entre 1 y 20");
    }

    try {
        const { campaignId } = await context.params;
        const draws = await runCampaignDraw({
            campaignId,
            winnerCount,
            actorId: actor.id,
        });
        return NextResponse.json({ ok: true, draws }, { status: 201 });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo realizar el sorteo",
            409,
        );
    }
}
