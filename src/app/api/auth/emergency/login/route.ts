import { NextResponse, type NextRequest } from "next/server";
import { verifyTemporaryCode } from "@/lib/auth/access-codes";
import { recordAuthEvent } from "@/lib/auth/audit";
import { normalizePin } from "@/lib/auth/crypto";
import { getProfileById } from "@/lib/auth/profiles";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getRequestContext } from "@/lib/auth/request-context";
import {
    genericCredentialsError,
    jsonError,
    safeJson,
} from "@/lib/auth/responses";
import { destinationForRole } from "@/lib/auth/routing";
import { createSessionForEmail } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const context = getRequestContext(request);
    const body = await safeJson(request);
    const code = normalizePin(body?.code);
    if (!code) {
        return genericCredentialsError();
    }

    const limit = await consumeRateLimit(
        "emergency-login",
        `${context.ipAddress || "unknown"}:${code}`,
        { maxAttempts: 5, windowSeconds: 300, blockSeconds: 900 },
    );
    if (!limit.allowed) {
        return jsonError("Demasiados intentos. Espera unos minutos", 429);
    }

    const temporary = await verifyTemporaryCode(code, "admin_emergency");
    const profile = temporary
        ? await getProfileById(temporary.user_id)
        : null;

    if (
        !temporary
        || !profile
        || profile.account_status !== "active"
        || profile.role === "admin"
    ) {
        await recordAuthEvent(context, {
            eventType: "login_failed",
            authMethod: "emergency_code",
            success: false,
            failureCode: "invalid_credentials",
        });
        return genericCredentialsError();
    }

    const admin = createAdminClient();
    await admin
        .from("temporary_access_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", temporary.id)
        .is("used_at", null);

    await createSessionForEmail(profile.email);
    await recordAuthEvent(context, {
        userId: profile.id,
        eventType: "emergency_code_used",
        authMethod: "emergency_code",
        success: true,
    });

    return NextResponse.json({
        ok: true,
        next: destinationForRole(profile.role),
    });
}
