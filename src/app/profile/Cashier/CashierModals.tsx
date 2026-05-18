"use client";

import { DollarSign, Activity, Receipt, Clock, Wallet, ReceiptText, User, ShoppingBag } from "lucide-react";

interface CashierModalsProps {
    activeModal: string | null;
    modalData?: any; 
    pendingOrders?: any[]; 
    paidOrders?: any[]; 
    performanceData?: number[];
    ingresosTotales?: number;
    profile?: any;            
    onViewOrder?: (orderData: any) => void; 
}

const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'ready':
            return { text: 'Por Cobrar', bg: 'var(--bg-status-ready)', color: 'var(--status-ready)' };
        case 'served':
            return { text: 'Servido', bg: 'var(--bg-status-served)', color: 'var(--status-served)' };
        case 'preparing':
            return { text: 'En Cocina', bg: 'var(--bg-status-preparing)', color: 'var(--status-preparing)' };
        case 'pending':
            return { text: 'En Espera', bg: 'var(--bg-status-pending)', color: 'var(--status-pending)' };
        case 'canceled':
            return { text: 'Cancelado', bg: 'var(--bg-status-cancel)', color: 'var(--status-cancel)' };
        default:
            return { text: status || 'Desconocido', bg: 'var(--bg-status-pending)', color: 'var(--status-pending)' };
    }
};

