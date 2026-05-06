"use client";

import { useAuth } from "@/context/AuthContext";
import { WaiterProfile } from "./Waiter/WaiterProfile";
import { AdminProfile } from "./Admin/AdminProfile";
import { ChefProfile } from "./Chef/ChefProfile";
import { CashierProfile } from "./Cashier/CashierProfile";

export default function ProfileDashboardPage() {
    const { profile } = useAuth();

    if (!profile) return null;

    // Semáforo de roles
    switch (profile.role) {
        case 'waiter':
            return <WaiterProfile profile={profile} />;
        case 'admin':
            return <AdminProfile profile={profile} />;
        case 'chef':
            return <ChefProfile profile={profile} />;
        case 'cashier':
            return <CashierProfile profile={profile} />;
        default:
            return (
                <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                    <div>
                        <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#ef4444" }}>Rol no reconocido</h2>
                        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Contacta al administrador del sistema.</p>
                    </div>
                </div>
            );
    }
}