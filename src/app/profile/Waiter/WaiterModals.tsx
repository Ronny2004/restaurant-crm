"use client";

import { CheckCircle, Activity, Users } from "lucide-react";

interface WaiterModalsProps {
    activeModal: string | null;
}

export function WaiterModals({ activeModal }: WaiterModalsProps) {
    if (!activeModal) return null;

    switch (activeModal) {
        case 'waiter_orders':
            return (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                    <CheckCircle size={48} color="#10b981" style={{ margin: "0 auto 1rem" }} />
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>Historial de tus Pedidos</h2>
                    <p style={{ color: "var(--text-muted)" }}>
                        Aquí verás la lista detallada de todas las órdenes que has despachado en tu turno actual.
                    </p>
                </div>
            );

        case 'waiter_performance':
            return (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                    <Activity size={48} color="#3b82f6" style={{ margin: "0 auto 1rem" }} />
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>Productividad Alta 🔥</h2>
                    <p style={{ color: "var(--text-muted)" }}>
                        Estás manteniendo un ritmo excelente. Tu tiempo de respuesta promedio es de 5 minutos por mesa.
                    </p>
                </div>
            );

        case 'waiter_tables':
            return (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                    <Users size={48} color="#f59e0b" style={{ margin: "0 auto 1rem" }} />
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>Tus Mesas Activas</h2>
                    <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "1rem" }}>
                        <div className="glass-panel" style={{ padding: "1.5rem", border: "1px solid #f59e0b", minWidth: "120px" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Estado: Atendiendo</span>
                            <strong style={{ fontSize: "1.2rem" }}>Mesa 4</strong>
                        </div>
                        <div className="glass-panel" style={{ padding: "1.5rem", border: "1px solid #f59e0b", minWidth: "120px" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Estado: Esperando</span>
                            <strong style={{ fontSize: "1.2rem" }}>Mesa 7</strong>
                        </div>
                    </div>
                </div>
            );

        default:
            return null;
    }
}