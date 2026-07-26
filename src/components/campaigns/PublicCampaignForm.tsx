"use client";

import { useState } from "react";
import { CheckCircle2, Gift, Loader2, Send } from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
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
            <main className="campaign-public-page">
                <section className="campaign-public-card campaign-success">
                    <CheckCircle2 size={62} />
                    <h1>¡Respuesta registrada!</h1>
                    <p>{message}</p>
                    <div className="campaign-reward">
                        <Gift size={22} />
                        <span><strong>Estás participando por:</strong> {campaign.reward}</span>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="campaign-public-page">
            <section className="campaign-public-card">
                <header className="campaign-public-header">
                    <p className="auth-eyebrow">Delicias Morán</p>
                    <h1>{campaign.title}</h1>
                    <p>{campaign.description}</p>
                    <div className="campaign-reward">
                        <Gift size={22} />
                        <span><strong>Premio o recompensa:</strong> {campaign.reward}</span>
                    </div>
                </header>

                <form className="campaign-form" onSubmit={submit}>
                    <label>
                        Nombres
                        <input
                            required
                            minLength={2}
                            maxLength={120}
                            autoComplete="name"
                            value={form.fullName}
                            onChange={(event) => setForm({
                                ...form,
                                fullName: event.target.value,
                            })}
                        />
                    </label>

                    <div className="campaign-form-grid">
                        <label>
                            Correo electrónico
                            <input
                                required
                                type="email"
                                maxLength={254}
                                autoComplete="email"
                                value={form.email}
                                onChange={(event) => setForm({
                                    ...form,
                                    email: event.target.value,
                                })}
                            />
                        </label>
                        <label>
                            Número de teléfono
                            <input
                                required
                                type="tel"
                                minLength={7}
                                maxLength={30}
                                autoComplete="tel"
                                value={form.phone}
                                onChange={(event) => setForm({
                                    ...form,
                                    phone: event.target.value,
                                })}
                            />
                        </label>
                    </div>

                    <label>
                        Plato favorito
                        <select
                            required
                            value={form.favoriteProductId}
                            onChange={(event) => setForm({
                                ...form,
                                favoriteProductId: event.target.value,
                            })}
                        >
                            <option value="">Selecciona un plato</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                        {products.length === 0 && (
                            <small>
                                No existen productos en la categoría Platos.
                            </small>
                        )}
                    </label>

                    <label>
                        Sector donde vive
                        <select
                            required
                            value={form.sector}
                            onChange={(event) => setForm({
                                ...form,
                                sector: event.target.value as CampaignSector,
                                otherSector: "",
                            })}
                        >
                            <option value="">Selecciona un sector</option>
                            {CAMPAIGN_SECTORS.map((sector) => (
                                <option key={sector} value={sector}>
                                    {CAMPAIGN_SECTOR_LABELS[sector]}
                                </option>
                            ))}
                        </select>
                    </label>

                    {form.sector === "otros" && (
                        <label>
                            Especifica el sector
                            <input
                                required
                                minLength={2}
                                maxLength={100}
                                value={form.otherSector}
                                onChange={(event) => setForm({
                                    ...form,
                                    otherSector: event.target.value,
                                })}
                            />
                        </label>
                    )}

                    <label>
                        Sugerencias
                        <textarea
                            maxLength={1500}
                            rows={5}
                            placeholder="Cuéntanos cómo podemos mejorar..."
                            value={form.suggestions}
                            onChange={(event) => setForm({
                                ...form,
                                suggestions: event.target.value,
                            })}
                        />
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
                            Autorizo a Delicias Morán a almacenar estos datos para
                            análisis de clientes y gestión de esta campaña.
                        </span>
                    </label>

                    <AuthMessage message={message} />
                    <button
                        className="btn btn-primary campaign-submit"
                        disabled={loading || products.length === 0}
                    >
                        {loading
                            ? <Loader2 className="animate-spin" size={20} />
                            : <Send size={20} />}
                        Enviar respuesta
                    </button>
                </form>
            </section>
        </main>
    );
}
