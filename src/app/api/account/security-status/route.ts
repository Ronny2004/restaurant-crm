import { NextResponse } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import {
    getCredentials,
    toCredentialStatus,
} from "@/lib/auth/credentials";
import { jsonError } from "@/lib/auth/responses";

export async function GET() {
    const profile = await requireActiveProfile();
    if (!profile) {
        return jsonError("No autorizado", 401);
    }

    if (profile.role === "admin") {
        return NextResponse.json({
            ok: true,
            credentialStatus: {
                pinConfigured: false,
                mustChangePin: false,
                mustChangePassword: false,
                pinExpiresAt: null,
                passwordExpiresAt: null,
                pinDaysRemaining: null,
                passwordDaysRemaining: null,
            },
        });
    }

    const credentials = await getCredentials(profile.id);
    return NextResponse.json({
        ok: true,
        credentialStatus: toCredentialStatus(credentials),
    });
}
