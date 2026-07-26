import "server-only";

import type { NextRequest } from "next/server";

export type RequestContext = {
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
    countryCode: string | null;
    region: string | null;
    city: string | null;
};

function decodeHeader(value: string | null) {
    if (!value) {
        return null;
    }

    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function getRequestContext(request: NextRequest): RequestContext {
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || null;

    return {
        requestId: request.headers.get("x-vercel-id") || crypto.randomUUID(),
        ipAddress,
        userAgent: request.headers.get("user-agent"),
        countryCode: request.headers.get("x-vercel-ip-country"),
        region: decodeHeader(request.headers.get("x-vercel-ip-country-region")),
        city: decodeHeader(request.headers.get("x-vercel-ip-city")),
    };
}

export function clientBinding(context: RequestContext) {
    return {
        ip: context.ipAddress || "unknown",
        userAgent: context.userAgent || "unknown",
    };
}
