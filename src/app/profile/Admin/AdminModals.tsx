"use client";

import { Users, Clock, AlertTriangle, ShieldAlert, ReceiptText, User, ShoppingBag } from "lucide-react";

interface AdminModalsProps {
    activeModal: string | null;
    modalData?: any;
    allOrders?: any[];
    allAudits?: any[];
    onViewOrder?: (orderData: any) => void;
}

export function AdminModals({ 
    activeModal, 
    modalData, 
    allOrders = [], 
    allAudits = [] 
}: AdminModalsProps) {
    
    if (!activeModal) return null;

    // Estilo común fijado con Flexbox para erradicar el doble scroll externo
    const scrollContainerStyle: React.CSSProperties = {
        flex: 1, 
        minHeight: 0, 
        display: "flex", 
        flexDirection: "column", 
        gap: "1rem", 
        overflowY: "auto", 
        paddingRight: "0.5rem",
        paddingBottom: "1rem"
    };

    switch (activeModal) {
        // ====================================================
        // MODAL 1: PERSONAL ACTIVO
        // ====================================================
        case 'admin_employees':
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
                    <div style={{ textAlign: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
                        <Users size={40} color="#8b5cf6" style={{ margin: "0 auto 0.5rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Personal de Turno</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            Monitoreo de asistencia y estaciones de trabajo activas.
                        </p>
                    </div>

                    <div style={scrollContainerStyle}>
                        {/* Estructura base lista para iterar los perfiles activos del restaurante */}
                        <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #8b5cf6" }}>
                                    <User size={20} color="#8b5cf6" />
                                </div>
                                <div>
                                    <strong style={{ display: "block", color: "white" }}>Estaciones Sincronizadas</strong>
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Falta vincular registro_sesiones</span>
                                </div>
                            </div>
                            <span style={{ fontSize: "0.8rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.3rem 0.6rem", borderRadius: "12px", fontWeight: "bold" }}>
                                ONLINE
                            </span>
                        </div>
                    </div>
                </div>
            );

        // ====================================================
        // MODAL 2: VELOCIDAD DE COCINA DETALLADA
        // ====================================================
        case 'admin_kitchen':
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
                    <div style={{ textAlign: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
                        <Clock size={40} color="#f97316" style={{ margin: "0 auto 0.5rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Tiempos de Preparación</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            Análisis del tiempo transcurrido por mesa desde su envío a cocina.
                        </p>
                    </div>

                    <div style={scrollContainerStyle}>
                        {allOrders.length > 0 ? (
                            allOrders.map((order: any, i: number) => {
                                const start = new Date(order.created_at).getTime();
                                const end = new Date(order.updated_at || order.created_at).getTime();
                                const diffMin = Math.round((end - start) / (1000 * 60));

                                return (
                                    <div key={i} className="glass-panel" style={{ padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <strong style={{ display: "block", color: "white" }}>Mesa {order.table_number}</strong>
                                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                                <ShoppingBag size={12} /> {order.items?.length || 0} ítems enviados
                                            </span>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: diffMin > 20 ? "#ef4444" : "#f97316" }}>
                                                {diffMin} min
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No hay órdenes registradas hoy para promediar.</p>
                        )}
                    </div>
                </div>
            );

        // ====================================================
        // MODAL 3: ALERTAS DE STOCK / INVENTARIO
        // ====================================================
        case 'admin_stock':
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
                    <div style={{ textAlign: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
                        <AlertTriangle size={40} color="#ef4444" style={{ margin: "0 auto 0.5rem" }} />
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Alertas de Inventario</h2>
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>
                            Insumos y productos del menú críticos o agotados.
                        </p>
                    </div>

                    <div style={scrollContainerStyle}>
                        <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid #ef4444", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <strong style={{ display: "block", color: "white", fontSize: "1.1rem" }}>Bebidas & Suministros</strong>
                                <p style={{ margin: "0.2rem 0 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>Pendiente vincular con tabla stock/productos</p>
                            </div>
                            <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "0.3rem 0.8rem", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "bold" }}>
                                CRÍTICO
                            </span>
                        </div>
                    </div>
                </div>
            );

        // ====================================================
        // MODAL 4: VISTA DE DETALLE INTERNA (LOGS DE AUDITORÍA CLICKEABLES)
        // ====================================================
        case 'admin_detail':
            if (!modalData) return <div style={{ textAlign: "center", padding: "2rem" }}>Cargando datos...</div>;

            return (
                <div>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <ReceiptText color="#8b5cf6" /> Inspección del Sistema
                    </h2>
                    
                    <div className="glass-panel" style={{ padding: "2rem", borderLeft: `4px solid ${modalData.color || '#8b5cf6'}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                            <span style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Mesa {modalData.table_number || modalData.mesa || "N/A"}</span>
                            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <Clock size={16} /> {modalData.displayTime || "Transacción"}
                            </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "var(--text-muted)" }}>Responsable:</span>
                                <span style={{ fontWeight: "bold", color: "white" }}>{modalData.usuario || "Sistema"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "var(--text-muted)" }}>Evento registrado:</span>
                                <span style={{ background: "rgba(255,255,255,0.05)", padding: "0.3rem 0.8rem", borderRadius: "8px", fontWeight: "bold", color: modalData.color || 'white', fontSize: "0.85rem" }}>
                                    {modalData.desc || "Actualización ordinaria"}
                                </span>
                            </div>

                            {/* Detalle interno extendido de los payloads de auditoría */}
                            {modalData.pedido_original && (
                                <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "0.5rem" }}>
                                    <p style={{ margin: "0 0 0.5rem 0", color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "bold" }}>Payload de datos original:</p>
                                    <p style={{ margin: 0, fontSize: "0.95rem", color: "#cbd5e1" }}>{modalData.pedido_original}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );

        default: 
            return null;
    }
}