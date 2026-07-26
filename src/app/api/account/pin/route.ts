import { NextResponse, type NextRequest } from "next/server";
import { recordAuthEvent } from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { setUserPin, verifyUserPin } from "@/lib/auth/credentials";
import { normalizePin } from "@/lib/auth/crypto";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
    const context = getRequestContext(request);
    const profile = await requireActiveProfile(["waiter", "chef", "cashier"]);
    if (!profile) {
        return jsonError("No autorizado", 401);
    }

    const body = await safeJson(request);
    const currentPin = normalizePin(body?.currentPin);
    const newPin = normalizePin(body?.newPin);
    const confirmation = normalizePin(body?.confirmation);

    if (!currentPin || !newPin || newPin !== confirmation) {
        return jsonError("Verifica el PIN actual y la confirmación");
    }

    const currentCredential = await verifyUserPin(currentPin);
    if (!currentCredential || currentCredential.user_id !== profile.id) {
        return jsonError("El PIN actual no es correcto", 401);
    }

    try {
        await setUserPin(profile.id, newPin, false);
        await recordAuthEvent(context, {
            userId: profile.id,
            eventType: "pin_changed",
            authMethod: "pin",
            success: true,
        });
        return NextResponse.json({ ok: true, message: "PIN actualizado" });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo cambiar el PIN",
        );
    }
}
