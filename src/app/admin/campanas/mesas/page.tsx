import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";
import { TableQrDashboardView } from "@/components/admin/table-qrs/TableQrDashboardView";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function TableQrConfigurationPage() {
    await requirePageRole(["admin"]);

    return (
        <div>
            <Header />
            <main className="container campaign-admin-page table-qr-page">
                <div className="users-heading table-qr-page-heading">
                    <div>
                        <p className="auth-eyebrow">Demo privado para administradores</p>
                        <h1><QrCode size={30} /> Configuración de mesas</h1>
                        <p>
                            Administra QR físicos permanentes y cambia su destino sin volver a imprimirlos.
                        </p>
                    </div>
                    <Link className="btn btn-secondary" href="/admin/campanas">
                        <ArrowLeft size={18} /> Volver a módulos
                    </Link>
                </div>
                <TableQrDashboardView />
            </main>
        </div>
    );
}
