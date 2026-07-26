import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SecuritySettings } from "@/components/auth/SecuritySettings";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
    const profile = await requireActiveProfile();
    if (!profile) redirect("/login");

    return (
        <main className="container security-page">
            <div className="security-heading">
                <div>
                    <p className="auth-eyebrow">Perfil</p>
                    <h1>Seguridad de la cuenta</h1>
                    <p>
                        Actualiza tus credenciales de acceso. El administrador no
                        puede consultar ni restablecer tu contraseña.
                    </p>
                </div>
                <Link className="btn btn-secondary" href="/">
                    <ArrowLeft size={18} /> Volver
                </Link>
            </div>
            <SecuritySettings isAdmin={profile.role === "admin"} />
        </main>
    );
}
