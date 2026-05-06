"use client";

import { useState, useEffect } from "react";
import { Activity, CheckCircle, Users, Calendar } from "lucide-react";
import { ProfileTemplate } from "../ProfileTemplate";
import { WaiterModals } from "./WaiterModals";
import { useOrders } from "@/hooks/useOrders"; 

// ==========================================
// CÁLCULO MATEMÁTICO ESTRICTO UTC-5 (ECUADOR)
// ==========================================

// 1. Forzamos la fecha de hoy restando 5 horas al tiempo universal
const getEcuadorToday = () => {
    const now = new Date();
    // Le restamos 5 horas en milisegundos
    const ecDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    
    const yyyy = ecDate.getUTCFullYear();
    const mm = String(ecDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(ecDate.getUTCDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`; // Siempre devuelve "YYYY-MM-DD" perfecto
};

// 2. Transforma la fecha de Supabase restándole 5 horas exactamente
const getEcuadorTime = (dateString: string) => {
    if (!dateString) return null;
    
    // Aseguramos que el texto sea leído como UTC por Javascript
    const safeString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
    const finalString = (safeString.endsWith('Z') || safeString.includes('+')) ? safeString : `${safeString}Z`;
    const dateObj = new Date(finalString);

    // Matemáticas: Hora absoluta - 5 Horas
    const ecDate = new Date(dateObj.getTime() - (5 * 60 * 60 * 1000));

    const yyyy = ecDate.getUTCFullYear();
    const mm = String(ecDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(ecDate.getUTCDate()).padStart(2, '0');
    const hh = String(ecDate.getUTCHours()).padStart(2, '0');
    const min = String(ecDate.getUTCMinutes()).padStart(2, '0');

    return {
        dateString: `${yyyy}-${mm}-${dd}`, // Ej: "2026-05-05"
        timeString: `${hh}:${min}`,       // Ej: "23:02" 
        rawDate: dateObj                  // Fecha original intacta para ordenar
    };
};

// ==========================================

export function WaiterProfile({ profile }: { profile: any }) {
    const { orders, auditorias } = useOrders(); 
    
    const [metrics, setMetrics] = useState<any[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [selectedOrderData, setSelectedOrderData] = useState<any>(null); 

    const [selectedDate, setSelectedDate] = useState<string>(getEcuadorToday());
    const [activityHistory, setActivityHistory] = useState<any[]>([]);

    // 1. MÉTRICAS SUPERIORES
    // 1. MÉTRICAS SUPERIORES (Corregido para usar created_by)
    useEffect(() => {
        if (orders) {
            const activeOrders = orders.filter(o => o.status !== 'ready');
            const mesasActivasCount = new Set(activeOrders.map(o => o.table_number)).size;

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            
            const pedidosHoy = orders.filter(o => {
                const orderDate = new Date(o.created_at);
                // CORRECCIÓN: Filtramos por created_by
                const isMyOrder = o.created_by ? o.created_by === profile.id : true; 
                return orderDate >= startOfDay && isMyOrder;
            });

            const cantidadPedidos = pedidosHoy.length;

            setMetrics([
                { label: "Pedidos Tomados", value: cantidadPedidos, icon: CheckCircle, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", action: "waiter_orders" },
                { label: "Productividad", value: cantidadPedidos > 15 ? "Alta 🔥" : "Normal", icon: Activity, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", action: "waiter_performance" },
                { label: "Mesas Activas", value: mesasActivasCount.toString(), icon: Users, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", action: "waiter_tables" }
            ]);
            
            setIsLoadingStats(false);
        }
    }, [orders, profile.id]);

    // 2. HISTORIAL DE ACTIVIDAD
    useEffect(() => {
        if (!orders || !auditorias) return;

        let timeline: any[] = [];

        // A. Creaciones
        orders.forEach(order => {
            if (order.created_by && order.created_by !== profile.id) return;
            
            const ecTime = getEcuadorTime(order.created_at);
            if (ecTime?.dateString === selectedDate) {
                timeline.push({
                    id: `create-${order.id}`,
                    type: 'create',
                    timeRaw: ecTime.rawDate,
                    displayTime: ecTime.timeString, // <--- Aquí ya está la hora exacta (-5)
                    title: "Creaste el pedido",
                    table_number: order.table_number,
                    orderData: order, 
                    color: "#3b82f6" 
                });
            }
        });

        // B. Auditorías (Ediciones y Cancelaciones)
        auditorias.forEach(audit => {
            const isValidUser = audit.usuario === profile.id || audit.usuario === profile.username || audit.usuario === profile.full_name;
            if (!isValidUser) return;

            const ecTime = getEcuadorTime(audit.fecha_hora);
            if (ecTime?.dateString === selectedDate) {
                const isCancel = audit.estado_pedido?.toLowerCase().includes('eliminado') || audit.estado_pedido?.toLowerCase().includes('cancelado');
                timeline.push({
                    id: `audit-${audit.pedido_id}-${audit.fecha_hora}`,
                    type: isCancel ? 'cancel' : 'update',
                    timeRaw: ecTime.rawDate,
                    displayTime: ecTime.timeString, // <--- Aquí ya está la hora exacta (-5)
                    title: isCancel ? "Cancelaste un pedido" : "Actualizaste un pedido",
                    table_number: audit.mesa,
                    orderData: { ...audit, isAudit: true }, 
                    color: isCancel ? "#ef4444" : "#f59e0b" 
                });
            }
        });

        // Ordenamos del más viejo al más nuevo
        timeline.sort((a, b) => a.timeRaw.getTime() - b.timeRaw.getTime());

        // Simulador de Turnos (Decorativo)
        if (timeline.length > 0) {
            const firstEventEcuadorDate = new Date(timeline[0].timeRaw.getTime() - (5 * 60 * 60 * 1000) - (10 * 60000));
            const hhStart = String(firstEventEcuadorDate.getUTCHours()).padStart(2, '0');
            const mmStart = String(firstEventEcuadorDate.getUTCMinutes()).padStart(2, '0');
            
            timeline.unshift({
                id: 'start',
                type: 'shift',
                timeRaw: new Date(timeline[0].timeRaw.getTime() - 10 * 60000),
                displayTime: `${hhStart}:${mmStart}`,
                title: "Turno iniciado",
                desc: "Has comenzado tu jornada laboral correctamente.",
                color: "#10b981" 
            });

            if (selectedDate !== getEcuadorToday()) {
                const lastEventEcuadorDate = new Date(timeline[timeline.length - 1].timeRaw.getTime() - (5 * 60 * 60 * 1000) + (15 * 60000));
                const hhEnd = String(lastEventEcuadorDate.getUTCHours()).padStart(2, '0');
                const mmEnd = String(lastEventEcuadorDate.getUTCMinutes()).padStart(2, '0');

                timeline.push({
                    id: 'end',
                    type: 'shift',
                    timeRaw: new Date(timeline[timeline.length - 1].timeRaw.getTime() + 15 * 60000),
                    displayTime: `${hhEnd}:${mmEnd}`,
                    title: "Turno terminado",
                    desc: "Has terminado tu jornada laboral correctamente.",
                    color: "#8b5cf6" 
                });
            }
        }

        setActivityHistory(timeline);
    }, [orders, auditorias, selectedDate, profile.id, profile.username, profile.full_name]);

    const handleOrderClick = (orderData: any) => {
        setSelectedOrderData(orderData);
        setActiveModal('waiter_order_detail');
    };

    const roleStyle = { label: 'Mesero', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' };

    return (
        <ProfileTemplate 
            profile={profile} 
            roleStyle={roleStyle} 
            metrics={metrics} 
            isLoadingStats={isLoadingStats}
            activeModal={activeModal}
            setActiveModal={setActiveModal}
            // modalContent={<WaiterModals activeModal={activeModal} modalData={selectedOrderData} />}
        >
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", marginTop: "1rem" }}>
                    <h2 style={{ fontSize: "1.5rem", margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Activity size={24} color="var(--primary)" /> Historial de Actividad
                    </h2>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <Calendar size={18} color="var(--text-muted)" />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={getEcuadorToday()} 
                            style={{ background: "transparent", border: "none", color: "white", outline: "none", cursor: "pointer", fontFamily: "inherit" }}
                        />
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: "2.5rem" }}>
                    {activityHistory.length === 0 ? (
                        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No hay actividad registrada en esta fecha.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", borderLeft: "2px solid var(--border)", marginLeft: "1rem", paddingLeft: "2rem" }}>
                            
                            {activityHistory.map((item) => (
                                <div key={item.id} style={{ position: "relative" }}>
                                    <div style={{ position: "absolute", left: "-39px", top: "4px", width: "14px", height: "14px", borderRadius: "50%", background: item.color, border: "3px solid #0f172a" }} />
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            {item.type === 'shift' ? (
                                                <>
                                                    <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem" }}>{item.title}</h4>
                                                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", whiteSpace: "pre-line" }}>{item.desc}</p>
                                                </>
                                            ) : (
                                                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "1.1rem" }}>
                                                    {item.title} de la {' '}
                                                    <span 
                                                        onClick={() => handleOrderClick(item.orderData)}
                                                        style={{ color: item.color, textDecoration: "underline", cursor: "pointer", fontWeight: "bold" }}
                                                    >
                                                        mesa {item.table_number}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                        
                                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "bold", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                                            {item.displayTime}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            
                        </div>
                    )}
                </div>
            </div>
        </ProfileTemplate>
    );
}