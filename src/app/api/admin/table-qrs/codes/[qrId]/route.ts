import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { jsonError, safeJson } from "@/lib/auth/responses";
import { deleteTableQr, updateTableQr } from "@/lib/table-qrs/service";
import { parseTableQrUpdate } from "@/lib/table-qrs/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ qrId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    const input = parseTableQrUpdate(await safeJson(request));
    if (!input) return jsonError("Revisa el nombre y el destino del QR");

    try {
        const { qrId } = await context.params;
        const qrCode = await updateTableQr(qrId, input);
        if (!qrCode) return jsonError("QR no encontrado", 404);
        return NextResponse.json({ ok: true, qrCode });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo actualizar el QR",
            409,
        );
    }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    try {
        const { qrId } = await context.params;
        const result = await deleteTableQr(qrId, actor.id);
        return NextResponse.json({ ok: true, result });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo eliminar el QR",
            409,
        );
    }
}
