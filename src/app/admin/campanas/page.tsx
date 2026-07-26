import { Megaphone } from "lucide-react";
import { CampaignManagement } from "@/components/admin/CampaignManagement";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
    await requirePageRole(["admin"]);

    return (
        <div>
            <Header />
            <main className="container campaign-admin-page">
                <div className="users-heading">
                    <div>
                        <p className="auth-eyebrow">Análisis de clientes</p>
                        <h1><Megaphone size={30} /> Creación de campañas</h1>
                        <p>
                            Crea formularios públicos, comparte su enlace o QR y
                            consulta las respuestas recibidas.
                        </p>
                    </div>
                </div>
                <CampaignManagement />
            </main>
        </div>
    );
}
