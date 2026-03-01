"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useSupabase, Order } from "@/context/SupabaseProvider";
import { DollarSign, Loader2, Lock } from "lucide-react"; // Añadido icono de candadoimport { RoleNavigation } from "@/components/RoleNavigation";
import { RoleNavigation } from "@/components/RoleNavigation";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";

export default function CajeroPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { orders, updateOrderStatus, loading } = useSupabase();
    const [confirmingPay, setConfirmingPay] = useState<string | null>(null);
    const toast = useToast();
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'ready':
                return { text: 'Listo p/ Pagar', bg: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }; // Verde
            case 'served':
                return { text: 'Sirviendo', bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }; // Azul
            case 'preparing':
                return { text: 'En Cocina', bg: 'rgba(249, 115, 22, 0.2)', color: '#f97316' }; // Naranja
            case 'pending':
            default:
                return { text: 'En Espera', bg: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }; // Amarillo
        }
    };

    useEffect(() => {
        if (!authLoading && (!profile || (profile.role !== "cashier" && profile.role !== "admin"))) {
            router.push("/login");
        }
    }, [authLoading, profile, router]);

    if (authLoading || !profile || (profile.role !== "cashier" && profile.role !== "admin")) {
        return (
            <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={48} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
            </div>
        );
    }

    // Filtramos las no pagadas y las ordenamos por fecha (las más recientes arriba)
    const unpaidOrders = orders
        .filter(o => o.status !== 'paid')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (loading) return <div className="container">Cargando...</div>;

    const handlePay = async () => {
        if (confirmingPay) {
            try {
                await updateOrderStatus(confirmingPay, 'paid');
                setConfirmingPay(null);
                toast("Pago registrado correctamente", "success");
            } catch (error) {
                toast("Error al procesar el pago", "error");
            }
        }
    };

    return (
        <div className="container">
            <header className="responsive-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <h1>Caja - Cobros</h1>
                <RoleNavigation />
            </header>

            <div className="glass-panel" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                    <thead>
                        <tr style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid var(--border)" }}>
                            <th style={{ padding: "1rem", textAlign: "left", color: "white" }}>Mesa</th>
                            <th style={{ padding: "1rem", textAlign: "left", color: "white" }}>Items</th>
                            <th style={{ padding: "1rem", textAlign: "left", color: "white" }}>Estado</th>
                            <th style={{ padding: "1rem", textAlign: "left", color: "white" }}>Total</th>
                            <th style={{ padding: "1rem", textAlign: "center", color: "white" }}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {unpaidOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No hay órdenes pendientes de cobro.</td>
                            </tr>
                        ) : (
                            unpaidOrders.map((order) => {
                                // VALIDACIÓN CLAVE: Solo habilitar si está 'ready'
                                const canPay = order.status === 'ready';
                                const statusConfig = getStatusConfig(order.status);

                                return (
                                    <tr key={order.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={{ padding: "1rem" }}>
                                            <div style={{ fontWeight: "bold", fontSize: "1.1rem", color: "white" }}>#{order.table_number}</div>
                                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <div style={{ color: "white" }}>{order.items.length} items</div>
                                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {order.items.map((i: any) => i.product?.name || i.product_name).join(", ")}
                                            </div>
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <span style={{
                                                padding: "0.25rem 0.75rem",
                                                borderRadius: "99px",
                                                fontSize: "0.85rem",
                                                background: statusConfig.bg,
                                                color: statusConfig.color,
                                                fontWeight: "500"
                                            }}>
                                                {statusConfig.text}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem", fontWeight: "bold", fontSize: "1.1rem", color: "white" }}>
                                            ${order.total.toFixed(2)}
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "center" }}>
                                            <button
                                                onClick={() => setConfirmingPay(order.id)}
                                                disabled={!canPay} // Bloquea el botón si no está listo
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    fontSize: "0.9rem",
                                                    fontWeight: "600",
                                                    cursor: canPay ? 'pointer' : 'not-allowed',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    justifyContent: 'center',
                                                    background: canPay ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                                                    color: canPay ? 'var(--background)' : 'var(--text-muted)',
                                                    border: canPay ? 'none' : '1px solid var(--border)',
                                                    borderRadius: "8px",
                                                    minWidth: "120px",
                                                    transition: "all 0.2s ease"
                                                }}
                                            >
                                                {canPay ? <DollarSign size={16} /> : <Lock size={16} />}
                                                {canPay ? 'Cobrar' : 'Pendiente'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Confirmación */}
            <Modal
                isOpen={!!confirmingPay}
                onClose={() => setConfirmingPay(null)}
                title="Confirmar Pago"
            >
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        background: "rgba(34, 197, 94, 0.1)",
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1.5rem auto",
                        color: "var(--success)"
                    }}>
                        <DollarSign size={32} />
                    </div>
                    <p style={{ marginBottom: "2rem", color: "var(--text-muted)", fontSize: "1.1rem" }}>
                        ¿Confirmar el cobro de la mesa <strong style={{ color: "white" }}>#{unpaidOrders.find(o => o.id === confirmingPay)?.table_number}</strong>?
                        <br />
                        <strong style={{ color: "var(--success)", fontSize: "1.5rem", display: "block", marginTop: "0.5rem" }}>
                            ${unpaidOrders.find(o => o.id === confirmingPay)?.total.toFixed(2)}
                        </strong>
                    </p>
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                        <button onClick={() => setConfirmingPay(null)} className="btn btn-secondary" style={{ minWidth: "120px" }}>
                            Cancelar
                        </button>
                        <button onClick={handlePay} className="btn btn-primary" style={{ minWidth: "120px" }}>
                            Confirmar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}