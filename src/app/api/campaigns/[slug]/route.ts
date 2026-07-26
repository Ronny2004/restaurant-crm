import { NextResponse, type NextRequest } from "next/server";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";
import {
    getPublicCampaign,
    saveCampaignResponse,
} from "@/lib/campaigns/service";
import { parseCampaignResponse } from "@/lib/campaigns/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const result = await getPublicCampaign(slug);
        if (!result.campaign) {
            return jsonError("Esta campaña no existe o ya está cerrada", 404);
        }
        return NextResponse.json(
            { ok: true, ...result },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo consultar la campaña",
            500,
        );
    }
}

export async function POST(request: NextRequest, context: RouteContext) {
    const { slug } = await context.params;
    const contextData = getRequestContext(request);
    const limit = await consumeRateLimit(
        "campaign-submit-ip",
        `${contextData.ipAddress || "unknown"}:${slug}`,
        { maxAttempts: 20, windowSeconds: 3600, blockSeconds: 60 },
    );

    if (!limit.allowed) {
        return jsonError("Demasiados intentos. Espera 1 minuto", 429);
    }

    const input = parseCampaignResponse(await safeJson(request));
    if (!input) {
        return jsonError("Revisa los datos y acepta el uso indicado");
    }

    try {
        const { campaign } = await getPublicCampaign(slug);
        if (!campaign) {
            return jsonError("Esta campaña no existe o ya está cerrada", 404);
        }

        const emailLimit = await consumeRateLimit(
            "campaign-submit-email",
            `${slug}:${input.email}`,
            { maxAttempts: 3, windowSeconds: 86400, blockSeconds: 300 },
        );
        if (!emailLimit.allowed) {
            return jsonError("No se pudo registrar otra respuesta", 429);
        }

        await saveCampaignResponse({
            campaignId: campaign.id,
            ...input,
            ipAddress: contextData.ipAddress,
            userAgent: contextData.userAgent,
        });

        return NextResponse.json(
            {
                ok: true,
                message: "Tu respuesta fue registrada. Gracias por participar.",
            },
            { status: 201 },
        );
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : "No se pudo registrar la respuesta";
        return jsonError(message, message.includes("ya participó") ? 409 : 400);
    }
}
