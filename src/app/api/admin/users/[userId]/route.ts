import { NextResponse, type NextRequest } from "next/server";
import { recordManagementAudit } from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";
import {
    isUserRole,
    normalizeUsername,
    updateManagedUser,
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
    const requestContext = getRequestContext(request);
    const body = await safeJson(request);
    const username = normalizeUsername(body?.username);
    const fullName =
        typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const role = body?.role;
    const phone = typeof body?.phone === "string" ? body.phone.trim() : null;

    if (
        !username
        || fullName.length < 2
        || fullName.length > 100
        || !isUserRole(role)
        || (phone && phone.length > 30)
    ) {
        return jsonError("Revisa los datos ingresados");
    }

    if (userId === actor.id && role !== "admin") {
        return jsonError("No puedes retirar tu propio rol de administrador");
    }

    try {
        const { oldProfile, profile } = await updateManagedUser(userId, {
            username,
            fullName,
            role,
            phone,
        });
        const changedFields = [
            oldProfile.username !== profile.username ? "username" : null,
            oldProfile.full_name !== profile.full_name ? "full_name" : null,
            oldProfile.role !== profile.role ? "role" : null,
            oldProfile.phone !== profile.phone ? "phone" : null,
        ].filter((value): value is string => Boolean(value));

        await recordManagementAudit(requestContext, {
            action: oldProfile.role !== profile.role
                ? "role_changed"
                : "updated",
            actor: {
                id: actor.id,
                username: actor.username,
                role: actor.role,
            },
            target: {
                id: profile.id,
                email: profile.email,
                username: profile.username,
            },
            changedFields,
            oldData: {
                username: oldProfile.username,
                full_name: oldProfile.full_name,
                role: oldProfile.role,
                phone: oldProfile.phone,
            },
            newData: {
                username: profile.username,
                full_name: profile.full_name,
                role: profile.role,
                phone: profile.phone,
            },
        });

        return NextResponse.json({ ok: true, user: profile });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo actualizar el usuario",
            409,
        );
    }
}
