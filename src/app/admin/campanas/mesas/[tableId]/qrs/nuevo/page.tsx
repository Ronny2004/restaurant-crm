import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";
import { TableQrForm } from "@/components/admin/table-qrs/TableQrForm";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type PageProps = {
    params: Promise<{ tableId: string }>;
};

export default async function NewTableQrPage({ params }: PageProps) {
    await requirePageRole(["admin"]);
    const { tableId } = await params;

    return (
        <div>
            <Header />
            <main className="container campaign-admin-page table-qr-page">
                <div className="users-heading table-qr-page-heading">
                    <div>
                        <p className="auth-eyebrow">Configuración de mesas</p>
                        <h1><QrCode size={30} /> Crear QR físico</h1>
                        <p>Elige qué contenido verá el cliente al escanear el código de esta mesa.</p>
                    </div>
                    <Link className="btn btn-secondary" href={`/admin/campanas/mesas/${tableId}`}>
                        <ArrowLeft size={18} /> Volver a la mesa
                    </Link>
                </div>
                <div className="table-qr-step-indicator" aria-label="Progreso">
                    <span className="complete">1. Mesa registrada</span>
                    <span className="active"><QrCode size={18} /> 2. Crear QR físico</span>
                </div>
                <TableQrForm tableId={tableId} />
            </main>
        </div>
    );
}
