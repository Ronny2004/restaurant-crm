"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useSupabase, Order } from "@/context/SupabaseProvider";
import Link from "next/link";
import { ChevronLeft, Clock, CheckCircle, LogOut, Loader2 } from "lucide-react";
import { RoleNavigation } from "@/components/RoleNavigation";

export default function CocinaPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { orders, updateOrderStatus, loading } = useSupabase();

    useEffect(() => {
        if (!authLoading && (!profile || (profile.role !== "chef" && profile.role !== "admin"))) {
            router.push("/login");
        }
    }, [authLoading, profile, router]);

    if (authLoading || !profile || (profile.role !== "chef" && profile.role !== "admin")) {
        return (
            <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={48} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
            </div>
        );
    }

    // Filter for active kitchen orders (pending or preparing)
    const kitchenOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');

    if (loading) return <div className="container">Cargando...</div>;

    const handleStatusChange = async (orderId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'pending' ? 'preparing' : 'ready';
        await updateOrderStatus(orderId, nextStatus as Order['status']);
    };

    return (
        <div className="container">
            <header className="responsive-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <h1>Cocina - Comandas Activas</h1>
                <RoleNavigation />
            </header>

            {kitchenOrders.length === 0 ? (
                <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", fontStyle: "italic", color: "var(--text-muted)" }}>
                    <CheckCircle size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
                    <p>No hay pedidos pendientes. ¡Buen trabajo!</p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                    {kitchenOrders.map((order) => (
                        <div key={order.id} className="glass-panel" style={{
                            padding: "1.5rem",
                            borderLeft: `4px solid ${order.status === 'pending' ? 'var(--danger)' : 'var(--primary)'}`
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                                <h2 style={{ fontSize: "1.2rem" }}>Mesa {order.table_number}</h2>
                                <span style={{
                                    background: order.status === 'pending' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    color: order.status === 'pending' ? '#fca5a5' : '#fcd34d',
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "4px",
                                    fontSize: "0.8rem",
                                    textTransform: "uppercase",
                                    fontWeight: "bold"
                                }}>
                                    {order.status === 'pending' ? 'Pendiente' : 'En Preparación'}
                                </span>
                            </div>

                            <div style={{ marginBottom: "1.5rem" }}>
                                {order.items.map((item, idx) => (
                                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: "0.25rem" }}>
                                        <span>{item.quantity}x {item.product_name}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                    <Clock size={14} />
                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleStatusChange(order.id, order.status)}
                                >
                                    {order.status === 'pending' ? 'Empezar' : 'Marcar Listo'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
