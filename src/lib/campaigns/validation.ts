import {
    CAMPAIGN_SECTORS,
    CAMPAIGN_STATUSES,
    type CampaignSector,
    type CampaignStatus,
} from "@/types/campaign";

function cleanText(value: unknown, maxLength: number) {
    if (typeof value !== "string") {
        return "";
    }
    return value.trim().slice(0, maxLength);
}

export function parseCampaignInput(body: Record<string, unknown> | null) {
    const title = cleanText(body?.title, 120);
    const description = cleanText(body?.description, 1200);
    const reward = cleanText(body?.reward, 300);
    const rawStatus = body?.status;
    const status = CAMPAIGN_STATUSES.includes(rawStatus as CampaignStatus)
        ? rawStatus as CampaignStatus
        : "active";

    if (title.length < 3 || description.length < 3 || reward.length < 2) {
        return null;
    }
    return { title, description, reward, status };
}

export function parseCampaignResponse(body: Record<string, unknown> | null) {
    const fullName = cleanText(body?.fullName, 120);
    const email = cleanText(body?.email, 254).toLowerCase();
    const phone = cleanText(body?.phone, 30);
    const favoriteProductId = cleanText(body?.favoriteProductId, 50);
    const sector = body?.sector as CampaignSector;
    const otherSector = cleanText(body?.otherSector, 100) || null;
    const suggestions = cleanText(body?.suggestions, 1500) || null;
    const consent = body?.consent === true;

    if (
        fullName.length < 2
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || phone.length < 7
        || !/^[0-9+()\-\s]+$/.test(phone)
        || !/^[0-9a-f-]{36}$/i.test(favoriteProductId)
        || !CAMPAIGN_SECTORS.includes(sector)
        || (sector === "otros" && (!otherSector || otherSector.length < 2))
        || !consent
    ) {
        return null;
    }

    return {
        fullName,
        email,
        phone,
        favoriteProductId,
        sector,
        otherSector: sector === "otros" ? otherSector : null,
        suggestions,
    };
}
