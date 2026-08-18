import Link from "next/link";
import { ArrowLeft, Plus, QrCode, Table2 } from "lucide-react";
import { NewTableForm } from "@/components/admin/table-qrs/NewTableForm";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function NewTablePage() {
    await requirePageRole(["admin"]);

    return (
        <div>
            <Header />
            <main className="container campaign-admin-page table-qr-page">
                <div className="users-heading table-qr-page-heading">
                    <div>
                        <p className="auth-eyebrow">Configuración de mesas</p>
                        <h1><Plus size={30} /> Nueva mesa</h1>
                        <p>Registra la mesa y continúa directamente con la creación de su primer QR físico.</p>
                    </div>
                    <Link className="btn btn-secondary" href="/admin/campanas/mesas">
                        <ArrowLeft size={18} /> Volver a mesas
                    </Link>
                </div>
                <div className="table-qr-step-indicator" aria-label="Progreso">
                    <span className="active"><Table2 size={18} /> 1. Registrar mesa</span>
                    <span><QrCode size={18} /> 2. Crear QR físico</span>
                </div>
                <NewTableForm />
            </main>
        </div>
    );
}
