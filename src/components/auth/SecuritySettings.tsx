"use client";

import { useState } from "react";
import { KeyRound, Loader2, Save } from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { PinInput } from "@/components/auth/PinInput";

export function SecuritySettings({ isAdmin }: { isAdmin: boolean }) {
    const [currentPin, setCurrentPin] = useState("");
    const [newPin, setNewPin] = useState("");
    const [pinConfirmation, setPinConfirmation] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [pinMessage, setPinMessage] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");
    const [loading, setLoading] = useState<"pin" | "password" | null>(null);

    const changePin = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading("pin");
        setPinMessage("");
        try {
            const response = await fetch("/api/account/pin", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPin,
                    newPin,
                    confirmation: pinConfirmation,
                }),
            });
            const data = await response.json() as { ok: boolean; message?: string };
            setPinMessage(data.message || (data.ok ? "PIN actualizado" : "No se pudo actualizar"));
            if (data.ok) {
                setCurrentPin("");
                setNewPin("");
                setPinConfirmation("");
            }
        } catch {
            setPinMessage("No fue posible conectar con el servidor");
        } finally {
            setLoading(null);
        }
    };

    const changePassword = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading("password");
        setPasswordMessage("");
        try {
            const response = await fetch("/api/account/password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmation: passwordConfirmation,
                }),
            });
            const data = await response.json() as { ok: boolean; message?: string };
            setPasswordMessage(
                data.message || (data.ok ? "Contraseña actualizada" : "No se pudo actualizar"),
            );
            if (data.ok) {
                setCurrentPassword("");
                setNewPassword("");
                setPasswordConfirmation("");
            }
        } catch {
            setPasswordMessage("No fue posible conectar con el servidor");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="security-settings-grid">
            {!isAdmin && (
                <section className="glass-panel security-card">
                    <h2><KeyRound size={22} /> Cambiar PIN</h2>
                    <form className="auth-form" onSubmit={changePin}>
                        <label className="pin-label">
                            PIN actual
                            <PinInput value={currentPin} onChange={setCurrentPin} />
                        </label>
                        <label className="pin-label">
                            PIN nuevo
                            <PinInput value={newPin} onChange={setNewPin} />
                        </label>
                        <label className="pin-label">
                            Confirmar PIN nuevo
                            <PinInput
                                value={pinConfirmation}
                                onChange={setPinConfirmation}
                            />
                        </label>
                        <AuthMessage
                            message={pinMessage}
                            type={pinMessage === "PIN actualizado" ? "success" : "error"}
                        />
                        <button className="btn btn-primary" disabled={loading !== null}>
                            {loading === "pin" ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Guardar PIN
                        </button>
                    </form>
                </section>
            )}

            <section className="glass-panel security-card">
                <h2><KeyRound size={22} /> Cambiar contraseña</h2>
                <form className="auth-form" onSubmit={changePassword}>
                    <label>
                        Contraseña actual
                        <input
                            required
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)}
                        />
                    </label>
                    <label>
                        Contraseña nueva
                        <input
                            required
                            type="password"
                            minLength={10}
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                        />
                    </label>
                    <label>
                        Confirmar contraseña
                        <input
                            required
                            type="password"
                            minLength={10}
                            autoComplete="new-password"
                            value={passwordConfirmation}
                            onChange={(event) => setPasswordConfirmation(event.target.value)}
                        />
                    </label>
                    <p className="auth-help">
                        Mínimo 10 caracteres, mayúscula, minúscula y número.
                    </p>
                    <AuthMessage
                        message={passwordMessage}
                        type={
                            passwordMessage === "Contraseña actualizada"
                                ? "success"
                                : "error"
                        }
                    />
                    <button className="btn btn-primary" disabled={loading !== null}>
                        {loading === "password" ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Guardar contraseña
                    </button>
                </form>
            </section>
        </div>
    );
}
