import Link from "next/link";
import { ArrowRight, Bot, Megaphone, QrCode } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
    await requirePageRole(["admin"]);
    return (
        <div>
            <Header />
            <main className="container campaign-admin-page campaign-module-hub">
                <div className="users-heading">
                    <div>
                        <p className="auth-eyebrow">Análisis de clientes</p>
                        <h1><Megaphone size={30} /> Creación de campañas</h1>
                        <p>Elige la herramienta que deseas utilizar.</p>
                    </div>
                </div>
                <div className="campaign-module-options">
                    <Link className="glass-panel campaign-module-option" href="/admin/campanas/gestion">
                        <span className="campaign-module-number">1</span>
                        <div className="campaign-module-icon"><Bot size={34} /></div>
                        <div>
                            <p className="auth-eyebrow">Producción</p>
                            <h2>Creación de campañas con asistente</h2>
                            <p>Crea formularios públicos, genera ideas, comparte enlaces o QR y consulta las respuestas.</p>
                        </div>
                        <span className="campaign-module-action">Abrir campañas <ArrowRight size={18} /></span>
                    </Link>
                    <Link className="glass-panel campaign-module-option" href="/admin/campanas/mesas">
                        <span className="campaign-module-number">2</span>
                        <div className="campaign-module-icon"><QrCode size={34} /></div>
                        <div>
                            <p className="auth-eyebrow">Administración de QR</p>
                            <h2>Configuración de mesas</h2>
                            <p>Administra QR físicos permanentes por mesa y cambia sus destinos desde el CRM.</p>
                        </div>
                        <span className="campaign-module-action">Abrir configuración <ArrowRight size={18} /></span>
                    </Link>
                </div>
            </main>
        </div>
    );
}
