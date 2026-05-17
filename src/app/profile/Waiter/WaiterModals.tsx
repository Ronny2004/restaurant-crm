"use client";

import { useState } from "react";
import { CheckCircle, Activity, Users, ReceiptText, Clock, AlertTriangle, ChevronRight, User, Calendar } from "lucide-react";

interface WaiterModalsProps {
    activeModal: string | null;
    modalData?: any; 
    ordersList?: any[]; 
    performanceData?: number[];
    activeTablesList?: any[]; 
    profile?: any;            
    onViewOrder?: (orderData: any) => void; 
}

const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'ready':
            return { text: 'Listo p/ Pagar', bg: 'var(--bg-status-ready)', color: 'var(--status-ready)' };
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

export function WaiterModals({ 
    activeModal, 
    modalData, 
    ordersList, 
    performanceData, 
    activeTablesList, 
    profile,          
    onViewOrder 
}: WaiterModalsProps) {
    
    // 👇 ESTADO PARA EL FILTRO DE LOS TICKETS 👇
    const [ordersFilter, setOrdersFilter] = useState<'all' | 'pending' | 'completed'>('all');

    if (!activeModal) return null;

    switch (activeModal) {
        // ====================================================
        // MODAL DE HISTORIAL DE PEDIDOS (CORTE DE CAJA DEL MESERO)
        // ====================================================
        case 'waiter_orders':
            // 1. Filtrado Visual (Lo que se dibuja en la lista)
            const filteredOrders = ordersList?.filter(order => {
                const isCompleted = order.status === 'ready' || order.is_paid === true;
                if (ordersFilter === 'completed') return isCompleted;
                if (ordersFilter === 'pending') return !isCompleted;
                return true; // 'all'
            }) || [];

            // 2. Lógica Contable (ESTA NUNCA CAMBIA, siempre suma los listos/pagados)
            const pedidosCompletados = ordersList?.filter(o => o.status === 'ready' || o.is_paid) || [];
            const grandTotal = pedidosCompletados.reduce((sum, order) => sum + (order.total || 0), 0);

            return (
                // FIX SCROLL: Altura fija de 65vh para que nunca exceda el modal
                <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
                    
                    <div style={{ textAlign: "center", marginBottom: "1rem", flexShrink: 0 }}>
                        <CheckCircle size={40} color="#10b981" style={{ margin: "0 auto 0.5rem" }} />
                        <h2 style={{ fontSize: "1.6rem", marginBottom: "0.2rem" }}>Historial de Ventas</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>
                            Has tomado {ordersList?.length || 0} pedidos hoy.
                        </p>
                    </div>

                    {/* 👇 BOTONES DE FILTRO 👇 */}
                    <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem", flexShrink: 0 }}>
                        <button 
                            onClick={() => setOrdersFilter('all')}
                            style={{ padding: "0.4rem 1rem", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", background: ordersFilter === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent', color: ordersFilter === 'all' ? 'white' : 'var(--text-muted)', cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem", transition: "all 0.2s" }}
                        >
                            Todos
                        </button>
                        <button 
                            onClick={() => setOrdersFilter('pending')}
                            style={{ padding: "0.4rem 1rem", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", background: ordersFilter === 'pending' ? 'var(--bg-status-pending)' : 'transparent', color: ordersFilter === 'pending' ? 'var(--status-pending)' : 'var(--text-muted)', cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem", transition: "all 0.2s" }}
                        >
                            En Curso
                        </button>
                        <button 
                            onClick={() => setOrdersFilter('completed')}
                            style={{ padding: "0.4rem 1rem", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", background: ordersFilter === 'completed' ? 'var(--bg-status-ready)' : 'transparent', color: ordersFilter === 'completed' ? 'var(--status-ready)' : 'var(--text-muted)', cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem", transition: "all 0.2s" }}
                        >
                            Completados
                        </button>
                    </div>

                    {/* FIX SCROLL: flex: 1 con minHeight: 0 obliga a hacer el scroll internamente */}
                    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", paddingRight: "0.5rem", paddingBottom: "1rem" }}>
                        {filteredOrders && filteredOrders.length > 0 ? (
                            [...filteredOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((order: any, idx: number) => {
                                const statusConf = getStatusConfig(order.status); 
                                
                                return (
                                    <div 
                                        key={idx} 
                                        className="glass-panel" 
                                        style={{ 
                                            padding: "1.2rem", 
                                            borderLeft: `4px solid ${statusConf.color}` 
                                        }} 
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.8rem", marginBottom: "0.8rem" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                                                <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "white" }}>Mesa {order.table_number}</span>
                                                <span style={{ fontSize: "0.7rem", background: statusConf.bg, color: statusConf.color, padding: "0.2rem 0.5rem", borderRadius: "12px", textTransform: "uppercase", fontWeight: "bold" }}>
                                                    {statusConf.text} {order.is_paid ? '- Pagado💵' : ''}
                                                </span>
                                            </div>
                                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                                <Clock size={12} />
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.8rem" }}>
                                            {order.items && order.items.length > 0 ? (
                                                order.items.map((item: any, i: number) => (
                                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#cbd5e1" }}>
                                                        <span>{item.quantity}x {item.product_name || item.product?.name || 'Producto'}</span>
                                                        <span style={{ color: "var(--text-muted)" }}>${((item.price || item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>Sin detalles de ítems</span>
                                            )}
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", paddingTop: "0.6rem", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                                            <span style={{ fontWeight: "bold", fontSize: "1rem", color: "white" }}>
                                                Subtotal: <span style={{ color: "var(--primary)" }}>${order.total?.toFixed(2) || "0.00"}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ textAlign: "center", padding: "2rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", marginTop: "auto", marginBottom: "auto" }}>
                                <ReceiptText size={32} color="var(--text-muted)" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                                <h3 style={{ color: "white", marginBottom: "0.5rem", fontSize: "1.1rem" }}>No se encontraron pedidos</h3>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No hay registros con este filtro.</p>
                            </div>
                        )}
                    </div>

                    {/* PIE DE PÁGINA (Total Recaudado) */}
                    <div style={{ 
                        flexShrink: 0, 
                        marginTop: "1rem", 
                        paddingTop: "1rem", 
                        borderTop: "2px solid rgba(255,255,255,0.1)", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center"
                    }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            <span style={{ color: "white", fontSize: "1.1rem", fontWeight: "bold", letterSpacing: "0.5px" }}>Total Recaudado</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Por {pedidosCompletados.length} mesas listas/pagadas</span>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{ height: "40px", width: "2px", background: "rgba(255,255,255,0.1)" }}></div>
                            <span style={{ fontSize: "2.2rem", fontWeight: "bold", color: "white" }}>
                                ${grandTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            );

        // ====================================================
        // MODAL DE RENDIMIENTO
        // ====================================================
        case 'waiter_performance':
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
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Curva de Productividad</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            {isMinuteView ? "Análisis detallado de tu primera hora." : `Progreso histórico de tu turno.`}
                        </p>
                    </div>

                    <div className="animate-wrapper" style={{ position: "relative", width: "100%", maxWidth: "650px", margin: "0 auto", padding: "1rem 2rem 4rem 5rem" }}>
                        <div style={{ position: "absolute", left: "-60px", top: "45%", transform: "translateY(-50%) rotate(-90deg)", color: "var(--text-muted)", fontWeight: "bold", fontSize: "0.9rem", letterSpacing: "1px", width: "200px", textAlign: "center" }}>
                            Total de Pedidos
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
        // MODAL DE MESAS ACTIVAS
        // ====================================================
        case 'waiter_tables':
            const mesasActivas = activeTablesList?.reduce((acc: any, order: any) => {
                if (!acc[order.table_number]) {
                    acc[order.table_number] = { ...order, itemsCount: order.items?.length || 0, totalAmount: order.total };
                } else {
                    if (new Date(order.created_at) < new Date(acc[order.table_number].created_at)) {
                        acc[order.table_number].created_at = order.created_at; 
                    }
                    acc[order.table_number].itemsCount += (order.items?.length || 0);
                    acc[order.table_number].totalAmount += order.total;

                    const prioridades: Record<string, number> = { preparing: 4, editing: 3, pending: 2, served: 1, ready: 0 };
                    const currentPrio = prioridades[acc[order.table_number].status] || 0;
                    const newPrio = prioridades[order.status] || 0;
                    
                    if (newPrio > currentPrio) {
                        acc[order.table_number].status = order.status;
                    }
                }
                return acc;
            }, {});

            const tablesArray = Object.values(mesasActivas || {});

            const calculateTimeElapsed = (dateStr: string) => {
                const past = new Date(dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`).getTime();
                const now = new Date().getTime();
                const diffMs = now - past;
                
                if (diffMs < 60000) return "Justo ahora";
                
                const minutes = Math.floor(diffMs / 60000);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (days > 0) return `Hace ${days} d`;
                if (hours > 0) return `Hace ${hours}h ${minutes % 60}m`;
                return `Hace ${minutes} min`;
            };

            return (
                <div>
                    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                        <Users size={48} color="#f59e0b" style={{ margin: "0 auto 1rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Mesas en Atención</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            Hay {tablesArray.length} {tablesArray.length === 1 ? 'mesa activa' : 'mesas activas'} en este momento.
                        </p>
                    </div>

                    {tablesArray.length > 0 ? (
                        <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", 
                            gap: "2.5rem",
                            padding: "1rem" 
                        }}>
                            {tablesArray.map((table: any, idx: number) => {
                                const statusConf = getStatusConfig(table.status);
                                const isMine = table.created_by === profile?.id;

                                const partnerName = table.profiles?.full_name || table.profiles?.username || table.mesero || "Otro Mesero";
                                const partnerAvatar = table.profiles?.avatar_url; 

                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => onViewOrder && onViewOrder(table)}
                                        style={{
                                            aspectRatio: "1", 
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            borderRadius: "50%",
                                            border: `4px solid ${statusConf.color}`,
                                            background: `linear-gradient(145deg, rgba(255,255,255,0.03) 0%, ${statusConf.bg} 100%)`, 
                                            transition: "all 0.2s ease",
                                            boxShadow: `0 0 20px ${statusConf.bg}`, 
                                            position: "relative"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "scale(1.05)";
                                            e.currentTarget.style.boxShadow = `0 0 30px ${statusConf.bg}`;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "scale(1)";
                                            e.currentTarget.style.boxShadow = `0 0 20px ${statusConf.bg}`;
                                        }}
                                    >
                                        <span style={{ fontSize: "1rem", color: "var(--text-muted)", marginBottom: "-0.5rem" }}>Mesa</span>
                                        <span style={{ fontSize: "3.5rem", fontWeight: "bold", color: "white" }}>{table.table_number}</span>
                                        
                                        <span style={{ 
                                            fontSize: "0.85rem", 
                                            color: "var(--text-muted)", 
                                            marginTop: "0.2rem",
                                            marginBottom: "1rem" 
                                        }}>
                                            {calculateTimeElapsed(table.created_at)}
                                        </span>
                                        
                                        {!isMine && (
                                            <div style={{ 
                                                position: "absolute", top: "-5px", right: "-5px", 
                                                background: "#0f172a", 
                                                borderRadius: "50%", 
                                                padding: "4px",
                                                zIndex: 10
                                            }} title={`Atendida por: ${partnerName}`}>
                                                <div style={{
                                                    width: "32px", height: "32px", 
                                                    borderRadius: "50%", 
                                                    background: "rgba(255,255,255,0.1)",
                                                    display: "flex", justifyContent: "center", alignItems: "center",
                                                    overflow: "hidden",
                                                    border: `1px solid ${statusConf.color}`
                                                }}>
                                                    {partnerAvatar ? (
                                                        <img src={partnerAvatar} alt={partnerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    ) : (
                                                        <User size={16} color="#cbd5e1" />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ 
                                            position: "absolute",
                                            bottom: "-16px",
                                            background: "#0f172a", 
                                            borderRadius: "16px",
                                            padding: "4px" 
                                        }}>
                                            <span style={{ 
                                                display: "block",
                                                fontSize: "0.75rem", 
                                                fontWeight: "bold", 
                                                color: statusConf.color, 
                                                background: statusConf.bg, 
                                                border: `2px solid ${statusConf.color}`,
                                                padding: "0.3rem 0.8rem",
                                                borderRadius: "12px",
                                                textTransform: "uppercase",
                                                whiteSpace: "nowrap"
                                            }}>
                                                {statusConf.text}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px" }}>
                            <div style={{ fontSize: "4rem", marginBottom: "1rem", opacity: 0.5 }}>🪑</div>
                            <h3 style={{ color: "white", marginBottom: "0.5rem", fontSize: "1.5rem" }}>Todo despejado</h3>
                            <p style={{ color: "var(--text-muted)" }}>No tienes ninguna mesa en atención en este momento.</p>
                        </div>
                    )}
                </div>
            );

        // ====================================================
        // MODAL DE DETALLE DE PEDIDO
        // ====================================================
        case 'waiter_order_detail':
            if (!modalData) return <div style={{ textAlign: "center", padding: "2rem" }}>Cargando...</div>;
            const isAudit = modalData.isAudit === true;
            
            let detailStatusConf = getStatusConfig(modalData.status);
            if (isAudit) {
                const estado = modalData.estado_pedido?.toLowerCase() || '';
                if (estado.includes('eliminado') || estado.includes('cancelado')) {
                    detailStatusConf = getStatusConfig('canceled');
                } else {
                    detailStatusConf = { text: modalData.estado_pedido, bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
                }
            }

            const isMyTicket = modalData.created_by === profile?.id;
            const ticketOwnerName = isMyTicket ? "Tú" : (modalData.profiles?.full_name || modalData.profiles?.username || modalData.mesero || "Otro Mesero");
            const ticketOwnerAvatar = isMyTicket ? profile?.avatar_url : modalData.profiles?.avatar_url;

            return (
                <div>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><ReceiptText color="var(--primary)" /> {isAudit ? 'Registro de Auditoría' : 'Detalle del Pedido'}</h2>
                    
                    <div className="glass-panel" style={{ padding: "2rem", borderLeft: `4px solid ${detailStatusConf.color}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                            <span style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Mesa {isAudit ? modalData.mesa : modalData.table_number}</span>
                            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <Clock size={16} /> {new Date(isAudit ? modalData.fecha_hora : modalData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        {isAudit ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Acción realizada:</span>
                                    <span style={{ background: detailStatusConf.bg, padding: "0.3rem 0.8rem", borderRadius: "8px", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem", color: detailStatusConf.color }}>{detailStatusConf.text}</span>
                                </div>
                                {modalData.pedido_original && (
                                    <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                                        <p style={{ margin: "0 0 0.5rem 0", color: "#fca5a5", fontSize: "0.85rem", fontWeight: "bold" }}>El pedido antes era:</p>
                                        <p style={{ margin: 0, fontSize: "0.95rem" }}>{modalData.pedido_original}</p>
                                    </div>
                                )}
                                {modalData.pedido_actualizado && !modalData.estado_pedido.toLowerCase().includes('eliminado') && !modalData.estado_pedido.toLowerCase().includes('cancelado') && (
                                    <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)", marginTop: "0.5rem" }}>
                                        <p style={{ margin: "0 0 0.5rem 0", color: "#6ee7b7", fontSize: "0.85rem", fontWeight: "bold" }}>Se cambió a:</p>
                                        <p style={{ margin: 0, fontSize: "0.95rem" }}>{modalData.pedido_actualizado}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Estado actual:</span>
                                    <span style={{ background: detailStatusConf.bg, padding: "0.3rem 0.8rem", borderRadius: "8px", color: detailStatusConf.color, textTransform: "uppercase", fontSize: "0.85rem", fontWeight: "bold" }}>
                                        {detailStatusConf.text} {modalData.is_paid ? ' - Pagado 💵' : ''}
                                    </span>
                                </div>
                                
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Atendido por:</span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: "bold", color: "white" }}>
                                        {ticketOwnerAvatar ? (
                                            <img src={ticketOwnerAvatar} alt={ticketOwnerName} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", border: `1px solid ${detailStatusConf.color}` }} />
                                        ) : (
                                            <User size={18} color="var(--primary)" />
                                        )}
                                        {ticketOwnerName}
                                    </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "1.5rem" }}>
                                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "bold" }}>Ítems enviados a cocina:</p>
                                    {modalData.items && modalData.items.length > 0 ? (
                                        modalData.items.map((item: any, idx: number) => (
                                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", background: "rgba(255,255,255,0.03)", padding: "0.6rem 0.8rem", borderRadius: "6px" }}>
                                                <span>{item.quantity}x {item.product_name || item.product?.name || 'Producto'}</span>
                                                <span style={{ color: "var(--text-muted)" }}>${((item.price || item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}><AlertTriangle size={16} /> No hay registro de los ítems</div>
                                    )}
                                </div>
                                <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <p style={{ margin: 0, color: "var(--text-muted)" }}>Total:</p>
                                    <strong style={{ fontSize: "1.6rem", color: "white" }}>${modalData.total?.toFixed(2) || "0.00"}</strong>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );

        default: return null;
    }
}