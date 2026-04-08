"use client";

import { useState } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
// Importamos la acción del servidor
import { handlePasswordResetRequest } from "./actions";

export default function ForgotPasswordPage() {
    const [identifier, setIdentifier] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sent || loading) return;

        setLoading(true);
        setError("");
        setMessage("");

        try {
            // Llamamos al Server Action que procesa todo en el servidor
            const result = await handlePasswordResetRequest(identifier);

            if (result?.success) {
                setSent(true);
                setMessage(`¡Enlace enviado! Revisa el correo asociado a la cuenta.`);
            } else {
                // El error viene del Action (ej: Usuario no encontrado)
                setError(result?.error || "No se pudo procesar la solicitud.");
            }
        } catch (err) {
            setError("Ocurrió un error inesperado de conexión.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ 
            minHeight: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)"
        }}>
            <div className="glass-panel" style={{ 
                maxWidth: "450px", 
                width: "90%", 
                padding: "3rem",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(12px)",
                background: "rgba(255, 255, 255, 0.03)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{ 
                        display: "inline-flex", 
                        padding: "1rem", 
                        background: sent ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", 
                        borderRadius: "50%", 
                        marginBottom: "1rem" 
                    }}>
                        {sent ? (
                            <CheckCircle size={40} style={{ color: "#10b981" }} />
                        ) : (
                            <Mail size={40} style={{ color: "#f59e0b" }} />
                        )}
                    </div>
                    <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem", color: "#fff" }}>
                        {sent ? "¡Revisa tu bandeja!" : "Recuperar Acceso"}
                    </h1>
                    <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.95rem" }}>
                        {sent 
                            ? "Hemos enviado las instrucciones a tu correo." 
                            : "Ingresa tu usuario o correo para recibir un enlace."}
                    </p>
                </div>

                {!sent ? (
                    <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div style={{ position: "relative" }}>
                            <input
                                type="text"
                                placeholder="Usuario o Email"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "0.875rem",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    background: "rgba(0, 0, 0, 0.2)",
                                    color: "#fff",
                                    fontSize: "1rem",
                                    outline: "none",
                                    transition: "border-color 0.2s"
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                                onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.1)"}
                            />
                        </div>
                        
                        {error && (
                            <div style={{ 
                                padding: "0.8rem", 
                                background: "rgba(239, 68, 68, 0.1)", 
                                color: "#fca5a5", 
                                borderRadius: "8px", 
                                fontSize: "0.85rem", 
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem"
                            }}>
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading} 
                            style={{ 
                                width: "100%", 
                                padding: "1rem", 
                                borderRadius: "8px",
                                background: "#f59e0b",
                                color: "#000",
                                fontWeight: "600",
                                border: "none",
                                cursor: loading ? "not-allowed" : "pointer",
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                gap: "0.6rem",
                                transition: "transform 0.2s, opacity 0.2s",
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="spin" size={20} />
                                    Buscando usuario...
                                </>
                            ) : (
                                "Enviar Instrucciones"
                            )}
                        </button>
                    </form>
                ) : (
                    <div style={{ 
                        padding: "1.2rem", 
                        background: "rgba(16, 185, 129, 0.1)", 
                        color: "#6ee7b7", 
                        borderRadius: "8px", 
                        textAlign: "center", 
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        fontSize: "0.9rem",
                        lineHeight: "1.5"
                    }}>
                        {message}
                    </div>
                )}

                <div style={{ marginTop: "2rem", textAlign: "center" }}>
                    <Link href="/login" style={{ 
                        color: "rgba(255, 255, 255, 0.5)", 
                        textDecoration: "none", 
                        fontSize: "0.9rem", 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "0.5rem",
                        transition: "color 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = "#fff"}
                    onMouseOut={(e) => e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)"}
                    >
                        <ArrowLeft size={16} /> Volver al Login
                    </Link>
                </div>
            </div>
            
            <style jsx>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 
                    from { transform: rotate(0deg); } 
                    to { transform: rotate(360deg); } 
                }
            `}</style>
        </div>
    );
}