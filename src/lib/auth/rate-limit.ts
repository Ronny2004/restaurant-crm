import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashIdentifier } from "@/lib/auth/crypto";

export async function consumeRateLimit(
    action: string,
    identifier: string,
    options: {
        maxAttempts: number;
        windowSeconds: number;
        blockSeconds: number;
    },
) {
    const admin = createAdminClient();
    const identifierHash = hashIdentifier(action, identifier);
    const { data, error } = await admin.rpc("consume_auth_rate_limit", {
        p_action: action,
        p_identifier_hash: identifierHash,
        p_max_attempts: options.maxAttempts,
        p_window_seconds: options.windowSeconds,
        p_block_seconds: options.blockSeconds,
    });

    if (error) {
        throw new Error(`No se pudo evaluar el límite de intentos: ${error.message}`);
    }

    return {
        allowed: data === true,
        identifierHash,
    };
}

export async function clearRateLimit(action: string, identifierHash: string) {
    const admin = createAdminClient();
    const { error } = await admin.rpc("clear_auth_rate_limit", {
        p_action: action,
        p_identifier_hash: identifierHash,
    });

    if (error) {
        console.error("No se pudo limpiar el límite de intentos", error.message);
    }
}
