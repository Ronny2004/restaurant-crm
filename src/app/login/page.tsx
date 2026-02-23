"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const { error } = await signIn(email, password);

        if (error) {
            setError("Credenciales inválidas. Por favor, intenta de nuevo.");
            setLoading(false);
        } else {
            // Redirect will be handled by the home page based on role
            router.push("/");
        }
    };

    return (
        <div className="container" style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <div className="glass-panel" style={{
                maxWidth: "450px",
                width: "100%",
                padding: "3rem"
            }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{
                        display: "inline-flex",
                        padding: "1rem",
                        background: "rgba(245, 158, 11, 0.2)",
                        borderRadius: "50%",
                        marginBottom: "1rem"
                    }}>
                        <LogIn size={40} style={{ color: "var(--primary)" }} />
                    </div>
                    <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                        Restaurante <span style={{ color: "var(--primary)" }}>CRM</span>
                    </h1>
                    <p style={{ color: "var(--text-muted)" }}>
                        Ingresa tus credenciales para continuar
                    </p>
                    <p style={{ color: "var(--text-muted)" }}>
                        hola mundo
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div>
                        <label
                            htmlFor="email"
                            style={{
                                display: "block",
                                marginBottom: "0.5rem",
                                fontWeight: "500",
                                color: "var(--text-muted)"
                            }}
                        >
                            Correo Electrónico
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="usuario@restaurant.com"
                            style={{
                                width: "100%",
                                padding: "0.875rem",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                background: "rgba(0,0,0,0.3)",
                                color: "white",
                                fontSize: "1rem",
                                transition: "border-color 0.2s"
                            }}
                            onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                            onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            style={{
                                display: "block",
                                marginBottom: "0.5rem",
                                fontWeight: "500",
                                color: "var(--text-muted)"
                            }}
                        >
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                            style={{
                                width: "100%",
                                padding: "0.875rem",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                background: "rgba(0,0,0,0.3)",
                                color: "white",
                                fontSize: "1rem",
                                transition: "border-color 0.2s"
                            }}
                            onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                            onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: "0.875rem",
                            borderRadius: "8px",
                            background: "rgba(239, 68, 68, 0.2)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            color: "#fca5a5",
                            fontSize: "0.9rem"
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{
                            width: "100%",
                            padding: "1rem",
                            fontSize: "1rem",
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? "not-allowed" : "pointer"
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                                Iniciando sesión...
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                Iniciar Sesión
                            </>
                        )}
                    </button>
                </form>

                <div style={{
                    marginTop: "2rem",
                    padding: "1rem",
                    background: "rgba(59, 130, 246, 0.1)",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)"
                }}>
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
