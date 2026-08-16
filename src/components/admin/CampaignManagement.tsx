"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
    Archive,
    ArchiveRestore,
    Bot,
    Gift,
    Loader2,
    Megaphone,
    RefreshCw,
    Sparkles,
    Users,
} from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import type { Campaign, CampaignStatus } from "@/types/campaign";

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

export function CampaignManagement() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [createForm, setCreateForm] = useState<CampaignForm>(EMPTY_FORM);
    const [showArchived, setShowArchived] = useState(false);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState("");
    const [aiObjective, setAiObjective] = useState("");
    const [aiAudience, setAiAudience] = useState("");
    const [aiContext, setAiContext] = useState("");
    const [aiIdeas, setAiIdeas] = useState<CampaignIdea[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

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

    useEffect(() => void loadCampaigns(), [loadCampaigns]);

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
            router.push(`/admin/campanas/${data.campaign.id}`);
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudo crear la campaña",
            );
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
                            placeholder="Ej.: conocer mejor a las familias que nos visitan."
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
                            || (aiObjective.trim().length > 0 && aiObjective.trim().length < 10)
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
                        <p>El formulario público conservará la plantilla y enlaces oficiales.</p>
                    </div>
                </div>
                <form className="campaign-form" onSubmit={create}>
                    <label>
                        Título de la campaña
                        <input required minLength={3} maxLength={120} value={createForm.title}
                            onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} />
                    </label>
                    <label>
                        Descripción
                        <textarea required minLength={3} maxLength={1200} rows={5}
                            value={createForm.description}
                            onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} />
                    </label>
                    <label>
                        Premio o recompensa
                        <textarea required minLength={2} maxLength={300} rows={3}
                            value={createForm.reward}
                            onChange={(event) => setCreateForm({ ...createForm, reward: event.target.value })} />
                    </label>
                    <button className="btn btn-primary" disabled={working}>
                        {working ? <Loader2 className="animate-spin" size={20} /> : <Megaphone size={20} />}
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
                        <button type="button" className="btn btn-secondary"
                            onClick={() => setShowArchived((value) => !value)}>
                            {showArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                            {showArchived ? "Volver a campañas" : "Campañas archivadas"}
                        </button>
                        <button type="button" className="btn btn-secondary campaign-refresh"
                            aria-label="Actualizar campañas" onClick={() => void loadCampaigns()} disabled={loading}>
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                <AuthMessage message={message} />
                {loading ? (
                    <div className="campaign-loading"><Loader2 className="animate-spin" size={28} /></div>
                ) : campaigns.length === 0 ? (
                    <p className="campaign-empty">
                        {showArchived ? "No hay campañas archivadas." : "Crea tu primera campaña para obtener un enlace y QR."}
                    </p>
                ) : (
                    <div className="campaign-list">
                        {campaigns.map((campaign) => (
                            <Link key={campaign.id} className="campaign-list-item"
                                href={`/admin/campanas/${campaign.id}`}>
                                <div>
                                    <strong>{campaign.title}</strong>
                                    <span>{campaign.archived_at ? "Archivada" : campaign.status === "active" ? "Activa" : "Cerrada"}</span>
                                </div>
                                <span className="campaign-response-count">
                                    <Users size={16} /> {campaign.response_count || 0}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
