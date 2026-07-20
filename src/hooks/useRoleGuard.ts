"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/context/AuthContext";

export function useRoleGuard(allowedRoles: readonly UserRole[]) {
    const { profile, loading } = useAuth();
    const router = useRouter();
    const authorized = Boolean(profile && allowedRoles.includes(profile.role));

    useEffect(() => {
        if (!loading && !authorized) {
            router.replace("/login");
        }
    }, [authorized, loading, router]);

    return {
        authorized,
        loading: loading || (!authorized && Boolean(profile)),
        profile,
    };
}
