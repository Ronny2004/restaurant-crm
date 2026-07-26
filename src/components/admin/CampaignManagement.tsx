"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
    Check,
    Clipboard,
    Download,
    Edit2,
    ExternalLink,
    Gift,
    Link2,
    Loader2,
    Megaphone,
    RefreshCw,
    Save,
    Users,
} from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import {
    CAMPAIGN_SECTOR_LABELS,
    type Campaign,
    type CampaignDetail,
    type CampaignStatus,
} from "@/types/campaign";

type CampaignForm = {
    title: string;
    description: string;
    reward: string;
    status: CampaignStatus;
};

const EMPTY_FORM: CampaignForm = {
    title: "",
    description: "",
    reward: "",
    status: "active",
};

export function CampaignManagement() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selected, setSelected] = useState<CampaignDetail | null>(null);
    const [createForm, setCreateForm] = useState<CampaignForm>(EMPTY_FORM);
    const [editForm, setEditForm] = useState<CampaignForm>(EMPTY_FORM);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [copied, setCopied] = useState(false);

    const publicUrl = useMemo(() => {
        if (!selected || typeof window === "undefined") {
            return "";
        }
        return `${window.location.origin}/campanas/${selected.slug}`;
    }, [selected]);

    const loadCampaigns = useCallback(async () => {
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/admin/campaigns", {
                cache: "no-store",
            });
            const data = await response.json() as {
                ok: boolean;
                campaigns?: Campaign[];
                message?: string;
            };
            if (!data.ok) throw new Error(data.message);
            setCampaigns(data.campaigns || []);
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudieron cargar las campañas",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const openCampaign = useCallback(async (id: string) => {
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/campaigns/${id}`, {
                cache: "no-store",
            });
            const data = await response.json() as {
                ok: boolean;
                campaign?: CampaignDetail;
                message?: string;
            };
            if (!data.ok || !data.campaign) throw new Error(data.message);
            setSelected(data.campaign);
            setEditForm({
                title: data.campaign.title,
                description: data.campaign.description,
                reward: data.campaign.reward,
                status: data.campaign.status,
            });
            setEditing(false);
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudo abrir la campaña",
            );
        } finally {
            setWorking(false);
        }
    }, []);

    useEffect(() => {
        void loadCampaigns();
    }, [loadCampaigns]);

    useEffect(() => {
        if (!publicUrl) {
            setQrDataUrl("");
            return;
        }
        void QRCode.toDataURL(publicUrl, {
            width: 320,
            margin: 2,
            errorCorrectionLevel: "M",
            color: {
                dark: "#0f172a",
                light: "#ffffff",
            },
        }).then(setQrDataUrl);
    }, [publicUrl]);

    const create = async (event: React.FormEvent) => {
        event.preventDefault();
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch("/api/admin/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createForm),
            });
            const data = await response.json() as {
                ok: boolean;
                campaign?: Campaign;
                message?: string;
            };
            if (!data.ok || !data.campaign) throw new Error(data.message);
            setCreateForm(EMPTY_FORM);
            await loadCampaigns();
            await openCampaign(data.campaign.id);
            setMessage("Campaña creada. El enlace y el QR están listos.");
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudo crear la campaña",
            );
        } finally {
            setWorking(false);
        }
    };

    const update = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selected) return;
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(
                `/api/admin/campaigns/${selected.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editForm),
                },
            );
            const data = await response.json() as {
                ok: boolean;
                campaign?: Campaign;
                message?: string;
            };
            if (!data.ok) throw new Error(data.message);
            await Promise.all([
                loadCampaigns(),
                openCampaign(selected.id),
            ]);
            setMessage("Campaña actualizada.");
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudo actualizar",
            );
        } finally {
            setWorking(false);
        }
    };

    const copyUrl = async () => {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="campaign-admin-layout">
            <section className="glass-panel campaign-create-panel">
                <div className="campaign-section-title">
                    <Megaphone size={24} />
                    <div>
                        <h2>Nueva campaña</h2>
                        <p>El formulario público siempre conservará la misma plantilla.</p>
                    </div>
                </div>

                <form className="campaign-form" onSubmit={create}>
                    <label>
                        Título de la campaña
                        <input
                            required
                            minLength={3}
                            maxLength={120}
                            value={createForm.title}
                            onChange={(event) => setCreateForm({
                                ...createForm,
                                title: event.target.value,
                            })}
                        />
                    </label>
                    <label>
                        Descripción
                        <textarea
                            required
                            minLength={3}
                            maxLength={1200}
                            rows={5}
                            value={createForm.description}
                            onChange={(event) => setCreateForm({
                                ...createForm,
                                description: event.target.value,
                            })}
                        />
                    </label>
                    <label>
                        Premio o recompensa
                        <textarea
                            required
                            minLength={2}
                            maxLength={300}
                            rows={3}
                            value={createForm.reward}
                            onChange={(event) => setCreateForm({
                                ...createForm,
                                reward: event.target.value,
                            })}
                        />
                    </label>
                    <button className="btn btn-primary" disabled={working}>
                        {working
                            ? <Loader2 className="animate-spin" size={20} />
                            : <Megaphone size={20} />}
                        Crear campaña
                    </button>
                </form>
            </section>

            <section className="glass-panel campaign-list-panel">
                <div className="campaign-section-title campaign-list-heading">
                    <div>
                        <h2>Campañas creadas</h2>
                        <p>{campaigns.length} campaña(s)</p>
                    </div>
                    <button
                        className="btn btn-secondary"
                        onClick={() => void loadCampaigns()}
                        disabled={loading}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                <AuthMessage message={message} />
                {loading ? (
                    <div className="campaign-loading">
                        <Loader2 className="animate-spin" size={28} />
                    </div>
                ) : campaigns.length === 0 ? (
                    <p className="campaign-empty">
                        Crea tu primera campaña para obtener un enlace y QR.
                    </p>
                ) : (
                    <div className="campaign-list">
                        {campaigns.map((campaign) => (
                            <button
                                key={campaign.id}
                                className={`campaign-list-item ${
                                    selected?.id === campaign.id ? "active" : ""
                                }`}
                                onClick={() => void openCampaign(campaign.id)}
                            >
                                <div>
                                    <strong>{campaign.title}</strong>
                                    <span>
                                        {campaign.status === "active" ? "Activa" : "Cerrada"}
                                    </span>
                                </div>
                                <span className="campaign-response-count">
                                    <Users size={16} />
                                    {campaign.response_count || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {selected && (
                <section className="glass-panel campaign-detail-panel">
                    <div className="campaign-detail-heading">
                        <div>
                            <p className="auth-eyebrow">Campaña seleccionada</p>
                            <h2>{selected.title}</h2>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setEditing(!editing)}
                        >
                            <Edit2 size={18} />
                            Editar
                        </button>
                    </div>

                    {editing ? (
                        <form className="campaign-form campaign-edit-form" onSubmit={update}>
                            <label>
                                Título
                                <input
                                    required
                                    value={editForm.title}
                                    onChange={(event) => setEditForm({
                                        ...editForm,
                                        title: event.target.value,
                                    })}
                                />
                            </label>
                            <label>
                                Descripción
                                <textarea
                                    required
                                    rows={4}
                                    value={editForm.description}
                                    onChange={(event) => setEditForm({
                                        ...editForm,
                                        description: event.target.value,
                                    })}
                                />
                            </label>
                            <label>
                                Premio o recompensa
                                <textarea
                                    required
                                    rows={3}
                                    value={editForm.reward}
                                    onChange={(event) => setEditForm({
                                        ...editForm,
                                        reward: event.target.value,
                                    })}
                                />
                            </label>
                            <label>
                                Estado
                                <select
                                    value={editForm.status}
                                    onChange={(event) => setEditForm({
                                        ...editForm,
                                        status: event.target.value as CampaignStatus,
                                    })}
                                >
                                    <option value="active">Activa</option>
                                    <option value="closed">Cerrada</option>
                                </select>
                            </label>
                            <button className="btn btn-primary" disabled={working}>
                                <Save size={18} />
                                Guardar cambios
                            </button>
                        </form>
                    ) : (
                        <>
                            <p className="campaign-detail-description">
                                {selected.description}
                            </p>
                            <div className="campaign-reward">
                                <Gift size={20} />
                                <span><strong>Recompensa:</strong> {selected.reward}</span>
                            </div>
                        </>
                    )}

                    <div className="campaign-share-grid">
                        <div className="campaign-share-info">
                            <h3><Link2 size={19} /> Enlace público</h3>
                            <div className="campaign-url-row">
                                <input readOnly value={publicUrl} />
                                <button className="btn btn-secondary" onClick={copyUrl}>
                                    {copied ? <Check size={18} /> : <Clipboard size={18} />}
                                    {copied ? "Copiado" : "Copiar"}
                                </button>
                            </div>
                            <a
                                className="btn btn-secondary"
                                href={publicUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink size={18} />
                                Abrir formulario
                            </a>
                        </div>

                        <div className="campaign-qr">
                            {qrDataUrl && (
                                // El QR es generado localmente como data URL.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={qrDataUrl} alt={`QR de ${selected.title}`} />
                            )}
                            <a
                                className="btn btn-secondary"
                                href={qrDataUrl}
                                download={`qr-${selected.slug}.png`}
                            >
                                <Download size={18} />
                                Descargar QR
                            </a>
                        </div>
                    </div>

                    <div className="campaign-responses">
                        <h3>
                            <Users size={20} />
                            Respuestas ({selected.responses.length})
                        </h3>
                        {selected.responses.length === 0 ? (
                            <p className="campaign-empty">Todavía no hay respuestas.</p>
                        ) : (
                            <div className="campaign-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Contacto</th>
                                            <th>Plato</th>
                                            <th>Sector</th>
                                            <th>Sugerencias</th>
                                            <th>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selected.responses.map((response) => (
                                            <tr key={response.id}>
                                                <td>{response.full_name}</td>
                                                <td>
                                                    {response.email}
                                                    <br />
                                                    <small>{response.phone}</small>
                                                </td>
                                                <td>{response.favorite_product_name}</td>
                                                <td>
                                                    {response.sector === "otros"
                                                        ? response.other_sector
                                                        : CAMPAIGN_SECTOR_LABELS[response.sector]}
                                                </td>
                                                <td>{response.suggestions || "—"}</td>
                                                <td>
                                                    {new Date(response.created_at).toLocaleString("es-EC")}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {working && !selected && (
                <div className="campaign-floating-loader">
                    <Loader2 className="animate-spin" size={24} />
                </div>
            )}
        </div>
    );
}
