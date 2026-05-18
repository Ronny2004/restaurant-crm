"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, CheckCircle, Users, Calendar } from "lucide-react";
import { ProfileTemplate } from "../ProfileTemplate";
import { WaiterModals } from "./WaiterModals";
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

    const yyyy = ecDate.getUTCFullYear();
    const mm = String(ecDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(ecDate.getUTCDate()).padStart(2, '0');
    const hh = String(ecDate.getUTCHours()).padStart(2, '0');
    const min = String(ecDate.getUTCMinutes()).padStart(2, '0');

    return {
        dateString: `${yyyy}-${mm}-${dd}`,
        timeString: `${hh}:${min}`,       
        rawDate: dateObj                  
    };
};

export function WaiterProfile({ profile }: { profile: any }) {
    const { orders, auditorias } = useOrders(); 
    
    const [metrics, setMetrics] = useState<any[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [selectedOrderData, setSelectedOrderData] = useState<any>(null); 
    const [pedidosDelDia, setPedidosDelDia] = useState<any[]>([]); 
    const [performanceData, setPerformanceData] = useState<number[]>([]); 
    const [activeTablesData, setActiveTablesData] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(getEcuadorToday());
    const [activityHistory, setActivityHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const calcularMetricas = async () => {
            if (orders) {
                // 👇 MAGIA AQUÍ: Traemos TODAS las mesas activas de TODO el restaurante 👇
                const todasLasMesasActivas = orders.filter(o => 
                    o.status !== 'ready' && 
                    !o.status?.toLowerCase().includes('cancel')
                );
                
                // Mantenemos el conteo solo para el número de la tarjeta (para que no sea confuso si una mesa tiene 2 pedidos)
                const mesasActivasCount = new Set(todasLasMesasActivas.map(o => o.table_number)).size;
                if (isMounted) setActiveTablesData(todasLasMesasActivas);

                const ecuadorHoy = getEcuadorToday();
                const pedidosHoy = orders.filter(o => {
                    const ecTime = getEcuadorTime(o.created_at);
                    const isMyOrder = o.created_by ? o.created_by === profile.id : true; 
                    return ecTime?.dateString === selectedDate && isMyOrder;
                });

                const cantidadPedidos = pedidosHoy.length;
                if (isMounted) setPedidosDelDia(pedidosHoy);

                let nHoras = 0;
                let startTime = null;
                let lastActivity = null;
                let tempChartData: number[] = [0]; 
                
                try {
                    const { data: sesionesData } = await supabase.from('registro_sesiones').select('*').eq('user_id', profile.id);

                    if (sesionesData) {
                        const sesionesDelDia = sesionesData.filter((s: any) => getEcuadorTime(s.created_at)?.dateString === selectedDate);
                        const logins = sesionesDelDia.filter((s: any) => s.tipo === 'login').map((s: any) => new Date(s.created_at).getTime());
                        const logouts = sesionesDelDia.filter((s: any) => s.tipo === 'logout').map((s: any) => new Date(s.created_at).getTime());
                        
                        startTime = logins.length > 0 ? Math.min(...logins) : null;
                        lastActivity = logouts.length > 0 ? Math.max(...logouts) : null;

                        if (startTime) {
                            if (!lastActivity || lastActivity < startTime) {
                                if (selectedDate === ecuadorHoy) {
                                    lastActivity = new Date().getTime(); 
                                } else if (pedidosHoy.length > 0) {
                                    lastActivity = Math.max(...pedidosHoy.map(o => new Date(o.created_at).getTime()));
                                } else {
                                    lastActivity = startTime + (3600 * 1000); 
                                }
                            }
                        } else if (pedidosHoy.length > 0) {
                            const orderTimes = pedidosHoy.map(o => new Date(o.created_at).getTime());
                            startTime = Math.min(...orderTimes);
                            lastActivity = Math.max(...orderTimes);
                        }

                        if (startTime && lastActivity && lastActivity >= startTime) {
                            nHoras = (lastActivity - startTime) / (1000 * 60 * 60);
                            
                            if (nHoras < 1) {
                                tempChartData = [0]; 
                                for (let i = 1; i <= 6; i++) {
                                    const limitTime = startTime + (i * 10 * 60000); 
                                    const ordersUpToNow = pedidosHoy.filter(o => new Date(o.created_at).getTime() <= limitTime).length;
                                    tempChartData.push(ordersUpToNow);
                                }
                            } else {
                                const totalHoursInt = Math.max(1, Math.ceil(nHoras)); 
                                tempChartData = [0];
                                for (let i = 1; i <= totalHoursInt; i++) {
                                    const limitTime = startTime + (i * 3600000);
                                    const ordersUpToNow = pedidosHoy.filter(o => new Date(o.created_at).getTime() <= limitTime).length;
                                    tempChartData.push(ordersUpToNow);
                                }
                            }
                        } else {
                            tempChartData = [0, pedidosHoy.length];
                        }
                    }
                } catch (err) {
                    console.error("Error obteniendo sesiones para métricas:", err);
                    tempChartData = [0, pedidosHoy.length];
                }

                nHoras = Math.max(1, Math.round(nHoras));
                const score = (cantidadPedidos + nHoras) / 2;

                let prodLabel = "Baja 💤";
                let prodColor = "#ef4444"; 
                let prodBg = "rgba(239, 68, 68, 0.1)";

                if (score >= 8) {
                    prodLabel = "Alta 🔥";
                    prodColor = "#10b981"; 
                    prodBg = "rgba(16, 185, 129, 0.1)";
                } else if (score >= 5) {
                    prodLabel = "Media ⚡";
                    prodColor = "#f59e0b"; 
                    prodBg = "rgba(245, 158, 11, 0.1)";
                }

                if (isMounted) {
                    setPerformanceData(tempChartData);
                    setMetrics([
                        { label: "Pedidos Tomados", value: cantidadPedidos, icon: CheckCircle, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", action: "waiter_orders" },
                        { label: "Productividad", value: prodLabel, icon: Activity, color: prodColor, bg: prodBg, action: "waiter_performance" },
                        // 👇 LA TARJETA TAMBIÉN MOSTRARÁ EL CONTEO GLOBAL DE MESAS 👇
                        { label: "Mesas Activas", value: mesasActivasCount.toString(), icon: Users, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", action: "waiter_tables" }
                    ]);
                    setIsLoadingStats(false);
                }
            }
        };

        calcularMetricas();
        return () => { isMounted = false; };
    }, [orders, profile.id, selectedDate]);

    useEffect(() => {
        let isMounted = true;
        const buildTimeline = async () => {
            if (!orders || !auditorias) return;
            setIsLoadingHistory(true);
            try {
                const { data: sesionesData } = await supabase.from('registro_sesiones').select('*').eq('user_id', profile.id);
                let timeline: any[] = [];

                orders.forEach(order => {
                    if (order.created_by && order.created_by !== profile.id) return;
                    const ecTime = getEcuadorTime(order.created_at);
                    if (ecTime?.dateString === selectedDate) {
                        timeline.push({ id: `create-${order.id}`, type: 'create', timeRaw: ecTime.rawDate, displayTime: ecTime.timeString, title: "Creaste el pedido", table_number: order.table_number, orderData: order, color: "#3b82f6" });
                    }
                });

                auditorias.forEach(audit => {
                    const isValidUser = audit.usuario === profile.id || audit.usuario === profile.username || audit.usuario === profile.full_name;
                    if (!isValidUser) return;
                    
                    const ecTime = getEcuadorTime(audit.fecha_hora);
                    if (ecTime?.dateString === selectedDate) {
                        const estado = audit.estado_pedido?.toLowerCase() || '';
                        let color = "#f59e0b"; 
                        let title = "Se ha actualizado el pedido";
                        
                        // 👇 TUS 2 LOGS PROFESIONALES POR PEDIDO 👇
                        if (estado.includes('cocina') || estado.includes('preparando') || estado.includes('preparing')) {
                            color = "var(--status-preparing)";
                            title = "Se ha comenzado la preparación del pedido"; // -> Renderiza: "Se ha comenzado la preparación del pedido de la mesa #"
                        } else if (estado.includes('listo') || estado.includes('ready')) {
                            color = "var(--status-ready)";
                            title = "Se ha completado la preparación del pedido"; // -> Renderiza: "Se ha completado la preparación del pedido de la mesa #"
                        } else {
                            title = `Se registró cambio a [${audit.estado_pedido}] para el pedido`;
                        }

                        timeline.push({ 
                            id: `audit-${audit.pedido_id}-${audit.fecha_hora}`, 
                            type: 'audit', 
                            timeRaw: ecTime.rawDate, 
                            displayTime: ecTime.timeString, 
                            title: title, 
                            table_number: audit.mesa, 
                            orderData: { ...audit, isAudit: true }, 
                            color: color 
                        });
                    }
                });

                if (sesionesData) {
                    sesionesData.forEach(sesion => {
                        const ecTime = getEcuadorTime(sesion.created_at);
                        if (ecTime?.dateString === selectedDate) {
                            const isLogin = sesion.tipo === 'login';
                            timeline.push({ id: `sesion-${sesion.id}`, type: 'shift', timeRaw: ecTime.rawDate, displayTime: ecTime.timeString, title: isLogin ? "Turno iniciado" : "Turno terminado", desc: isLogin ? "Has comenzado tu jornada laboral correctamente." : "Has terminado tu jornada laboral correctamente.", color: isLogin ? "#10b981" : "#8b5cf6" });
                        }
                    });
                }
                timeline.sort((a, b) => b.timeRaw.getTime() - a.timeRaw.getTime());
                if (isMounted) setActivityHistory(timeline);
            } catch (error) {
                console.error("Error al construir historial:", error);
            } finally {
                if (isMounted) setIsLoadingHistory(false);
            }
        };
        buildTimeline();
        return () => { isMounted = false; };
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
            modalContent={
                <WaiterModals 
                    activeModal={activeModal} 
                    modalData={selectedOrderData} 
                    ordersList={pedidosDelDia} 
                    performanceData={performanceData} 
                    activeTablesList={activeTablesData} 
                    profile={profile}
                    onViewOrder={handleOrderClick} 
                />
            }
        >
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", marginTop: "1rem" }}>
                    <h2 style={{ fontSize: "1.5rem", margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Activity size={24} color="var(--primary)" /> Historial de Actividad
                    </h2>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <Calendar size={18} color="var(--text-muted)" />
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={getEcuadorToday()} style={{ background: "transparent", border: "none", color: "white", outline: "none", cursor: "pointer", fontFamily: "inherit" }} />
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: "2.5rem" }}>
                    {isLoadingHistory ? (
                        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Sincronizando historial...</p>
                    ) : activityHistory.length === 0 ? (
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
                                                    <span onClick={() => handleOrderClick(item.orderData)} style={{ color: item.color, textDecoration: "underline", cursor: "pointer", fontWeight: "bold" }}>mesa {item.table_number}</span>
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