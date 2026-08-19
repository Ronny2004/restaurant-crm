"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    CheckCircle2,
    Gift,
    Heart,
    Loader2,
    Mail,
    MessageCircle,
    PackageCheck,
    Share2,
    Sparkles,
    Trophy,
} from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import {
    createWinnerCongratulationsFile,
    createWinnerShareFile,
    downloadWinnerShareFile,
} from "@/lib/campaigns/winner-share-card";
import { campaignPrizeLabel } from "@/lib/campaigns/reward";
import type { CampaignDetail } from "@/types/campaign";
import type {
    CampaignDraw,
    CampaignDrawWinner,
    CampaignWinnerStatus,
} from "@/types/campaign-raffle";

function publicWinnerName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return parts[0] || "Ganador/a";
    return `${parts[0]} ${parts[1][0]}.`;
}

function whatsappNumber(phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("593")) return digits;
    if (digits.startsWith("0")) return `593${digits.slice(1)}`;
    if (digits.length === 9 && digits.startsWith("9")) return `593${digits}`;
    return digits;
}

export function CampaignRaffle({ campaign }: { campaign: CampaignDetail }) {
    const [draws, setDraws] = useState<CampaignDraw[]>([]);
    const [winnerCount, setWinnerCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [spinning, setSpinning] = useState(false);
    const [spinName, setSpinName] = useState("¿Quién ganará?");
    const [revealedDraw, setRevealedDraw] = useState<CampaignDraw | null>(null);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"error" | "success" | "info">("error");
    const [emailingWinnerId, setEmailingWinnerId] = useState<string | null>(null);
    const [congratulatingWinnerId, setCongratulatingWinnerId] = useState<string | null>(null);
    const [sharingWinnerId, setSharingWinnerId] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/campaigns/${campaign.id}/draws`, { cache: "no-store" });
            const data = await response.json() as { ok: boolean; draws?: CampaignDraw[]; message?: string };
            if (!data.ok || !data.draws) throw new Error(data.message);
            setDraws(data.draws);
        } catch (error) {
            setMessageType("error");
            setMessage(error instanceof Error ? error.message : "No se pudieron consultar los sorteos");
        } finally {
            setLoading(false);
        }
    }, [campaign.id]);

    useEffect(() => {
        setRevealedDraw(null);
        void load();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [load]);

    const previousWinnerIds = useMemo(() => new Set(
        draws
            .filter((draw) => draw.status === "completed")
            .flatMap((draw) => draw.winners.map((winner) => winner.response.id)),
    ), [draws]);
    const eligibleResponses = campaign.responses.filter((response) => !previousWinnerIds.has(response.id));

    const runDraw = async () => {
        if (!window.confirm(`¿Realizar el sorteo con ${winnerCount} ganador(es)? El resultado quedará guardado.`)) return;
        setMessage("");
        setRevealedDraw(null);
        setSpinning(true);
        const startedAt = Date.now();
        let index = 0;
        intervalRef.current = setInterval(() => {
            if (eligibleResponses.length > 0) {
                setSpinName(eligibleResponses[index % eligibleResponses.length].full_name);
                index += 1;
            }
        }, 90);

        try {
            const response = await fetch(`/api/admin/campaigns/${campaign.id}/draws`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ winnerCount }),
            });
            const data = await response.json() as { ok: boolean; draws?: CampaignDraw[]; message?: string };
            if (!data.ok || !data.draws?.[0]) throw new Error(data.message);
            const remaining = Math.max(0, 3200 - (Date.now() - startedAt));
            await new Promise((resolve) => window.setTimeout(resolve, remaining));
            setDraws(data.draws);
            setRevealedDraw(data.draws[0]);
            setSpinName("¡Tenemos ganador!");
        } catch (error) {
            setMessageType("error");
            setMessage(error instanceof Error ? error.message : "No se pudo realizar el sorteo");
        } finally {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setSpinning(false);
        }
    };

    const contactWinner = (winner: CampaignDrawWinner) => {
        setMessage("");
        const prize = campaignPrizeLabel(campaign.reward);
        const phone = whatsappNumber(winner.response.phone);
        if (!/^5939\d{8}$/.test(phone)) {
            setMessageType("error");
            setMessage(`El número ${winner.response.phone} no parece ser un WhatsApp válido. Puedes intentar contactarle por correo.`);
            return;
        }
        const firstName = winner.response.full_name.trim().split(/\s+/)[0] || "Hola";
        const text = [
            `¡Hola, ${firstName}! 👋 Somos el equipo de Delicias Morán.`,
            "",
            "¡Tenemos una noticia especial para ti! 🎉 Resultaste ganador/a de nuestro sorteo.",
            "",
            `🏆 Tu premio: ${prize}`,
            "",
            "Queremos coordinar contigo la entrega. ¿Puedes confirmarnos por este medio que recibiste el mensaje y en qué horario podemos contactarte?",
            "",
            "Por tu seguridad, no necesitas realizar ningún pago ni compartir claves o códigos.",
            "",
            "¡Felicitaciones y gracias por participar! ❤️",
        ].join("\n");
        window.open(
            `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
            "_blank",
            "noopener,noreferrer",
        );
    };

    const shareWinner = async (winner: CampaignDrawWinner) => {
        setMessage("");
        setSharingWinnerId(winner.id);
        const name = publicWinnerName(winner.response.full_name);
        const prize = campaignPrizeLabel(campaign.reward);
        const text = [
            `🎉 ¡Tenemos ganador/a! ${name}`,
            "",
            `🏆 Premio: ${prize}`,
            "",
            "¡Gracias a todos por participar! Muy pronto tendremos nuevas promociones y sorteos en Delicias Morán.",
        ].join("\n");

        try {
            const file = await createWinnerShareFile(name, prize);
            const files = [file];
            if (navigator.share && navigator.canShare?.({ files })) {
                try {
                    await navigator.share({
                        title: "Ganador/a de Delicias Morán",
                        text,
                        files,
                    });
                    return;
                } catch (error) {
                    if (error instanceof DOMException && error.name === "AbortError") return;
                }
            }

            downloadWinnerShareFile(file);
            await navigator.clipboard?.writeText(text).catch(() => undefined);
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
            setMessageType("info");
            setMessage("La imagen fue descargada y el mensaje quedó listo. Adjunta la imagen en WhatsApp antes de enviarlo.");
        } catch (error) {
            setMessageType("error");
            setMessage(error instanceof Error ? error.message : "No se pudo preparar el anuncio del ganador");
        } finally {
            setSharingWinnerId(null);
        }
    };

    const shareWinnerCongratulations = async (winner: CampaignDrawWinner) => {
        setMessage("");
        setCongratulatingWinnerId(winner.id);
        const firstName = winner.response.full_name.trim().split(/\s+/)[0] || "Ganador/a";
        const prize = campaignPrizeLabel(campaign.reward);
        const phone = whatsappNumber(winner.response.phone);
        const text = [
            `¡Hola, ${firstName}! 🎉`,
            "",
            "Preparamos esta felicitación especialmente para ti. Gracias por compartir tu experiencia y ser parte de Delicias Morán.",
            "",
            `🏆 Tu premio: ${prize}`,
            "",
            "Cuando puedas, respóndenos para coordinar contigo la entrega. Recuerda que no debes realizar ningún pago ni compartir claves o códigos.",
            "",
            "¡Esperamos celebrar contigo muy pronto! ❤️",
        ].join("\n");

        try {
            const file = await createWinnerCongratulationsFile(winner.response.full_name, prize);
            const files = [file];
            if (navigator.share && navigator.canShare?.({ files })) {
                try {
                    await navigator.share({
                        title: `Felicitación para ${firstName}`,
                        text,
                        files,
                    });
                    return;
                } catch (error) {
                    if (error instanceof DOMException && error.name === "AbortError") return;
                }
            }

            downloadWinnerShareFile(file);
            await navigator.clipboard?.writeText(text).catch(() => undefined);
            if (/^5939\d{8}$/.test(phone)) {
                window.open(
                    `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
                    "_blank",
                    "noopener,noreferrer",
                );
                setMessageType("info");
                setMessage("La felicitación fue descargada. Adjunta la imagen en el chat del ganador antes de enviarla.");
            } else {
                setMessageType("info");
                setMessage("La felicitación fue descargada y el texto quedó copiado. Como el teléfono no es válido, puedes enviarlos por correo.");
            }
        } catch (error) {
            setMessageType("error");
            setMessage(error instanceof Error ? error.message : "No se pudo preparar la felicitación");
        } finally {
            setCongratulatingWinnerId(null);
        }
    };

    const emailWinner = async (winner: CampaignDrawWinner) => {
        if (!window.confirm(`¿Enviar el aviso de ganador a ${winner.response.email}?`)) return;
        setMessage("");
        setEmailingWinnerId(winner.id);
        try {
            const response = await fetch(
                `/api/admin/campaigns/${campaign.id}/winners/${winner.id}/email`,
                { method: "POST" },
            );
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            setMessageType("success");
            setMessage(data.message || "Correo enviado correctamente");
            await load();
        } catch (error) {
            setMessageType("error");
            setMessage(error instanceof Error ? error.message : "No se pudo enviar el correo");
        } finally {
            setEmailingWinnerId(null);
        }
    };

    const updateStatus = async (winner: CampaignDrawWinner, status: CampaignWinnerStatus) => {
        setMessage("");
        try {
            const response = await fetch(
                `/api/admin/campaigns/${campaign.id}/winners/${winner.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                },
            );
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            await load();
        } catch (error) {
            setMessageType("error");
            setMessage(error instanceof Error ? error.message : "No se pudo actualizar el premio");
        }
    };

    return (
        <section className="campaign-raffle">
            <div className="campaign-section-title">
                <Trophy size={24} />
                <div>
                    <p className="auth-eyebrow">Exclusivo para administradores</p>
                    <h3>Ruleta de ganadores</h3>
                    <p>La animación es visual; el resultado se selecciona y guarda de forma segura en el servidor.</p>
                </div>
            </div>

            <div className="raffle-stage">
                <div className={`raffle-wheel ${spinning ? "spinning" : ""}`}>
                    <div><Gift size={38} /><span>{spinName}</span></div>
                </div>
                <div className="raffle-controls">
                    <strong>{eligibleResponses.length} participante(s) elegible(s)</strong>
                    {campaign.status !== "closed" && (
                        <p className="raffle-warning">Cierra el formulario público antes de realizar el sorteo.</p>
                    )}
                    <label>
                        Cantidad de ganadores
                        <input
                            type="number"
                            min={1}
                            max={Math.min(20, eligibleResponses.length || 1)}
                            value={winnerCount}
                            onChange={(event) => setWinnerCount(Math.max(1, Number(event.target.value) || 1))}
                        />
                    </label>
                    <button
                        type="button"
                        className="btn btn-primary raffle-button"
                        disabled={
                            spinning
                            || loading
                            || campaign.status !== "closed"
                            || Boolean(campaign.archived_at)
                            || eligibleResponses.length < winnerCount
                        }
                        onClick={() => void runDraw()}
                    >
                        {spinning ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        {spinning ? "Girando..." : "Iniciar sorteo"}
                    </button>
                </div>
            </div>

            <AuthMessage message={message} type={messageType} />

            {revealedDraw && (
                <div className="raffle-reveal">
                    <CheckCircle2 size={34} />
                    <div>
                        <span>Sorteo registrado correctamente</span>
                        {revealedDraw.winners.map((winner) => (
                            <strong key={winner.id}>#{winner.position} {winner.response.full_name}</strong>
                        ))}
                    </div>
                </div>
            )}

            {draws.length > 0 && (
                <div className="raffle-history">
                    <h4>Historial de sorteos</h4>
                    {draws.map((draw) => (
                        <article key={draw.id}>
                            <header>
                                <span>{new Date(draw.created_at).toLocaleString("es-EC")}</span>
                                <small>{draw.eligible_count} participantes · {draw.winner_count} ganador(es)</small>
                            </header>
                            {draw.winners.map((winner) => (
                                <div className="raffle-winner-row" key={winner.id}>
                                    <div><Trophy size={18} /><span><strong>{winner.response.full_name}</strong><small>{winner.response.email} · {winner.response.phone}</small></span></div>
                                    <span className={`raffle-contact-status ${winner.contact_status}`}>
                                        {winner.contact_status === "pending" ? "Pendiente" : winner.contact_status === "contacted" ? "Contactado" : "Entregado"}
                                    </span>
                                    <div className="raffle-winner-actions">
                                        <button className="btn btn-secondary" onClick={() => contactWinner(winner)}><MessageCircle size={16} /> Contactar por WhatsApp</button>
                                        <button
                                            className="btn btn-secondary"
                                            disabled={emailingWinnerId === winner.id}
                                            onClick={() => void emailWinner(winner)}
                                        >
                                            {emailingWinnerId === winner.id ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
                                            Enviar por correo
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            disabled={congratulatingWinnerId === winner.id}
                                            onClick={() => void shareWinnerCongratulations(winner)}
                                        >
                                            {congratulatingWinnerId === winner.id ? <Loader2 className="animate-spin" size={16} /> : <Heart size={16} />}
                                            Enviar felicitación
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            disabled={sharingWinnerId === winner.id}
                                            onClick={() => void shareWinner(winner)}
                                        >
                                            {sharingWinnerId === winner.id ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                                            Compartir anuncio
                                        </button>
                                        {winner.contact_status === "pending" && (
                                            <button className="btn btn-secondary" onClick={() => void updateStatus(winner, "contacted")}><CheckCircle2 size={16} /> Marcar contactado</button>
                                        )}
                                        {winner.contact_status !== "delivered" && (
                                            <button className="btn btn-primary" onClick={() => void updateStatus(winner, "delivered")}><PackageCheck size={16} /> Premio entregado</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
