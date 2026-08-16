"use client";

import { useMemo } from "react";
import { BarChart3, Clock3, MapPin, MessageSquareText, UtensilsCrossed, Users } from "lucide-react";
import { CAMPAIGN_SECTOR_LABELS, type CampaignResponse } from "@/types/campaign";

function increment(map: Map<string, number>, key: string) {
    map.set(key, (map.get(key) || 0) + 1);
}

function topEntry(map: Map<string, number>) {
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

export function CampaignAnalytics({ responses }: { responses: CampaignResponse[] }) {
    const stats = useMemo(() => {
        const sectors = new Map<string, number>();
        const products = new Map<string, number>();
        const hours = new Map<string, number>();
        let suggestions = 0;

        for (const response of responses) {
            increment(
                sectors,
                response.sector === "otros"
                    ? response.other_sector || "Otros"
                    : CAMPAIGN_SECTOR_LABELS[response.sector],
            );
            increment(products, response.favorite_product_name);
            increment(
                hours,
                new Intl.DateTimeFormat("es-EC", {
                    hour: "2-digit",
                    hour12: false,
                    timeZone: "America/Guayaquil",
                }).format(new Date(response.created_at)),
            );
            if (response.suggestions?.trim()) suggestions += 1;
        }

        return {
            sectors,
            products,
            topSector: topEntry(sectors),
            topProduct: topEntry(products),
            peakHour: topEntry(hours),
            suggestions,
        };
    }, [responses]);

    if (responses.length === 0) return null;

    const maxSector = Math.max(...stats.sectors.values());
    const maxProduct = Math.max(...stats.products.values());

    return (
        <section className="campaign-analytics">
            <div className="campaign-section-title">
                <BarChart3 size={23} />
                <div><h3>Lectura rápida de la campaña</h3><p>Indicadores sencillos basados únicamente en respuestas registradas.</p></div>
            </div>
            <div className="campaign-analytics-cards">
                <article><Users size={20} /><span>Participantes</span><strong>{responses.length}</strong></article>
                <article><MapPin size={20} /><span>Sector principal</span><strong>{stats.topSector?.[0] || "—"}</strong></article>
                <article><UtensilsCrossed size={20} /><span>Plato más elegido</span><strong>{stats.topProduct?.[0] || "—"}</strong></article>
                <article><Clock3 size={20} /><span>Hora con más respuestas</span><strong>{stats.peakHour ? `${stats.peakHour[0]}:00` : "—"}</strong></article>
                <article><MessageSquareText size={20} /><span>Con sugerencias</span><strong>{stats.suggestions}</strong></article>
            </div>
            <div className="campaign-analytics-bars">
                <div>
                    <h4>Participación por sector</h4>
                    {[...stats.sectors.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => (
                        <div className="campaign-bar-row" key={label}>
                            <span>{label}</span>
                            <div><i style={{ width: `${(count / maxSector) * 100}%` }} /></div>
                            <strong>{count}</strong>
                        </div>
                    ))}
                </div>
                <div>
                    <h4>Platos preferidos</h4>
                    {[...stats.products.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => (
                        <div className="campaign-bar-row" key={label}>
                            <span>{label}</span>
                            <div><i style={{ width: `${(count / maxProduct) * 100}%` }} /></div>
                            <strong>{count}</strong>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
