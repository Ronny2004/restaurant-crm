"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    ExternalLink,
    Link2,
    Loader2,
    Plus,
    Power,
    QrCode,
    RefreshCw,
    Table2,
    Trash2,
} from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { fetchTableQrDashboard, readApiPayload } from "@/components/admin/table-qrs/client";
import { QrDownload } from "@/components/admin/table-qrs/QrDownload";
import type { RestaurantTableConfig, TableQrDashboard } from "@/types/table-qr";

const EMPTY_DASHBOARD: TableQrDashboard = { tables: [], campaigns: [] };

export function TableQrDetail({ tableId }: { tableId: string }) {
    const router = useRouter();
    const [dashboard, setDashboard] = useState<TableQrDashboard>(EMPTY_DASHBOARD);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState("");
    const [origin, setOrigin] = useState("");

    useEffect(() => setOrigin(window.location.origin), []);

    const load = useCallback(async () => {
        setLoading(true);
        setMessage("");
        try {
            setDashboard(await fetchTableQrDashboard());
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo cargar la mesa");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => void load(), [load]);

    const table = useMemo(
        () => dashboard.tables.find((item) => item.id === tableId),
        [dashboard.tables, tableId],
    );

    const toggleTable = async () => {
        if (!table) return;
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/table-qrs/tables/${table.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !table.is_active }),
            });
            await readApiPayload<Record<string, never>>(response);
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo actualizar la mesa");
        } finally {
            setWorking(false);
        }
    };

    const deleteQr = async (qrId: string, qrName: string, scans: number) => {
        if (!window.confirm(`¿Eliminar definitivamente el QR "${qrName}" y sus ${scans} escaneo(s)?`)) return;
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/table-qrs/codes/${qrId}`, { method: "DELETE" });
            await readApiPayload<Record<string, never>>(response);
            await load();
            setMessage("QR eliminado definitivamente.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo eliminar el QR");
        } finally {
            setWorking(false);
        }
    };

    const deleteTable = async (currentTable: RestaurantTableConfig) => {
        const confirmation = window.prompt(
            `Esta acción eliminará la mesa, sus ${currentTable.qr_codes.length} QR y todos sus escaneos.\n\nEscribe exactamente el nombre para confirmar:\n${currentTable.name}`,
        );
        if (confirmation === null) return;
        if (confirmation.trim() !== currentTable.name) {
            setMessage("El nombre no coincide. No se eliminó la mesa.");
            return;
        }

        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/table-qrs/tables/${currentTable.id}`, { method: "DELETE" });
            await readApiPayload<Record<string, never>>(response);
            router.push("/admin/campanas/mesas");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo eliminar la mesa");
            setWorking(false);
        }
    };

    if (loading) {
        return <div className="campaign-loading"><Loader2 className="animate-spin" size={30} /></div>;
    }

    if (!table) {
        return (
            <section className="glass-panel table-qr-form-panel table-qr-empty-state">
                <Table2 size={34} />
                <h2>Mesa no disponible</h2>
                <p>La mesa fue eliminada o ya no está disponible.</p>
                <Link className="btn btn-secondary" href="/admin/campanas/mesas">
                    <ArrowLeft size={18} /> Volver a mesas
                </Link>
            </section>
        );
    }

    const totalScans = table.qr_codes.reduce((sum, qr) => sum + qr.total_scans, 0);
    const scans7d = table.qr_codes.reduce((sum, qr) => sum + qr.scans_7d, 0);

    return (
        <div className="table-qr-admin">
            <AuthMessage message={message} />

            <section className="glass-panel table-qr-detail-hero">
                <div>
                    <span className="table-qr-table-icon"><Table2 size={25} /></span>
                    <div>
                        <p className="auth-eyebrow">Mesa seleccionada</p>
                        <h2>{table.name}</h2>
                        <p>{table.qr_codes.length} QR configurado(s) · {totalScans} visitas totales</p>
                    </div>
                </div>
                <div className="table-qr-table-actions">
                    <button
                        type="button"
                        className={`table-qr-status ${table.is_active ? "active" : "inactive"}`}
                        onClick={() => void toggleTable()}
                        disabled={working}
                    >
                        <Power size={16} /> {table.is_active ? "Mesa activa" : "Mesa pausada"}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => void deleteTable(table)} disabled={working}>
                        <Trash2 size={16} /> Eliminar mesa
                    </button>
                </div>
            </section>

            <section className="table-qr-summary-grid table-qr-detail-summary">
                <article><QrCode size={24} /><span>QR configurados</span><strong>{table.qr_codes.length}</strong></article>
                <article><Power size={24} /><span>QR activos</span><strong>{table.qr_codes.filter((qr) => qr.is_active).length}</strong></article>
                <article><RefreshCw size={24} /><span>Visitas últimos 7 días</span><strong>{scans7d}</strong></article>
            </section>

            <section className="glass-panel table-qr-list-panel">
                <div className="campaign-section-title campaign-list-heading table-qr-dashboard-heading">
                    <div>
                        <h2>QR físicos de {table.name}</h2>
                        <p>El código impreso permanece igual aunque cambies su destino.</p>
                    </div>
                    <div className="table-qr-dashboard-heading-actions">
                        <button className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
                            <RefreshCw size={18} /> Actualizar
                        </button>
                        <Link className="btn btn-primary" href={`/admin/campanas/mesas/${table.id}/qrs/nuevo`}>
                            <Plus size={18} /> Crear QR físico
                        </Link>
                    </div>
                </div>

                {table.qr_codes.length === 0 ? (
                    <div className="table-qr-empty-state">
                        <QrCode size={34} />
                        <h3>Esta mesa todavía no tiene códigos QR</h3>
                        <p>Crea su primer código permanente y elige la campaña o enlace de destino.</p>
                        <Link className="btn btn-primary" href={`/admin/campanas/mesas/${table.id}/qrs/nuevo`}>
                            <Plus size={18} /> Crear primer QR
                        </Link>
                    </div>
                ) : (
                    <div className="table-qr-code-grid table-qr-detail-code-grid">
                        {table.qr_codes.map((qr) => {
                            const publicUrl = `${origin}/q/${qr.public_token}`;
                            return (
                                <article className={`table-qr-code-card ${qr.is_active ? "active" : "inactive"}`} key={qr.id}>
                                    <div className="table-qr-code-heading">
                                        <div>
                                            <span>{qr.is_active ? "Activo" : "Pausado"}</span>
                                            <h3>{qr.name}</h3>
                                        </div>
                                        <div className="table-qr-code-actions">
                                            <Link className="btn btn-secondary" href={`/admin/campanas/mesas/${table.id}/qrs/${qr.id}/editar`}>
                                                Editar
                                            </Link>
                                            <button className="btn btn-danger" onClick={() => void deleteQr(qr.id, qr.name, qr.total_scans)} disabled={working}>
                                                <Trash2 size={16} /> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                    <p className="table-qr-destination">
                                        <Link2 size={16} />
                                        {qr.destination_type === "campaign"
                                            ? qr.campaign?.title || "Campaña no disponible"
                                            : qr.destination_url}
                                    </p>
                                    <div className="table-qr-metrics">
                                        <span><strong>{qr.scans_7d}</strong> 7 días</span>
                                        <span><strong>{qr.scans_30d}</strong> 30 días</span>
                                        <span><strong>{qr.total_scans}</strong> total</span>
                                    </div>
                                    <small>
                                        Última visita: {qr.last_scanned_at
                                            ? new Date(qr.last_scanned_at).toLocaleString("es-EC")
                                            : "sin visitas"}
                                    </small>
                                    {origin && <QrDownload qr={qr} publicUrl={publicUrl} />}
                                    <a className="table-qr-test-link" href={publicUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink size={15} /> Probar destino
                                    </a>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
