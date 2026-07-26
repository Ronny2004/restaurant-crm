import { NextResponse, type NextRequest } from "next/server";
import { recordManagementAudit } from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";
import {
    changeManagedUserStatus,
    isAccountStatus,
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
    const status = body?.status;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : null;

    if (
        !isAccountStatus(status)
        || (status !== "active" && status !== "disabled")
    ) {
        return jsonError("Estado inválido");
    }
    if (userId === actor.id && status === "disabled") {
        return jsonError("No puedes desactivar tu propia cuenta");
    }

    try {
        const result = await changeManagedUserStatus(
            userId,
            status,
            actor.id,
            reason,
        );
        await recordManagementAudit(getRequestContext(request), {
            action: status === "active" ? "activated" : "deactivated",
            actor: {
                id: actor.id,
                username: actor.username,
                role: actor.role,
            },
            target: {
                id: userId,
                email: result.profile.email,
                username: result.profile.username,
            },
            changedFields: [
                "account_status",
                status === "active" ? "activated_at" : "deactivated_at",
            ],
            oldData: { account_status: result.oldProfile.account_status },
            newData: { account_status: result.profile.account_status },
            reason,
        });
        return NextResponse.json({ ok: true, user: result.profile });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo cambiar el estado",
            409,
        );
    }
}
