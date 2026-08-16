"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
    BarChart3,
    Check,
    Clipboard,
    Download,
    ExternalLink,
    Link2,
    Loader2,
    Plus,
    Power,
    QrCode,
    RefreshCw,
    Save,
    Table2,
    Trash2,
} from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import type {
    TableQrCode,
    TableQrDashboard,
    TableQrDestinationType,
} from "@/types/table-qr";

type QrForm = {
    tableId: string;
    name: string;
    destinationType: TableQrDestinationType;
    campaignId: string;
    destinationUrl: string;
    isActive: boolean;
};

const EMPTY_QR_FORM: QrForm = {
    tableId: "",
    name: "QR principal",
    destinationType: "campaign",
    campaignId: "",
    destinationUrl: "https://deliciasmoran.vercel.app/",
    isActive: true,
};

function QrDownload({ qr, publicUrl }: { qr: TableQrCode; publicUrl: string }) {
    const [dataUrl, setDataUrl] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        void QRCode.toDataURL(publicUrl, {
            width: 720,
            margin: 2,
            errorCorrectionLevel: "H",
            color: { dark: "#4b2416", light: "#fffaf0" },
        }).then(setDataUrl);
    }, [publicUrl]);

    const copy = async () => {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="table-qr-preview">
            {dataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt={`Código QR ${qr.name}`} />
            )}
            <div>
                <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
                    {copied ? <Check size={17} /> : <Clipboard size={17} />}
                    {copied ? "Copiado" : "Copiar enlace"}
                </button>
                <a
                    className="btn btn-primary"
                    href={dataUrl}
                    download={`${qr.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
                >
                    <Download size={17} /> Descargar QR
                </a>
            </div>
        </div>
    );
}

export function TableQrManagement() {
    const [dashboard, setDashboard] = useState<TableQrDashboard>({ tables: [], campaigns: [] });
    const [tableName, setTableName] = useState("");
    const [qrForm, setQrForm] = useState<QrForm>(EMPTY_QR_FORM);
    const [editingQr, setEditingQr] = useState<TableQrCode | null>(null);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState("");
    const [origin, setOrigin] = useState("");

    useEffect(() => setOrigin(window.location.origin), []);

    const load = useCallback(async () => {
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/admin/table-qrs", { cache: "no-store" });
            const data = await response.json() as {
                ok: boolean;
                dashboard?: TableQrDashboard;
                message?: string;
            };
            if (!data.ok || !data.dashboard) throw new Error(data.message);
            setDashboard(data.dashboard);
            setQrForm((current) => ({
                ...current,
                tableId: current.tableId || data.dashboard?.tables[0]?.id || "",
                campaignId: current.campaignId || data.dashboard?.campaigns[0]?.id || "",
            }));
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
    const totalScans7d = qrCodes.reduce((total, qr) => total + qr.scans_7d, 0);
    const mostScanned = [...qrCodes].sort((a, b) => b.scans_30d - a.scans_30d)[0];

    const createTable = async (event: React.FormEvent) => {
        event.preventDefault();
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch("/api/admin/table-qrs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: tableName }),
            });
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            setTableName("");
            await load();
            setMessage("Mesa registrada. Ahora puedes crear uno o varios QR para ella.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo crear la mesa");
        } finally {
            setWorking(false);
        }
    };

    const saveQr = async (event: React.FormEvent) => {
        event.preventDefault();
        setWorking(true);
        setMessage("");
        try {
            const payload = {
                tableId: editingQr?.restaurant_table_id || qrForm.tableId,
                name: qrForm.name,
                destinationType: qrForm.destinationType,
                campaignId: qrForm.campaignId,
                destinationUrl: qrForm.destinationUrl,
                isActive: qrForm.isActive,
            };
            const response = await fetch(
                editingQr
                    ? `/api/admin/table-qrs/codes/${editingQr.id}`
                    : "/api/admin/table-qrs/codes",
                {
                    method: editingQr ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            setEditingQr(null);
            setQrForm((current) => ({
                ...EMPTY_QR_FORM,
                tableId: current.tableId,
                campaignId: dashboard.campaigns[0]?.id || "",
            }));
            await load();
            setMessage(editingQr ? "QR actualizado sin cambiar su código físico." : "QR creado y listo para descargar.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo guardar el QR");
        } finally {
            setWorking(false);
        }
    };

    const editQr = (qr: TableQrCode) => {
        setEditingQr(qr);
        setQrForm({
            tableId: qr.restaurant_table_id,
            name: qr.name,
            destinationType: qr.destination_type,
            campaignId: qr.campaign_id || dashboard.campaigns[0]?.id || "",
            destinationUrl: qr.destination_url || "https://deliciasmoran.vercel.app/",
            isActive: qr.is_active,
        });
        document.querySelector(".table-qr-form-panel")?.scrollIntoView({ behavior: "smooth" });
    };

    const toggleTable = async (tableId: string, isActive: boolean) => {
        setWorking(true);
        try {
            const response = await fetch(`/api/admin/table-qrs/tables/${tableId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive }),
            });
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo actualizar la mesa");
        } finally {
            setWorking(false);
        }
    };

    const deleteQr = async (qr: TableQrCode) => {
        if (!window.confirm(`¿Eliminar definitivamente el QR "${qr.name}" y sus ${qr.total_scans} escaneo(s)?`)) return;
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/table-qrs/codes/${qr.id}`, { method: "DELETE" });
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            if (editingQr?.id === qr.id) {
                setEditingQr(null);
                setQrForm({ ...EMPTY_QR_FORM, tableId: dashboard.tables[0]?.id || "", campaignId: dashboard.campaigns[0]?.id || "" });
            }
            await load();
            setMessage("QR eliminado definitivamente.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo eliminar el QR");
        } finally {
            setWorking(false);
        }
    };

    const deleteTable = async (table: TableQrDashboard["tables"][number]) => {
        const confirmation = window.prompt(
            `Esta acción eliminará la mesa, sus ${table.qr_codes.length} QR y todos sus escaneos.\n\nEscribe exactamente el nombre para confirmar:\n${table.name}`,
        );
        if (confirmation === null) return;
        if (confirmation.trim() !== table.name) {
            setMessage("El nombre no coincide. No se eliminó la mesa.");
            return;
        }
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/table-qrs/tables/${table.id}`, { method: "DELETE" });
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            if (editingQr && table.qr_codes.some((qr) => qr.id === editingQr.id)) setEditingQr(null);
            const fallbackTableId = dashboard.tables.find((item) => item.id !== table.id)?.id || "";
            setQrForm((current) => current.tableId === table.id
                ? { ...current, tableId: fallbackTableId }
                : current);
            await load();
            setMessage("Mesa y recursos QR eliminados definitivamente.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo eliminar la mesa");
        } finally {
            setWorking(false);
        }
    };

    return (
        <div className="table-qr-admin">
            <section className="table-qr-summary-grid">
                <article><Table2 size={24} /><span>Mesas configuradas</span><strong>{dashboard.tables.length}</strong></article>
                <article><QrCode size={24} /><span>QR activos</span><strong>{qrCodes.filter((qr) => qr.is_active).length}</strong></article>
                <article><BarChart3 size={24} /><span>Visitas últimos 7 días</span><strong>{totalScans7d}</strong></article>
                <article><RefreshCw size={24} /><span>Más visitado en 30 días</span><strong>{mostScanned?.name || "—"}</strong></article>
            </section>

            <AuthMessage message={message} />

            <div className="table-qr-form-grid">
                <section className="glass-panel table-qr-form-panel">
                    <div className="campaign-section-title">
                        <Plus size={22} />
                        <div><h2>Nueva mesa</h2><p>Este catálogo no modifica el flujo de pedidos.</p></div>
                    </div>
                    <form className="campaign-form" onSubmit={createTable}>
                        <label>
                            Nombre o identificación
                            <input
                                required
                                maxLength={80}
                                placeholder="Ej.: Mesa 1"
                                value={tableName}
                                onChange={(event) => setTableName(event.target.value)}
                            />
                        </label>
                        <button className="btn btn-primary" disabled={working}>
                            <Table2 size={18} /> Registrar mesa
                        </button>
                    </form>
                </section>

                <section className="glass-panel table-qr-form-panel">
                    <div className="campaign-section-title">
                        <QrCode size={22} />
                        <div>
                            <h2>{editingQr ? "Editar destino del QR" : "Crear QR físico"}</h2>
                            <p>Puedes mantener varios QR activos para la misma mesa.</p>
                        </div>
                    </div>
                    {dashboard.tables.length === 0 ? (
                        <p className="campaign-empty">Registra una mesa antes de crear su QR.</p>
                    ) : (
                        <form className="campaign-form" onSubmit={saveQr}>
                            <label>
                                Mesa
                                <select
                                    disabled={Boolean(editingQr)}
                                    value={qrForm.tableId}
                                    onChange={(event) => setQrForm({ ...qrForm, tableId: event.target.value })}
                                >
                                    {dashboard.tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}
                                </select>
                            </label>
                            <label>
                                Nombre del QR
                                <input
                                    required
                                    minLength={2}
                                    maxLength={100}
                                    value={qrForm.name}
                                    onChange={(event) => setQrForm({ ...qrForm, name: event.target.value })}
                                />
                            </label>
                            <label>
                                Tipo de destino
                                <select
                                    value={qrForm.destinationType}
                                    onChange={(event) => setQrForm({
                                        ...qrForm,
                                        destinationType: event.target.value as TableQrDestinationType,
                                    })}
                                >
                                    <option value="campaign">Campaña del CRM</option>
                                    <option value="url">Menú o enlace HTTPS</option>
                                </select>
                            </label>
                            {qrForm.destinationType === "campaign" ? (
                                <label>
                                    Campaña
                                    <select
                                        required
                                        value={qrForm.campaignId}
                                        onChange={(event) => setQrForm({ ...qrForm, campaignId: event.target.value })}
                                    >
                                        <option value="">Selecciona una campaña</option>
                                        {dashboard.campaigns.map((campaign) => (
                                            <option key={campaign.id} value={campaign.id}>
                                                {campaign.title} {campaign.status === "closed" ? "(cerrada)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : (
                                <label>
                                    Enlace HTTPS
                                    <input
                                        required
                                        type="url"
                                        maxLength={2048}
                                        placeholder="https://..."
                                        value={qrForm.destinationUrl}
                                        onChange={(event) => setQrForm({ ...qrForm, destinationUrl: event.target.value })}
                                    />
                                </label>
                            )}
                            <label className="table-qr-active-toggle">
                                <input
                                    type="checkbox"
                                    checked={qrForm.isActive}
                                    onChange={(event) => setQrForm({ ...qrForm, isActive: event.target.checked })}
                                />
                                Publicar este QR inmediatamente
                            </label>
                            <div className="campaign-download-actions">
                                {editingQr && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setEditingQr(null);
                                            setQrForm({ ...EMPTY_QR_FORM, tableId: dashboard.tables[0]?.id || "", campaignId: dashboard.campaigns[0]?.id || "" });
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button className="btn btn-primary" disabled={working}>
                                    {working ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {editingQr ? "Guardar destino" : "Crear QR"}
                                </button>
                            </div>
                        </form>
                    )}
                </section>
            </div>

            <section className="glass-panel table-qr-list-panel">
                <div className="campaign-section-title campaign-list-heading">
                    <div><h2>Mesas y QR físicos</h2><p>El código impreso permanece igual aunque cambies el destino.</p></div>
                    <button className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
                        <RefreshCw className={loading ? "animate-spin" : ""} size={18} /> Actualizar
                    </button>
                </div>

                {loading ? (
                    <div className="campaign-loading"><Loader2 className="animate-spin" size={28} /></div>
                ) : dashboard.tables.length === 0 ? (
                    <p className="campaign-empty">Todavía no existen mesas configuradas.</p>
                ) : (
                    <div className="table-qr-table-list">
                        {dashboard.tables.map((table) => (
                            <article className="table-qr-table-card" key={table.id}>
                                <header>
                                    <div><Table2 size={22} /><div><h3>{table.name}</h3><span>{table.qr_codes.length} QR configurado(s)</span></div></div>
                                    <div className="table-qr-table-actions">
                                        <button
                                            type="button"
                                            className={`table-qr-status ${table.is_active ? "active" : "inactive"}`}
                                            onClick={() => void toggleTable(table.id, !table.is_active)}
                                            disabled={working}
                                        >
                                            <Power size={16} /> {table.is_active ? "Mesa activa" : "Mesa pausada"}
                                        </button>
                                        <button type="button" className="btn btn-danger" onClick={() => void deleteTable(table)} disabled={working}>
                                            <Trash2 size={16} /> Eliminar mesa
                                        </button>
                                    </div>
                                </header>

                                {table.qr_codes.length === 0 ? (
                                    <p className="campaign-empty">Esta mesa todavía no tiene códigos QR.</p>
                                ) : (
                                    <div className="table-qr-code-grid">
                                        {table.qr_codes.map((qr) => {
                                            const publicUrl = `${origin}/q/${qr.public_token}`;
                                            return (
                                                <div className={`table-qr-code-card ${qr.is_active ? "active" : "inactive"}`} key={qr.id}>
                                                    <div className="table-qr-code-heading">
                                                        <div>
                                                            <span>{qr.is_active ? "Activo" : "Pausado"}</span>
                                                            <h4>{qr.name}</h4>
                                                        </div>
                                                        <div className="table-qr-code-actions">
                                                            <button className="btn btn-secondary" onClick={() => editQr(qr)}>Editar</button>
                                                            <button className="btn btn-danger" onClick={() => void deleteQr(qr)} disabled={working}>
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
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
