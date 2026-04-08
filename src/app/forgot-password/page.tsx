"use client";

import { useState } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
// IMPORTANTE: Importamos el Action que creamos
import { handlePasswordResetRequest } from "./actions";

export default function ForgotPasswordPage() {
    const [identifier, setIdentifier] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sent) return;

        setLoading(true);
        setError("");

        try {
            // LLAMADA AL SERVER ACTION
            // Esta función ya se encarga de buscar el email por RPC, 
            // crear el token en la DB y enviar el correo con EmailJS.
            const result = await handlePasswordResetRequest(identifier);

            if (result?.success) {
                setSent(true);
                setLoading(false);
                setMessage(`¡Enlace enviado con éxito! Revisa el correo asociado a tu cuenta.`);
            } else {
                setError(result?.error || "No se pudo procesar la solicitud.");
                setLoading(false);
            }
        } catch (err) {
            setError("Ocurrió un error inesperado al conectar con el servidor.");
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="glass-panel" style={{ maxWidth: "450px", width: "100%", padding: "3rem" }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{ display: "inline-flex", padding: "1rem", background: "rgba(245, 158, 11, 0.2)", borderRadius: "50%", marginBottom: "1rem" }}>
                        <Mail size={40} style={{ color: "var(--primary)" }} />
                    </div>
                    <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Recuperar Acceso</h1>
                    <p style={{ color: "var(--text-muted)" }}>Ingresa tu usuario o correo electrónico</p>
                </div>

                <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ position: "relative" }}>
                        <input
                            type="text"
                            placeholder="Usuario o Email"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            disabled={sent}
                            required
                            style={{
                                width: "100%", padding: "0.875rem", borderRadius: "8px", 
                                border: "1px solid var(--border)", background: "rgba(0,0,0,0.3)", 
                                color: sent ? "var(--text-muted)" : "white", fontSize: "1rem",
                                opacity: sent ? 0.6 : 1
                            }}
                        />
                    </div>
                    
                    {error && (
                        <div style={{ padding: "0.8rem", background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading || sent} 
                        className="btn btn-primary" 
                        style={{ 
                            width: "100%", 
                            padding: "1rem", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            gap: "0.5rem",
                            background: sent ? "#10b981" : "var(--primary)",
                            borderColor: sent ? "#10b981" : "var(--primary)",
                            cursor: (loading || sent) ? "not-allowed" : "pointer",
                            transition: "all 0.3s ease"
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="spin" size={20} />
                                Enviando...
                            </>
                        ) : sent ? (
                            <>
                                <CheckCircle size={20} />
                                Enviado con éxito
                            </>
                        ) : (
                            "Enviar Instrucciones"
                        )}
                    </button>
                </form>

                {message && (
                    <div style={{ 
                        marginTop: "1.5rem",
                        padding: "1rem", 
                        background: "rgba(16, 185, 129, 0.1)", 
                        color: "#6ee7b7", 
                        borderRadius: "8px", 
                        textAlign: "center", 
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        fontSize: "0.9rem"
                    }}>
                        {message}
                    </div>
                )}

                <div style={{ marginTop: "2rem", textAlign: "center" }}>
                    <Link href="/login" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                        <ArrowLeft size={16} /> Volver al Login
                    </Link>
                </div>
            </div>
            
            <style jsx>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}