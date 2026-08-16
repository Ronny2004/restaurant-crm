"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
    Archive,
    ArchiveRestore,
    BarChart3,
    Check,
    Clipboard,
    Download,
    Edit2,
    ExternalLink,
    FileText,
    Gift,
    Link2,
    Loader2,
    Save,
    Trophy,
    Trash2,
    Users,
} from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import {
    CAMPAIGN_SECTOR_LABELS,
    type CampaignDetail,
    type CampaignStatus,
} from "@/types/campaign";

type CampaignForm = {
    title: string;
    description: string;
    reward: string;
    status: CampaignStatus;
};

async function imageToPngDataUrl(source: string) {
    return new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            if (!context) return reject(new Error("No se pudo preparar el logotipo"));
            context.drawImage(image, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        image.onerror = () => reject(new Error("No se pudo cargar el logotipo"));
        image.src = source;
    });
}

export function CampaignDetailManagement({
    initialCampaign,
}: {
    initialCampaign: CampaignDetail;
}) {
    const router = useRouter();
    const [campaign, setCampaign] = useState(initialCampaign);
    const [editForm, setEditForm] = useState<CampaignForm>({
        title: initialCampaign.title,
        description: initialCampaign.description,
        reward: initialCampaign.reward,
        status: initialCampaign.status,
    });
    const [editing, setEditing] = useState(false);
    const [working, setWorking] = useState(false);
    const [pdfWorking, setPdfWorking] = useState(false);
    const [message, setMessage] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [copied, setCopied] = useState(false);

    const publicUrl = useMemo(() => {
        if (typeof window === "undefined") return "";
        return `${window.location.origin}/campanas/${campaign.slug}`;
    }, [campaign.slug]);

    useEffect(() => {
        if (!publicUrl) return;
        void QRCode.toDataURL(publicUrl, {
            width: 560,
            margin: 2,
            errorCorrectionLevel: "M",
            color: { dark: "#4b2416", light: "#ffffff" },
        }).then(setQrDataUrl);
    }, [publicUrl]);

    const reload = async () => {
        const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
            cache: "no-store",
        });
        const data = await response.json() as {
            ok: boolean;
            campaign?: CampaignDetail;
            message?: string;
        };
        if (!data.ok || !data.campaign) throw new Error(data.message);
        setCampaign(data.campaign);
        setEditForm({
            title: data.campaign.title,
            description: data.campaign.description,
            reward: data.campaign.reward,
            status: data.campaign.status,
        });
    };

    const update = async (event: React.FormEvent) => {
        event.preventDefault();
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            await reload();
            setEditing(false);
            setMessage("Campaña actualizada.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo actualizar");
        } finally {
            setWorking(false);
        }
    };

    const toggleArchive = async () => {
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/campaigns/${campaign.id}/archive`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ archived: !campaign.archived_at }),
            });
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            router.push("/admin/campanas/gestion");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo actualizar el archivo");
            setWorking(false);
        }
    };

    const deleteCampaign = async () => {
        const confirmation = window.prompt(
            `Esta acción borrará definitivamente la campaña, sus respuestas, sorteos y ganadores.\n\nEscribe exactamente el título para confirmar:\n${campaign.title}`,
        );
        if (confirmation === null) return;
        if (confirmation.trim() !== campaign.title) {
            setMessage("El título no coincide. No se eliminó la campaña.");
            return;
        }

        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
                method: "DELETE",
            });
            const data = await response.json() as { ok: boolean; message?: string };
            if (!data.ok) throw new Error(data.message);
            router.push("/admin/campanas/gestion");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo eliminar la campaña");
            setWorking(false);
        }
    };

    const copyUrl = async () => {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    const downloadFlyer = async () => {
        if (!qrDataUrl) return;
        setPdfWorking(true);
        setMessage("");
        try {
            const [{ jsPDF }, logoDataUrl] = await Promise.all([
                import("jspdf"),
                imageToPngDataUrl("/assets/logo.webp"),
            ]);
            const document = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
                document.text(document.splitTextToSize(campaign.title, 123).slice(0, 2), 12, top + 53);
                document.setFont("helvetica", "normal");
                document.setFontSize(9.5);
                document.setTextColor(79, 65, 55);
                document.text(document.splitTextToSize(campaign.description, 123).slice(0, 4), 12, top + 70);
                document.setFillColor(243, 218, 168);
                document.roundedRect(12, top + 94, 123, 23, 2, 2, "F");
                document.setTextColor(87, 39, 20);
                document.setFont("helvetica", "bold");
                document.setFontSize(9);
                document.text("ESTÁS PARTICIPANDO POR:", 17, top + 102);
                document.setFontSize(11);
                document.text(document.splitTextToSize(campaign.reward, 112).slice(0, 2), 17, top + 109);
                document.setFillColor(255, 255, 255);
                document.roundedRect(145, top + 40, 49, 62, 3, 3, "F");
                document.addImage(qrDataUrl, "PNG", 150, top + 44, 39, 39);
                document.setFont("helvetica", "bold");
                document.setFontSize(8);
                document.setTextColor(87, 39, 20);
                document.text("ESCANEA Y PARTICIPA", 169.5, top + 89, { align: "center" });
                document.setFont("helvetica", "normal");
                document.setFontSize(7);
                document.text("Solo te tomará un minuto", 169.5, top + 95, { align: "center" });
                document.setDrawColor(224, 188, 126);
                document.line(12, top + 124, 198, top + 124);
                document.setFontSize(8);
                document.setTextColor(111, 78, 55);
                document.text("Gracias por ayudarnos a crear mejores experiencias para ti.", pageWidth / 2, top + 131, { align: "center" });
            };

            drawFlyer(0);
            drawFlyer(flyerHeight);
            document.setDrawColor(155, 118, 87);
            document.setLineDashPattern([2, 2], 0);
            document.line(5, flyerHeight, 205, flyerHeight);
            document.save(`folleto-${campaign.slug}.pdf`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo generar el PDF");
        } finally {
            setPdfWorking(false);
        }
    };

    return (
        <section className="glass-panel campaign-detail-panel">
            <div className="campaign-detail-heading">
                <div>
                    <p className="auth-eyebrow">Campaña seleccionada</p>
                    <h2>{campaign.title}</h2>
                </div>
                <div className="campaign-detail-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setEditing(!editing)}>
                        <Edit2 size={18} /> Editar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => void toggleArchive()} disabled={working}>
                        {campaign.archived_at ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                        {campaign.archived_at ? "Restaurar" : "Archivar"}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => void deleteCampaign()} disabled={working}>
                        <Trash2 size={18} /> Eliminar definitivamente
                    </button>
                </div>
            </div>

            <AuthMessage message={message} />
            {editing ? (
                <form className="campaign-form campaign-edit-form" onSubmit={update}>
                    <label>Título<input required minLength={3} maxLength={120} value={editForm.title}
                        onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /></label>
                    <label>Descripción<textarea required minLength={3} maxLength={1200} rows={4} value={editForm.description}
                        onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /></label>
                    <label>Premio o recompensa<textarea required minLength={2} maxLength={300} rows={3} value={editForm.reward}
                        onChange={(event) => setEditForm({ ...editForm, reward: event.target.value })} /></label>
                    <label>Estado del formulario público
                        <select value={editForm.status} disabled={Boolean(campaign.archived_at)}
                            onChange={(event) => setEditForm({ ...editForm, status: event.target.value as CampaignStatus })}>
                            <option value="active">Activa</option><option value="closed">Cerrada</option>
                        </select>
                    </label>
                    <button className="btn btn-primary" disabled={working}><Save size={18} /> Guardar cambios</button>
                </form>
            ) : (
                <>
                    <p className="campaign-detail-description">{campaign.description}</p>
                    <div className="campaign-reward"><Gift size={20} /><span><strong>Recompensa:</strong> {campaign.reward}</span></div>
                </>
            )}

            {!campaign.archived_at && (
                <div className="campaign-share-grid">
                    <div className="campaign-share-info">
                        <h3><Link2 size={19} /> Enlace público</h3>
                        <div className="campaign-url-row"><input readOnly value={publicUrl} />
                            <button type="button" className="btn btn-secondary" onClick={() => void copyUrl()}>
                                {copied ? <Check size={18} /> : <Clipboard size={18} />} {copied ? "Copiado" : "Copiar"}
                            </button>
                        </div>
                        <a className="btn btn-secondary" href={publicUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={18} /> Abrir formulario
                        </a>
                    </div>
                    <div className="campaign-qr">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {qrDataUrl && <img src={qrDataUrl} alt={`QR de ${campaign.title}`} />}
                        <div className="campaign-download-actions">
                            <a className="btn btn-secondary" href={qrDataUrl} download={`qr-${campaign.slug}.png`}>
                                <Download size={18} /> Descargar QR
                            </a>
                            <button type="button" className="btn btn-primary" disabled={pdfWorking || !qrDataUrl}
                                onClick={() => void downloadFlyer()}>
                                {pdfWorking ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />} Descargar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="campaign-detail-destinations">
                <Link href={`/admin/campanas/${campaign.id}/analisis`}>
                    <BarChart3 size={28} /><span><strong>Lectura rápida de la campaña</strong><small>Indicadores basados únicamente en respuestas registradas.</small></span>
                </Link>
                <Link href={`/admin/campanas/${campaign.id}/sorteo`}>
                    <Trophy size={28} /><span><strong>Ruleta de ganadores</strong><small>Exclusivo para administradores.</small></span>
                </Link>
            </div>

            <div className="campaign-responses">
                <h3><Users size={20} /> Respuestas ({campaign.responses.length})</h3>
                {campaign.responses.length === 0 ? <p className="campaign-empty">Todavía no hay respuestas.</p> : (
                    <div className="campaign-table-wrap"><table><thead><tr>
                        <th>Nombre</th><th>Contacto</th><th>Plato</th><th>Sector</th><th>Sugerencias</th><th>Fecha</th>
                    </tr></thead><tbody>{campaign.responses.map((response) => (
                        <tr key={response.id}>
                            <td>{response.full_name}</td><td>{response.email}<br /><small>{response.phone}</small></td>
                            <td>{response.favorite_product_name}</td>
                            <td>{response.sector === "otros" ? response.other_sector : CAMPAIGN_SECTOR_LABELS[response.sector]}</td>
                            <td>{response.suggestions || "—"}</td>
                            <td>{new Date(response.created_at).toLocaleString("es-EC")}</td>
                        </tr>
                    ))}</tbody></table></div>
                )}
            </div>
        </section>
    );
}
