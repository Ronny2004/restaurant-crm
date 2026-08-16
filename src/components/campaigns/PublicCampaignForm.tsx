"use client";

import Image from "next/image";
import { useState } from "react";
import {
    CheckCircle2,
    Gift,
    Loader2,
    Mail,
    MapPin,
    MessageSquareText,
    Phone,
    Send,
    ShieldCheck,
    Sparkles,
    UserRound,
    UtensilsCrossed,
} from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { RichCampaignText } from "@/components/campaigns/RichCampaignText";
import {
    CAMPAIGN_SECTOR_LABELS,
    CAMPAIGN_SECTORS,
    type CampaignProduct,
    type CampaignSector,
} from "@/types/campaign";

type PublicCampaign = {
    slug: string;
    title: string;
    description: string;
    reward: string;
};

const EMPTY_FORM = {
    fullName: "",
    email: "",
    phone: "",
    favoriteProductId: "",
    sector: "" as CampaignSector | "",
    otherSector: "",
    suggestions: "",
    consent: false,
};

export function PublicCampaignForm({
    campaign,
    products,
}: {
    campaign: PublicCampaign;
    products: CampaignProduct[];
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [completed, setCompleted] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch(`/api/campaigns/${campaign.slug}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await response.json() as {
                ok: boolean;
                message?: string;
            };
            if (!data.ok) {
                throw new Error(data.message || "No se pudo guardar la respuesta");
            }
            setCompleted(true);
            setMessage(data.message || "Gracias por participar");
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudo enviar el formulario",
            );
        } finally {
            setLoading(false);
        }
    };

    if (completed) {
        return (
            <main className="campaign-public-page campaign-public-success-page">
                <section className="campaign-public-card campaign-success">
                    <div className="campaign-success-logo">
                        <Image
                            src="/assets/logo.webp"
                            alt="Delicias Morán"
                            width={92}
                            height={92}
                            priority
                        />
                    </div>
                    <div className="campaign-success-icon">
                        <CheckCircle2 size={54} />
                    </div>
                    <p className="campaign-brand-kicker">Delicias Morán</p>
                    <h1>¡Tu participación está registrada!</h1>
                    <p>{message}</p>
                    <div className="campaign-public-reward">
                        <Gift size={24} />
                        <span>
                            <small>Estás participando por</small>
                            <strong>{campaign.reward}</strong>
                        </span>
                    </div>
                    <p className="campaign-success-note">
                        Gracias por ayudarnos a conocerte mejor. ¡Mucha suerte!
                    </p>
                </section>
            </main>
        );
    }

    return (
        <main className="campaign-public-page">
            <section className="campaign-public-card">
                <header className="campaign-public-header">
                    <div className="campaign-public-brand">
                        <Image
                            src="/assets/logo.webp"
                            alt="Logotipo de Delicias Morán"
                            width={108}
                            height={108}
                            priority
                        />
                        <div>
                            <p>Restaurante ecuatoriano</p>
                            <strong>Delicias Morán</strong>
                        </div>
                    </div>
                    <div className="campaign-public-heading">
                        <p className="campaign-brand-kicker">
                            <Sparkles size={16} />
                            Queremos conocerte
                        </p>
                        <h1>{campaign.title}</h1>
                        <RichCampaignText text={campaign.description} />
                        <div className="campaign-public-reward">
                            <Gift size={24} />
                            <span>
                                <small>Premio o recompensa</small>
                                <strong>{campaign.reward}</strong>
                            </span>
                        </div>
                    </div>
                </header>

                <div className="campaign-form-intro">
                    <span>Paso único</span>
                    <div>
                        <h2>Cuéntanos un poco sobre ti</h2>
                        <p>Completarlo te tomará menos de un minuto.</p>
                    </div>
                </div>

                <form className="campaign-form campaign-public-form" onSubmit={submit}>
                    <label>
                        <span><UserRound size={18} /> Nombres</span>
                        <input
                            required
                            minLength={2}
                            maxLength={120}
                            autoComplete="name"
                            placeholder="¿Cómo te llamas?"
                            value={form.fullName}
                            onChange={(event) => setForm({
                                ...form,
                                fullName: event.target.value,
                            })}
                        />
                    </label>

                    <div className="campaign-form-grid">
                        <label>
                            <span><Mail size={18} /> Correo electrónico</span>
                            <input
                                required
                                type="email"
                                maxLength={254}
                                autoComplete="email"
                                inputMode="email"
                                placeholder="nombre@correo.com"
                                value={form.email}
                                onChange={(event) => setForm({
                                    ...form,
                                    email: event.target.value,
                                })}
                            />
                        </label>
                        <label>
                            <span><Phone size={18} /> Número de teléfono</span>
                            <input
                                required
                                type="tel"
                                minLength={7}
                                maxLength={30}
                                autoComplete="tel"
                                inputMode="tel"
                                placeholder="099 999 9999"
                                value={form.phone}
                                onChange={(event) => setForm({
                                    ...form,
                                    phone: event.target.value,
                                })}
                            />
                        </label>
                    </div>

                    <label>
                        <span><UtensilsCrossed size={18} /> Tu plato favorito</span>
                        <select
                            required
                            value={form.favoriteProductId}
                            onChange={(event) => setForm({
                                ...form,
                                favoriteProductId: event.target.value,
                            })}
                        >
                            <option value="">Elige el que más disfrutas</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                        {products.length === 0 && (
                            <small>No existen productos en la categoría Platos.</small>
                        )}
                    </label>

                    <label>
                        <span><MapPin size={18} /> Sector donde vives</span>
                        <select
                            required
                            value={form.sector}
                            onChange={(event) => setForm({
                                ...form,
                                sector: event.target.value as CampaignSector,
                                otherSector: "",
                            })}
                        >
                            <option value="">Selecciona tu sector</option>
                            {CAMPAIGN_SECTORS.map((sector) => (
                                <option key={sector} value={sector}>
                                    {CAMPAIGN_SECTOR_LABELS[sector]}
                                </option>
                            ))}
                        </select>
                    </label>

                    {form.sector === "otros" && (
                        <label>
                            <span><MapPin size={18} /> Especifica el sector</span>
                            <input
                                required
                                minLength={2}
                                maxLength={100}
                                placeholder="Escribe el nombre de tu sector"
                                value={form.otherSector}
                                onChange={(event) => setForm({
                                    ...form,
                                    otherSector: event.target.value,
                                })}
                            />
                        </label>
                    )}

                    <label>
                        <span><MessageSquareText size={18} /> Sugerencias</span>
                        <textarea
                            maxLength={1500}
                            rows={5}
                            placeholder="¿Qué te gustaría encontrar o mejorar en Delicias Morán?"
                            value={form.suggestions}
                            onChange={(event) => setForm({
                                ...form,
                                suggestions: event.target.value,
                            })}
                        />
                        <small className="campaign-character-count">
                            {form.suggestions.length}/1500
                        </small>
                    </label>

                    <label className="campaign-consent">
                        <input
                            required
                            type="checkbox"
                            checked={form.consent}
                            onChange={(event) => setForm({
                                ...form,
                                consent: event.target.checked,
                            })}
                        />
                        <span>
                            <ShieldCheck size={19} />
                            Autorizo a Delicias Morán a almacenar estos datos para
                            análisis de clientes y gestión de esta campaña.
                        </span>
                    </label>

                    <AuthMessage message={message} />
                    <button
                        className="btn campaign-submit"
                        disabled={loading || products.length === 0}
                    >
                        {loading
                            ? <Loader2 className="animate-spin" size={20} />
                            : <Send size={20} />}
                        Participar ahora
                    </button>
                    <p className="campaign-privacy-note">
                        Tus datos se utilizan únicamente para esta campaña.
                    </p>
                </form>
            </section>
        </main>
    );
}
