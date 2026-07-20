"use client";

import { Loader2 } from "lucide-react";
import { UserRole } from "@/context/AuthContext";
import { useRoleGuard } from "@/hooks/useRoleGuard";

type RoleGuardProps = {
    allowedRoles: readonly UserRole[];
    children: React.ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
    const { authorized } = useRoleGuard(allowedRoles);

    if (!authorized) {
        return (
            <main className="container" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
                <Loader2 aria-label="Validando acceso" className="animate-spin" size={42} />
            </main>
        );
    }

    return children;
}
