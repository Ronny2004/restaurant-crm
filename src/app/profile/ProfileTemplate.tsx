"use client";

import { Header } from "@/components/layout/Header";
import { UserCircle, Target, Loader2, Calendar, X } from "lucide-react";

interface ProfileTemplateProps {
    profile: any;
    roleStyle: { label: string, color: string, bg: string };
    metrics: any[];
    isLoadingStats: boolean;
    activeModal: string | null;
    setActiveModal: (modal: string | null) => void;
    modalContent?: React.ReactNode; // El contenido del modal inyectado
    children?: React.ReactNode;     // El contenido extra (ej. Historial) inyectado
}

export function ProfileTemplate({ 
    profile, roleStyle, metrics, isLoadingStats, 
    activeModal, setActiveModal, modalContent, children 
}: ProfileTemplateProps) {
    return (
        <div className="container">
            <Header />

            <div style={{ maxWidth: "1000px", margin: "2rem auto", display: "flex", flexDirection: "column", gap: "2.5rem", paddingBottom: "4rem" }}>
                
                {/* CABECERA VISUAL UNIVERSAL */}
                <div className="glass-panel" style={{ padding: "2.5rem", display: "flex", alignItems: "center", gap: "2.5rem", flexWrap: "wrap" }}>
                    <div style={{ position: "relative" }}>
                        <div style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", border: `3px solid ${roleStyle.color}`, background: "#1e293b", boxShadow: `0 0 20px ${roleStyle.bg}` }}>
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><UserCircle size={60} color="var(--text-muted)" /></div>
                            )}
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                            <h1 style={{ fontSize: "2.2rem", margin: 0 }}>{profile.full_name || profile.username}</h1>
                            <span style={{ background: roleStyle.bg, color: roleStyle.color, padding: "0.3rem 0.8rem", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>{roleStyle.label}</span>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            @{profile.username} • <Calendar size={16} /> Equipo LDM
                        </p>
                    </div>
                </div>

                {/* DASHBOARD DE MÉTRICAS MÁGICO Y VACÍO */}
                <div>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}><Target size={24} color="var(--primary)" /> Mi Rendimiento ({roleStyle.label})</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                        {metrics.map((metric, idx) => {
                            const Icon = metric.icon;
                            return (
                                <div 
                                    key={idx} className="glass-panel" onClick={() => metric.action && setActiveModal(metric.action)}
                                    style={{ padding: "2rem", cursor: metric.action ? "pointer" : "default", transition: "transform 0.2s, box-shadow 0.2s" }}
                                    onMouseEnter={(e) => { if (metric.action) { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = `0 10px 20px ${metric.bg}`; } }}
                                    onMouseLeave={(e) => { if (metric.action) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; } }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: "1rem" }}>
                                            <p style={{ color: "var(--text-muted)", margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>{metric.label}</p>
                                            <span style={{ fontSize: "1.8rem", fontWeight: "bold", lineHeight: "1.2", color: metric.color, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {isLoadingStats ? <Loader2 className="animate-spin" size={28} color="white" /> : metric.value}
                                            </span>
                                        </div>
                                        <div style={{ padding: "0.75rem", borderRadius: "12px", background: metric.bg, flexShrink: 0 }}><Icon color={metric.color} size={28} /></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* CONTENIDO EXTRA (Ej. Historial, Pestañas) */}
                {children}

                {/* EL CASCARÓN DEL MODAL (Solo se dibuja si hay un activeModal) */}
                {activeModal && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }} onClick={() => setActiveModal(null)}>
                        <div className="glass-panel" style={{ padding: "2.5rem", maxWidth: "900px", width: "90%", maxHeight: "85vh", overflowY: "auto", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setActiveModal(null)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.5rem" }}><X size={28} /></button>
                            
                            {/* AQUI ATERRIZA EL DISEÑO ESPECÍFICO DEL ROL PARA EL MODAL */}
                            {modalContent}

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}