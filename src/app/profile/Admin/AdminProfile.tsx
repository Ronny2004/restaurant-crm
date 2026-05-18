"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
    Users, Clock, AlertTriangle, Activity, 
    Calendar, ArrowRight, ShieldCheck 
} from "lucide-react";
import { ProfileTemplate } from "../ProfileTemplate";
import { AdminModals } from "./AdminModals"; // Los modales que armaremos luego
import { useOrders } from "@/hooks/useOrders"; 

const getEcuadorToday = () => {
    const now = new Date();
    const ecDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    const yyyy = ecDate.getUTCFullYear();
    const mm = String(ecDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(ecDate.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`; 
};

const getEcuadorTime = (dateString: string) => {
    if (!dateString) return null;
    const safeString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
    const finalString = (safeString.endsWith('Z') || safeString.includes('+')) ? safeString : `${safeString}Z`;
    const dateObj = new Date(finalString);
    const ecDate = new Date(dateObj.getTime() - (5 * 60 * 60 * 1000));
    return {
        dateString: `${ecDate.getUTCFullYear()}-${String(ecDate.getUTCMonth() + 1).padStart(2, '0')}-${String(ecDate.getUTCDate()).padStart(2, '0')}`,
        timeString: `${String(ecDate.getUTCHours()).padStart(2, '0')}:${String(ecDate.getUTCMinutes()).padStart(2, '0')}`,
        rawDate: dateObj                  
    };
};

export function AdminProfile({ profile }: { profile: any }) {
    const router = useRouter();
    const { orders, auditorias } = useOrders(); 

    // Estados exclusivos del Admin
    const [activeTab, setActiveTab] = useState<'info' | 'audit'>('audit'); 
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [selectedOrderData, setSelectedOrderData] = useState<any>(null); 
    
    const [metrics, setMetrics] = useState<any[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    
    const [selectedDate, setSelectedDate] = useState<string>(getEcuadorToday());
    const [activityHistory, setActivityHistory] = useState<any[]>([]);

    // 1. CÁLCULO DE MÉTRICAS (Usando tu lógica original)
    useEffect(() => {
        let isMounted = true;

        const fetchAdminStats = async () => {
            if (!orders) return;
            setIsLoadingStats(true);
            
            // --- TU LÓGICA DE VELOCIDAD DE COCINA ---
            const ordersHoy = orders.filter(o => getEcuadorTime(o.created_at)?.dateString === selectedDate);
            const kitchenData = ordersHoy.filter(o => o.status === 'ready' || o.status === 'served' || o.is_paid);

            let globalAvgTime = "0 min";
            if (kitchenData.length > 0) {
                const totalMs = kitchenData.reduce((acc, curr) => {
                    const start = new Date(curr.created_at).getTime();
                    const end = new Date(curr.updated_at || curr.created_at).getTime();
                    return acc + (end - start);
                }, 0);
                const avgMin = Math.round((totalMs / kitchenData.length) / (1000 * 60));
                globalAvgTime = `${avgMin} min`;
            }

            if (isMounted) {
                setMetrics([
                    { label: "Personal Activo", value: "4", icon: Users, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", action: 'admin_employees' },
                    { label: "Velocidad Cocina", value: globalAvgTime, icon: Clock, color: "#f97316", bg: "rgba(249, 115, 22, 0.1)", action: 'admin_kitchen' },
                    { label: "Alertas de Stock", value: "1 Nueva", icon: AlertTriangle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", action: 'admin_stock' }
                ]);
                setIsLoadingStats(false);
            }
        };

        fetchAdminStats();
        return () => { isMounted = false; };
    }, [orders, selectedDate]);

    // 2. TIMELINE AUTOMÁTICO (Mezcla de auditorías y sesiones)
    useEffect(() => {
        let isMounted = true;
        const buildTimeline = async () => {
            if (!auditorias) return;
            
            let timeline: any[] = [];
            
            // Traemos las auditorías del día
            auditorias.forEach(audit => {
                const ecTime = getEcuadorTime(audit.fecha_hora);
                if (ecTime?.dateString === selectedDate) {
                    timeline.push({
                        id: `audit-${audit.id}`,
                        timeRaw: ecTime.rawDate,
                        displayTime: ecTime.timeString,
                        title: `Acción de ${audit.usuario}`,
                        desc: `${audit.estado_pedido} - Mesa ${audit.mesa}`,
                        color: audit.estado_pedido?.toLowerCase().includes('cancel') ? "#ef4444" : "#f59e0b",
                        orderData: { ...audit, isAudit: true }
                    });
                }
            });

            // Agregamos tus eventos estáticos de sistema
            const now = new Date();
            timeline.push({
                id: 'sys-1',
                timeRaw: new Date(now.getTime() - 10000), 
                displayTime: "Reciente",
                title: "Sesión Sincronizada",
                desc: "Conectado exitosamente con la base de datos principal.",
                color: "#10b981"
            });

            timeline.push({
                id: 'sys-2',
                timeRaw: new Date(now.getTime() - 60000), 
                displayTime: "Hace poco",
                title: "Apertura de turno",
                desc: "Iniciaste sesión en el dispositivo actual.",
                color: "#3b82f6"
            });

            timeline.sort((a, b) => b.timeRaw.getTime() - a.timeRaw.getTime());
            if (isMounted) setActivityHistory(timeline);
        };
        buildTimeline();
        return () => { isMounted = false; };
    }, [auditorias, selectedDate]);

    const handleLogClick = (data: any) => {
        if(data && data.isAudit) {
            setSelectedOrderData(data);
            setActiveModal('admin_detail');
        }
    };

    const roleStyle = { label: 'Administrador', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' };

    return (
        <ProfileTemplate 
            profile={profile} 
            roleStyle={roleStyle} 
            metrics={metrics} 
            isLoadingStats={isLoadingStats}
            activeModal={activeModal}
            setActiveModal={setActiveModal}
            modalContent={
                <AdminModals 
                    activeModal={activeModal} 
                    modalData={selectedOrderData} 
                />
            }
        >
            <div style={{ marginTop: "1rem" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    {/* 3. TU SELECTOR DE PESTAÑAS */}
                    <div style={{ display: "flex", gap: "0.5rem", background: "rgba(255,255,255,0.03)", padding: "0.4rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
                        <button 
                            onClick={() => setActiveTab('audit')}
                            style={{ 
                                padding: "0.6rem 1.2rem", borderRadius: "8px", border: "none", cursor: "pointer",
                                background: activeTab === 'audit' ? "var(--primary)" : "transparent",
                                color: activeTab === 'audit' ? "white" : "var(--text-muted)", fontWeight: "bold",
                                transition: "all 0.2s"
                            }}
                        >
                            Auditoría de Empleados
                        </button>
                        <button 
                            onClick={() => setActiveTab('info')}
                            style={{ 
                                padding: "0.6rem 1.2rem", borderRadius: "8px", border: "none", cursor: "pointer",
                                background: activeTab === 'info' ? "var(--primary)" : "transparent",
                                color: activeTab === 'info' ? "white" : "var(--text-muted)", fontWeight: "bold",
                                transition: "all 0.2s"
                            }}
                        >
                            Información y Actividad
                        </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <Calendar size={18} color="var(--text-muted)" />
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={getEcuadorToday()} style={{ background: "transparent", border: "none", color: "white", outline: "none", cursor: "pointer", fontFamily: "inherit" }} />
                    </div>
                </div>

                {/* 4. CONTENIDO DE PESTAÑAS */}
                {activeTab === 'audit' && (
                    <div className="glass-panel" style={{ padding: "2.5rem", border: "1px solid rgba(139, 92, 246, 0.4)", background: "linear-gradient(145deg, rgba(139, 92, 246, 0.05) 0%, rgba(0,0,0,0.2) 100%)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                        <ShieldCheck size={56} color="#8b5cf6" style={{ marginBottom: "0.5rem" }} />
                        <h3 style={{ margin: 0, fontSize: "1.8rem", color: "white" }}>
                            Auditoría Completa del Restaurante
                        </h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto 1.5rem auto" }}>
                            Accede al historial avanzado de facturación, monitor de pedidos cancelados y rastreo detallado de movimientos del personal para el cuadre oficial de caja.
                        </p>
                        <button 
                            onClick={() => router.push('/admin/ventastotales')} 
                            className="btn btn-primary" 
                            style={{ padding: "1rem 2rem", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "#8b5cf6", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 15px rgba(139, 92, 246, 0.4)" }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            Abrir Panel de Auditoría <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {activeTab === 'info' && (
                    <div>
                        <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <Activity size={24} color="#8b5cf6" /> Historial de Actividad Global
                        </h2>
                        <div className="glass-panel" style={{ padding: "2.5rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2rem", borderLeft: "2px solid var(--border)", marginLeft: "1rem", paddingLeft: "2rem" }}>
                                {activityHistory.map((item) => (
                                    <div key={item.id} style={{ position: "relative" }}>
                                        <div style={{ position: "absolute", left: "-39px", top: "4px", width: "14px", height: "14px", borderRadius: "50%", background: item.color, border: "3px solid #0f172a" }} />
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: item.orderData ? "pointer" : "default" }} onClick={() => handleLogClick(item.orderData)}>
                                            <div>
                                                <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem", color: "white" }}>{item.title}</h4>
                                                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>{item.desc}</p>
                                            </div>
                                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "bold", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                                                {item.displayTime}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProfileTemplate>
    );
}