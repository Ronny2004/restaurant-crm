"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { updatePasswordAdmin } from "./actions";



function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        async function validateToken() {
            if (!token) {
                setStatus('invalid');
                return;
            }

            // Validar el token en nuestra tabla personalizada
            const { data, error: fetchError } = await supabase
                .from("password_resets")
                .select("email, expires_at, used")
                .eq("token", token)
                .single();

            if (fetchError || !data || data.used || new Date(data.expires_at) < new Date()) {
                setStatus('invalid');
            } else {
                setEmail(data.email);
                setStatus('valid');
            }
        }
        validateToken();
    }, [token]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setUpdating(true);

        try {
            // LLAMADA AL SERVER ACTION DE ADMIN
            const result = await updatePasswordAdmin(token!, password);

            if (result.error) {
                setError(result.error);
            } else {
                setStatus('success');
                setTimeout(() => router.push("/login"), 3000);
            }
        } catch (err: any) {
            setError("Error inesperado al conectar con el servidor.");
        } finally {
            setUpdating(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="spin" size={40} style={{ color: "var(--primary)" }} />
                <p style={{ color: "rgba(255,255,255,0.6)" }}>Validando enlace de seguridad...</p>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="text-center">
                <AlertCircle size={50} style={{ color: "#ef4444", marginBottom: "1rem" }} />
                <h1 style={{ color: "#fff", marginBottom: "1rem" }}>Enlace Inválido</h1>
                <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "2rem" }}>
                    El enlace ha expirado o ya fue utilizado. Por favor, solicita uno nuevo.
                </p>
                <button 
                    onClick={() => router.push("/forgot-password")}
                    className="btn btn-primary"
                    style={{ padding: "0.8rem 1.5rem" }}
                >
                    Volver a intentar
                </button>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="text-center">
                <CheckCircle2 size={60} style={{ color: "#10b981", marginBottom: "1rem" }} />
                <h1 style={{ color: "#fff", marginBottom: "0.5rem" }}>¡Todo listo!</h1>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>
                    Tu contraseña ha sido actualizada correctamente. 
                    Redirigiendo al login...
                </p>
            </div>
        );
    }

    return (
        <div style={{ width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.8rem", color: "#fff", marginBottom: "0.5rem" }}>Nueva Contraseña</h1>
                <p style={{ color: "rgba(255,255,255,0.6)" }}>Restableciendo acceso para: <strong>{email}</strong></p>
            </div>

            <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div style={{ position: "relative" }}>
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Nueva contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={inputStyle}
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={eyeButtonStyle}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={inputStyle}
                />

                {error && (
                    <div style={errorStyle}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={updating}
                    className="btn btn-primary"
                    style={{ 
                        width: "100%", 
                        padding: "1rem", 
                        background: "var(--primary)",
                        opacity: updating ? 0.7 : 1,
                        cursor: updating ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem"
                    }}
                >
                    {updating ? <Loader2 className="spin" size={20} /> : null}
                    {updating ? "Guardando..." : "Actualizar Contraseña"}
                </button>
            </form>
        </div>
    );
}

// Estilos rápidos para mantener el diseño Glass
const inputStyle = {
    width: "100%",
    padding: "0.875rem",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(0, 0, 0, 0.3)",
    color: "#fff",
    fontSize: "1rem"
};

const eyeButtonStyle = {
    position: "absolute" as "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.5)",
    cursor: "pointer"
};

const errorStyle = {
    padding: "0.8rem",
    background: "rgba(239, 68, 68, 0.1)",
    color: "#fca5a5",
    borderRadius: "8px",
    fontSize: "0.85rem",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
};

// Componente principal con Suspense (Requerido por Next.js al usar useSearchParams)
export default function ResetPasswordPage() {
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
                background: "rgba(255, 255, 255, 0.03)"
            }}>
                <Suspense fallback={<Loader2 className="spin" />}>
                    <ResetPasswordContent />
                </Suspense>
            </div>
            <style jsx>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}