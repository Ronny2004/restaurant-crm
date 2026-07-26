import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
    return NextResponse.json({ ok: false, message }, { status });
}

export function genericCredentialsError() {
    return jsonError("Credenciales inválidas", 401);
}

export async function safeJson(request: Request) {
    try {
        return await request.json() as Record<string, unknown>;
    } catch {
        return null;
    }
}
