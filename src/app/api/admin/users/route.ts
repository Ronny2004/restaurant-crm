import { NextResponse, type NextRequest } from "next/server";
import { recordManagementAudit } from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { sendAccessCredentialsEmail } from "@/lib/email/provider";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";
import {
    createManagedUser,
    generateManagedAccess,
    isEmail,
    isUserRole,
    listManagedUsers,
    rollbackManagedUserCreation,
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
    const fullName =
        typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const role = body?.role;

    if (
        !isEmail(email)
        || fullName.length < 2
        || fullName.length > 100
        || !isUserRole(role)
    ) {
        return jsonError("Revisa el correo, nombre completo y rol");
    }

    try {
        const access = await generateManagedAccess(fullName, role);
        if (!access.username) {
            throw new Error("No se pudo generar el nombre de usuario");
        }

        const profile = await createManagedUser({
            email,
            username: access.username,
            fullName,
            role,
            password: access.password,
            pin: access.pin,
            actorId: actor.id,
        });

        try {
            await sendAccessCredentialsEmail({
                email: profile.email,
                fullName: profile.full_name || profile.username,
                username: profile.username,
                password: access.password,
                pin: access.pin,
            });
        } catch (emailError) {
            await rollbackManagedUserCreation(profile.id);
            throw emailError;
        }

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

        return NextResponse.json({
            ok: true,
            user: profile,
            message: "Usuario creado y credenciales enviadas por correo",
        }, { status: 201 });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo crear el usuario",
            409,
        );
    }
}
