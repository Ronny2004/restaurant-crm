import type { TableQrDestinationType } from "@/types/table-qr";

function clean(value: unknown, maxLength: number) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseSafeHttpsUrl(value: unknown) {
    const raw = clean(value, 2048);
    try {
        const url = new URL(raw);
        if (
            url.protocol !== "https:"
            || url.username
            || url.password
            || url.hostname === "localhost"
            || /^(127\.|10\.|192\.168\.|0\.|169\.254\.)/.test(url.hostname)
        ) {
            return null;
        }
        return url.toString();
    } catch {
        return null;
    }
}

export function parseRestaurantTableInput(body: Record<string, unknown> | null) {
    const name = clean(body?.name, 80);
    if (!name) return null;
    return { name };
}

export function parseRestaurantTableUpdate(body: Record<string, unknown> | null) {
    if (typeof body?.isActive !== "boolean") return null;
    return { isActive: body.isActive };
}

export function parseTableQrInput(body: Record<string, unknown> | null) {
    const tableId = clean(body?.tableId, 36);
    const name = clean(body?.name, 100);
    const destinationType = body?.destinationType as TableQrDestinationType;
    const campaignId = clean(body?.campaignId, 36);
    const destinationUrl = parseSafeHttpsUrl(body?.destinationUrl);
    const isActive = body?.isActive !== false;

    if (
        !isUuid(tableId)
        || name.length < 2
        || !["campaign", "url"].includes(destinationType)
        || (destinationType === "campaign" && !isUuid(campaignId))
        || (destinationType === "url" && !destinationUrl)
    ) {
        return null;
    }

    return {
        tableId,
        name,
        destinationType,
        campaignId: destinationType === "campaign" ? campaignId : null,
        destinationUrl: destinationType === "url" ? destinationUrl : null,
        isActive,
    };
}

export function parseTableQrUpdate(body: Record<string, unknown> | null) {
    const name = clean(body?.name, 100);
    const destinationType = body?.destinationType as TableQrDestinationType;
    const campaignId = clean(body?.campaignId, 36);
    const destinationUrl = parseSafeHttpsUrl(body?.destinationUrl);

    if (
        name.length < 2
        || !["campaign", "url"].includes(destinationType)
        || typeof body?.isActive !== "boolean"
        || (destinationType === "campaign" && !isUuid(campaignId))
        || (destinationType === "url" && !destinationUrl)
    ) {
        return null;
    }

    return {
        name,
        destinationType,
        campaignId: destinationType === "campaign" ? campaignId : null,
        destinationUrl: destinationType === "url" ? destinationUrl : null,
        isActive: body.isActive,
    };
}
