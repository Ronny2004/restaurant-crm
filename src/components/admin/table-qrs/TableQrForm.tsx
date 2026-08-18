"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, QrCode, Save, Table2 } from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { fetchTableQrDashboard, readApiPayload } from "@/components/admin/table-qrs/client";
import type {
    TableQrDashboard,
    TableQrDestinationType,
} from "@/types/table-qr";

type QrFormState = {
    name: string;
    destinationType: TableQrDestinationType;
    campaignId: string;
    destinationUrl: string;
    isActive: boolean;
};

const EMPTY_FORM: QrFormState = {
    name: "QR principal",
    destinationType: "campaign",
    campaignId: "",
    destinationUrl: "https://deliciasmoran.vercel.app/",
    isActive: true,
};

export function TableQrForm({ tableId, qrId }: { tableId: string; qrId?: string }) {
    const router = useRouter();
    const [dashboard, setDashboard] = useState<TableQrDashboard>({ tables: [], campaigns: [] });
    const [form, setForm] = useState<QrFormState>(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setMessage("");
        try {
            const result = await fetchTableQrDashboard();
            setDashboard(result);
            const table = result.tables.find((item) => item.id === tableId);
            if (!table) throw new Error("La mesa ya no está disponible");

            if (qrId) {
                const qr = table.qr_codes.find((item) => item.id === qrId);
                if (!qr) throw new Error("El código QR ya no está disponible");
                setForm({
                    name: qr.name,
                    destinationType: qr.destination_type,
                    campaignId: qr.campaign_id || result.campaigns[0]?.id || "",
                    destinationUrl: qr.destination_url || "https://deliciasmoran.vercel.app/",
                    isActive: qr.is_active,
                });
            } else {
                setForm({
                    ...EMPTY_FORM,
                    destinationType: result.campaigns.length > 0 ? "campaign" : "url",
                    campaignId: result.campaigns[0]?.id || "",
                });
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo preparar el formulario");
        } finally {
            setLoading(false);
        }
    }, [qrId, tableId]);

    useEffect(() => void load(), [load]);

    const table = useMemo(
        () => dashboard.tables.find((item) => item.id === tableId),
        [dashboard.tables, tableId],
    );

    const saveQr = async (event: React.FormEvent) => {
        event.preventDefault();
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(
                qrId ? `/api/admin/table-qrs/codes/${qrId}` : "/api/admin/table-qrs/codes",
                {
                    method: qrId ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tableId,
                        name: form.name,
                        destinationType: form.destinationType,
                        campaignId: form.campaignId,
                        destinationUrl: form.destinationUrl,
                        isActive: form.isActive,
                    }),
                },
            );
            await readApiPayload<Record<string, never>>(response);
            router.push(`/admin/campanas/mesas/${tableId}`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo guardar el QR");
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
                <AuthMessage message={message} />
                <Link className="btn btn-secondary" href="/admin/campanas/mesas">
                    <ArrowLeft size={18} /> Volver a mesas
                </Link>
            </section>
        );
    }

    return (
        <div className="table-qr-form-layout">
            <aside className="glass-panel table-qr-context-card">
                <span className="table-qr-table-icon"><Table2 size={25} /></span>
                <p className="auth-eyebrow">Mesa seleccionada</p>
                <h2>{table.name}</h2>
                <p>
                    El QR físico siempre abrirá una dirección estable del CRM. Puedes cambiar su contenido después sin reimprimirlo.
                </p>
                <ul>
                    <li>Una campaña creada en el CRM.</li>
                    <li>El menú o cualquier enlace HTTPS.</li>
                    <li>Varios QR activos para la misma mesa.</li>
                </ul>
            </aside>

            <section className="glass-panel table-qr-form-panel table-qr-form-shell">
                <div className="table-qr-form-intro">
                    <span><QrCode size={25} /></span>
                    <div>
                        <p className="auth-eyebrow">{qrId ? "Destino administrable" : "Paso 2 de 2"}</p>
                        <h2>{qrId ? "Editar destino del QR" : "Crear QR físico"}</h2>
                        <p>{qrId ? "El código impreso no cambiará." : "Configura el primer destino para esta mesa."}</p>
                    </div>
                </div>

                <AuthMessage message={message} />

                <form className="campaign-form" onSubmit={saveQr}>
                    <label>
                        Nombre del QR
                        <input
                            required
                            minLength={2}
                            maxLength={100}
                            value={form.name}
                            onChange={(event) => setForm({ ...form, name: event.target.value })}
                        />
                    </label>
                    <label>
                        Tipo de destino
                        <select
                            value={form.destinationType}
                            onChange={(event) => setForm({
                                ...form,
                                destinationType: event.target.value as TableQrDestinationType,
                            })}
                        >
                            <option value="campaign" disabled={dashboard.campaigns.length === 0}>Campaña del CRM</option>
                            <option value="url">Menú o enlace HTTPS</option>
                        </select>
                    </label>
                    {form.destinationType === "campaign" ? (
                        <label>
                            Campaña
                            <select
                                required
                                value={form.campaignId}
                                onChange={(event) => setForm({ ...form, campaignId: event.target.value })}
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
                                value={form.destinationUrl}
                                onChange={(event) => setForm({ ...form, destinationUrl: event.target.value })}
                            />
                        </label>
                    )}
                    <label className="table-qr-active-toggle">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                        />
                        Publicar este QR inmediatamente
                    </label>
                    <div className="campaign-download-actions table-qr-form-actions">
                        <Link className="btn btn-secondary" href={`/admin/campanas/mesas/${table.id}`}>
                            <ArrowLeft size={18} /> Cancelar
                        </Link>
                        <button className="btn btn-primary" disabled={working}>
                            {working ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {qrId ? "Guardar destino" : "Crear QR"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
