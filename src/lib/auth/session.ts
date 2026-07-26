import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function createSessionForEmail(email: string) {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
    });

    if (error || !data.properties?.hashed_token) {
        throw new Error("No se pudo preparar la sesión del usuario");
    }

    const supabase = await createServerClient();
    const { data: verification, error: verificationError } =
        await supabase.auth.verifyOtp({
            token_hash: data.properties.hashed_token,
            type: "magiclink",
        });

    if (verificationError || !verification.session) {
        throw new Error("No se pudo crear la sesión del usuario");
    }

    return verification.session;
}

export async function resolveLoginEmail(identifier: string) {
    if (identifier.includes("@")) {
        return identifier.trim().toLowerCase();
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_email_by_username", {
        p_username: identifier,
    });

    if (error || typeof data !== "string") {
        return null;
    }

    return data.toLowerCase();
}

export async function signInWithPassword(
    identifier: string,
    password: string,
) {
    const email = await resolveLoginEmail(identifier);
    if (!email) {
        return { email: null, user: null, error: new Error("Invalid credentials") };
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    return {
        email,
        user: data.user,
        error,
    };
}

export async function clearServerSession() {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
}
