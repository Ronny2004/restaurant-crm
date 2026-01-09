"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useSupabase, Product } from "@/context/SupabaseProvider";
import Link from "next/link";
import { ChevronLeft, Plus, Minus, ShoppingCart, LogOut, Loader2, Send } from "lucide-react";
import { RoleNavigation } from "@/components/RoleNavigation";
import { useToast } from "@/context/ToastContext";

export default function MeseroPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { products, createOrder, loading, orders } = useSupabase(); // Added orders
    const toast = useToast();
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [table, setTable] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && (!profile || (profile.role !== "waiter" && profile.role !== "admin"))) {
            router.push("/login");
        }
    }, [authLoading, profile, router]);

    if (authLoading || !profile || (profile.role !== "waiter" && profile.role !== "admin")) {
        return (
            <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={48} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
            </div>
        );
    }

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((p) => p.product.id === product.id);
            if (existing) {
                return prev.map((p) =>
                    p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
        toast(`Agregado: ${product.name}`, "info");
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => {
            return prev
                .map((p) => (p.product.id === productId ? { ...p, quantity: p.quantity - 1 } : p))
                .filter((p) => p.quantity > 0);
        });
    };

    const handleCreateOrder = async () => {
        if (!table || cart.length === 0) return;
        setSubmitting(true);
        try {
            await createOrder(table, cart);
            setCart([]);
            setTable("");
            toast("Pedido enviado a cocina!", "success");
        } catch (error) {
            toast("Error al enviar el pedido", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const activeOrders = orders.filter(o => o.status !== 'paid').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (loading) return <div className="container">Cargando...</div>;

    return (
        <div className="container">
            <header className="responsive-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <h1>Mesero - Nuevo Pedido</h1>
                <RoleNavigation />
            </header>

            <div className="waiter-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                {/* Product Grid */}
                <div>
                    <h2 style={{ marginBottom: "1rem" }}>Menú</h2>
                    <div className="grid-menu">
                        {products.map((product) => (
                            <div key={product.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                    <h3 style={{ fontSize: "1.2rem" }}>{product.name}</h3>
                                    <span style={{ color: "var(--primary)", fontWeight: "bold" }}>${product.price.toFixed(2)}</span>
                                </div>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{product.category}</p>
                                <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
                                    <button onClick={() => addToCart(product)} className="btn btn-primary" style={{ width: "100%" }}>
                                        <Plus size={18} /> Agregar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Cart + Active Orders */}
                <div style={{ position: "sticky", top: "2rem", height: "fit-content", display: "flex", flexDirection: "column", gap: "2rem" }}>

                    {/* Cart Panel */}
                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                            <ShoppingCart /> Comanda
                        </h2>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)" }}>Mesa #</label>
                            <input
                                type="text"
                                value={table}
                                onChange={(e) => setTable(e.target.value)}
                                placeholder="Ej. 5"
                            />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto", marginBottom: "1.5rem" }}>
                            {cart.length === 0 ? (
                                <p style={{ color: "var(--text-muted)", textAlign: "center", fontStyle: "italic" }}>No hay items seleccionados</p>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
                                        <div>
                                            <div style={{ fontWeight: "600" }}>{item.product.name}</div>
                                            <div style={{ color: "var(--primary)" }}>${(item.product.price * item.quantity).toFixed(2)}</div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface)", borderRadius: "8px", padding: "0.25rem" }}>
                                            <button className="btn" style={{ padding: "0.25rem", color: "var(--danger)" }} onClick={() => removeFromCart(item.product.id)}><Minus size={16} /></button>
                                            <span style={{ minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                                            <button className="btn" style={{ padding: "0.25rem", color: "var(--success)" }} onClick={() => addToCart(item.product)}><Plus size={16} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ borderTop: "2px solid var(--border)", paddingTop: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>

                            <button
                                onClick={handleCreateOrder}
                                disabled={submitting || cart.length === 0 || !table}
                                className="btn btn-primary"
                                style={{ width: "100%", opacity: (submitting || cart.length === 0 || !table) ? 0.5 : 1 }}
                            >
                                {submitting ? "Enviando..." : "Enviar a Cocina"}
                            </button>
                        </div>
                    </div>

                    {/* Active Orders Panel */}
                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h2 style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>Pedidos Activos</h2>
                        {activeOrders.length === 0 ? (
                            <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No hay pedidos activos.</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {activeOrders.map(order => (
                                    <div key={order.id} style={{
                                        padding: "1rem",
                                        background: "rgba(255,255,255,0.03)",
                                        borderRadius: "8px",
                                        borderLeft: `4px solid ${order.status === 'ready' ? 'var(--success)' : order.status === 'preparing' ? 'var(--primary)' : 'var(--danger)'}`
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                            <span style={{ fontWeight: "bold" }}>Mesa {order.table_number}</span>
                                            <span style={{
                                                fontSize: "0.8rem",
                                                textTransform: "capitalize",
                                                color: order.status === 'ready' ? 'var(--success)' : order.status === 'preparing' ? 'var(--primary)' : 'var(--danger)'
                                            }}>
                                                {order.status === 'ready' ? '¡Listo!' : order.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                            {order.items.length} items - ${order.total.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
