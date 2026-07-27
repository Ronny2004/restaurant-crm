"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
    Archive,
    ArchiveRestore,
    Bot,
    Check,
    Clipboard,
    Download,
    Edit2,
    ExternalLink,
    FileText,
    Gift,
    Link2,
    Loader2,
    Megaphone,
    RefreshCw,
    Save,
    Sparkles,
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

type CampaignIdea = {
    title: string;
    description: string;
    reward: string;
    rationale: string;
};

const EMPTY_FORM: CampaignForm = {
    title: "",
    description: "",
    reward: "",
    status: "active",
};

async function imageToPngDataUrl(source: string) {
    return new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            if (!context) {
                reject(new Error("No se pudo preparar el logotipo"));
                return;
            }
            context.drawImage(image, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        image.onerror = () => reject(new Error("No se pudo cargar el logotipo"));
        image.src = source;
    });
}

export function CampaignManagement() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selected, setSelected] = useState<CampaignDetail | null>(null);
    const [createForm, setCreateForm] = useState<CampaignForm>(EMPTY_FORM);
    const [editForm, setEditForm] = useState<CampaignForm>(EMPTY_FORM);
    const [editing, setEditing] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [pdfWorking, setPdfWorking] = useState(false);
    const [message, setMessage] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [aiObjective, setAiObjective] = useState("");
    const [aiAudience, setAiAudience] = useState("");
    const [aiContext, setAiContext] = useState("");
    const [aiIdeas, setAiIdeas] = useState<CampaignIdea[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

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
            const response = await fetch(
                `/api/admin/campaigns?archived=${showArchived}`,
                { cache: "no-store" },
            );
            const data = await response.json() as {
                ok: boolean;
                campaigns?: Campaign[];
                message?: string;
            };
            if (!data.ok) throw new Error(data.message);
            setCampaigns(data.campaigns || []);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "No se pudieron cargar las campañas",
            );
        } finally {
            setLoading(false);
        }
    }, [showArchived]);

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
        setSelected(null);
        void loadCampaigns();
    }, [loadCampaigns]);

    useEffect(() => {
        if (!publicUrl) {
            setQrDataUrl("");
            return;
        }
        void QRCode.toDataURL(publicUrl, {
            width: 560,
            margin: 2,
            errorCorrectionLevel: "M",
            color: {
                dark: "#4b2416",
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
            setMessage("Campaña creada. El enlace, QR y folleto están listos.");
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
                message?: string;
            };
            if (!data.ok) throw new Error(data.message);
            await Promise.all([loadCampaigns(), openCampaign(selected.id)]);
            setMessage("Campaña actualizada.");
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudo actualizar",
            );
        } finally {
            setWorking(false);
        }
    };

    const toggleArchive = async () => {
        if (!selected) return;
        setWorking(true);
        setMessage("");
        try {
            const archive = !selected.archived_at;
            const response = await fetch(
                `/api/admin/campaigns/${selected.id}/archive`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ archived: archive }),
                },
            );
            const data = await response.json() as {
                ok: boolean;
                message?: string;
            };
            if (!data.ok) throw new Error(data.message);
            setSelected(null);
            await loadCampaigns();
            setMessage(
                archive
                    ? "Campaña archivada y formulario público cerrado."
                    : "Campaña restaurada como cerrada. Actívala cuando esté lista.",
            );
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudo actualizar el archivo",
            );
        } finally {
            setWorking(false);
        }
    };

    const generateIdeas = async () => {
        setAiLoading(true);
        setMessage("");
        setAiIdeas([]);
        try {
            const response = await fetch("/api/admin/campaigns/ideas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    objective: aiObjective,
                    audience: aiAudience,
                    extraContext: aiContext,
                }),
            });
            const data = await response.json() as {
                ok: boolean;
                ideas?: CampaignIdea[];
                message?: string;
            };
            if (!data.ok || !data.ideas) throw new Error(data.message);
            setAiIdeas(data.ideas);
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudieron generar ideas",
            );
        } finally {
            setAiLoading(false);
        }
    };

    const applyIdea = (idea: CampaignIdea) => {
        setCreateForm({
            title: idea.title,
            description: idea.description,
            reward: idea.reward,
            status: "active",
        });
        document.querySelector(".campaign-create-panel")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const copyUrl = async () => {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    const downloadFlyer = async () => {
        if (!selected || !qrDataUrl) return;
        setPdfWorking(true);
        setMessage("");
        try {
            const [{ jsPDF }, logoDataUrl] = await Promise.all([
                import("jspdf"),
                imageToPngDataUrl("/assets/logo.webp"),
            ]);
            const document = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const pageWidth = 210;
            const flyerHeight = 148.5;

            const drawFlyer = (offsetY: number) => {
                const top = offsetY + 7;
                document.setFillColor(255, 249, 235);
                document.roundedRect(7, top, 196, 134.5, 3, 3, "F");

                document.setFillColor(140, 62, 25);
                document.roundedRect(7, top, 196, 31, 3, 3, "F");
                document.addImage(logoDataUrl, "PNG", 12, top + 3, 25, 25);

                document.setTextColor(255, 250, 240);
                document.setFont("helvetica", "bold");
                document.setFontSize(17);
                document.text("DELICIAS MORÁN", 42, top + 12);
                document.setFont("helvetica", "normal");
                document.setFontSize(9);
                document.text("Comida ecuatoriana hecha con cariño", 42, top + 20);

                document.setTextColor(87, 39, 20);
                document.setFont("helvetica", "bold");
                document.setFontSize(18);
                document.text("¡PARTICIPA Y GANA!", 12, top + 43);

                document.setFontSize(14);
                const titleLines = document.splitTextToSize(selected.title, 123);
                document.text(titleLines.slice(0, 2), 12, top + 53);

                document.setFont("helvetica", "normal");
                document.setFontSize(9.5);
                document.setTextColor(79, 65, 55);
                const descriptionLines = document.splitTextToSize(
                    selected.description,
                    123,
                );
                document.text(descriptionLines.slice(0, 4), 12, top + 70);

                document.setFillColor(243, 218, 168);
                document.roundedRect(12, top + 94, 123, 23, 2, 2, "F");
                document.setTextColor(87, 39, 20);
                document.setFont("helvetica", "bold");
                document.setFontSize(9);
                document.text("ESTÁS PARTICIPANDO POR:", 17, top + 102);
                document.setFontSize(11);
                const rewardLines = document.splitTextToSize(selected.reward, 112);
                document.text(rewardLines.slice(0, 2), 17, top + 109);

                document.setFillColor(255, 255, 255);
                document.roundedRect(145, top + 40, 49, 62, 3, 3, "F");
                document.addImage(qrDataUrl, "PNG", 150, top + 44, 39, 39);
                document.setFont("helvetica", "bold");
                document.setFontSize(8);
                document.setTextColor(87, 39, 20);
                document.text("ESCANEA Y PARTICIPA", 169.5, top + 89, {
                    align: "center",
                });
                document.setFont("helvetica", "normal");
                document.setFontSize(7);
                document.text("Solo te tomará un minuto", 169.5, top + 95, {
                    align: "center",
                });

                document.setDrawColor(224, 188, 126);
                document.line(12, top + 124, 198, top + 124);
                document.setFontSize(8);
                document.setTextColor(111, 78, 55);
                document.text(
                    "Gracias por ayudarnos a crear mejores experiencias para ti.",
                    pageWidth / 2,
                    top + 131,
                    { align: "center" },
                );
            };

            drawFlyer(0);
            drawFlyer(flyerHeight);
            document.setDrawColor(155, 118, 87);
            document.setLineDashPattern([2, 2], 0);
            document.line(5, flyerHeight, 205, flyerHeight);
            document.save(`folleto-${selected.slug}.pdf`);
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudo generar el PDF",
            );
        } finally {
            setPdfWorking(false);
        }
    };

    return (
        <div className="campaign-admin-layout">
            <section className="glass-panel campaign-ai-panel">
                <div className="campaign-section-title">
                    <Bot size={25} />
                    <div>
                        <p className="auth-eyebrow">Asistente de ideas</p>
                        <h2>Inspiración para tu próxima campaña</h2>
                        <p>
                            Recibe borradores orientativos de atención al cliente y
                            marketing. Revísalos y adáptalos antes de crear la campaña.
                        </p>
                    </div>
                </div>
                <div className="campaign-ai-fields">
                    <label>
                        Enfoque adicional (opcional)
                        <textarea
                            rows={3}
                            maxLength={600}
                            placeholder="Ej.: conocer mejor a las familias que nos visitan. Si lo dejas vacío, el asistente aplicará la estrategia general."
                            value={aiObjective}
                            onChange={(event) => setAiObjective(event.target.value)}
                        />
                    </label>
                    <label>
                        Público deseado
                        <input
                            maxLength={160}
                            placeholder="Ej.: familias de Calderón y Carapungo"
                            value={aiAudience}
                            onChange={(event) => setAiAudience(event.target.value)}
                        />
                    </label>
                    <label>
                        Condiciones o contexto
                        <input
                            maxLength={500}
                            placeholder="Ej.: premio sencillo, campaña durante agosto"
                            value={aiContext}
                            onChange={(event) => setAiContext(event.target.value)}
                        />
                    </label>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={
                            aiLoading
                            || (
                                aiObjective.trim().length > 0
                                && aiObjective.trim().length < 10
                            )
                        }
                        onClick={() => void generateIdeas()}
                    >
                        {aiLoading
                            ? <Loader2 className="animate-spin" size={19} />
                            : <Sparkles size={19} />}
                        Generar ideas
                    </button>
                </div>
                {aiIdeas.length > 0 && (
                    <div className="campaign-idea-grid">
                        {aiIdeas.map((idea, index) => (
                            <article className="campaign-idea-card" key={`${idea.title}-${index}`}>
                                <span>Idea orientativa {index + 1}</span>
                                <h3>{idea.title}</h3>
                                <p>{idea.description}</p>
                                <div><Gift size={16} /> {idea.reward}</div>
                                <small>{idea.rationale}</small>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => applyIdea(idea)}
                                >
                                    Usar como borrador
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="glass-panel campaign-create-panel">
                <div className="campaign-section-title">
                    <Megaphone size={24} />
                    <div>
                        <h2>Nueva campaña</h2>
                        <p>El formulario público conservará la misma plantilla.</p>
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
                        <h2>{showArchived ? "Campañas archivadas" : "Campañas creadas"}</h2>
                        <p>{campaigns.length} campaña(s)</p>
                    </div>
                    <div className="campaign-list-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowArchived((value) => !value)}
                        >
                            {showArchived
                                ? <ArchiveRestore size={18} />
                                : <Archive size={18} />}
                            {showArchived ? "Volver a campañas" : "Campañas archivadas"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary campaign-refresh"
                            aria-label="Actualizar campañas"
                            onClick={() => void loadCampaigns()}
                            disabled={loading}
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                <AuthMessage message={message} />
                {loading ? (
                    <div className="campaign-loading">
                        <Loader2 className="animate-spin" size={28} />
                    </div>
                ) : campaigns.length === 0 ? (
                    <p className="campaign-empty">
                        {showArchived
                            ? "No hay campañas archivadas."
                            : "Crea tu primera campaña para obtener un enlace y QR."}
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
                                        {campaign.archived_at
                                            ? "Archivada"
                                            : campaign.status === "active"
                                                ? "Activa"
                                                : "Cerrada"}
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
                        <div className="campaign-detail-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setEditing(!editing)}
                            >
                                <Edit2 size={18} />
                                Editar
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => void toggleArchive()}
                                disabled={working}
                            >
                                {selected.archived_at
                                    ? <ArchiveRestore size={18} />
                                    : <Archive size={18} />}
                                {selected.archived_at ? "Restaurar" : "Archivar"}
                            </button>
                        </div>
                    </div>

                    {editing ? (
                        <form className="campaign-form campaign-edit-form" onSubmit={update}>
                            <label>
                                Título
                                <input
                                    required
                                    minLength={3}
                                    maxLength={120}
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
                                    minLength={3}
                                    maxLength={1200}
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
                                    minLength={2}
                                    maxLength={300}
                                    rows={3}
                                    value={editForm.reward}
                                    onChange={(event) => setEditForm({
                                        ...editForm,
                                        reward: event.target.value,
                                    })}
                                />
                            </label>
                            <label>
                                Estado del formulario público
                                <select
                                    value={editForm.status}
                                    disabled={Boolean(selected.archived_at)}
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

                    {!selected.archived_at && (
                        <div className="campaign-share-grid">
                            <div className="campaign-share-info">
                                <h3><Link2 size={19} /> Enlace público</h3>
                                <div className="campaign-url-row">
                                    <input readOnly value={publicUrl} />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => void copyUrl()}
                                    >
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
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={qrDataUrl} alt={`QR de ${selected.title}`} />
                                )}
                                <div className="campaign-download-actions">
                                    <a
                                        className="btn btn-secondary"
                                        href={qrDataUrl}
                                        download={`qr-${selected.slug}.png`}
                                    >
                                        <Download size={18} />
                                        Descargar QR
                                    </a>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        disabled={pdfWorking || !qrDataUrl}
                                        onClick={() => void downloadFlyer()}
                                    >
                                        {pdfWorking
                                            ? <Loader2 className="animate-spin" size={18} />
                                            : <FileText size={18} />}
                                        Descargar PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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
