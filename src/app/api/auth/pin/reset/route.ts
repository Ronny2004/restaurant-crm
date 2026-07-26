import { NextResponse, type NextRequest } from "next/server";
import { recordAuthEvent } from "@/lib/auth/audit";
import {
    consumeAuthChallenge,
    getAuthChallenge,
} from "@/lib/auth/challenges";
import { setUserPin } from "@/lib/auth/credentials";
import { normalizePin } from "@/lib/auth/crypto";
import { getProfileById } from "@/lib/auth/profiles";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";
import { destinationForRole } from "@/lib/auth/routing";
import { createSessionForEmail } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const context = getRequestContext(request);
    const body = await safeJson(request);
    const pin = normalizePin(body?.pin);
    const confirmation = normalizePin(body?.confirmation);

    if (!pin || !confirmation || pin !== confirmation) {
        return jsonError("Los PIN deben coincidir y contener 6 dígitos");
    }

    const challenge = await getAuthChallenge(context, [
        "reset_pin",
        "change_expired_pin",
        "initial_pin",
    ]);
    if (!challenge) {
        return jsonError("La solicitud expiró. Inicia el proceso nuevamente", 401);
    }

    const profile = await getProfileById(challenge.user_id);
    if (
        !profile
        || profile.account_status !== "active"
        || profile.role === "admin"
    ) {
        return jsonError("La cuenta no está disponible", 403);
    }

    try {
        await setUserPin(profile.id, pin, false);
        await createSessionForEmail(profile.email);
        await consumeAuthChallenge(challenge.id, challenge.source_code_id);
        await recordAuthEvent(context, {
            userId: profile.id,
            eventType: "pin_changed",
            authMethod:
                challenge.purpose === "reset_pin" ? "recovery_pin" : "pin",
            success: true,
        });

        return NextResponse.json({
            ok: true,
            next: destinationForRole(profile.role),
        });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo cambiar el PIN",
        );
    }
}
