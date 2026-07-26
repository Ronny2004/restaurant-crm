import { NextResponse, type NextRequest } from "next/server";
import { createTemporaryCode } from "@/lib/auth/access-codes";
import {
    recordAuthEvent,
    recordManagementAudit,
} from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { getProfileById } from "@/lib/auth/profiles";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError } from "@/lib/auth/responses";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ userId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    const { userId } = await context.params;
    const target = await getProfileById(userId);
    if (
        !target
        || target.role === "admin"
        || target.account_status !== "active"
    ) {
        return jsonError("El usuario no puede recibir un código de emergencia");
    }

    try {
        const temporary = await createTemporaryCode(
            userId,
            "admin_emergency",
            {
                createdBy: actor.id,
                expiresInSeconds: 10 * 60,
            },
        );
        const requestContext = getRequestContext(request);
        await Promise.all([
            recordAuthEvent(requestContext, {
                userId,
                eventType: "emergency_code_created",
                authMethod: "emergency_code",
                success: true,
            }),
            recordManagementAudit(requestContext, {
                action: "emergency_code_created",
                actor: {
                    id: actor.id,
                    username: actor.username,
                    role: actor.role,
                },
                target: {
                    id: target.id,
                    email: target.email,
                    username: target.username,
                },
                changedFields: [],
                metadata: { expires_in_seconds: 600 },
            }),
        ]);

        return NextResponse.json({
            ok: true,
            code: temporary.code,
            expiresInSeconds: 600,
        });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo generar el código",
            409,
        );
    }
}
