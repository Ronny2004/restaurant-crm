"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, Lock, LogOut, Shield, Camera, Calendar, UserCircle, Phone, Save, Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { Header } from "@/components/layout/Header";

export default function ProfilePage() {
    const { profile, loading: authLoading, signOut } = useAuth();
    const router = useRouter();
    const toast = useToast();

    // Estados para Datos Personales
    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        birth_date: "",
        gender: ""
    });

    // Estados para Seguridad y UI
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

    // Cargar datos actuales del perfil
    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || "",
                phone: profile.phone || "",
                birth_date: profile.birth_date || "",
                gender: profile.gender || ""
            });
        }
    }, [profile]);

    if (authLoading) {
        return (
            <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={48} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    if (!profile) {
        router.push("/login");
        return null;
    }

    // --- LÓGICA DE SUBIDA DE FOTO ---
    const uploadAvatar = async (event: any) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) return;

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // 1. Subir a Storage (Asegúrate de crear el bucket 'avatar_image' en Supabase)
            const { error: uploadError } = await supabase.storage
                .from('avatar_image')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Obtener URL pública
            const { data: { publicUrl } } = supabase.storage.from('avatar_image').getPublicUrl(filePath);

            // 3. Actualizar tabla profiles
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            toast("¡Foto de perfil actualizada!", "success");
            window.location.reload(); // Recargamos para ver los cambios
        } catch (error: any) {
            toast(error.message, "error");
        } finally {
            setUploading(false);
        }
    };

    // --- LÓGICA DE GUARDAR DATOS PERSONALES ---
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update(formData)
                .eq('id', profile.id);

            if (error) throw error;
            toast("Datos personales actualizados correctamente", "success");
        } catch (error: any) {
            toast("Error al actualizar perfil", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // --- LÓGICA DE CAMBIO DE CLAVE ---
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast("Las contraseñas no coinciden", "error");
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast("Contraseña actualizada", "success");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast(error.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const traducirRol = (rol: string) => {
        switch (rol) {
            case 'admin': return { texto: 'Admin', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' };
            case 'waiter': return { texto: 'Mesero', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' };
            case 'chef': return { texto: 'Chef', color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)' };
            default: return { texto: rol, color: '#fff', bg: 'rgba(255,255,255,0.1)' };
        }
    };

    const rolVisual = traducirRol(profile.role);

    return (
        <div className="container">
            <Header />

            <div style={{ maxWidth: "900px", margin: "2rem auto" }}>
                
                {/* CABECERA DE PERFIL */}
                <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
                    <div style={{ position: "relative" }}>
                        <div style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", border: `3px solid ${rolVisual.color}`, background: "#1e293b" }}>
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <User size={60} color="var(--text-muted)" />
                                </div>
                            )}
                        </div>
                        <label style={{ 
                            position: "absolute", bottom: "5px", right: "5px", 
                            background: "var(--primary)", padding: "8px", borderRadius: "50%", 
                            cursor: "pointer", display: "flex", alignItems: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.5)" 
                        }}>
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} color="white" />}
                            <input type="file" hidden accept="image/*" onChange={uploadAvatar} disabled={uploading} />
                        </label>
                    </div>

                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>{formData.full_name || profile.username}</h1>
                        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>@{profile.username}</p>
                        <span style={{ background: rolVisual.bg, color: rolVisual.color, padding: "0.3rem 1rem", borderRadius: "99px", fontSize: "0.85rem", fontWeight: "bold" }}>
                            {rolVisual.texto}
                        </span>
                    </div>

                    <button onClick={signOut} className="btn btn-danger" style={{ display: "flex", gap: "0.5rem" }}>
                        <LogOut size={18} /> Salir
                    </button>
                </div>

                {/* SELECTOR DE PESTAÑAS */}
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
                    <button 
                        onClick={() => setActiveTab('info')}
                        style={{ 
                            padding: "0.75rem 1.5rem", borderRadius: "8px", border: "none", cursor: "pointer",
                            background: activeTab === 'info' ? "var(--primary)" : "rgba(255,255,255,0.05)",
                            color: activeTab === 'info' ? "white" : "var(--text-muted)", fontWeight: "bold"
                        }}
                    >
                        Información Personal
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        style={{ 
                            padding: "0.75rem 1.5rem", borderRadius: "8px", border: "none", cursor: "pointer",
                            background: activeTab === 'security' ? "var(--primary)" : "rgba(255,255,255,0.05)",
                            color: activeTab === 'security' ? "white" : "var(--text-muted)", fontWeight: "bold"
                        }}
                    >
                        Seguridad
                    </button>
                </div>

                {/* CONTENIDO PESTAÑA INFO */}
                {activeTab === 'info' && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <form onSubmit={handleUpdateProfile} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                            <div style={{ gridColumn: "span 2" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)" }}>Nombre Completo</label>
                                <input 
                                    type="text" 
                                    value={formData.full_name} 
                                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                    placeholder="Ej. Michael Villarreal Jara"
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)" }}>Teléfono / WhatsApp</label>
                                <input 
                                    type="text" 
                                    value={formData.phone} 
                                    onChange={(e) => {
                                        // 1. Limpiamos: Solo permitimos números y el símbolo '+'
                                        let val = e.target.value.replace(/[^\d+]/g, '');

                                        // 2. Si escriben "9" al inicio, autocompletamos sin espacios para que cuadren los 13 caracteres
                                        if (val === "9") {
                                            val = "+5939";
                                        }

                                        // 3. Calculamos el límite máximo según el inicio
                                        let maxLen = 17; // Por defecto para otros países (+)
                                        
                                        if (val.startsWith("+593")) {
                                            maxLen = 13;
                                        } else if (val.startsWith("09")) {
                                            maxLen = 10;
                                        } else if (val.startsWith("+")) {
                                            maxLen = 17; // Cualquier otro código de país
                                        }

                                        // 4. Cortamos el string si se pasa del límite calculado
                                        if (val.length > maxLen) {
                                            val = val.slice(0, maxLen);
                                        }

                                        setFormData({...formData, phone: val});
                                    }}
                                    placeholder="Ej. +593 *** *** **** o 09* *** ****"
                                    style={{ width: "100%", padding: "0.75rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", color: "white", borderRadius: "8px" }}
                                />
                                {/* Pequeño texto de ayuda dinámico debajo del input */}
                                <small style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.3rem", display: "block" }}>
                                    {formData.phone.startsWith("+593") ? "Formato Ecuador: Máx 13 caracteres" : 
                                    formData.phone.startsWith("09") ? "Formato Local: Máx 10 caracteres" : 
                                    formData.phone.startsWith("+") ? "Formato Internacional: Máx 17 caracteres" : ""}
                                </small>
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)" }}>Género</label>
                                
                                {/* FALSO SELECT PERSONALIZADO */}
                                <div style={{ position: "relative" }}>
                                    <div 
                                        onClick={() => {
                                            // Creamos un pequeño toggle en línea para abrir/cerrar
                                            const el = document.getElementById('custom-gender-dropdown');
                                            if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                                        }}
                                        style={{ 
                                            width: "100%", 
                                            padding: "0.58rem", 
                                            background: "rgba(0,0,0,0.2)", 
                                            border: "1px solid var(--border)", 
                                            color: formData.gender ? "white" : "var(--text-muted)", 
                                            borderRadius: "8px",
                                            cursor: "pointer",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}
                                    >
                                        <span>{formData.gender || "Seleccionar..."}</span>
                                        <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>▼</span>
                                    </div>

                                    {/* LISTA DESPLEGABLE */}
                                    <div 
                                        id="custom-gender-dropdown"
                                        style={{ 
                                            display: "none", 
                                            position: "absolute", 
                                            top: "105%", 
                                            left: 0, 
                                            width: "100%", 
                                            background: "#0f172a", // Fondo oscuro que combina con tu app
                                            border: "1px solid var(--border)", 
                                            borderRadius: "8px", 
                                            zIndex: 50, 
                                            overflow: "hidden",
                                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.8)"
                                        }}
                                    >
                                        {["Masculino", "Femenino", "Otro"].map((opcion) => (
                                            <div 
                                                key={opcion}
                                                onClick={() => {
                                                    setFormData({...formData, gender: opcion});
                                                    document.getElementById('custom-gender-dropdown')!.style.display = 'none';
                                                }}
                                                style={{ 
                                                    padding: "0.75rem 1rem", 
                                                    cursor: "pointer", 
                                                    color: "white",
                                                    transition: "background 0.2s"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                            >
                                                {opcion}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* OVERLAY INVISIBLE PARA CERRAR AL HACER CLIC AFUERA */}
                                    <div 
                                        onClick={() => document.getElementById('custom-gender-dropdown')!.style.display = 'none'}
                                        style={{
                                            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 49,
                                            display: "none" // Se maneja por CSS indirecto, pero para simplificar, se cierra al hacer clic en las opciones
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ gridColumn: "span 2" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)" }}>Fecha de Nacimiento</label>
                                <input 
                                    type="date" 
                                    value={formData.birth_date} 
                                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                                    // ESTA LÍNEA ES LA SOLUCIÓN: Limita la fecha máxima al día de hoy
                                    max={new Date().toISOString().split("T")[0]} 
                                    // OPCIONAL: Si quieres evitar que pongan fechas como el año 0001
                                    min="1900-01-01" 
                                    style={{ 
                                        width: "100%", 
                                        padding: "0.75rem", 
                                        background: "rgba(0,0,0,0.2)", 
                                        border: "1px solid var(--border)", 
                                        color: "white", 
                                        borderRadius: "8px",
                                        colorScheme: "dark", 
                                        cursor: "text" 
                                    }}
                                />
                            </div>

                            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ gridColumn: "span 2", padding: "1rem", display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Guardar Cambios
                            </button>
                        </form>
                    </div>
                )}

                {/* CONTENIDO PESTAÑA SEGURIDAD (Reutilizamos tu código anterior) */}
                {activeTab === 'security' && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <h3 style={{ marginBottom: "1.5rem" }}>Cambiar Contraseña</h3>
                        <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva Contraseña" />
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar Nueva Contraseña" />
                            <button type="submit" disabled={isSaving || !newPassword} className="btn btn-primary">Actualizar Contraseña</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}