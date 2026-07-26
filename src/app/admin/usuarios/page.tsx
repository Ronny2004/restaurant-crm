import { Users } from "lucide-react";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
    const profile = await requirePageRole(["admin"]);

    return (
        <div>
            <Header />
            <main className="container users-page">
                <div className="users-heading">
                    <div>
                        <p className="auth-eyebrow">Administración</p>
                        <h1><Users size={30} /> Usuarios</h1>
                        <p>
                            Crea, actualiza, activa o desactiva cuentas y administra
                            sus roles. Las cuentas no pueden eliminarse.
                        </p>
                    </div>
                </div>
                <UsersManagement currentUserId={profile.id} />
            </main>
        </div>
    );
}
