import { NextResponse, type NextRequest } from "next/server";
import { recordAuthEvent } from "@/lib/auth/audit";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { markPasswordChanged } from "@/lib/auth/credentials";
import { getRequestContext } from "@/lib/auth/request-context";
import { jsonError, safeJson } from "@/lib/auth/responses";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function validPassword(password: string) {
    return password.length >= 10
        && password.length <= 128
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /\d/.test(password);
}

export async function PATCH(request: NextRequest) {
    const context = getRequestContext(request);
    const profile = await requireActiveProfile();
    if (!profile) {
        return jsonError("No autorizado", 401);
    }

    const body = await safeJson(request);
    const currentPassword =
        typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
        typeof body?.newPassword === "string" ? body.newPassword : "";
    const confirmation =
        typeof body?.confirmation === "string" ? body.confirmation : "";

    if (
        currentPassword.length < 8
        || !validPassword(newPassword)
        || newPassword !== confirmation
    ) {
        return jsonError(
            "La contraseña nueva debe coincidir y tener al menos 10 caracteres, mayúscula, minúscula y número",
        );
    }

    const supabase = await createServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
    });

    if (signInError) {
        return jsonError("La contraseña actual no es correcta", 401);
    }

    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
    });
    if (updateError) {
        return jsonError(`No se pudo cambiar la contraseña: ${updateError.message}`);
    }

    if (profile.role !== "admin") {
        await markPasswordChanged(profile.id);
    }

    await recordAuthEvent(context, {
        userId: profile.id,
        eventType: "password_changed",
        authMethod: profile.role === "admin"
            ? "admin_password"
            : "password",
        success: true,
    });

    return NextResponse.json({
        ok: true,
        message: "Contraseña actualizada",
    });
}
