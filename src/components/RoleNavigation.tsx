"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, ArrowLeft } from "lucide-react";

export function RoleNavigation() {
    const { profile, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const handleBack = () => {
        router.push("/");
    };

    const handleLogout = async () => {
        await signOut();
    };

    if (!profile) return null;

    // Lógica inteligente: 
    // Si es admin Y no está en la raíz de admin, muestra "Volver"
    // Pero si ya está en /admin o es otro rol, muestra "Cerrar Sesión"
    const isAdminOutsidePanel = profile.role === "admin" && pathname !== "/";

    return (
        <div style={{ display: "flex", gap: "1rem" }}>
            {isAdminOutsidePanel ? (
                <button
                    onClick={handleBack}
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                    <ArrowLeft size={18} />
                    <span>Volver al Panel</span>
                </button>
            ) : (
                <button
                    onClick={handleLogout}
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--danger)" }}
                >
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                </button>
            )}
        </div>
    );
}
