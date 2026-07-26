"use client";

import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { LoginShell } from "@/components/auth/LoginShell";
import type { AuthApiResponse } from "@/types/auth";

export default function AdminLoginPage() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/auth/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });
            const data = await response.json() as AuthApiResponse;
            if (!data.ok) {
                setMessage(data.message || "Credenciales inválidas");
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
            title="Acceso administrativo"
            description="Área exclusiva para administradores. Ingresa tu usuario o correo y contraseña."
            backHref="/login"
            backLabel="Volver al acceso por PIN"
        >
            <form className="auth-form" onSubmit={submit}>
                <label>
                    Usuario o correo
                    <input
                        required
                        autoComplete="username"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                    />
                </label>
                <label>
                    Contraseña
                    <input
                        required
                        type="password"
                        minLength={8}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </label>
                <AuthMessage message={message} />
                <button className="btn btn-primary auth-submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                    Ingresar como administrador
                </button>
            </form>
        </LoginShell>
    );
}
