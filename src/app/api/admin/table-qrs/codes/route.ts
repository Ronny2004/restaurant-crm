import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { jsonError, safeJson } from "@/lib/auth/responses";
import { createTableQr } from "@/lib/table-qrs/service";
import { parseTableQrInput } from "@/lib/table-qrs/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) return jsonError("No autorizado", 401);

    const input = parseTableQrInput(await safeJson(request));
    if (!input) return jsonError("Revisa la mesa, el nombre y el destino del QR");

    try {
        const qrCode = await createTableQr({ ...input, actorId: actor.id });
        return NextResponse.json({ ok: true, qrCode }, { status: 201 });
    } catch (error) {
        return jsonError(
            error instanceof Error ? error.message : "No se pudo crear el QR",
            409,
        );
    }
}
