"use client";

import { Flame, Activity, Clock, ReceiptText, AlertTriangle, Utensils } from "lucide-react";

interface ChefModalsProps {
    activeModal: string | null;
    modalData?: any; 
    pendingOrders?: any[]; 
    preparingOrders?: any[]; 
    performanceData?: number[];
    profile?: any;            
    onViewOrder?: (orderData: any) => void; 
}

const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'ready':
            return { text: 'Listo p/ Servir', bg: 'var(--bg-status-ready)', color: 'var(--status-ready)' };
        case 'served':
            return { text: 'Sirviendo', bg: 'var(--bg-status-served)', color: 'var(--status-served)' };
        case 'preparing':
            return { text: 'En Cocina', bg: 'var(--bg-status-preparing)', color: 'var(--status-preparing)' };
        case 'pending':
            return { text: 'En Espera', bg: 'var(--bg-status-pending)', color: 'var(--status-pending)' };
        case 'editing':
            return { text: 'Editando...', bg: 'var(--bg-status-editing)', color: 'var(--status-editing)' };
        case 'canceled':
        case 'cancelado':
        case 'eliminado':
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

// Componente reutilizable para las tarjetas de cocina
const KitchenOrderCard = ({ order, statusConf, onViewOrder }: { order: any, statusConf: any, onViewOrder?: any }) => (
    <div 
        onClick={() => onViewOrder && onViewOrder(order)} 
        className="glass-panel" 
        style={{ 
            padding: "1.5rem", 
            borderLeft: `4px solid ${statusConf.color}`,
            cursor: "pointer",
            transition: "all 0.2s ease"
        }} 
        onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"} 
        onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
    >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.8rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "white" }}>Mesa {order.table_number}</span>
                <span style={{ fontSize: "0.75rem", background: statusConf.bg, color: statusConf.color, padding: "0.2rem 0.6rem", borderRadius: "12px", textTransform: "uppercase", fontWeight: "bold" }}>
                    {statusConf.text}
                </span>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Clock size={14} /> {calculateTimeElapsed(order.created_at)}
            </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p style={{ margin: "0 0 0.2rem 0", color: "white", fontSize: "0.9rem", fontWeight: "bold" }}>A preparar:</p>
            {order.items && order.items.length > 0 ? (
                order.items.map((item: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: "0.8rem", fontSize: "0.95rem", color: "#cbd5e1" }}>
                        <strong style={{ color: "var(--primary)" }}>{item.quantity}x</strong> 
                        <span>{item.product_name || item.product?.name || 'Producto'}</span>
                    </div>
                ))
            ) : (
                <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>Sin detalles de ítems</span>
            )}
        </div>
    </div>
);

