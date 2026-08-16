import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CampaignDetailManagement } from "@/components/admin/CampaignDetailManagement";
import { Header } from "@/components/layout/Header";
import { requirePageRole } from "@/lib/auth/authorization";
import { getCampaignDetail } from "@/lib/campaigns/service";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
    await requirePageRole(["admin"]);
    const { campaignId } = await params;
    const campaign = await getCampaignDetail(campaignId);
    if (!campaign) notFound();
    return (
        <div>
            <Header />
            <main className="container campaign-admin-page">
                <div className="campaign-route-back">
                    <Link className="btn btn-secondary" href="/admin/campanas/gestion"><ArrowLeft size={18} /> Volver a campañas</Link>
                </div>
                <CampaignDetailManagement initialCampaign={campaign} />
            </main>
        </div>
    );
}
