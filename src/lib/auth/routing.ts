import type { UserRole } from "@/types/auth";

export function destinationForRole(role: UserRole) {
    switch (role) {
        case "admin":
            return "/";
        case "waiter":
            return "/mesero";
        case "chef":
            return "/cocina";
        case "cashier":
            return "/cajero";
    }
}
