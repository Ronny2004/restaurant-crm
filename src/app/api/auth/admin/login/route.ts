import { NextResponse, type NextRequest } from "next/server";
import { recordAuthEvent } from "@/lib/auth/audit";
import { normalizeIdentifier } from "@/lib/auth/crypto";
import { getProfileById } from "@/lib/auth/profiles";
import { consumeRateLimit, clearRateLimit } from "@/lib/auth/rate-limit";
import { getRequestContext } from "@/lib/auth/request-context";
import {
    genericCredentialsError,
    jsonError,
    safeJson,
} from "@/lib/auth/responses";
import {
    clearServerSession,
    signInWithPassword,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const context = getRequestContext(request);
    const body = await safeJson(request);
    const identifier = normalizeIdentifier(body?.identifier);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!identifier || password.length < 8 || password.length > 128) {
        return genericCredentialsError();
    }

    const limit = await consumeRateLimit(
        "admin-login",
        `${context.ipAddress || "unknown"}:${identifier}`,
        { maxAttempts: 5, windowSeconds: 300, blockSeconds: 60 },
    );

    if (!limit.allowed) {
        return jsonError("Demasiados intentos. Espera 1 minuto", 429);
    }

    const result = await signInWithPassword(identifier, password);
    const profile = result.user ? await getProfileById(result.user.id) : null;

    if (
        result.error
        || !profile
        || profile.role !== "admin"
        || profile.account_status !== "active"
    ) {
        if (result.user) {
            await clearServerSession();
        }
        await recordAuthEvent(context, {
            userId: result.user?.id,
            eventType: "login_failed",
            authMethod: "admin_password",
            success: false,
            failureCode: "invalid_credentials",
        });
        return genericCredentialsError();
    }

    await Promise.all([
        clearRateLimit("admin-login", limit.identifierHash),
        recordAuthEvent(context, {
            userId: profile.id,
            eventType: "login_success",
            authMethod: "admin_password",
            success: true,
        }),
    ]);

    return NextResponse.json({ ok: true, next: "/" });
}
