import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppProfile } from "@/types/auth";

export async function getProfileById(userId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return data as AppProfile;
}

export async function getActiveProfileByEmail(email: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("profiles")
        .select("*")
        .ilike("email", email)
        .eq("account_status", "active")
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return data as AppProfile;
}
