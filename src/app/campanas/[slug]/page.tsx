import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicCampaignForm } from "@/components/campaigns/PublicCampaignForm";
import { getPublicCampaign } from "@/lib/campaigns/service";

export const dynamic = "force-dynamic";

type PageProps = {
    params: Promise<{ slug: string }>;
};

const getCampaign = cache(getPublicCampaign);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const { campaign } = await getCampaign(slug);
    return {
        title: campaign
            ? `${campaign.title} | Delicias Morán`
            : "Campaña no disponible | Delicias Morán",
        description: campaign?.description,
    };
}

export default async function CampaignPublicPage({ params }: PageProps) {
    const { slug } = await params;
    const { campaign, products } = await getCampaign(slug);
    if (!campaign) {
        notFound();
    }

    return <PublicCampaignForm campaign={campaign} products={products} />;
}
