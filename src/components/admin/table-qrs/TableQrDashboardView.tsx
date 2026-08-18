"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    BarChart3,
    Loader2,
    Plus,
    QrCode,
    RefreshCw,
    Table2,
} from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { fetchTableQrDashboard } from "@/components/admin/table-qrs/client";
import type { TableQrDashboard } from "@/types/table-qr";

const EMPTY_DASHBOARD: TableQrDashboard = { tables: [], campaigns: [] };

export function TableQrDashboardView() {
    const [dashboard, setDashboard] = useState<TableQrDashboard>(EMPTY_DASHBOARD);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setMessage("");
        try {
            setDashboard(await fetchTableQrDashboard());
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => void load(), [load]);

    const qrCodes = useMemo(
        () => dashboard.tables.flatMap((table) => table.qr_codes),
        [dashboard.tables],
    );
    const activeQrCount = qrCodes.filter((qr) => qr.is_active).length;
    const totalScans7d = qrCodes.reduce((total, qr) => total + qr.scans_7d, 0);
    const mostScanned = [...qrCodes].sort((a, b) => b.scans_30d - a.scans_30d)[0];

    return (
        <div className="table-qr-admin">
            <section className="table-qr-summary-grid" aria-label="Resumen de configuración de mesas">
                <article><Table2 size={24} /><span>Mesas configuradas</span><strong>{dashboard.tables.length}</strong></article>
                <article><QrCode size={24} /><span>QR activos</span><strong>{activeQrCount}</strong></article>
                <article><BarChart3 size={24} /><span>Visitas últimos 7 días</span><strong>{totalScans7d}</strong></article>
                <article><RefreshCw size={24} /><span>Más visitado en 30 días</span><strong>{mostScanned?.name || "—"}</strong></article>
            </section>

            <AuthMessage message={message} />

            <section className="glass-panel table-qr-list-panel">
                <div className="campaign-section-title campaign-list-heading table-qr-dashboard-heading">
                    <div>
                        <h2>Mesas existentes</h2>
                        <p>Consulta el estado de cada mesa y entra a administrar sus códigos QR.</p>
                    </div>
                    <div className="table-qr-dashboard-heading-actions">
                        <button className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={loading ? "animate-spin" : ""} size={18} /> Actualizar
                        </button>
                        <Link className="btn btn-primary" href="/admin/campanas/mesas/nueva">
                            <Plus size={18} /> Nueva mesa
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="campaign-loading"><Loader2 className="animate-spin" size={28} /></div>
                ) : dashboard.tables.length === 0 ? (
                    <div className="table-qr-empty-state">
                        <Table2 size={34} />
                        <h3>Todavía no existen mesas configuradas</h3>
                        <p>Registra la primera mesa y después crea su QR físico permanente.</p>
                        <Link className="btn btn-primary" href="/admin/campanas/mesas/nueva">
                            <Plus size={18} /> Registrar primera mesa
                        </Link>
                    </div>
                ) : (
                    <div className="table-qr-table-list table-qr-dashboard-list">
                        {dashboard.tables.map((table) => {
                            const totalScans = table.qr_codes.reduce((sum, qr) => sum + qr.total_scans, 0);
                            const activeCodes = table.qr_codes.filter((qr) => qr.is_active).length;
                            const latestScan = table.qr_codes
                                .map((qr) => qr.last_scanned_at)
                                .filter((value): value is string => Boolean(value))
                                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

                            return (
                                <article className="table-qr-table-card table-qr-dashboard-card" key={table.id}>
                                    <header>
                                        <div>
                                            <span className="table-qr-table-icon"><Table2 size={22} /></span>
                                            <div>
                                                <h3>{table.name}</h3>
                                                <span className={table.is_active ? "table-state-active" : "table-state-inactive"}>
                                                    {table.is_active ? "Mesa activa" : "Mesa pausada"}
                                                </span>
                                            </div>
                                        </div>
                                        <Link className="btn btn-secondary" href={`/admin/campanas/mesas/${table.id}`}>
                                            Administrar <ArrowRight size={17} />
                                        </Link>
                                    </header>
                                    <div className="table-qr-table-overview">
                                        <span><strong>{table.qr_codes.length}</strong> QR configurados</span>
                                        <span><strong>{activeCodes}</strong> QR activos</span>
                                        <span><strong>{totalScans}</strong> visitas totales</span>
                                        <span>
                                            <strong>{latestScan ? new Date(latestScan).toLocaleDateString("es-EC") : "—"}</strong>
                                            última visita
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
