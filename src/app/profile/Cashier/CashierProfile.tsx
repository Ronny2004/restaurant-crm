"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, DollarSign, Receipt, Calendar, Wallet } from "lucide-react";
import { ProfileTemplate } from "../ProfileTemplate";
// Asegúrate de tener o crear pronto este archivo CashierModals.tsx
import { CashierModals } from "./CashierModals"; 
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

export function CashierProfile({ profile }: { profile: any }) {
    const { orders } = useOrders(); 
    
    const [metrics, setMetrics] = useState<any[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [selectedOrderData, setSelectedOrderData] = useState<any>(null); 
    
    const [pedidosPorCobrar, setPedidosPorCobrar] = useState<any[]>([]); 
    const [pedidosCobrados, setPedidosCobrados] = useState<any[]>([]); 
    const [performanceData, setPerformanceData] = useState<number[]>([]); 
    const [ingresosTotales, setIngresosTotales] = useState<number>(0);
    
    const [selectedDate, setSelectedDate] = useState<string>(getEcuadorToday());
    const [activityHistory, setActivityHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // 1. MÉTRICAS SUPERIORES (Caja)
    useEffect(() => {
        let isMounted = true;

        const calcularMetricas = async () => {
            if (orders) {
                // 1. Por Cobrar: Todo lo que esté "ready" (listo para servir/pagar) y que NO esté pagado ni cancelado.
                // Esto es global, el cajero ve las mesas de todos los meseros.
                const porCobrar = orders.filter(o => o.status === 'ready' && !o.is_paid && !o.status?.toLowerCase().includes('cancel'));
                
                if (isMounted) setPedidosPorCobrar(porCobrar);

                // 2. Cobrados Hoy: Todo lo que esté pagado en la fecha seleccionada
                const ecuadorHoy = getEcuadorToday();
                const cobradosHoy = orders.filter(o => {
                    const ecTime = getEcuadorTime(o.updated_at || o.created_at);
                    return ecTime?.dateString === selectedDate && o.is_paid;
                });

                // Calculamos el dinero ingresado
                const totalIngresos = cobradosHoy.reduce((sum, o) => sum + (o.total || 0), 0);
                
                if (isMounted) {
                    setPedidosCobrados(cobradosHoy);
                    setIngresosTotales(totalIngresos);
                }

                // =====================================
                // CÁLCULO DE GRÁFICA (Ritmo de cobros)
                // =====================================
                let tempChartData: number[] = [0]; 
                
                try {
                    const { data: sesionesData } = await supabase.from('registro_sesiones').select('*').eq('user_id', profile.id);

                    if (sesionesData) {
                        const sesionesDelDia = sesionesData.filter((s: any) => getEcuadorTime(s.created_at)?.dateString === selectedDate);
                        const logins = sesionesDelDia.filter((s: any) => s.tipo === 'login').map((s: any) => new Date(s.created_at).getTime());
                        const logouts = sesionesDelDia.filter((s: any) => s.tipo === 'logout').map((s: any) => new Date(s.created_at).getTime());
                        
                        let startTime = logins.length > 0 ? Math.min(...logins) : null;
                        let lastActivity = logouts.length > 0 ? Math.max(...logouts) : null;

                        if (startTime) {
                            if (!lastActivity || lastActivity < startTime) {
                                if (selectedDate === ecuadorHoy) {
                                    lastActivity = new Date().getTime(); 
                                } else if (cobradosHoy.length > 0) {
                                    lastActivity = Math.max(...cobradosHoy.map(o => new Date(o.updated_at || o.created_at).getTime()));
                                } else {
                                    lastActivity = startTime + (3600 * 1000); 
                                }
                            }
                        } else if (cobradosHoy.length > 0) {
                            const orderTimes = cobradosHoy.map(o => new Date(o.updated_at || o.created_at).getTime());
                            startTime = Math.min(...orderTimes);
                            lastActivity = Math.max(...orderTimes);
                        }

                        if (startTime && lastActivity && lastActivity >= startTime) {
                            const nHoras = (lastActivity - startTime) / (1000 * 60 * 60);
                            
                            if (nHoras < 1) {
                                tempChartData = [0]; 
                                for (let i = 1; i <= 6; i++) {
                                    const limitTime = startTime + (i * 10 * 60000); 
                                    const ordersUpToNow = cobradosHoy.filter(o => new Date(o.updated_at || o.created_at).getTime() <= limitTime).length;
                                    tempChartData.push(ordersUpToNow);
                                }
                            } else {
                                const totalHoursInt = Math.max(1, Math.ceil(nHoras)); 
                                tempChartData = [0];
                                for (let i = 1; i <= totalHoursInt; i++) {
                                    const limitTime = startTime + (i * 3600000);
                                    const ordersUpToNow = cobradosHoy.filter(o => new Date(o.updated_at || o.created_at).getTime() <= limitTime).length;
                                    tempChartData.push(ordersUpToNow);
                                }
                            }
                        } else {
                            tempChartData = [0, cobradosHoy.length];
                        }
                    }
                } catch (err) {
                    console.error("Error obteniendo sesiones para métricas:", err);
                    tempChartData = [0, cobradosHoy.length];
                }

                if (isMounted) {
                    setPerformanceData(tempChartData);
                    setMetrics([
                        { label: "Por Cobrar", value: porCobrar.length.toString(), icon: Receipt, color: "var(--status-pending)", bg: "var(--bg-status-pending)", action: "cashier_pending" },
                        { label: "Ingresos Hoy", value: `$${totalIngresos.toFixed(2)}`, icon: DollarSign, color: "var(--status-ready)", bg: "var(--bg-status-ready)", action: "cashier_revenue" },
                        { label: "Ritmo de Caja", value: cobradosHoy.length.toString(), icon: Activity, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", action: "cashier_performance" }
                    ]);
                    setIsLoadingStats(false);
                }
            }
        };

        calcularMetricas();
        return () => { isMounted = false; };
    }, [orders, profile.id, selectedDate]);

    // 2. HISTORIAL DE ACTIVIDAD (Solo caja y turnos)
    useEffect(() => {
        let isMounted = true;
        const buildTimeline = async () => {
            if (!orders) return;
            setIsLoadingHistory(true);
            try {
                const { data: sesionesData } = await supabase.from('registro_sesiones').select('*').eq('user_id', profile.id);
                let timeline: any[] = [];

                // Generamos los logs de cobro revisando las órdenes pagadas
                orders.forEach(order => {
                    if (order.is_paid) {
                        const ecTimeUpdated = getEcuadorTime(order.updated_at || order.created_at);
                        
                        if (ecTimeUpdated?.dateString === selectedDate) {
                            timeline.push({ 
                                id: `payment-${order.id}`, 
                                type: 'payment', 
                                timeRaw: ecTimeUpdated.rawDate, 
                                displayTime: ecTimeUpdated.timeString, 
                                title: "Pago recibido de la mesa " + order.table_number, 
                                desc: `Monto cobrado: $${order.total?.toFixed(2)}`,
                                table_number: order.table_number, 
                                orderData: order, 
                                color: "var(--status-ready)" 
                            });
                        }
                    }
                });

                // Logs de Turnos del Cajero
                if (sesionesData) {
                    sesionesData.forEach(sesion => {
                        const ecTime = getEcuadorTime(sesion.created_at);
                        if (ecTime?.dateString === selectedDate) {
                            const isLogin = sesion.tipo === 'login';
                            timeline.push({ 
                                id: `sesion-${sesion.id}`, 
                                type: 'shift', 
                                timeRaw: ecTime.rawDate, 
                                displayTime: ecTime.timeString, 
                                title: isLogin ? "Apertura de Caja" : "Cierre de Caja", 
                                desc: isLogin ? "Has abierto tu estación de caja." : "Has cerrado tu estación de caja correctamente.", 
                                color: isLogin ? "#10b981" : "#8b5cf6" 
                            });
                        }
                    });
                }
                
                timeline.sort((a, b) => b.timeRaw.getTime() - a.timeRaw.getTime());
                if (isMounted) setActivityHistory(timeline);
            } catch (error) {
                console.error("Error al construir historial de caja:", error);
            } finally {
                if (isMounted) setIsLoadingHistory(false);
            }
        };
        buildTimeline();
        return () => { isMounted = false; };
    }, [orders, selectedDate, profile.id]);

    const handleOrderClick = (orderData: any) => {
        setSelectedOrderData(orderData);
        setActiveModal('cashier_order_detail');
    };

    // Color verde esmeralda para la caja registradora
    const roleStyle = { label: 'Cajero', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' }; 

    return (
        <ProfileTemplate 
            profile={profile} 
            roleStyle={roleStyle} 
            metrics={metrics} 
            isLoadingStats={isLoadingStats}
            activeModal={activeModal}
            setActiveModal={setActiveModal}
            modalContent={
                <CashierModals 
                    activeModal={activeModal} 
                    modalData={selectedOrderData} 
                    pendingOrders={pedidosPorCobrar}
                    paidOrders={pedidosCobrados} 
                    performanceData={performanceData} 
                    ingresosTotales={ingresosTotales}
                    profile={profile}
                    onViewOrder={handleOrderClick} 
                />
            }
        >
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", marginTop: "1rem" }}>
                    <h2 style={{ fontSize: "1.5rem", margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Wallet size={24} color="var(--status-ready)" /> Movimientos de Caja
                    </h2>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <Calendar size={18} color="var(--text-muted)" />
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={getEcuadorToday()} style={{ background: "transparent", border: "none", color: "white", outline: "none", cursor: "pointer", fontFamily: "inherit" }} />
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: "2.5rem" }}>
                    {isLoadingHistory ? (
                        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Sincronizando transacciones...</p>
                    ) : activityHistory.length === 0 ? (
                        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>La caja no registra movimientos en esta fecha.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", borderLeft: "2px solid var(--border)", marginLeft: "1rem", paddingLeft: "2rem" }}>
                            {activityHistory.map((item) => (
                                <div key={item.id} style={{ position: "relative" }}>
                                    <div style={{ position: "absolute", left: "-39px", top: "4px", width: "14px", height: "14px", borderRadius: "50%", background: item.color, border: "3px solid #0f172a" }} />
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            <p style={{ margin: "0 0 0.2rem 0", color: "white", fontSize: "1.1rem", fontWeight: "bold" }}>
                                                {item.title}
                                            </p>
                                            {item.desc && (
                                                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
                                                    {item.desc}
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