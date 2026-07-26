import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import {
    createCampaign,
    listCampaigns,
} from "@/lib/campaigns/service";
import { parseCampaignInput } from "@/lib/campaigns/validation";
import { jsonError, safeJson } from "@/lib/auth/responses";

export const runtime = "nodejs";

export async function GET() {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    try {
        return NextResponse.json({ ok: true, campaigns: await listCampaigns() });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudieron consultar las campañas",
            500,
        );
    }
}

export async function POST(request: NextRequest) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    const input = parseCampaignInput(await safeJson(request));
    if (!input) {
        return jsonError("Completa título, descripción y premio");
    }

    try {
        const campaign = await createCampaign({
            title: input.title,
            description: input.description,
            reward: input.reward,
            actorId: actor.id,
        });
        return NextResponse.json({ ok: true, campaign }, { status: 201 });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo crear la campaña",
            409,
        );
    }
}
