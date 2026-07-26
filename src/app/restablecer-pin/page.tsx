"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { LoginShell } from "@/components/auth/LoginShell";
import { PinInput } from "@/components/auth/PinInput";
import type { AuthApiResponse } from "@/types/auth";

export default function ResetPinPage() {
    const [pin, setPin] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (pin.length !== 6 || pin !== confirmation) {
            setMessage("Los PIN deben coincidir y contener 6 dígitos");
            return;
        }
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/auth/pin/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin, confirmation }),
            });
            const data = await response.json() as AuthApiResponse;
            if (!data.ok) {
                setMessage(data.message || "No se pudo cambiar el PIN");
                return;
            }
            window.location.assign(data.next || "/");
        } catch {
            setMessage("No fue posible conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <LoginShell
            title="Restablecer tu PIN"
            description="Por seguridad debes elegir un PIN nuevo antes de entrar."
            backHref="/login"
        >
            <form className="auth-form" onSubmit={submit}>
                <label className="pin-label">
                    Nuevo PIN
                    <PinInput value={pin} onChange={setPin} autoFocus />
                </label>
                <label className="pin-label">
                    Confirmar PIN
                    <PinInput value={confirmation} onChange={setConfirmation} />
                </label>
                <AuthMessage message={message} />
                <button
                    className="btn btn-primary auth-submit"
                    disabled={loading || pin.length !== 6 || confirmation.length !== 6}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Guardar e ingresar
                </button>
            </form>
        </LoginShell>
    );
}
