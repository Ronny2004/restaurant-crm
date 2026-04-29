"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Header } from "@/components/layout/Header";
import { 
    UserCircle, TrendingUp, CheckCircle, Activity, 
    Clock, Loader2, Calendar, Target, ChefHat, 
    AlertTriangle, Users, DollarSign, Receipt
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

// Importamos los dos sub-componentes que creaste
import { AuditoriaEmpleados } from "./auditoriaEmpleados";
import { AdminMetricsModals } from "./AdminMetricsModals";

export default function ProfileDashboardPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const toast = useToast();

    // Estados
    const [activeTab, setActiveTab] = useState<'info' | 'audit'>('info');
    const [activeAdminModal, setActiveAdminModal] = useState<string | null>(null); // Estado para los modales de tarjetas
    const [metrics, setMetrics] = useState<any[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        if (!authLoading && !profile) {
            router.push("/login");
        } else if (profile) {
            if (profile.role === 'admin') {
                setActiveTab('audit');
            } else {
                setActiveTab('info');
            }
            fetchRoleSpecificStats();
        }
    }, [profile, authLoading, router]);

    const fetchRoleSpecificStats = async () => {
        try {
            setIsLoadingStats(true);
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            // --- MESERO ---
            if (profile?.role === 'waiter') {
                const { count } = await supabase.from('orders')
                    .select('*', { count: 'exact' })
                    .eq('waiter_id', profile.id)
                    .gte('created_at', startOfDay.toISOString());
                
                setMetrics([
                    { label: "Pedidos Tomados", value: count || 0, icon: CheckCircle, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
                    { label: "Productividad", value: (count || 0) > 15 ? "Alta 🔥" : "Normal", icon: Activity, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
                    { label: "Mesas Activas", value: "3", icon: Users, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" }
                ]);

            // --- COCINERO ---
            } else if (profile?.role === 'chef') {
                const { data, count } = await supabase.from('orders')
                    .select('created_at, updated_at')
                    .eq('status', 'served') 
                    .gte('created_at', startOfDay.toISOString());

                let myAvgTime = "Sin datos";
                if (data && data.length > 0) {
                    const totalMs = data.reduce((acc, curr) => {
                        const start = new Date(curr.created_at).getTime();
                        const end = new Date(curr.updated_at).getTime();
                        return acc + (end - start);
                    }, 0);
                    const avgMin = Math.round((totalMs / data.length) / (1000 * 60));
                    myAvgTime = `${avgMin} min`;
                }

                setMetrics([
                    { label: "Platos Despachados", value: count || 0, icon: ChefHat, color: "#f97316", bg: "rgba(249, 115, 22, 0.1)" },
                    { label: "Tu Tiempo Promedio", value: myAvgTime, icon: Clock, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
                    { label: "Alertas Stock", value: "0", icon: AlertTriangle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" }
                ]);

            // --- CAJERO ---
            } else if (profile?.role === 'cashier') {
                const { data } = await supabase.from('orders')
                    .select('total')
                    .eq('is_paid', true)
                    .gte('created_at', startOfDay.toISOString());
                
                const totalGanado = data?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;

                setMetrics([
                    { label: "Tickets Cobrados", value: data?.length || 0, icon: Receipt, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
                    { label: "Ingresos del Turno", value: `$${totalGanado.toFixed(2)}`, icon: DollarSign, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
                    { label: "Cierre de Caja", value: "Pendiente", icon: Clock, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" }
                ]);

            // --- ADMIN ---
            } else if (profile?.role === 'admin') {
                const { data: kitchenData } = await supabase.from('orders')
                    .select('created_at, updated_at')
                    .eq('status', 'served')
                    .gte('created_at', startOfDay.toISOString());

                let globalAvgTime = "N/A";
                if (kitchenData && kitchenData.length > 0) {
                    const totalMs = kitchenData.reduce((acc, curr) => {
                        const start = new Date(curr.created_at).getTime();
                        const end = new Date(curr.updated_at).getTime();
                        return acc + (end - start);
                    }, 0);
                    const avgMin = Math.round((totalMs / kitchenData.length) / (1000 * 60));
                    globalAvgTime = `${avgMin} min`;
                }

                setMetrics([
                    // NOTA: Aquí agregamos la propiedad "action" para que abran los modales
                    { label: "Personal Activo", value: "4", icon: Users, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", action: 'employees' },
                    { label: "Velocidad de Cocina", value: globalAvgTime, icon: Clock, color: "#f97316", bg: "rgba(249, 115, 22, 0.1)", action: 'kitchen' },
                    { label: "Alertas de Stock", value: "1 Nueva", icon: AlertTriangle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", action: 'stock' }
                ]);
            }

        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    if (authLoading || !profile) return null;

    const handleRequestInventory = () => {
        toast("Se ha enviado una notificación al Administrador para reabastecer el inventario.", "success");
    };

    const roleStyles: Record<string, { label: string, color: string, bg: string }> = {
        'admin': { label: 'Administrador', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' },
        'waiter': { label: 'Mesero', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },
        'chef': { label: 'Cocinero', color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)' },
        'cashier': { label: 'Cajero', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' },
    };
    const roleStyle = roleStyles[profile.role] || { label: profile.role, color: 'white', bg: 'rgba(255,255,255,0.1)' };

    return (
        <div className="container">
            <Header />

            <div style={{ maxWidth: "1000px", margin: "2rem auto", display: "flex", flexDirection: "column", gap: "2.5rem", paddingBottom: "4rem" }}>
                
                {/* 1. CABECERA VISUAL */}
                <div className="glass-panel" style={{ padding: "2.5rem", display: "flex", alignItems: "center", gap: "2.5rem", flexWrap: "wrap" }}>
                    <div style={{ position: "relative" }}>
                        <div style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", border: `3px solid ${roleStyle.color}`, background: "#1e293b", boxShadow: `0 0 20px ${roleStyle.bg}` }}>
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <UserCircle size={60} color="var(--text-muted)" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                            <h1 style={{ fontSize: "2.2rem", margin: 0 }}>{profile.full_name || profile.username}</h1>
                            <span style={{ background: roleStyle.bg, color: roleStyle.color, padding: "0.3rem 0.8rem", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                                {roleStyle.label}
                            </span>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            @{profile.username} • <Calendar size={16} /> Miembro del equipo
                        </p>
                    </div>
                </div>

                {/* 2. DASHBOARD (Tarjetas Clickeables) */}
                <div>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Target size={24} color="var(--primary)" /> Mi Rendimiento ({roleStyle.label})
                    </h2>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                        {metrics.map((metric, idx) => {
                            const Icon = metric.icon;
                            return (
                                <div 
                                    key={idx} 
                                    className="glass-panel" 
                                    onClick={() => metric.action && setActiveAdminModal(metric.action)}
                                    style={{ 
                                        padding: "2rem", 
                                        cursor: metric.action ? "pointer" : "default",
                                        transition: "transform 0.2s, box-shadow 0.2s" 
                                    }}
                                    onMouseEnter={(e) => {
                                        if (metric.action) {
                                            e.currentTarget.style.transform = "translateY(-5px)";
                                            e.currentTarget.style.boxShadow = `0 10px 20px ${metric.bg}`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (metric.action) {
                                            e.currentTarget.style.transform = "translateY(0)";
                                            e.currentTarget.style.boxShadow = "none";
                                        }
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: "1rem" }}>
                                            <p style={{ color: "var(--text-muted)", margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>{metric.label}</p>
                                            <span style={{ fontSize: "1.8rem", fontWeight: "bold", lineHeight: "1.2", color: metric.color, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {isLoadingStats ? <Loader2 className="animate-spin" size={28} color="white" /> : metric.value}
                                            </span>
                                        </div>
                                        <div style={{ padding: "0.75rem", borderRadius: "12px", background: metric.bg, flexShrink: 0 }}>
                                            <Icon color={metric.color} size={28} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 3. SELECTOR DE PESTAÑAS (Solo visible para el Admin) */}
                {profile.role === 'admin' && (
                    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                        <button 
                            onClick={() => setActiveTab('audit')}
                            style={{ 
                                padding: "0.75rem 1.5rem", borderRadius: "8px", border: "none", cursor: "pointer",
                                background: activeTab === 'audit' ? "var(--primary)" : "rgba(255,255,255,0.05)",
                                color: activeTab === 'audit' ? "white" : "var(--text-muted)", fontWeight: "bold",
                                transition: "all 0.2s"
                            }}
                        >
                            Auditoría de Empleados
                        </button>
                        <button 
                            onClick={() => setActiveTab('info')}
                            style={{ 
                                padding: "0.75rem 1.5rem", borderRadius: "8px", border: "none", cursor: "pointer",
                                background: activeTab === 'info' ? "var(--primary)" : "rgba(255,255,255,0.05)",
                                color: activeTab === 'info' ? "white" : "var(--text-muted)", fontWeight: "bold",
                                transition: "all 0.2s"
                            }}
                        >
                            Información y Actividad
                        </button>
                    </div>
                )}

                {/* 4. CONTENIDO DE PESTAÑAS */}
                {activeTab === 'info' && (
                    <>
                        {profile.role === 'chef' && (
                            <div className="glass-panel" style={{ padding: "2rem", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#ef4444" }}>
                                    <AlertTriangle size={20} /> Solicitar Insumos a Administración
                                </h3>
                                <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>¿Te quedaste sin ingredientes? Envía una alerta rápida al administrador para que reabastezca el inventario.</p>
                                <button onClick={handleRequestInventory} className="btn" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.5)", width: "100%", padding: "1rem", display: "flex", justifyContent: "center", gap: "0.5rem", fontSize: "1.1rem" }}>
                                    <AlertTriangle size={20} /> Enviar Alerta de Stock
                                </button>
                            </div>
                        )}

                        {profile.role === 'admin' && (
                            <div className="glass-panel" style={{ padding: "2rem", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#8b5cf6" }}>
                                    <Users size={20} /> Auditoría Completa del Restaurante
                                </h3>
                                <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                                    Accede al historial completo de facturación, pedidos cancelados y movimientos del día para cuadrar la caja.
                                </p>
                                <button onClick={() => router.push('/admin/pedidostotales')} className="btn btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }}>
                                    Ir al Panel de Auditoría de Pedidos
                                </button>
                            </div>
                        )}

                        <div>
                            <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <Activity size={24} color="var(--primary)" /> Historial de Actividad
                            </h2>

                            <div className="glass-panel" style={{ padding: "2.5rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2rem", borderLeft: "2px solid var(--border)", marginLeft: "1rem", paddingLeft: "2rem" }}>
                                    <div style={{ position: "relative" }}>
                                        <div style={{ position: "absolute", left: "-39px", top: "4px", width: "14px", height: "14px", borderRadius: "50%", background: "#10b981", border: "3px solid #0f172a" }} />
                                        <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem" }}>Sesión Sincronizada</h4>
                                        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>Conectado exitosamente con la base de datos principal.</p>
                                    </div>
                                    <div style={{ position: "relative" }}>
                                        <div style={{ position: "absolute", left: "-39px", top: "4px", width: "14px", height: "14px", borderRadius: "50%", background: "#3b82f6", border: "3px solid #0f172a" }} />
                                        <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem" }}>Apertura de turno</h4>
                                        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>Iniciaste sesión en el dispositivo actual.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'audit' && profile.role === 'admin' && (
                    <div style={{ marginTop: "1rem" }}>
                        <AuditoriaEmpleados />
                    </div>
                )}

                {/* 5. MODALES INTERACTIVOS DEL ADMIN */}
                {activeAdminModal && (
                    <AdminMetricsModals 
                        activeModal={activeAdminModal} 
                        onClose={() => setActiveAdminModal(null)} 
                    />
                )}

            </div>
        </div>
    );
}