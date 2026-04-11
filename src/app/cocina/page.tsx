"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Order } from "@/types";
import { useOrders } from "@/hooks/useOrders";
import { Clock, CheckCircle, Loader2, Edit3 } from "lucide-react"; // Añadí Edit3 para un ícono
import { useToast } from "@/context/ToastContext";
import { Header } from "@/components/layout/Header";

export default function CocinaPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { loadingOrders: loading, orders, updateOrderStatus, fetchOrders } = useOrders();
    const toast = useToast();
    const [processingId, setProcessingId] = useState<string | null>(null);

    // 1. Protección y Carga Inicial Forzada
    useEffect(() => {
        if (!authLoading && (!profile || (profile.role !== "chef" && profile.role !== "admin"))) {
            router.push("/login");
        }
        // Si entramos y no hay órdenes, forzamos carga
        if (!authLoading && profile && orders.length === 0) {
            fetchOrders();
        }
    }, [authLoading, profile, router, orders.length, fetchOrders]);

    if (authLoading || (loading && orders.length === 0)) {
        return (
            <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={48} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    // CAMBIO AQUÍ: Filtramos también los que están en edición para que el cocinero los vea (pero bloqueados)
    // Validamos 'editing' como string o 6 como número por si acaso.
    const kitchenOrders = orders.filter(o => 
        o.status === 'pending' || 
        o.status === 'preparing' || 
        o.status === 'editing'
    );

    const handleStatusChange = async (orderId: string, currentStatus: string) => {
        setProcessingId(orderId);
        
        // Cambiamos 'ready' por 'served'
        const nextStatus = currentStatus === 'pending' ? 'preparing' : 'served';

        try {
            await updateOrderStatus(orderId, nextStatus as Order['status']);

            // ACTUALIZACIÓN INSTANTÁNEA (Optimista)
            toast(
                nextStatus === 'preparing' ? "Pedido en preparación" : "¡Pedido servido!", 
                "success"
            );

            fetchOrders();
        } catch (error) {
            toast("Error al actualizar estado", "error");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="container">
            <Header />

            {kitchenOrders.length === 0 ? (
                <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", fontStyle: "italic", color: "var(--text-muted)" }}>
                    <CheckCircle size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
                    <p>No hay pedidos pendientes</p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                    {kitchenOrders.map((order) => {
                        // Determinamos si está en edición
                        const isEditing = order.status === 'editing';

                        return (
                            <div key={order.id} className="glass-panel" style={{
                                padding: "1.5rem",
                                display: "flex",
                                flexDirection: "column",
                                borderLeft: `6px solid ${isEditing ? 'var(--text-muted)' : order.status === 'pending' ? '#f97316' : 'var(--warning)'}`,
                                opacity: processingId === order.id || isEditing ? 0.6 : 1, // Opaco si procesa o edita
                                transition: 'all 0.3s ease',
                                position: 'relative' // Para efectos si quieres agregar un overlay
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                                    <h2 style={{ fontSize: "1.3rem" }}>Mesa {order.table_number}</h2>
                                    <span style={{
                                        // Estilos dinámicos basados en el estado
                                        background: isEditing ? 'rgba(255,255,255,0.1)' : order.status === 'pending' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                        color: isEditing ? 'var(--text-muted)' : order.status === 'pending' ? '#f97316' : '#fcd34d',
                                        padding: "0.25rem 0.5rem",
                                        borderRadius: "4px",
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}>
                                        {isEditing ? (
                                            <><Loader2 size={12} className="animate-spin" /> Editando...</>
                                        ) : order.status === 'pending' ? (
                                            'Pendiente'
                                        ) : (
                                            'En Preparación'
                                        )}
                                    </span>
                                </div>

                                <div style={{ marginBottom: "2rem", flexGrow: 1 }}>
                                    {order.items.map((item, idx) => (
                                        <div key={idx} style={{
                                            display: "flex",
                                            gap: "0.8rem",
                                            padding: "0.6rem 0",
                                            borderBottom: "1px solid rgba(255,255,255,0.05)"
                                        }}>
                                            <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{item.quantity}x</span>
                                            <span style={{ fontSize: '1.05rem' }}>{item.product_name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                        <Clock size={14} />
                                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <button
                                        // BLOQUEO: Deshabilitado si está procesando o en edición
                                        disabled={processingId === order.id || isEditing} 
                                        className={`btn ${isEditing ? 'btn-secondary' : order.status === 'pending' ? 'btn-danger' : 'btn-success'}`}
                                        title={isEditing ? "El mesero está modificando el pedido" : ""}
                                        onClick={() => !isEditing && handleStatusChange(order.id, order.status)}
                                        style={{
                                            padding: "0.6rem 1.2rem",
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            minWidth: '140px',
                                            justifyContent: 'center',
                                            cursor: isEditing ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {processingId === order.id ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : isEditing ? (
                                            <><Edit3 size={16} /> Bloqueado</>
                                        ) : order.status === 'pending' ? (
                                            <>Empezar</>
                                        ) : (
                                            <>Listo</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}