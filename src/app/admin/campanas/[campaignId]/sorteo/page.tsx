import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CampaignRaffle } from "@/components/admin/CampaignRaffle";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";
import { getCampaignDetail } from "@/lib/campaigns/service";

export const dynamic = "force-dynamic";

export default async function CampaignRafflePage({ params }: { params: Promise<{ campaignId: string }> }) {
    await requirePageRole(["admin"]);
    const { campaignId } = await params;
    const campaign = await getCampaignDetail(campaignId);
    if (!campaign) notFound();
    return (
        <div>
            <Header />
            <main className="container campaign-admin-page">
                <div className="users-heading">
                    <div><p className="auth-eyebrow">Sorteo de campaña</p><h1>{campaign.title}</h1><p>Área exclusiva para administradores.</p></div>
                    <Link className="btn btn-secondary" href={`/admin/campanas/${campaign.id}`}><ArrowLeft size={18} /> Volver a la campaña</Link>
                </div>
                <CampaignRaffle campaign={campaign} />
            </main>
        </div>
    );
}
