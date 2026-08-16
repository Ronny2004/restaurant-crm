import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { jsonError, safeJson } from "@/lib/auth/responses";
import { deleteRestaurantTable, updateRestaurantTable } from "@/lib/table-qrs/service";
import { parseRestaurantTableUpdate } from "@/lib/table-qrs/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tableId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    const input = parseRestaurantTableUpdate(await safeJson(request));
    if (!input) return jsonError("Indica el estado de la mesa");

    try {
        const { tableId } = await context.params;
        const table = await updateRestaurantTable(tableId, input.isActive);
        if (!table) return jsonError("Mesa no encontrada", 404);
        return NextResponse.json({ ok: true, table });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo actualizar la mesa",
            409,
        );
    }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    try {
        const { tableId } = await context.params;
        const result = await deleteRestaurantTable(tableId, actor.id);
        return NextResponse.json({ ok: true, result });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo eliminar la mesa",
            409,
        );
    }
}
