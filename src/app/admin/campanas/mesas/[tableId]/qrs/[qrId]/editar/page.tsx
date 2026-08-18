import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { TableQrForm } from "@/components/admin/table-qrs/TableQrForm";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type PageProps = {
    params: Promise<{ tableId: string; qrId: string }>;
};

export default async function EditTableQrPage({ params }: PageProps) {
    await requirePageRole(["admin"]);
    const { tableId, qrId } = await params;

    return (
        <div>
            <Header />
            <main className="container campaign-admin-page table-qr-page">
                <div className="users-heading table-qr-page-heading">
                    <div>
                        <p className="auth-eyebrow">Configuración de mesas</p>
                        <h1><Pencil size={28} /> Editar destino del QR</h1>
                        <p>Cambia el contenido sin reemplazar ni volver a imprimir el código físico.</p>
                    </div>
                    <Link className="btn btn-secondary" href={`/admin/campanas/mesas/${tableId}`}>
                        <ArrowLeft size={18} /> Volver a la mesa
                    </Link>
                </div>
                <TableQrForm tableId={tableId} qrId={qrId} />
            </main>
        </div>
    );
}
