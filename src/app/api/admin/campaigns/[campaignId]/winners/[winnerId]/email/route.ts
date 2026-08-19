import { NextResponse } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { jsonError } from "@/lib/auth/responses";
import {
    getWinnerContactContext,
    updateWinnerStatus,
} from "@/lib/campaigns/raffle-service";
import { campaignPrizeLabel } from "@/lib/campaigns/reward";
import { sendCampaignWinnerEmail } from "@/lib/email/provider";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ campaignId: string; winnerId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    try {
        const { campaignId, winnerId } = await context.params;
        const contact = await getWinnerContactContext({ campaignId, winnerId });
        if (!contact) return jsonError("Ganador no encontrado", 404);

        await sendCampaignWinnerEmail({
            email: contact.response.email,
            fullName: contact.response.full_name,
            phone: contact.response.phone,
            reward: campaignPrizeLabel(contact.reward),
        });
        try {
            await updateWinnerStatus({ campaignId, winnerId, status: "contacted" });
        } catch (statusError) {
            console.error("El correo fue enviado, pero no se pudo actualizar el estado del ganador:", statusError);
        }

        return NextResponse.json({
            ok: true,
            message: `Correo enviado a ${contact.response.email}`,
        });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo enviar el correo",
            502,
        );
    }
}
