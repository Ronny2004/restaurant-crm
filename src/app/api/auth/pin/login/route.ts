import { NextResponse, type NextRequest } from "next/server";
import { verifyTemporaryCode } from "@/lib/auth/access-codes";
import { recordAuthEvent } from "@/lib/auth/audit";
import { createAuthChallenge } from "@/lib/auth/challenges";
import {
    markPinLogin,
    toCredentialStatus,
    verifyUserPin,
} from "@/lib/auth/credentials";
import { normalizePin } from "@/lib/auth/crypto";
import { getProfileById } from "@/lib/auth/profiles";
import { consumeRateLimit, clearRateLimit } from "@/lib/auth/rate-limit";
import { getRequestContext } from "@/lib/auth/request-context";
import {
    genericCredentialsError,
    jsonError,
    safeJson,
} from "@/lib/auth/responses";
import { destinationForRole } from "@/lib/auth/routing";
import { createSessionForEmail } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const context = getRequestContext(request);
    const body = await safeJson(request);
    const pin = normalizePin(body?.pin);

    if (!pin) {
        return jsonError("Ingresa un PIN válido de 6 dígitos");
    }

    const ipKey = context.ipAddress || "unknown";
    const [ipLimit, pinLimit] = await Promise.all([
        consumeRateLimit("pin-login-ip", ipKey, {
            maxAttempts: 10,
            windowSeconds: 300,
            blockSeconds: 900,
        }),
        consumeRateLimit("pin-login-value", pin, {
            maxAttempts: 5,
            windowSeconds: 300,
            blockSeconds: 900,
        }),
    ]);

    if (!ipLimit.allowed || !pinLimit.allowed) {
        await recordAuthEvent(context, {
            eventType: "account_locked",
            authMethod: "pin",
            success: false,
            failureCode: "rate_limited",
        });
        return jsonError("Demasiados intentos. Espera unos minutos", 429);
    }

    const credential = await verifyUserPin(pin);

    if (credential) {
        const profile = await getProfileById(credential.user_id);
        if (
            !profile
            || profile.account_status !== "active"
            || profile.role === "admin"
        ) {
            await recordAuthEvent(context, {
                userId: profile?.id,
                eventType: "login_failed",
                authMethod: "pin",
                success: false,
                failureCode: "inactive_or_invalid_role",
            });
            return genericCredentialsError();
        }

        const status = toCredentialStatus(credential);
        if (
            status.mustChangePin
            || (
                status.pinExpiresAt
                && new Date(status.pinExpiresAt).getTime() <= Date.now()
            )
        ) {
            await createAuthChallenge(
                profile.id,
                status.mustChangePin ? "initial_pin" : "change_expired_pin",
                context,
            );
            return NextResponse.json({
                ok: true,
                challengeRequired: "pin",
                next: "/restablecer-pin",
            });
        }

        await createSessionForEmail(profile.email);
        await markPinLogin(profile.id);
        await Promise.all([
            clearRateLimit("pin-login-ip", ipLimit.identifierHash),
            clearRateLimit("pin-login-value", pinLimit.identifierHash),
            recordAuthEvent(context, {
                userId: profile.id,
                eventType: "login_success",
                authMethod: "pin",
                success: true,
            }),
        ]);

        return NextResponse.json({
            ok: true,
            next: destinationForRole(profile.role),
            credentialStatus: status,
        });
    }

    const rescueCode = await verifyTemporaryCode(pin, "pin_recovery");
    if (rescueCode) {
        const profile = await getProfileById(rescueCode.user_id);
        if (
            profile
            && profile.account_status === "active"
            && profile.role !== "admin"
        ) {
            await createAuthChallenge(
                profile.id,
                "reset_pin",
                context,
                rescueCode.id,
            );
            return NextResponse.json({
                ok: true,
                challengeRequired: "pin",
                next: "/restablecer-pin",
            });
        }
    }

    await recordAuthEvent(context, {
        eventType: "login_failed",
        authMethod: "pin",
        success: false,
        failureCode: "invalid_credentials",
    });
    return genericCredentialsError();
}
