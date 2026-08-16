import { NextResponse, type NextRequest } from "next/server";
import { recordManagementAudit } from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError } from "@/lib/auth/responses";
import { regenerateManagedUserAccess } from "@/lib/auth/user-management";
import { sendAccessCredentialsEmail } from "@/lib/email/provider";

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
    if (userId === actor.id) {
        return jsonError(
            "Cambia tus propias credenciales desde tu perfil de seguridad",
            409,
        );
    }

    try {
        const access = await regenerateManagedUserAccess(userId, actor.id);
        let delivered = true;

        try {
            await sendAccessCredentialsEmail({
                email: access.profile.email,
                fullName: access.profile.full_name || access.profile.username,
                username: access.profile.username,
                password: access.password,
                pin: access.pin,
                regenerated: true,
            });
        } catch {
            delivered = false;
        }

        await recordManagementAudit(getRequestContext(request), {
            action: "credentials_regenerated",
            actor: {
                id: actor.id,
                username: actor.username,
                role: actor.role,
            },
            target: {
                id: access.profile.id,
                email: access.profile.email,
                username: access.profile.username,
            },
            changedFields: access.pin
                ? ["password", "pin", "sessions"]
                : ["password", "sessions"],
            metadata: {
                email_delivered: delivered,
                mandatory_change: true,
            },
        });

        return NextResponse.json({
            ok: true,
            delivered,
            message: delivered
                ? "Credenciales regeneradas y enviadas por correo"
                : "Las credenciales cambiaron, pero el correo falló. Entrégalas manualmente",
            credentials: delivered ? undefined : {
                username: access.profile.username,
                password: access.password,
                pin: access.pin,
            },
        });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudieron regenerar las credenciales",
            409,
        );
    }
}
