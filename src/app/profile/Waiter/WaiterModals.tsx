"use client";

import { CheckCircle, Activity, Users, ReceiptText, Clock, AlertTriangle, ChevronRight } from "lucide-react";

interface WaiterModalsProps {
    activeModal: string | null;
    modalData?: any; 
    ordersList?: any[]; // Recibe la lista de pedidos del día
    onViewOrder?: (orderData: any) => void; // Función que se ejecuta al dar clic a una caja
}

export function WaiterModals({ activeModal, modalData, ordersList, onViewOrder }: WaiterModalsProps) {
    if (!activeModal) return null;

    switch (activeModal) {
        // ====================================================
        // MODAL DE HISTORIAL DE PEDIDOS (CAJITAS NAVEGABLES)
        // ====================================================
        case 'waiter_orders':
            return (
                <div>
                    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                        <CheckCircle size={48} color="#10b981" style={{ margin: "0 auto 1rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Tus Pedidos de Hoy</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            Has tomado {ordersList?.length || 0} pedidos durante la fecha seleccionada.
                        </p>
                    </div>

                    {/* Contenedor con scroll para las cajitas */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "55vh", overflowY: "auto", paddingRight: "0.5rem" }}>
                        {ordersList && ordersList.length > 0 ? (
                            // Ordenamos para que los más recientes salgan arriba
                            [...ordersList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((order: any, idx: number) => (
                                <div 
                                    key={idx}
                                    onClick={() => onViewOrder && onViewOrder(order)}
                                    className="glass-panel"
                                    style={{
                                        padding: "1.2rem",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        cursor: "pointer",
                                        transition: "background 0.2s ease",
                                        borderLeft: `4px solid ${
                                            order.status === 'pending' ? 'var(--status-pending)' : 
                                            order.status === 'preparing' ? 'var(--status-preparing)' : 
                                            order.status === 'served' ? 'var(--status-served)' : 
                                            order.status === 'ready' ? 'var(--status-ready)' :  
                                            'var(--status-cancel)'
                                        }`
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
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

        case 'waiter_performance':
            return (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                    <Activity size={48} color="#3b82f6" style={{ margin: "0 auto 1rem" }} />
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>Productividad Alta 🔥</h2>
                    <p style={{ color: "var(--text-muted)" }}>Estás manteniendo un ritmo excelente en tu turno.</p>
                </div>
            );

        case 'waiter_tables':
            return (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                    <Users size={48} color="#f59e0b" style={{ margin: "0 auto 1rem" }} />
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>Tus Mesas Activas</h2>
                    <p style={{ color: "var(--text-muted)" }}>Las mesas que actualmente estás atendiendo.</p>
                </div>
            );

        // ====================================================
        // MODAL DE DETALLE DE PEDIDO (Tus colores dinámicos)
        // ====================================================
        case 'waiter_order_detail':
            if (!modalData) return <div style={{ textAlign: "center", padding: "2rem" }}>Cargando...</div>;

            const isAudit = modalData.isAudit === true;
            let borderColor = '';
            
            if (isAudit) {
                const estado = modalData.estado_pedido?.toLowerCase() || '';
                borderColor = estado.includes('eliminado') || estado.includes('cancelado') ? 'var(--status-cancel)' : '#f59e0b';
            } else {
                borderColor = 
                    modalData.status === 'pending' ? 'var(--status-pending)' : 
                    modalData.status === 'preparing' ? 'var(--status-preparing)' : 
                    modalData.status === 'served' ? 'var(--status-served)' : 
                    modalData.status === 'ready' ? 'var(--status-ready)' :  
                    'var(--status-cancel)';
            }

            return (
                <div>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <ReceiptText color="var(--primary)" /> 
                        {isAudit ? 'Registro de Auditoría' : 'Detalle del Pedido'}
                    </h2>
                    
                    <div className="glass-panel" style={{ 
                        padding: "2rem", 
                        borderLeft: `4px solid ${borderColor}` 
                    }}>
                        
                        {/* CABECERA: Mesa y Hora */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                            <span style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Mesa {isAudit ? modalData.mesa : modalData.table_number}</span>
                            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <Clock size={16} />
                                {new Date(isAudit ? modalData.fecha_hora : modalData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        {/* RENDERIZADO SI ES UN CAMBIO/EDICIÓN/CANCELACIÓN */}
                        {isAudit ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Acción realizada:</span>
                                    <span style={{ background: "rgba(255,255,255,0.05)", padding: "0.3rem 0.8rem", borderRadius: "8px", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.85rem", color: modalData.estado_pedido.toLowerCase().includes('eliminado') || modalData.estado_pedido.toLowerCase().includes('cancelado') ? '#ef4444' : '#f59e0b' }}>
                                        {modalData.estado_pedido}
                                    </span>
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
                                    <span style={{ 
                                        background: modalData.status === 'pending' ? 'var(--bg-status-pending)' : 
                                                    modalData.status === 'preparing' ? 'var(--bg-status-preparing)' : 
                                                    modalData.status === 'served' ? 'var(--bg-status-served)' : 
                                                    modalData.status === 'ready' ? 'var(--bg-status-ready)' :  
                                                    'var(--bg-status-cancel)',
                                        padding: "0.3rem 0.8rem", borderRadius: "8px", 
                                        color:  modalData.status === 'pending' ? 'var(--status-pending)' : 
                                                modalData.status === 'preparing' ? 'var(--status-preparing)' : 
                                                modalData.status === 'served' ? 'var(--status-served)' : 
                                                modalData.status === 'ready' ? 'var(--status-ready)' :  
                                                'var(--status-cancel)',
                                        textTransform: "uppercase", 
                                        fontSize: "0.85rem",
                                        fontWeight: "bold"
                                    }}>
                                        {   modalData.status === 'pending' ? 'Pendiente' :
                                            modalData.status === 'preparing' ? 'Preparando' : 
                                            modalData.status === 'served' ? '¡¡Listo p/ servir!!' : 
                                            modalData.status === 'ready' ? 'Listo' : 
                                            modalData.status} 
                                        {   modalData.is_paid ? ' - Pagado 💵' : ''}
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
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}>
                                            <AlertTriangle size={16} /> No hay registro de los ítems
                                        </div>
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

        default:
            return null;
    }
}