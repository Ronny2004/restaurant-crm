import { NextResponse, type NextRequest } from "next/server";
import { recordAuthEvent } from "@/lib/auth/audit";
import { createAuthChallenge } from "@/lib/auth/challenges";
import {
    getCredentials,
    toCredentialStatus,
} from "@/lib/auth/credentials";
import { normalizeIdentifier } from "@/lib/auth/crypto";
import { getProfileById } from "@/lib/auth/profiles";
import { consumeRateLimit, clearRateLimit } from "@/lib/auth/rate-limit";
import { getRequestContext } from "@/lib/auth/request-context";
import {
    genericCredentialsError,
    jsonError,
    safeJson,
} from "@/lib/auth/responses";
import { destinationForRole } from "@/lib/auth/routing";
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
        "password-login",
        `${context.ipAddress || "unknown"}:${identifier}`,
        { maxAttempts: 5, windowSeconds: 300, blockSeconds: 900 },
    );

    if (!limit.allowed) {
        return jsonError("Demasiados intentos. Espera unos minutos", 429);
    }

    const result = await signInWithPassword(identifier, password);
    if (result.error || !result.user) {
        await recordAuthEvent(context, {
            eventType: "login_failed",
            authMethod: "password",
            success: false,
            failureCode: "invalid_credentials",
        });
        return genericCredentialsError();
    }

    const profile = await getProfileById(result.user.id);
    if (
        !profile
        || profile.account_status !== "active"
        || profile.role === "admin"
    ) {
        await clearServerSession();
        await recordAuthEvent(context, {
            userId: result.user.id,
            eventType: "login_failed",
            authMethod: "password",
            success: false,
            failureCode: "inactive_or_invalid_role",
        });
        return genericCredentialsError();
    }

    const credential = await getCredentials(profile.id);
    const status = toCredentialStatus(credential);
    if (
        status.mustChangePassword
        || (
            status.passwordExpiresAt
            && new Date(status.passwordExpiresAt).getTime() <= Date.now()
        )
    ) {
        await clearServerSession();
        await createAuthChallenge(
            profile.id,
            status.mustChangePassword
                ? "initial_password"
                : "change_expired_password",
            context,
        );
        return NextResponse.json({
            ok: true,
            challengeRequired: "password",
            next: "/actualizar-credencial",
        });
    }

    await Promise.all([
        clearRateLimit("password-login", limit.identifierHash),
        recordAuthEvent(context, {
            userId: profile.id,
            eventType: "login_success",
            authMethod: "password",
            success: true,
        }),
    ]);

    return NextResponse.json({
        ok: true,
        next: destinationForRole(profile.role),
        credentialStatus: status,
    });
}
