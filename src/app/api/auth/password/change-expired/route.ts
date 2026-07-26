import { NextResponse, type NextRequest } from "next/server";
import { recordAuthEvent } from "@/lib/auth/audit";
import {
    consumeAuthChallenge,
    getAuthChallenge,
} from "@/lib/auth/challenges";
import { markPasswordChanged } from "@/lib/auth/credentials";
import { getProfileById } from "@/lib/auth/profiles";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";
import { destinationForRole } from "@/lib/auth/routing";
import { createSessionForEmail } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function validPassword(password: string) {
    return password.length >= 10
        && password.length <= 128
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /\d/.test(password);
}

export async function POST(request: NextRequest) {
    const context = getRequestContext(request);
    const body = await safeJson(request);
    const password = typeof body?.password === "string" ? body.password : "";
    const confirmation =
        typeof body?.confirmation === "string" ? body.confirmation : "";

    if (!validPassword(password) || password !== confirmation) {
        return jsonError(
            "Usa al menos 10 caracteres, mayúscula, minúscula y número; ambas contraseñas deben coincidir",
        );
    }

    const challenge = await getAuthChallenge(context, [
        "change_expired_password",
        "initial_password",
    ]);
    if (!challenge) {
        return jsonError("La solicitud expiró. Inicia sesión nuevamente", 401);
    }

    const profile = await getProfileById(challenge.user_id);
    if (
        !profile
        || profile.account_status !== "active"
        || profile.role === "admin"
    ) {
        return jsonError("La cuenta no está disponible", 403);
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(profile.id, {
        password,
    });
    if (error) {
        return jsonError(`No se pudo cambiar la contraseña: ${error.message}`);
    }

    await markPasswordChanged(profile.id);
    await createSessionForEmail(profile.email);
    await consumeAuthChallenge(challenge.id);
    await recordAuthEvent(context, {
        userId: profile.id,
        eventType: "password_changed",
        authMethod: "password",
        success: true,
    });

    return NextResponse.json({
        ok: true,
        next: destinationForRole(profile.role),
    });
}
