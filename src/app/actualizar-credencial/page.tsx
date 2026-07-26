"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { LoginShell } from "@/components/auth/LoginShell";
import type { AuthApiResponse } from "@/types/auth";

export default function ChangeExpiredPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/auth/password/change-expired", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, confirmation }),
            });
            const data = await response.json() as AuthApiResponse;
            if (!data.ok) {
                setMessage(data.message || "No se pudo cambiar la contraseña");
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
            title="Actualizar contraseña"
            description="Tu contraseña es temporal o expiró. Debes cambiarla para continuar."
            backHref="/login"
        >
            <form className="auth-form" onSubmit={submit}>
                <label>
                    Nueva contraseña
                    <input
                        required
                        type="password"
                        minLength={10}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </label>
                <label>
                    Confirmar contraseña
                    <input
                        required
                        type="password"
                        minLength={10}
                        autoComplete="new-password"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                    />
                </label>
                <p className="auth-help">
                    Mínimo 10 caracteres, una mayúscula, una minúscula y un número.
                </p>
                <AuthMessage message={message} />
                <button className="btn btn-primary auth-submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
                    Cambiar e ingresar
                </button>
            </form>
        </LoginShell>
    );
}
