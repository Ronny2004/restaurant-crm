import { NextResponse, type NextRequest } from "next/server";
import { createTemporaryCode } from "@/lib/auth/access-codes";
import { recordAuthEvent } from "@/lib/auth/audit";
import { normalizeIdentifier } from "@/lib/auth/crypto";
import { getActiveProfileByEmail } from "@/lib/auth/profiles";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getRequestContext } from "@/lib/auth/request-context";
import { safeJson } from "@/lib/auth/responses";
import { sendPinRecoveryEmail } from "@/lib/email/provider";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const GENERIC_MESSAGE =
    "Si el correo está registrado, recibirás un PIN temporal en unos minutos.";

export async function POST(request: NextRequest) {
    const context = getRequestContext(request);
    const body = await safeJson(request);
    const email = normalizeIdentifier(body?.email);

    if (!email || !email.includes("@")) {
        return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const [ipLimit, emailLimit] = await Promise.all([
        consumeRateLimit(
            "pin-recovery-ip",
            context.ipAddress || "unknown",
            { maxAttempts: 5, windowSeconds: 3600, blockSeconds: 3600 },
        ),
        consumeRateLimit(
            "pin-recovery-email",
            email,
            { maxAttempts: 3, windowSeconds: 3600, blockSeconds: 3600 },
        ),
    ]);

    await recordAuthEvent(context, {
        eventType: "pin_recovery_requested",
        authMethod: "recovery_pin",
        success: ipLimit.allowed && emailLimit.allowed,
        failureCode:
            ipLimit.allowed && emailLimit.allowed ? null : "rate_limited",
    });

    if (!ipLimit.allowed || !emailLimit.allowed) {
        return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const profile = await getActiveProfileByEmail(email);
    if (!profile || profile.role === "admin") {
        return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    let temporaryId: string | null = null;
    try {
        const temporary = await createTemporaryCode(
            profile.id,
            "pin_recovery",
            { expiresInSeconds: 300 },
        );
        temporaryId = temporary.id;
        await sendPinRecoveryEmail(profile.email, temporary.code);
        await recordAuthEvent(context, {
            userId: profile.id,
            eventType: "pin_recovery_sent",
            authMethod: "recovery_pin",
            success: true,
        });
    } catch (error) {
        if (temporaryId) {
            const admin = createAdminClient();
            await admin
                .from("temporary_access_codes")
                .update({ revoked_at: new Date().toISOString() })
                .eq("id", temporaryId);
        }
        console.error(
            "No se pudo enviar el correo de recuperación",
            error instanceof Error ? error.message : error,
        );
        await recordAuthEvent(context, {
            userId: profile.id,
            eventType: "pin_recovery_failed",
            authMethod: "recovery_pin",
            success: false,
            failureCode: "delivery_failed",
        });
    }

    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
