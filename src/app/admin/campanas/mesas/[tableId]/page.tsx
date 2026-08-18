import Link from "next/link";
import { ArrowLeft, Table2 } from "lucide-react";
import { TableQrDetail } from "@/components/admin/table-qrs/TableQrDetail";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type PageProps = {
    params: Promise<{ tableId: string }>;
};

export default async function TableDetailPage({ params }: PageProps) {
    await requirePageRole(["admin"]);
    const { tableId } = await params;

    return (
        <div>
            <Header />
            <main className="container campaign-admin-page table-qr-page">
                <div className="users-heading table-qr-page-heading">
                    <div>
                        <p className="auth-eyebrow">Configuración de mesas</p>
                        <h1><Table2 size={30} /> Administración de mesa</h1>
                        <p>Gestiona el estado, los destinos y los QR físicos de una sola mesa.</p>
                    </div>
                    <Link className="btn btn-secondary" href="/admin/campanas/mesas">
                        <ArrowLeft size={18} /> Volver a mesas
                    </Link>
                </div>
                <TableQrDetail tableId={tableId} />
            </main>
        </div>
    );
}
