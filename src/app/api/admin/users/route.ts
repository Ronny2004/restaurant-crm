import { NextResponse, type NextRequest } from "next/server";
import { recordManagementAudit } from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { normalizePin } from "@/lib/auth/crypto";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";
import {
    createManagedUser,
    isEmail,
    isStrongPassword,
    isUserRole,
    listManagedUsers,
    normalizeUsername,
} from "@/lib/auth/user-management";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    try {
        const users = await listManagedUsers(
            request.nextUrl.searchParams.get("q") || undefined,
        );
        return NextResponse.json({ ok: true, users });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudieron consultar los usuarios",
            500,
        );
    }
}

export async function POST(request: NextRequest) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    const context = getRequestContext(request);
    const body = await safeJson(request);
    const email = body?.email;
    const username = normalizeUsername(body?.username);
    const fullName =
        typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const role = body?.role;
    const password = body?.password;
    const pin = normalizePin(body?.pin);

    if (
        !isEmail(email)
        || !username
        || fullName.length < 2
        || fullName.length > 100
        || !isUserRole(role)
        || !isStrongPassword(password)
        || (role !== "admin" && !pin)
    ) {
        return jsonError(
            "Revisa correo, usuario, nombre, rol, contraseña temporal y PIN",
        );
    }

    try {
        const profile = await createManagedUser({
            email,
            username,
            fullName,
            role,
            password,
            pin,
            actorId: actor.id,
        });

        await recordManagementAudit(context, {
            action: "created",
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
            changedFields: [
                "email",
                "username",
                "full_name",
                "role",
                "account_status",
            ],
            newData: {
                email: profile.email,
                username: profile.username,
                full_name: profile.full_name,
                role: profile.role,
                account_status: profile.account_status,
            },
        });

        return NextResponse.json({ ok: true, user: profile }, { status: 201 });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo crear el usuario",
            409,
        );
    }
}
