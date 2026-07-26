"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, LockKeyhole, Mail, Shield } from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { LoginShell } from "@/components/auth/LoginShell";
import { NumericKeypad } from "@/components/auth/NumericKeypad";
import { PinInput } from "@/components/auth/PinInput";
import type { AuthApiResponse } from "@/types/auth";

type MoreOption = "password" | "emergency" | null;

export default function LoginPage() {
    const [pin, setPin] = useState("");
    const [option, setOption] = useState<MoreOption>(null);
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [emergencyCode, setEmergencyCode] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const finish = (data: AuthApiResponse) => {
        if (!data.ok) {
            setMessage(data.message || "No se pudo iniciar sesión");
            return;
        }
        window.location.assign(data.next || "/");
    };

    const submitPin = async (event: React.FormEvent) => {
        event.preventDefault();
        if (pin.length !== 6) {
            setMessage("Completa los 6 dígitos del PIN");
            return;
        }
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/auth/pin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            });
            finish(await response.json() as AuthApiResponse);
        } catch {
            setMessage("No fue posible conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const submitPassword = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/auth/password/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });
            finish(await response.json() as AuthApiResponse);
        } catch {
            setMessage("No fue posible conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const submitEmergency = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/auth/emergency/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: emergencyCode }),
            });
            finish(await response.json() as AuthApiResponse);
        } catch {
            setMessage("No fue posible conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <LoginShell
            title="Acceso del personal"
            description="Ingresa tu PIN de seis dígitos para continuar."
            brandIconSrc="/assets/logo.webp"
            brandIconAlt="Logo de Delicias Morán"
            cardClassName="staff-login-card"
            sideContent={(
                <NumericKeypad
                    value={pin}
                    onChange={setPin}
                    disabled={loading}
                />
            )}
        >
            <form className="auth-form" onSubmit={submitPin}>
                <PinInput
                    value={pin}
                    onChange={setPin}
                    autoFocus
                    label="PIN de acceso"
                />
                <AuthMessage message={message} />
                <button
                    className="btn btn-primary auth-submit"
                    disabled={loading || pin.length !== 6}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <LockKeyhole size={20} />}
                    Ingresar
                </button>
            </form>

            <div className="auth-secondary-actions">
                <button
                    type="button"
                    className="auth-option-toggle"
                    onClick={() => setOption(option ? null : "password")}
                >
                    Más opciones <ChevronDown size={17} />
                </button>
                <Link className="auth-link" href="/recuperar-pin">
                    ¿Olvidaste tu PIN?
                </Link>
            </div>

            {option && (
                <div className="auth-option-panel">
                    <div className="auth-option-tabs">
                        <button
                            className={option === "password" ? "active" : ""}
                            onClick={() => setOption("password")}
                            type="button"
                        >
                            <Mail size={16} /> Contraseña
                        </button>
                        <button
                            className={option === "emergency" ? "active" : ""}
                            onClick={() => setOption("emergency")}
                            type="button"
                        >
                            <Shield size={16} /> Código manual
                        </button>
                    </div>

                    {option === "password" ? (
                        <form className="auth-form compact" onSubmit={submitPassword}>
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
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                />
                            </label>
                            <button className="btn btn-secondary" disabled={loading}>
                                Iniciar con contraseña
                            </button>
                        </form>
                    ) : (
                        <form className="auth-form compact" onSubmit={submitEmergency}>
                            <p className="auth-help">
                                Solicita al administrador un código temporal de emergencia.
                            </p>
                            <PinInput
                                value={emergencyCode}
                                onChange={setEmergencyCode}
                                label="Código de emergencia"
                            />
                            <button
                                className="btn btn-secondary"
                                disabled={loading || emergencyCode.length !== 6}
                            >
                                Usar código
                            </button>
                        </form>
                    )}
                </div>
            )}

            <Link className="admin-login-button" href="/admin/login">
                ¿Eres administrador?
            </Link>
        </LoginShell>
    );
}
