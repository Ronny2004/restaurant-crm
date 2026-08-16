import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { jsonError, safeJson } from "@/lib/auth/responses";
import { updateWinnerStatus } from "@/lib/campaigns/raffle-service";
import type { CampaignWinnerStatus } from "@/types/campaign-raffle";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ campaignId: string; winnerId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    const body = await safeJson(request);
    const status = body?.status as CampaignWinnerStatus;
    if (!["pending", "contacted", "delivered"].includes(status)) {
        return jsonError("Estado de ganador inválido");
    }

    try {
        const { campaignId, winnerId } = await context.params;
        const winner = await updateWinnerStatus({ campaignId, winnerId, status });
        if (!winner) return jsonError("Ganador no encontrado", 404);
        return NextResponse.json({ ok: true, winner });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo actualizar el ganador",
            409,
        );
    }
}
