import "server-only";

import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { AppProfile, UserRole } from "@/types/auth";

export async function getCurrentProfile() {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return null;
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return data as AppProfile;
}

export async function requireActiveProfile(allowedRoles?: readonly UserRole[]) {
    const profile = await getCurrentProfile();

    if (
        !profile
        || profile.account_status !== "active"
        || (allowedRoles && !allowedRoles.includes(profile.role))
    ) {
        return null;
    }

    return profile;
}

export async function requirePageRole(allowedRoles: readonly UserRole[]) {
    const profile = await requireActiveProfile(allowedRoles);
    if (!profile) {
        redirect("/login");
    }
    return profile;
}