const calculateTimeElapsed = (dateStr: string) => {
    const past = new Date(dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`).getTime();
    const now = new Date().getTime();
    const diffMs = now - past;
    if (diffMs < 60000) return "Justo ahora";
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `Hace ${hours}h ${minutes % 60}m`;
    return `Hace ${minutes} min`;
};

export function CashierModals({ 
    activeModal, 
    modalData, 
    pendingOrders, 
    paidOrders, 
    performanceData, 
    ingresosTotales = 0,
    onViewOrder 
}: CashierModalsProps) {
    
    if (!activeModal) return null;

    switch (activeModal) {
        // ====================================================
        // MODAL DE MESAS POR COBRAR (SÓLO LAS QUE ESTÁN "READY")
        // ====================================================
        case 'cashier_pending':
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
                    <div style={{ textAlign: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
                        <Receipt size={40} color="var(--status-ready)" style={{ margin: "0 auto 0.5rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Cuentas por Cobrar</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            Hay {pendingOrders?.length || 0} mesas esperando para pagar su cuenta.
                        </p>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "1.2rem", overflowY: "auto", paddingRight: "0.5rem", paddingBottom: "1rem" }}>
                        {pendingOrders && pendingOrders.length > 0 ? (
                            [...pendingOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((order: any, idx: number) => (
                                <div 
                                    key={idx} 
                                    onClick={() => onViewOrder && onViewOrder(order)} 
                                    className="glass-panel" 
                                    style={{ padding: "1.5rem", borderLeft: `4px solid var(--status-ready)`, cursor: "pointer", transition: "all 0.2s ease" }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"} 
                                    onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                            <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "white" }}>Mesa {order.table_number}</span>
                                            <span style={{ fontSize: "0.75rem", background: "var(--bg-status-ready)", color: "var(--status-ready)", padding: "0.2rem 0.6rem", borderRadius: "12px", textTransform: "uppercase", fontWeight: "bold" }}>
                                                Listo p/ Cobrar
                                            </span>
                                        </div>
                                        <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "white" }}>${order.total?.toFixed(2)}</span>
                                    </div>
                                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "flex", gap: "1rem" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Clock size={14} /> {calculateTimeElapsed(order.created_at)}</span>
                                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><ShoppingBag size={14} /> {order.items?.length || 0} productos</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: "center", padding: "3rem 2rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", marginTop: "auto", marginBottom: "auto" }}>
                                <ReceiptText size={40} color="var(--text-muted)" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                                <h3 style={{ color: "white", marginBottom: "0.5rem" }}>Todo al día</h3>
                                <p style={{ color: "var(--text-muted)" }}>No hay cuentas pendientes por cobrar ahora mismo.</p>
                            </div>
                        )}
                    </div>
                </div>
            );

        // ====================================================
        // MODAL DE INGRESOS TOTALES (HISTORIAL DE COBROS)
        // ====================================================
        case 'cashier_revenue':
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
                    <div style={{ textAlign: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
                        <DollarSign size={40} color="#10b981" style={{ margin: "0 auto 0.5rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Reporte de Caja</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            Detalle de las {paidOrders?.length || 0} transacciones completadas hoy.
                        </p>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", paddingRight: "0.5rem", paddingBottom: "1rem" }}>
                        {paidOrders && paidOrders.length > 0 ? (
                            [...paidOrders].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()).map((order: any, idx: number) => (
                                <div key={idx} className="glass-panel" style={{ padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.3rem" }}>
                                            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>Mesa {order.table_number}</span>
                                            <span style={{ fontSize: "0.7rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.2rem 0.5rem", borderRadius: "8px", fontWeight: "bold" }}>COBRADO</span>
                                        </div>
                                        <div style={{ display: "flex", gap: "0.8rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                            <span>{new Date(order.updated_at || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>•</span>
                                            <span>{order.payment_type?.type || "Efectivo"}</span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "white" }}>${order.total?.toFixed(2)}</span>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: "center", padding: "3rem 2rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", marginTop: "auto", marginBottom: "auto" }}>
                                <Wallet size={40} color="var(--text-muted)" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                                <h3 style={{ color: "white", marginBottom: "0.5rem" }}>Caja en cero</h3>
                                <p style={{ color: "var(--text-muted)" }}>Aún no se han registrado cobros en este turno.</p>
                            </div>
                        )}
                    </div>

                    {/* PIE DE PÁGINA: Total Recaudado (Mismo estilo que el mesero) */}
                    <div style={{ flexShrink: 0, marginTop: "1rem", paddingTop: "1.5rem", borderTop: "2px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            <span style={{ color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>Ingresos Totales</span>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Balance neto del día</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                            <div style={{ height: "45px", width: "2px", background: "rgba(255,255,255,0.1)" }}></div>
                            <span style={{ fontSize: "2.5rem", fontWeight: "bold", color: "white" }}>${ingresosTotales.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            );

        // ====================================================
        // MODAL DE RITMO DE CAJA (GRÁFICA)
        // ====================================================
        case 'cashier_performance':
            const chartData = (performanceData && performanceData.length > 0) ? performanceData : [0, 0];
            const isMinuteView = chartData.length === 7; 
            const maxOrders = Math.max(...chartData);
            const maxVal = Math.max(5, Math.ceil(maxOrders / 5) * 5); 
            const yLabels = [maxVal, maxVal * 0.8, maxVal * 0.6, maxVal * 0.4, maxVal * 0.2, 0].map(v => Math.round(v));
            
            let xLabels: any[] = [];
            let xAxisTitle = "";

            if (isMinuteView) {
                xLabels = [0, 10, 20, 30, 40, 50, 60];
                xAxisTitle = "Minutos Transcurridos (Primera hora)";
            } else {
                const totalHours = Math.max(1, chartData.length - 1); 
                for (let i = 0; i <= totalHours; i++) xLabels.push(i);
                xAxisTitle = "Horas Trabajadas (Acumuladas)";
            }

            const chartHeight = 250;
            const chartWidth = 600;

            const getCoordinatesForPoint = (value: number, index: number, totalPoints: number) => {
                const x = totalPoints > 1 ? (index / (totalPoints - 1)) * chartWidth : 0;
                const y = chartHeight - (value / maxVal) * chartHeight;
                return `${x},${y}`;
            };

            const linePath = chartData.map((val, idx) => 
                (idx === 0 ? 'M ' : 'L ') + getCoordinatesForPoint(val, idx, chartData.length)
            ).join(' ');

            return (
                <div>
                    <style>{`
                        @keyframes slideUpChart { 0% { transform: translateY(80px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
                        @keyframes drawLine { to { stroke-dashoffset: 0; } }
                        @keyframes popDot { 0% { transform: scale(0); opacity: 0; } 80% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
                        .animate-wrapper { animation: slideUpChart 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                        .animate-line { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: drawLine 1.5s ease-out 0.2s forwards; }
                        .animate-dot { transform-origin: center; transform-box: fill-box; animation: popDot 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; }
                    `}</style>

                    <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                        <Activity size={48} color="#8b5cf6" style={{ margin: "0 auto 1rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Flujo de Transacciones</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            {isMinuteView ? "Análisis de cobros en tu primera hora." : `Volumen de mesas cobradas en el turno.`}
                        </p>
                    </div>

                    <div className="animate-wrapper" style={{ position: "relative", width: "100%", maxWidth: "650px", margin: "0 auto", padding: "1rem 2rem 4rem 5rem" }}>
                        <div style={{ position: "absolute", left: "-60px", top: "45%", transform: "translateY(-50%) rotate(-90deg)", color: "var(--text-muted)", fontWeight: "bold", fontSize: "0.9rem", letterSpacing: "1px", width: "200px", textAlign: "center" }}>
                            Cuentas Pagadas
                        </div>
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
                            <polyline points={`0,0 0,${chartHeight} ${chartWidth},${chartHeight}`} fill="none" stroke="#334155" strokeWidth="3" />
                            <path className="animate-line" d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                            {yLabels.map((val, i) => {
                                const yPos = chartHeight - (val / maxVal) * chartHeight;
                                return <text key={`y-${i}`} x="-15" y={yPos + 5} fill="var(--text-muted)" fontSize="14" fontWeight="bold" textAnchor="end">{val}</text>;
                            })}
                            {xLabels.map((val, i) => {
                                const xPos = (i / (xLabels.length - 1)) * chartWidth;
                                return <text key={`x-${i}`} x={xPos} y={chartHeight + 25} fill="var(--text-muted)" fontSize="14" fontWeight="bold" textAnchor="middle">{val}</text>;
                            })}
                            {chartData.map((val, idx) => {
                                const coord = getCoordinatesForPoint(val, idx, chartData.length).split(',');
                                const delay = 0.4 + (idx * 0.08); 
                                return <circle key={idx} className="animate-dot" style={{ animationDelay: `${delay}s` }} cx={coord[0]} cy={coord[1]} r="6" fill="#8b5cf6" stroke="#1e293b" strokeWidth="3" />;
                            })}
                        </svg>
                        <div style={{ textAlign: "center", color: "var(--text-muted)", fontWeight: "bold", fontSize: "0.9rem", marginTop: "4rem", letterSpacing: "1px" }}>
                            {xAxisTitle}
                        </div>
                    </div>
                </div>
            );

        // ====================================================
        // MODAL DE DETALLE DE PEDIDO (PARA EL CAJERO)
        // ====================================================
        case 'cashier_order_detail':
            if (!modalData) return <div style={{ textAlign: "center", padding: "2rem" }}>Cargando...</div>;
            
            return (
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <ReceiptText color="var(--primary)" /> Detalle de Cuenta
                    </h2>
                    
                    <div className="glass-panel" style={{ padding: "2rem", borderLeft: `4px solid ${modalData.is_paid ? '#10b981' : 'var(--status-ready)'}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                            <span style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Mesa {modalData.table_number}</span>
                            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <Clock size={16} /> {new Date(modalData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "1.5rem" }}>
                            {modalData.items?.map((item: any, idx: number) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                                    <span>{item.quantity}x {item.product_name || item.product?.name || 'Producto'}</span>
                                    <span>${((item.price || item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>Total a Pagar:</span>
                            <strong style={{ fontSize: "1.8rem", color: "white" }}>${modalData.total?.toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            );

        default: return null;
    }
}