export function ChefModals({ 
    activeModal, 
    modalData, 
    pendingOrders, 
    preparingOrders, 
    performanceData, 
    onViewOrder 
}: ChefModalsProps) {
    
    if (!activeModal) return null;

    switch (activeModal) {
        // ====================================================
        // MODAL DE PEDIDOS EN ESPERA
        // ====================================================
        case 'chef_pending':
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
                    <div style={{ textAlign: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
                        <Clock size={40} color="var(--status-pending)" style={{ margin: "0 auto 0.5rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Fila de Espera</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            Hay {pendingOrders?.length || 0} pedidos listos para entrar a la cocina.
                        </p>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "1.2rem", overflowY: "auto", paddingRight: "0.5rem", paddingBottom: "1rem" }}>
                        {pendingOrders && pendingOrders.length > 0 ? (
                            [...pendingOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((order: any, idx: number) => (
                                <KitchenOrderCard key={idx} order={order} statusConf={getStatusConfig(order.status)} onViewOrder={onViewOrder} />
                            ))
                        ) : (
                            <div style={{ textAlign: "center", padding: "3rem 2rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", marginTop: "auto", marginBottom: "auto" }}>
                                <Utensils size={40} color="var(--text-muted)" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                                <h3 style={{ color: "white", marginBottom: "0.5rem" }}>Cocina libre</h3>
                                <p style={{ color: "var(--text-muted)" }}>No hay pedidos nuevos en espera.</p>
                            </div>
                        )}
                    </div>
                </div>
            );

        // ====================================================
        // MODAL DE PEDIDOS EN PREPARACIÓN
        // ====================================================
        case 'chef_preparing':
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
                    <div style={{ textAlign: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
                        <Flame size={40} color="var(--status-preparing)" style={{ margin: "0 auto 0.5rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>En Preparación</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            Tienes {preparingOrders?.length || 0} pedidos cocinándose ahora mismo.
                        </p>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "1.2rem", overflowY: "auto", paddingRight: "0.5rem", paddingBottom: "1rem" }}>
                        {preparingOrders && preparingOrders.length > 0 ? (
                            [...preparingOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((order: any, idx: number) => (
                                <KitchenOrderCard key={idx} order={order} statusConf={getStatusConfig(order.status)} onViewOrder={onViewOrder} />
                            ))
                        ) : (
                            <div style={{ textAlign: "center", padding: "3rem 2rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", marginTop: "auto", marginBottom: "auto" }}>
                                <Flame size={40} color="var(--text-muted)" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                                <h3 style={{ color: "white", marginBottom: "0.5rem" }}>Estufa apagada</h3>
                                <p style={{ color: "var(--text-muted)" }}>No hay pedidos preparándose en este momento.</p>
                            </div>
                        )}
                    </div>
                </div>
            );

        // ====================================================
        // MODAL DE RENDIMIENTO
        // ====================================================
        case 'chef_performance':
            const chartData = (performanceData && performanceData.length > 0) ? performanceData : [0, 0];
            const isMinuteView = chartData.length === 7; 
            const maxOrders = Math.max(...chartData);
            const maxVal = Math.max(5, Math.ceil(maxOrders / 5) * 5); 
            const yLabels = [maxVal, maxVal * 0.8, maxVal * 0.6, maxVal * 0.4, maxVal * 0.2, 0].map(v => Math.round(v));
            
            let xLabels: any[] = [];
            let xAxisTitle = "";

            if (isMinuteView) {
                xLabels = [0, 10, 20, 30, 40, 50, 60];
                xAxisTitle = "Minutos Transcurridos (Primeros 60 min)";
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
                        <Activity size={48} color="#ef4444" style={{ margin: "0 auto 1rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Velocidad de Cocina</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            {isMinuteView ? "Platos sacados en la primera hora." : `Progreso de platos listos en el turno.`}
                        </p>
                    </div>

                    <div className="animate-wrapper" style={{ position: "relative", width: "100%", maxWidth: "650px", margin: "0 auto", padding: "1rem 2rem 4rem 5rem" }}>
                        <div style={{ position: "absolute", left: "-60px", top: "45%", transform: "translateY(-50%) rotate(-90deg)", color: "var(--text-muted)", fontWeight: "bold", fontSize: "0.9rem", letterSpacing: "1px", width: "200px", textAlign: "center" }}>
                            Platos Completados
                        </div>
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
                            <polyline points={`0,0 0,${chartHeight} ${chartWidth},${chartHeight}`} fill="none" stroke="#334155" strokeWidth="3" />
                            <path className="animate-line" d={linePath} fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
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
                                return <circle key={idx} className="animate-dot" style={{ animationDelay: `${delay}s` }} cx={coord[0]} cy={coord[1]} r="6" fill="#ef4444" stroke="#1e293b" strokeWidth="3" />;
                            })}
                        </svg>
                        <div style={{ textAlign: "center", color: "var(--text-muted)", fontWeight: "bold", fontSize: "0.9rem", marginTop: "4rem", letterSpacing: "1px" }}>
                            {xAxisTitle}
                        </div>
                    </div>
                </div>
            );

        // ====================================================
        // MODAL DE DETALLE DE AUDITORÍA
        // ====================================================
        case 'chef_order_detail':
            if (!modalData) return <div style={{ textAlign: "center", padding: "2rem" }}>Cargando...</div>;
            
            // Reutilizamos el visor de auditoría simple del mesero para el historial del Chef
            return (
                <div>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><ReceiptText color="var(--primary)" /> Registro de Cocina</h2>
                    
                    <div className="glass-panel" style={{ padding: "2rem", borderLeft: `4px solid ${modalData.color || '#f59e0b'}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                            <span style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Mesa {modalData.mesa}</span>
                            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <Clock size={16} /> {new Date(modalData.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "var(--text-muted)" }}>Acción realizada:</span>
                                <span style={{ background: "rgba(255,255,255,0.05)", padding: "0.3rem 0.8rem", borderRadius: "8px", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem", color: modalData.color || '#f59e0b' }}>{modalData.estado_pedido}</span>
                            </div>
                            {modalData.pedido_actualizado && !modalData.estado_pedido.toLowerCase().includes('eliminado') && (
                                <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)", marginTop: "0.5rem" }}>
                                    <p style={{ margin: "0 0 0.5rem 0", color: "#6ee7b7", fontSize: "0.85rem", fontWeight: "bold" }}>Detalle del pedido:</p>
                                    <p style={{ margin: 0, fontSize: "0.95rem" }}>{modalData.pedido_actualizado}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );

        default: return null;
    }
}