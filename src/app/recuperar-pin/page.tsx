"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { LoginShell } from "@/components/auth/LoginShell";

export default function RecoverPinPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/auth/pin/recovery/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await response.json() as {
                ok: boolean;
                message?: string;
            };
            setSent(true);
            setMessage(data.message || "Revisa tu correo.");
        } catch {
            setMessage("No fue posible procesar la solicitud");
        } finally {
            setLoading(false);
        }
    };

    return (
        <LoginShell
            title="Recuperar PIN"
            description="Para recuperar tu acceso, introduce tu correo registrado."
            backHref="/login"
            backLabel="Volver al inicio de sesión"
        >
            <form className="auth-form" onSubmit={submit}>
                <label>
                    Correo registrado
                    <input
                        required
                        type="email"
                        autoComplete="email"
                        value={email}
                        disabled={sent}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </label>
                <AuthMessage
                    message={message}
                    type={sent ? "success" : "error"}
                />
                {!sent && (
                    <button className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        Enviar PIN temporal
                    </button>
                )}
            </form>
        </LoginShell>
    );
}
