import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
    generateSixDigitCode,
    hashSecret,
    keyedLookup,
    normalizePin,
    verifySecret,
} from "@/lib/auth/crypto";

export type AccessCodePurpose = "pin_recovery" | "admin_emergency";

export async function createTemporaryCode(
    userId: string,
    purpose: AccessCodePurpose,
    options?: {
        createdBy?: string | null;
        expiresInSeconds?: number;
    },
) {
    const admin = createAdminClient();
    const expiresInSeconds = options?.expiresInSeconds || 300;

    await admin
        .from("temporary_access_codes")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("purpose", purpose)
        .is("used_at", null)
        .is("revoked_at", null);

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const code = generateSixDigitCode();
        const { data, error } = await admin
            .from("temporary_access_codes")
            .insert({
                user_id: userId,
                purpose,
                code_lookup: keyedLookup(`access-code:${purpose}`, code),
                code_hash: await hashSecret(code),
                created_by: options?.createdBy || null,
                expires_at: new Date(
                    Date.now() + expiresInSeconds * 1000,
                ).toISOString(),
            })
            .select("id")
            .single();

        if (!error && data) {
            return { id: data.id as string, code };
        }

        if (error?.code !== "23505") {
            throw new Error(`No se pudo crear el código temporal: ${error?.message}`);
        }
    }

    throw new Error("No se pudo generar un código temporal único");
}

export async function verifyTemporaryCode(
    rawCode: unknown,
    purpose: AccessCodePurpose,
) {
    const code = normalizePin(rawCode);
    if (!code) {
        return null;
    }

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("temporary_access_codes")
        .select("*")
        .eq("purpose", purpose)
        .eq("code_lookup", keyedLookup(`access-code:${purpose}`, code))
        .is("verified_at", null)
        .is("used_at", null)
        .is("revoked_at", null)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    if (
        new Date(data.expires_at).getTime() <= Date.now()
        || (
            data.locked_until
            && new Date(data.locked_until).getTime() > Date.now()
        )
        || !(await verifySecret(code, data.code_hash))
    ) {
        return null;
    }

    const { data: claimed, error: claimError } = await admin
        .from("temporary_access_codes")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", data.id)
        .is("verified_at", null)
        .select("id")
        .maybeSingle();

    if (claimError || !claimed) {
        return null;
    }

    return data as {
        id: string;
        user_id: string;
        purpose: AccessCodePurpose;
    };
}
