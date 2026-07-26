import "server-only";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    generateChallengeToken,
    hashIdentifier,
    keyedLookup,
} from "@/lib/auth/crypto";
import {
    clientBinding,
    type RequestContext,
} from "@/lib/auth/request-context";

const CHALLENGE_COOKIE = "dm_auth_challenge";
const CHALLENGE_SECONDS = 5 * 60;

function shouldUseSecureCookies() {
    if (process.env.NODE_ENV !== "production") {
        return false;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    return !supabaseUrl.includes("127.0.0.1")
        && !supabaseUrl.includes("localhost");
}

export type ChallengePurpose =
    | "reset_pin"
    | "change_expired_pin"
    | "change_expired_password"
    | "initial_pin"
    | "initial_password";

export async function createAuthChallenge(
    userId: string,
    purpose: ChallengePurpose,
    context: RequestContext,
    sourceCodeId?: string | null,
) {
    const admin = createAdminClient();
    const cookieStore = await cookies();
    const token = generateChallengeToken();
    const binding = clientBinding(context);
    const expiresAt = new Date(Date.now() + CHALLENGE_SECONDS * 1000);

    const { error } = await admin.from("auth_challenges").insert({
        user_id: userId,
        purpose,
        challenge_hash: keyedLookup("challenge", token),
        source_code_id: sourceCodeId || null,
        bound_ip_hash: hashIdentifier("challenge-ip", binding.ip),
        bound_user_agent_hash: hashIdentifier(
            "challenge-agent",
            binding.userAgent,
        ),
        expires_at: expiresAt.toISOString(),
    });

    if (error) {
        throw new Error(`No se pudo crear el desafío: ${error.message}`);
    }

    cookieStore.set(CHALLENGE_COOKIE, token, {
        httpOnly: true,
        secure: shouldUseSecureCookies(),
        sameSite: "lax",
        path: "/",
        maxAge: CHALLENGE_SECONDS,
    });
}

export async function getAuthChallenge(
    context: RequestContext,
    expectedPurposes: ChallengePurpose[],
) {
    const cookieStore = await cookies();
    const token = cookieStore.get(CHALLENGE_COOKIE)?.value;
    if (!token) {
        return null;
    }

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("auth_challenges")
        .select("*")
        .eq("challenge_hash", keyedLookup("challenge", token))
        .is("consumed_at", null)
        .maybeSingle();

    if (error || !data || !expectedPurposes.includes(data.purpose)) {
        return null;
    }

    if (new Date(data.expires_at).getTime() <= Date.now()) {
        return null;
    }

    const binding = clientBinding(context);
    if (
        data.bound_ip_hash !== hashIdentifier("challenge-ip", binding.ip)
        || data.bound_user_agent_hash
            !== hashIdentifier("challenge-agent", binding.userAgent)
    ) {
        return null;
    }

    return data as {
        id: string;
        user_id: string;
        purpose: ChallengePurpose;
        source_code_id: string | null;
    };
}

export async function consumeAuthChallenge(
    challengeId: string,
    sourceCodeId?: string | null,
) {
    const admin = createAdminClient();
    const cookieStore = await cookies();
    const consumedAt = new Date().toISOString();

    const { error } = await admin
        .from("auth_challenges")
        .update({ consumed_at: consumedAt })
        .eq("id", challengeId)
        .is("consumed_at", null);

    if (error) {
        throw new Error(`No se pudo consumir el desafío: ${error.message}`);
    }

    if (sourceCodeId) {
        await admin
            .from("temporary_access_codes")
            .update({ used_at: consumedAt })
            .eq("id", sourceCodeId)
            .is("used_at", null);
    }

    cookieStore.delete(CHALLENGE_COOKIE);
}
