import { NextResponse, type NextRequest } from "next/server";
import { recordManagementAudit } from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";
import {
    changeManagedUserEmail,
    isEmail,
} from "@/lib/auth/user-management";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ userId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    const { userId } = await context.params;
    const body = await safeJson(request);
    const email = body?.email;
    if (!isEmail(email)) {
        return jsonError("Ingresa un correo válido");
    }

    try {
        const result = await changeManagedUserEmail(userId, email);
        await recordManagementAudit(getRequestContext(request), {
            action: "email_changed",
            actor: {
                id: actor.id,
                username: actor.username,
                role: actor.role,
            },
            target: {
                id: userId,
                email: result.email,
                username: result.oldProfile.username,
            },
            changedFields: ["email"],
            oldData: { email: result.oldProfile.email },
            newData: { email: result.email },
        });
        return NextResponse.json({ ok: true, email: result.email });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo cambiar el correo",
            409,
        );
    }
}
