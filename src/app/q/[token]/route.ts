import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
    recordTableQrScan,
    resolveTableQr,
} from "@/lib/table-qrs/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

type RelatedCampaign = {
    slug: string;
    status: string;
    archived_at: string | null;
};

type RelatedTable = {
    is_active: boolean;
    archived_at: string | null;
};

function relatedOne<T>(value: T | T[] | null | undefined) {
    return Array.isArray(value) ? value[0] || null : value || null;
}

export async function GET(request: NextRequest, context: RouteContext) {
    const { token } = await context.params;
    const unavailable = new URL("/q/no-disponible", request.nextUrl.origin);

    try {
        const qr = await resolveTableQr(token);
        if (!qr || !qr.is_active || qr.archived_at) {
            return NextResponse.redirect(unavailable, 307);
        }

        const table = relatedOne(qr.restaurant_tables as RelatedTable | RelatedTable[] | null);
        if (!table?.is_active || table.archived_at) {
            return NextResponse.redirect(unavailable, 307);
        }

        let destination: URL | null = null;
        if (qr.destination_type === "campaign") {
            const campaign = relatedOne(qr.campaigns as RelatedCampaign | RelatedCampaign[] | null);
            if (campaign?.status === "active" && !campaign.archived_at) {
                destination = new URL(
                    `/campanas/${encodeURIComponent(campaign.slug)}`,
                    request.nextUrl.origin,
                );
            }
        } else if (qr.destination_url) {
            destination = new URL(qr.destination_url);
        }

        if (!destination) return NextResponse.redirect(unavailable, 307);

        const visitorToken = request.cookies.get("dm_qr_visitor")?.value || randomUUID();
        const visitorHash = createHash("sha256").update(visitorToken).digest("hex");
        try {
            await recordTableQrScan(qr.id, visitorHash);
        } catch (error) {
            console.error("No se pudo registrar el escaneo del QR", error);
        }

        const response = NextResponse.redirect(destination, 307);
        response.headers.set("Cache-Control", "no-store, max-age=0");
        response.cookies.set("dm_qr_visitor", visitorToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
        });
        return response;
    } catch (error) {
        console.error("No se pudo resolver el QR", error);
        return NextResponse.redirect(unavailable, 307);
    }
}
