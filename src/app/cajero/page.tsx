"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useSupabase, Order } from "@/context/SupabaseProvider";
import Link from "next/link";
import { ChevronLeft, DollarSign, Receipt, LogOut, Loader2 } from "lucide-react";
import { RoleNavigation } from "@/components/RoleNavigation";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { useState } from "react";

export default function CajeroPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { orders, updateOrderStatus, loading } = useSupabase();
    const toast = useToast();
    const [confirmingPay, setConfirmingPay] = useState<string | null>(null);

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

    // Filter for completed orders (ready) or manual payment (pending pay)
    // Usually Cashier sees "Ready" items to hand over and Pay, or just all unpaid.
    // Let's show all unpaid orders, prioritizing 'ready'.
    const unpaidOrders = orders.filter(o => o.status !== 'paid');

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
                            <th style={{ padding: "1rem", textAlign: "left" }}>Mesa</th>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Items</th>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Estado</th>
                            <th style={{ padding: "1rem", textAlign: "right" }}>Total</th>
                            <th style={{ padding: "1rem", textAlign: "center" }}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {unpaidOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No hay órdenes pendientes de cobro.</td>
                            </tr>
                        ) : (
                            unpaidOrders.map((order) => (
                                <tr key={order.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "1rem" }}>
                                        <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>#{order.table_number}</span>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                            {new Date(order.created_at).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                        {order.items.length} items
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {order.items.map(i => i.product_name).join(", ")}
                                        </div>
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                        <span style={{
                                            padding: "0.25rem 0.75rem",
                                            borderRadius: "99px",
                                            fontSize: "0.85rem",
                                            background: order.status === 'ready' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                            color: order.status === 'ready' ? '#4ade80' : 'var(--text-muted)'
                                        }}>
                                            {order.status === 'ready' ? 'Listo p/ Servir' : order.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: "1rem", textAlign: "right", fontWeight: "bold", fontSize: "1.1rem" }}>
                                        ${order.total.toFixed(2)}
                                    </td>
                                    <td style={{ padding: "1rem", textAlign: "center" }}>
                                        <button onClick={() => setConfirmingPay(order.id)} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
                                            <DollarSign size={16} /> Cobrar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
