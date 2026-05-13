"use client";

import { CheckCircle, Activity, Users, ReceiptText, Clock, AlertTriangle, ChevronRight } from "lucide-react";

interface WaiterModalsProps {
    activeModal: string | null;
    modalData?: any; 
    ordersList?: any[]; 
    performanceData?: number[]; // <--- ¡AQUÍ ESTÁ EL ARREGLO DEL ERROR!
    onViewOrder?: (orderData: any) => void; 
}

export function WaiterModals({ activeModal, modalData, ordersList, performanceData, onViewOrder }: WaiterModalsProps) {
    if (!activeModal) return null;

    switch (activeModal) {
        // ====================================================
        // MODAL DE HISTORIAL DE PEDIDOS
        // ====================================================
        case 'waiter_orders':
            return (
                <div>
                    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                        <CheckCircle size={48} color="#10b981" style={{ margin: "0 auto 1rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Tus Pedidos de Hoy</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>Has tomado {ordersList?.length || 0} pedidos durante la fecha seleccionada.</p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "55vh", overflowY: "auto", paddingRight: "0.5rem" }}>
                        {ordersList && ordersList.length > 0 ? (
                            [...ordersList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((order: any, idx: number) => (
                                <div key={idx} onClick={() => onViewOrder && onViewOrder(order)} className="glass-panel" style={{ padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.2s ease", borderLeft: `4px solid ${order.status === 'pending' ? 'var(--status-pending)' : order.status === 'preparing' ? 'var(--status-preparing)' : order.status === 'served' ? 'var(--status-served)' : order.status === 'ready' ? 'var(--status-ready)' : 'var(--status-cancel)'}` }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                        <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>Mesa {order.table_number}</span>
                                        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                            <Clock size={14} />
                                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                        <span style={{ fontWeight: "bold", color: "white" }}>${order.total?.toFixed(2) || "0.00"}</span>
                                        <ChevronRight size={20} color="var(--text-muted)" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: "center", padding: "2rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                                <p style={{ color: "var(--text-muted)" }}>No hay pedidos registrados.</p>
                            </div>
                        )}
                    </div>
                </div>
            );

        // ====================================================
        // MODAL DE RENDIMIENTO (GRÁFICA CON DATOS REALES)
        // ====================================================
        case 'waiter_performance':
            // 👇 AQUÍ USAMOS LOS DATOS REALES DEL PERFIL 👇
            // Si performanceData no existe o está vacío, ponemos datos base para que no falle
            const chartData = (performanceData && performanceData.length > 0) ? performanceData : [0];
            
            // Calculamos el Eje Y (Máximo de pedidos de ese día)
            const maxOrders = Math.max(...chartData);
            const maxVal = Math.max(5, Math.ceil(maxOrders / 5) * 5); // Escala en múltiplos de 5 (mínimo 5)
            const yLabels = [maxVal, maxVal * 0.8, maxVal * 0.6, maxVal * 0.4, maxVal * 0.2, 0].map(v => Math.round(v));
            
            // Calculamos el Eje X (Horas trabajadas)
            const totalHours = Math.max(1, chartData.length - 1); 
            const xLabels = [0, 0.2, 0.4, 0.6, 0.8, 1].map(pct => Math.round(totalHours * pct));

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
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>Crecimiento de pedidos en las últimas {totalHours} horas trabajadas.</p>
                    </div>

                    <div className="animate-wrapper" style={{ position: "relative", width: "100%", maxWidth: "650px", margin: "0 auto", padding: "1rem 2rem 2rem 4rem" }}>
                        
                        {/* ETIQUETA EJE Y */}
                        <div style={{ position: "absolute", left: "-60px", top: "50%", transform: "translateY(-50%) rotate(-90deg)", color: "var(--text-muted)", fontWeight: "bold", fontSize: "0.9rem", letterSpacing: "1px", width: "200px", textAlign: "center" }}>
                            Total de Pedidos
                        </div>

                        {/* NÚMEROS EJE Y DINÁMICOS */}
                        <div style={{ position: "absolute", left: "10px", top: "1rem", bottom: "2.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textAlign: "right", paddingRight: "10px" }}>
                            {yLabels.map((val, i) => <span key={i}>{val}</span>)}
                        </div>

                        {/* LIENZO SVG */}
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
                            <polyline points={`0,0 0,${chartHeight} ${chartWidth},${chartHeight}`} fill="none" stroke="#334155" strokeWidth="3" />
                            <path className="animate-line" d={linePath} fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                            
                            {chartData.map((val, idx) => {
                                const coord = getCoordinatesForPoint(val, idx, chartData.length).split(',');
                                const delay = 0.4 + (idx * 0.08); 
                                return (
                                    <circle key={idx} className="animate-dot" style={{ animationDelay: `${delay}s` }} cx={coord[0]} cy={coord[1]} r="6" fill="#ef4444" stroke="#1e293b" strokeWidth="3" />
                                );
                            })}
                        </svg>

                        {/* NÚMEROS EJE X DINÁMICOS */}
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", marginTop: "1rem" }}>
                            {xLabels.map((val, i) => <span key={i}>{val}</span>)}
                        </div>

                        {/* ETIQUETA EJE X */}
                        <div style={{ textAlign: "center", color: "var(--text-muted)", fontWeight: "bold", fontSize: "0.9rem", marginTop: "1.5rem", letterSpacing: "1px" }}>
                            Horas Trabajadas (Acumuladas)
                        </div>
                    </div>
                </div>
            );

        // ====================================================
        // MODAL DE MESAS ACTIVAS
        // ====================================================
        case 'waiter_tables':
            return (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                    <Users size={48} color="#f59e0b" style={{ margin: "0 auto 1rem" }} />
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>Tus Mesas Activas</h2>
                    <p style={{ color: "var(--text-muted)" }}>Las mesas que actualmente estás atendiendo.</p>
                </div>
            );

        // ====================================================
        // MODAL DE DETALLE DE PEDIDO
        // ====================================================
        case 'waiter_order_detail':
            if (!modalData) return <div style={{ textAlign: "center", padding: "2rem" }}>Cargando...</div>;
            const isAudit = modalData.isAudit === true;
            let borderColor = '';
            
            if (isAudit) {
                const estado = modalData.estado_pedido?.toLowerCase() || '';
                borderColor = estado.includes('eliminado') || estado.includes('cancelado') ? 'var(--status-cancel)' : '#f59e0b';
            } else {
                borderColor = modalData.status === 'pending' ? 'var(--status-pending)' : modalData.status === 'preparing' ? 'var(--status-preparing)' : modalData.status === 'served' ? 'var(--status-served)' : modalData.status === 'ready' ? 'var(--status-ready)' : 'var(--status-cancel)';
            }

            return (
                <div>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><ReceiptText color="var(--primary)" /> {isAudit ? 'Registro de Auditoría' : 'Detalle del Pedido'}</h2>
                    
                    <div className="glass-panel" style={{ padding: "2rem", borderLeft: `4px solid ${borderColor}` }}>
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
                                    <span style={{ background: "rgba(255,255,255,0.05)", padding: "0.3rem 0.8rem", borderRadius: "8px", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem", color: modalData.estado_pedido.toLowerCase().includes('eliminado') || modalData.estado_pedido.toLowerCase().includes('cancelado') ? '#ef4444' : '#f59e0b' }}>{modalData.estado_pedido}</span>
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
                                    <span style={{ background: modalData.status === 'pending' ? 'var(--bg-status-pending)' : modalData.status === 'preparing' ? 'var(--bg-status-preparing)' : modalData.status === 'served' ? 'var(--bg-status-served)' : modalData.status === 'ready' ? 'var(--bg-status-ready)' : 'var(--bg-status-cancel)', padding: "0.3rem 0.8rem", borderRadius: "8px", color: modalData.status === 'pending' ? 'var(--status-pending)' : modalData.status === 'preparing' ? 'var(--status-preparing)' : modalData.status === 'served' ? 'var(--status-served)' : modalData.status === 'ready' ? 'var(--status-ready)' : 'var(--status-cancel)', textTransform: "uppercase", fontSize: "0.85rem", fontWeight: "bold" }}>
                                        {modalData.status === 'pending' ? 'Pendiente' : modalData.status === 'preparing' ? 'Preparando' : modalData.status === 'served' ? '¡¡Listo p/ servir!!' : modalData.status === 'ready' ? 'Listo' : modalData.status} {modalData.is_paid ? ' - Pagado 💵' : ''}
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