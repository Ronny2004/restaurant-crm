"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogOut, ArrowLeft } from "lucide-react";

export function RoleNavigation() {
    const { profile, signOut } = useAuth();
    const router = useRouter();

    const handleBack = () => {
        router.push("/admin");
    };

    const handleLogout = async () => {
        await signOut();
    };

    if (!profile) return null;

    // Si es admin, mostrar botón de Volver
    if (profile.role === "admin") {
        return (
            <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
            >
                <ArrowLeft size={18} />
                Volver al Panel
            </button>
        );
    }

    // Para otros roles, mostrar Cerrar Sesión
    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
        >
            <LogOut size={18} />
            Cerrar Sesión
        </button>
    );
}
