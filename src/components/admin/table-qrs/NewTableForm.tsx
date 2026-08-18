"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Table2 } from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { readApiPayload } from "@/components/admin/table-qrs/client";

export function NewTableForm() {
    const router = useRouter();
    const [tableName, setTableName] = useState("");
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState("");

    const createTable = async (event: React.FormEvent) => {
        event.preventDefault();
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch("/api/admin/table-qrs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: tableName }),
            });
            const data = await readApiPayload<{ table?: { id: string } }>(response);
            if (!data.table) throw new Error("La mesa se creó sin una respuesta válida");
            router.push(`/admin/campanas/mesas/${data.table.id}/qrs/nuevo`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo crear la mesa");
            setWorking(false);
        }
    };

    return (
        <section className="glass-panel table-qr-form-panel table-qr-form-shell">
            <div className="table-qr-form-intro">
                <span><Table2 size={25} /></span>
                <div>
                    <p className="auth-eyebrow">Paso 1 de 2</p>
                    <h2>Identifica la nueva mesa</h2>
                    <p>El nombre será visible únicamente dentro del panel administrativo.</p>
                </div>
            </div>

            <AuthMessage message={message} />

            <form className="campaign-form" onSubmit={createTable}>
                <label>
                    Nombre o identificación
                    <input
                        autoFocus
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="Ej.: Mesa 1, Terraza 2"
                        value={tableName}
                        onChange={(event) => setTableName(event.target.value)}
                    />
                </label>
                <p className="auth-help">
                    Al continuar, te llevaremos directamente a crear el primer QR físico de esta mesa.
                </p>
                <div className="campaign-download-actions table-qr-form-actions">
                    <Link className="btn btn-secondary" href="/admin/campanas/mesas">
                        <ArrowLeft size={18} /> Cancelar
                    </Link>
                    <button className="btn btn-primary" disabled={working}>
                        {working ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                        Registrar y crear QR
                    </button>
                </div>
            </form>
        </section>
    );
}
