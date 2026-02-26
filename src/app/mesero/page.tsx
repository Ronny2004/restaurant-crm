"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useSupabase, Product } from "@/context/SupabaseProvider";
import { Plus, Minus, ShoppingCart, LogOut, Loader2, Send, Edit2, Trash2, X, CheckCircle } from "lucide-react";
import { RoleNavigation } from "@/components/RoleNavigation";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";

export default function MeseroPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { products, createOrder, loading: supabaseLoading, orders, fetchProducts, updateOrder, deleteOrder, updateOrderStatus, fetchOrders } = useSupabase();    
    const toast = useToast();
    
    // Estados para la creación de una NUEVA orden
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [table, setTable] = useState("");
    const [submitting, setSubmitting] = useState(false);
    
    // Estados para ELIMINAR una orden
    const [deletingOrder, setDeletingOrder] = useState<{ id: string; table_number: string } | null>(null);

    // Estados para EDITAR una orden existente
    const [editingOrder, setEditingOrder] = useState<any | null>(null);
    const [editCart, setEditCart] = useState<any[]>([]);
    const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>("");

    useEffect(() => {
        if (!authLoading && (!profile || (profile.role !== "waiter" && profile.role !== "admin"))) {
            router.push("/login");
        }
        if (!authLoading && profile && products.length === 0) {
            fetchProducts();
        }
    }, [authLoading, profile, router, products.length, fetchProducts]);

    const productosDisponibles = products.filter(p => p.stock > 0);

    if (authLoading || (supabaseLoading && products.length === 0)) {
        return (
            <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={48} className="animate-spin" style={{ color: "var(--primary)", margin: '0 auto' }} />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Sincronizando menú real-time...</p>
                </div>
            </div>
        );
    }

    // --- FUNCIONES PARA CREAR NUEVA ORDEN ---
    const addToCart = (product: Product) => {
        if (product.stock <= 0) {
            setTimeout(() => toast(`Sin stock: ${product.name}`, "error"), 0);
            return;
        }

        setCart((prev) => {
            const existing = prev.find((p) => p.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) {
                    toast(`Solo hay ${product.stock} unidades disponibles`, "error");
                    return prev;
                }
                return prev.map((p) =>
                    p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
                );
            }
            setTimeout(() => toast(`Agregado: ${product.name}`, "info"), 0);
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.map((p) =>
            p.product.id === productId ? { ...p, quantity: p.quantity - 1 } : p
        ).filter((p) => p.quantity > 0));
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

    // --- FUNCIONES PARA EDITAR ORDEN EXISTENTE ---
    const openEditModal = (order: any) => {
        setEditingOrder(order);
        setEditCart(order.items ? [...order.items] : []);
        setSelectedProductToAdd("");
    };

    const handleEditCartChange = (productId: string, delta: number) => {
        setEditCart((prev) => {
            const product = products.find(p => p.id === productId);
            const existing = prev.find(p => (p.product?.id || p.product_id) === productId);

            // 1. Calculamos el límite real nuevamente
            const originalItem = editingOrder?.items?.find((item: any) => (item.product?.id || item.product_id) === productId);
            const originalQty = originalItem ? originalItem.quantity : 0;
            const maxAllowed = originalQty + (product ? product.stock : 0);

            // Si intenta sumar (+), validamos contra el límite real
            if (delta > 0 && product && existing) {
                if (existing.quantity >= maxAllowed) {
                    toast(`Solo puedes pedir ${product.stock} más (Total: ${maxAllowed})`, "error");
                    return prev; 
                }
            }

            return prev.map(p => {
                const currentId = p.product?.id || p.product_id;
                if (currentId === productId) {
                    return { ...p, quantity: p.quantity + delta };
                }
                return p;
            }).filter(p => p.quantity > 0);
        });
    };

    const handleAddNewItemToEditOrder = () => {
        if (!selectedProductToAdd) return;
        const product = products.find(p => p.id === selectedProductToAdd);
        if (!product) return;

        // 1. Buscamos cuánto de este producto ya tenía el pedido originalmente
        const originalItem = editingOrder?.items?.find((item: any) => (item.product?.id || item.product_id) === product.id);
        const originalQty = originalItem ? originalItem.quantity : 0;
        
        // 2. Calculamos el límite real (Lo que ya tenía + el stock disponible)
        const maxAllowed = originalQty + product.stock;

        if (maxAllowed <= 0) {
            setTimeout(() => toast(`Sin stock: ${product.name}`, "error"), 0);
            return;
        }

        setEditCart(prev => {
            const existing = prev.find(p => (p.product?.id || p.product_id) === product.id);
            if (existing) {
                // Comparamos contra el nuevo límite real
                if (existing.quantity >= maxAllowed) {
                    toast(`Solo puedes pedir ${product.stock} más (Total: ${maxAllowed})`, "error");
                    return prev;
                }
                return prev.map(p => (p.product?.id || p.product_id) === product.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            
            setTimeout(() => toast(`Agregado: ${product.name}`, "info"), 0);
            return [...prev, { product, quantity: 1 }];
        });
        
        setSelectedProductToAdd(""); 
    };

    const handleUpdateOrder = async () => {
        if (!editingOrder || editCart.length === 0) return;
        setSubmitting(true);
        try {
            // Usa el editTotal que ya calcula correctamente el precio
            await updateOrder(editingOrder.id, { items: editCart, total: editTotal });
            
            setEditingOrder(null);
            setEditCart([]);
            toast("¡Pedido actualizado exitosamente!", "success");
        } catch (error) {
            toast("Error al actualizar el pedido", "error");
        } finally {
            setSubmitting(false);
        }
    };


    // --- FUNCION PARA ELIMINAR ORDEN ---
    const handleDeleteOrder = async () => {
        if (deletingOrder) {
            try {
                await deleteOrder(deletingOrder.id);
                
                setDeletingOrder(null);
                toast("Orden eliminada con éxito", "success");
            } catch (error: any) {
                const errorMessage = error.message || "Error al eliminar orden";
                toast(errorMessage, "error");
                
                fetchOrders();
            } finally {
                setDeletingOrder(null);
            }
        }
    };

    const handleMarkAsServed = async (orderId: string) => {
        try {
            await updateOrderStatus(orderId, 'ready' as any);
            toast("¡Pedido servido con éxito!", "success");
        } catch (error: any) {
            toast("Error al actualizar el estado", "error");
            console.error(error);
        }
    };

    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    // Ocultamos tanto los 'paid' (pagados) como los 'served' (entregados en mesa)
    const activeOrders = orders.filter(o => 
        o.status !== 'paid' && 
        o.status !== 'ready'
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // Total dinámico para el modal de edición (Soporta data de Supabase y del Carrito temporal)
    const editTotal = editCart.reduce((sum, item) => {
        const price = item.price || item.product?.price || 0;
        return sum + (price * item.quantity);
    }, 0);

    return (
        <div className="container">
            <header className="responsive-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <h1>Mesero - Nuevo Pedido</h1>
                <RoleNavigation />
            </header>

            <div className="waiter-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                
                {/* Product Grid (IZQUIERDA) */}
                <div>
                    <h2 style={{ marginBottom: "1rem" }}>Menú</h2>
                    <div className="grid-menu">
                        {productosDisponibles.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                                <p style={{ color: "var(--text-muted)" }}>No hay productos disponibles en este momento.</p>
                                <button onClick={() => fetchProducts()} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
                                    Reintentar cargar menú
                                </button>
                            </div>
                        ) : (
                            productosDisponibles.map((product) => (
                                <div key={product.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                        <h3 style={{ fontSize: "1.2rem" }}>{product.name}</h3>
                                        <span style={{ color: "var(--primary)", fontWeight: "bold" }}>${product.price.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{product.category}</p>
                                        <small style={{ color: "var(--success)" }}>Stock: {product.stock}</small>
                                    </div>
                                    <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
                                        <button onClick={() => addToCart(product)} className="btn btn-primary" style={{ width: "100%" }}>
                                            <Plus size={18} /> Agregar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Cart + Active Orders */}
                <div style={{ position: "sticky", top: "2rem", height: "fit-content", display: "flex", flexDirection: "column", gap: "2rem" }}>
                    
                    {/* CART NUEVO PEDIDO */}
                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                            <ShoppingCart /> Comanda
                        </h2>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)" }}>Numero de Mesa </label>
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
                                cart.map((item, index) => (
                                    <div key={`cart-${item.product?.id || index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
                                        <div>
                                            <div style={{ fontWeight: "600" }}>{item.product?.name}</div>
                                            <div style={{ color: "var(--primary)" }}>${((item.product?.price || 0) * item.quantity).toFixed(2)}</div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface)", borderRadius: "8px", padding: "0.25rem" }}>
                                            <button className="btn" style={{ padding: "0.25rem", color: "var(--danger)" }} onClick={() => item.product?.id && removeFromCart(item.product.id)}><Minus size={16} /></button>
                                            <span style={{ minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                                            <button className="btn" style={{ padding: "0.25rem", color: "var(--success)" }} onClick={() => item.product && addToCart(item.product)}><Plus size={16} /></button>
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

                    {/* PEDIDOS ACTIVOS */}
                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h2 style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>Pedidos Activos</h2>
                        {activeOrders.map(order => (
                            <div key={order.id} style={{
                                padding: "1rem",
                                background: "rgba(255,255,255,0.03)",
                                borderRadius: "8px",
                                borderLeft: `4px solid ${order.status === 'served' || order.status === 'ready' ? 'var(--success)' : order.status === 'preparing' ? 'var(--primary)' : 'var(--danger)'}`
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                    <span style={{ fontWeight: "bold" }}>Mesa {order.table_number}</span>
                                    <span style={{
                                        fontSize: "0.8rem",
                                        textTransform: "uppercase",
                                        fontWeight: "bold",
                                        color: order.status === 'served' || order.status === 'ready' ? 'var(--success)' : order.status === 'preparing' ? 'var(--primary)' : 'var(--danger)'
                                    }}>
                                        {order.status === 'served' || order.status === 'ready' ? '¡¡Listo p/ servir!!' : order.status}
                                    </span>
                                </div>
                                
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                        {order.items.length} items - ${order.total.toFixed(2)}
                                    </div>
                                    
                                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                                        {order.status === 'pending' && (
                                            <>
                                                <button 
                                                    onClick={() => openEditModal(order)} 
                                                    className="btn" 
                                                    title="Editar Orden"
                                                    style={{ padding: "0.5rem", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => setDeletingOrder({ id: order.id, table_number: order.table_number })} 
                                                    className="btn btn-danger" 
                                                    title="Eliminar orden"
                                                    style={{ padding: "0.5rem" }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}

                                        {order.status === 'preparing' && (
                                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                                Cocinando...
                                            </span>
                                        )}

                                        {/* SI ESTÁ LISTO: Mostrar botón para marcar como Servido */}
                                        {order.status === 'served' && (
                                            <button 
                                                onClick={() => handleMarkAsServed(order.id)} 
                                                className="btn btn-success" 
                                                title="Marcar como servido"
                                                style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                                            >
                                                <CheckCircle size={18} /> Servido
                                            </button>
                                        )}

                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAL 1: EDITAR ORDEN */}
            {editingOrder && (
                <Modal
                    isOpen={!!editingOrder}
                    onClose={() => setEditingOrder(null)}
                    title={`Editar Pedido - Mesa ${editingOrder.table_number}`}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        
                        {/* Selector para agregar nuevos ítems a la orden */}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <select 
                                value={selectedProductToAdd}
                                onChange={(e) => setSelectedProductToAdd(e.target.value)}
                                style={{ flex: 1, padding: "0.5rem", borderRadius: "8px", background: "var(--surface)", color: "white", border: "1px solid var(--border)" }}
                            >
                                <option value="">+ Agregar plato o bebida...</option>
                                {productosDisponibles.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} - ${p.price} (Stock: {p.stock})</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleAddNewItemToEditOrder}
                                className="btn btn-primary"
                                disabled={!selectedProductToAdd}
                                style={{ padding: "0.5rem 1rem" }}
                            >
                                Agregar
                            </button>
                        </div>

                        {/* Lista de ítems actuales en la orden a editar */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.5rem" }}>
                            {editCart.length === 0 ? (
                                <p style={{ color: "var(--text-muted)", textAlign: "center" }}>La orden quedó vacía.</p>
                            ) : (
                                editCart.map((item, index) => {
                                    const itemPrice = item.price || item.product?.price || 0;
                                    const itemTotal = itemPrice * item.quantity;
                                    const itemId = item.product?.id || item.product_id;

                                    return (
                                        <div key={`edit-${itemId || index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
                                            <div>
                                                <div style={{ fontWeight: "600" }}>{item.product?.name || "Producto"}</div>
                                                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>${itemTotal.toFixed(2)}</div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface)", borderRadius: "8px", padding: "0.25rem" }}>
                                                <button className="btn" style={{ padding: "0.25rem", color: "var(--danger)" }} onClick={() => itemId && handleEditCartChange(itemId, -1)}><Minus size={16} /></button>
                                                <span style={{ minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                                                <button className="btn" style={{ padding: "0.25rem", color: "var(--success)" }} onClick={() => itemId && handleEditCartChange(itemId, 1)}><Plus size={16} /></button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Total y Botones de acción */}
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                <span>Nuevo Total:</span>
                                <span>${editTotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                <button onClick={() => setEditingOrder(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleUpdateOrder} 
                                    className="btn btn-primary" 
                                    style={{ flex: 1 }}
                                    disabled={submitting || editCart.length === 0}
                                >
                                    {submitting ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL 2: CONFIRMAR ELIMINACIÓN */}
            <Modal
                isOpen={!!deletingOrder}
                onClose={() => setDeletingOrder(null)}
                title="Confirmar Eliminación"
            >
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1.5rem auto",
                        color: "var(--danger)"
                    }}>
                        <Trash2 size={32} />
                    </div>
                    <p style={{ marginBottom: "2rem", color: "var(--text-muted)", fontSize: "1.1rem" }}>
                        ¿Estás seguro de eliminar la orden de la <strong style={{ color: "white" }}>Mesa {deletingOrder?.table_number}</strong>?
                        <br />
                        <span style={{ fontSize: "0.9rem" }}>Esta acción no se puede deshacer.</span>
                    </p>
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                        <button onClick={() => setDeletingOrder(null)} className="btn btn-secondary" style={{ minWidth: "120px" }}>
                            Cancelar
                        </button>
                        <button onClick={handleDeleteOrder} className="btn btn-danger" style={{ minWidth: "120px" }}>
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}