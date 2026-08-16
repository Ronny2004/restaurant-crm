import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { jsonError, safeJson } from "@/lib/auth/responses";
import {
    createRestaurantTable,
    getTableQrDashboard,
} from "@/lib/table-qrs/service";
import { parseRestaurantTableInput } from "@/lib/table-qrs/validation";

export const runtime = "nodejs";

export async function GET() {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    try {
        return NextResponse.json({ ok: true, dashboard: await getTableQrDashboard() });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo consultar la configuración",
            500,
        );
    }
}

export async function POST(request: NextRequest) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    const input = parseRestaurantTableInput(await safeJson(request));
    if (!input) return jsonError("Ingresa un nombre válido para la mesa");

    try {
        const table = await createRestaurantTable({ ...input, actorId: actor.id });
        return NextResponse.json({ ok: true, table }, { status: 201 });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo crear la mesa",
            409,
        );
    }
}
