import "server-only";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
    RestaurantTableConfig,
    TableQrCampaignOption,
    TableQrCode,
    TableQrDashboard,
    TableQrDestinationType,
} from "@/types/table-qr";

type RawQr = Omit<TableQrCode, "campaign" | "total_scans" | "scans_7d" | "scans_30d" | "last_scanned_at"> & {
    campaigns: TableQrCampaignOption | null;
    table_qr_scan_events?: Array<{ count: number }>;
};

export async function getTableQrDashboard(): Promise<TableQrDashboard> {
    const admin = createAdminClient();
    const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [tablesResult, qrResult, scansResult, campaignsResult] = await Promise.all([
        admin
            .from("restaurant_tables")
            .select("*")
            .is("archived_at", null)
            .order("name"),
        admin
            .from("table_qr_codes")
            .select("*, campaigns(id,title,slug,status,archived_at), table_qr_scan_events(count)")
            .is("archived_at", null)
            .order("created_at", { ascending: false }),
        admin
            .from("table_qr_scan_events")
            .select("qr_code_id,scanned_at")
            .gte("scanned_at", since30Days)
            .order("scanned_at", { ascending: false })
            .limit(5000),
        admin
            .from("campaigns")
            .select("id,title,slug,status,archived_at")
            .is("archived_at", null)
            .order("created_at", { ascending: false }),
    ]);

    const error = tablesResult.error || qrResult.error || scansResult.error || campaignsResult.error;
    if (error) throw new Error(error.message);

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const scanStats = new Map<string, { scans7d: number; scans30d: number; last: string | null }>();

    for (const event of scansResult.data || []) {
        const current = scanStats.get(event.qr_code_id) || {
            scans7d: 0,
            scans30d: 0,
            last: null,
        };
        current.scans30d += 1;
        if (new Date(event.scanned_at).getTime() >= sevenDaysAgo) current.scans7d += 1;
        if (!current.last) current.last = event.scanned_at;
        scanStats.set(event.qr_code_id, current);
    }

    const qrCodes = (qrResult.data || []).map((raw) => {
        const qr = raw as unknown as RawQr;
        const stats = scanStats.get(qr.id);
        return {
            ...qr,
            campaigns: undefined,
            table_qr_scan_events: undefined,
            campaign: qr.campaigns || null,
            total_scans: qr.table_qr_scan_events?.[0]?.count || 0,
            scans_7d: stats?.scans7d || 0,
            scans_30d: stats?.scans30d || 0,
            last_scanned_at: stats?.last || null,
        } as TableQrCode;
    });

    const tables = (tablesResult.data || []).map((table) => ({
        ...table,
        qr_codes: qrCodes.filter((qr) => qr.restaurant_table_id === table.id),
    })) as RestaurantTableConfig[];

    return {
        tables,
        campaigns: (campaignsResult.data || []) as TableQrCampaignOption[],
    };
}

export async function createRestaurantTable(input: { name: string; actorId: string }) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("restaurant_tables")
        .insert({ name: input.name, created_by: input.actorId })
        .select("*")
        .single();
    if (error || !data) throw new Error(error?.message || "No se pudo crear la mesa");
    return data;
}

export async function updateRestaurantTable(id: string, isActive: boolean) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("restaurant_tables")
        .update({ is_active: isActive })
        .eq("id", id)
        .is("archived_at", null)
        .select("*")
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

export async function createTableQr(input: {
    tableId: string;
    name: string;
    destinationType: TableQrDestinationType;
    campaignId: string | null;
    destinationUrl: string | null;
    isActive: boolean;
    actorId: string;
}) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("table_qr_codes")
        .insert({
            restaurant_table_id: input.tableId,
            name: input.name,
            public_token: `qr_${randomBytes(12).toString("hex")}`,
            destination_type: input.destinationType,
            campaign_id: input.campaignId,
            destination_url: input.destinationUrl,
            is_active: input.isActive,
            created_by: input.actorId,
        })
        .select("*")
        .single();
    if (error || !data) throw new Error(error?.message || "No se pudo crear el QR");
    return data;
}

export async function updateTableQr(id: string, input: {
    name: string;
    destinationType: TableQrDestinationType;
    campaignId: string | null;
    destinationUrl: string | null;
    isActive: boolean;
}) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("table_qr_codes")
        .update({
            name: input.name,
            destination_type: input.destinationType,
            campaign_id: input.campaignId,
            destination_url: input.destinationUrl,
            is_active: input.isActive,
        })
        .eq("id", id)
        .is("archived_at", null)
        .select("*")
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

export async function resolveTableQr(publicToken: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("table_qr_codes")
        .select(`
            id,
            destination_type,
            destination_url,
            is_active,
            archived_at,
            restaurant_tables!inner(is_active,archived_at),
            campaigns(id,slug,status,archived_at)
        `)
        .eq("public_token", publicToken)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

export async function recordTableQrScan(qrCodeId: string, visitorHash: string) {
    const admin = createAdminClient();
    const { error } = await admin.rpc("record_table_qr_scan", {
        p_qr_code_id: qrCodeId,
        p_visitor_hash: visitorHash,
    });
    if (error) throw new Error(error.message);
}
