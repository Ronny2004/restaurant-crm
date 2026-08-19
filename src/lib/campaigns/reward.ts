export function campaignPrizeLabel(reward: string) {
    const [prize] = reward.split(/\bcondiciones?\s*:/i);
    const cleaned = prize
        .replace(/[¡!]*\s*no te lo pierdas[¡!.]*/gi, "")
        .replace(/[\s,;:.!-]+$/g, "")
        .trim();

    return cleaned || reward.trim();
}
