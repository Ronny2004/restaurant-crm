import type { TableQrDashboard } from "@/types/table-qr";

type ApiPayload<T> = {
    ok: boolean;
    message?: string;
} & T;

export async function readApiPayload<T>(response: Response) {
    const data = await response.json() as ApiPayload<T>;
    if (!response.ok || !data.ok) {
        throw new Error(data.message || "La operación no pudo completarse");
    }
    return data;
}

export async function fetchTableQrDashboard() {
    const response = await fetch("/api/admin/table-qrs", { cache: "no-store" });
    const data = await readApiPayload<{ dashboard?: TableQrDashboard }>(response);
    if (!data.dashboard) throw new Error("No se recibió la configuración de mesas");
    return data.dashboard;
}
