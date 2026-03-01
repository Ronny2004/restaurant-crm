"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useSupabase, Product } from "@/context/SupabaseProvider";
import Link from "next/link";
import { 
    ChevronLeft, TrendingUp, Package, Users, 
    DollarSign, LogOut, Loader2, Plus, 
    Edit2, Trash2, X, Check, ImageIcon 
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";

export default function AdminPage() {
    const { profile, loading: authLoading, signOut } = useAuth();
    const router = useRouter();
    const { 
        products, orders, loading, 
        fetchProducts, 
        createProduct, 
        updateProduct, 
        deleteProduct 
    } = useSupabase();
    const toast = useToast();

    // Estados de UI
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<{ id: string; name: string } | null>(null);
    
    // Estados de Formulario
    const [formData, setFormData] = useState({ name: "", price: 0, category: "", stock: 0 });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Protección de ruta y carga inicial
    useEffect(() => {
        if (!authLoading && (!profile || profile.role !== "admin")) {
            router.push("/login");
        }
        if (products.length === 0) {
            fetchProducts();
        }
    }, [authLoading, profile, router, products.length, fetchProducts]);

    if (authLoading || !profile || profile.role !== "admin") {
        return (
            <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={48} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
            </div>
        );
    }

    // Cálculos de Estadísticas
    const totalSales = orders
        .filter(o => o.status === 'paid')
        .reduce((sum, o) => sum + o.total, 0);

    const totalOrders = orders.length;

    // Producto más vendido
    const itemCounts: Record<string, number> = {};
    orders.forEach(o => {
        o.items.forEach(i => {
            itemCounts[i.product_name] = (itemCounts[i.product_name] || 0) + i.quantity;
        });
    });
    const bestSeller = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];

    // Handlers de Acciones
    const handleAddProduct = async () => {
        try {
            await createProduct(formData, selectedFile || undefined);
            setIsAddingProduct(false);
            setFormData({ name: "", price: 0, category: "", stock: 0 });
            setSelectedFile(null);
            toast("Producto creado exitosamente", "success");
        } catch (error) {
            toast("Error al crear producto", "error");
        }
    };

    const handleUpdateProduct = async (id: string) => {
        try {
            await updateProduct(id, formData, selectedFile || undefined);
            setEditingProductId(null);
            setFormData({ name: "", price: 0, category: "", stock: 0 });
            setSelectedFile(null);
            toast("Producto actualizado", "success");
        } catch (error) {
            toast("Error al actualizar producto", "error");
        }
    };

    const confirmDelete = async () => {
        if (deletingProduct) {
            try {
                // Intentamos borrar en la base de datos
                await deleteProduct(deletingProduct.id);

                // Si llega aquí, es porque se borró correctamente
                setDeletingProduct(null);
                toast("Producto eliminado con éxito", "success");
            } catch (error: any) {
                // Capturamos el mensaje específico (ej: "No se puede eliminar porque tiene ventas")
                const errorMessage = error.message || "Error al eliminar producto";
                toast(errorMessage, "error");

                // Forzamos un refresco por si la UI se desincronizó
                fetchProducts();
            } finally {
                // Cerramos el modal de confirmación pase lo que pase
                setDeletingProduct(null);
            }
        }
    };

    const startEdit = (product: Product) => {
        setEditingProductId(product.id);
        setFormData({
            name: product.name,
            price: product.price,
            category: product.category,
            stock: product.stock
        });
    };

    const cancelEdit = () => {
        setEditingProductId(null);
        setIsAddingProduct(false);
        setFormData({ name: "", price: 0, category: "", stock: 0 });
        setSelectedFile(null);
    };

    return (
        <div className="container">
            <header className="responsive-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <Link href="/" className="btn btn-secondary">
                        <ChevronLeft size={20} /> <span className="hidden-mobile">Volver</span>
                    </Link>
                    <h1>Administración</h1>
                </div>
                <button onClick={signOut} className="btn btn-secondary">
                    <LogOut size={20} /> <span className="hidden-mobile">Cerrar Sesión</span>
                </button>
            </header>

            {/* Panel de Estadísticas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>

                {/* Enlace a Ventas Totales */}
                <Link href="/admin/ventastotales" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass-panel stat-card-hover" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer", transition: "transform 0.2s" }}>
                        <div style={{ padding: "1rem", background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", borderRadius: "12px" }}>
                            <DollarSign size={32} />
                        </div>
                        <div>
                            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Ventas Totales</div>
                            <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>${totalSales.toFixed(2)}</div>
                        </div>
                    </div>
                </Link>

                {/* Enlace a Pedidos Totales */}
                <Link href="/admin/pedidostotales" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass-panel stat-card-hover" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer", transition: "transform 0.2s" }}>
                        <div style={{ padding: "1rem", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", borderRadius: "12px" }}>
                            <Users size={32} />
                        </div>
                        <div>
                            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Total Pedidos</div>
                            <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>{totalOrders}</div>
                        </div>
                    </div>
                </Link>

                {/* Más Vendido (Se mantiene como info estática) */}
                <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ padding: "1rem", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", borderRadius: "12px" }}>
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Más Vendido</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }}>
                            {bestSeller[0]}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de Inventario */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                    <Package /> Inventario
                </h2>
                <button
                    onClick={() => setIsAddingProduct(true)}
                    className="btn btn-primary"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                    <Plus size={20} /> Agregar Producto
                </button>
            </div>

            <div className="glass-panel" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                    <thead>
                        <tr style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid var(--border)" }}>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Imagen</th>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Producto</th>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Categoría</th>
                            <th style={{ padding: "1rem", textAlign: "right" }}>Precio</th>
                            <th style={{ padding: "1rem", textAlign: "center" }}>Stock</th>
                            <th style={{ padding: "1rem", textAlign: "center" }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isAddingProduct && (
                            <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(245, 158, 11, 0.1)" }}>
                                <td style={{ padding: "1rem" }}>
                                    <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            style={{ display: 'none' }}
                                            accept="image/*"
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="btn"
                                            style={{ padding: '4px', background: selectedFile ? 'var(--success)' : 'var(--surface)' }}
                                        >
                                            <ImageIcon size={20} />
                                        </button>
                                    </div>
                                </td>
                                <td style={{ padding: "1rem" }}>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Nombre del producto"
                                    />
                                </td>
                                <td style={{ padding: "1rem" }}>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        style={{ 
                                            width: "100%", 
                                            padding: "0.4rem", 
                                            borderRadius: "4px", 
                                            background: "var(--surface)", 
                                            color: "white" 
                                        }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="platos">Platos</option>
                                        <option value="bebidas">Bebidas</option>
                                        <option value="porciones">Porciones</option>
                                        {/* A la larga, aquí puedes mapear un array 'categorias.map(...)' 
                                            que venga de una tabla de base de datos o un diccionario */}
                                    </select>
                                </td>
                                <td style={{ padding: "1rem" }}>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                        placeholder="0.00"
                                        step="0.01"

                                        style={{ textAlign: "right" }}
                                    />
                                </td>
                                <td style={{ padding: "1rem" }}>
                                    <input
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                        placeholder="0"

                                        style={{ textAlign: "center" }}
                                    />
                                </td>
                                <td style={{ padding: "1rem", textAlign: "center" }}>
                                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                                        <button onClick={handleAddProduct} className="btn" style={{ padding: "0.5rem", background: "rgba(34, 197, 94, 0.2)", color: "#4ade80" }}>
                                            <Check size={18} />
                                        </button>
                                        <button onClick={cancelEdit} className="btn" style={{ padding: "0.5rem", background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}>
                                            <X size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {products.map((product) => (
                            <tr key={product.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                {editingProductId === product.id ? (
                                    <>
                                        <td style={{ padding: "1rem" }}>
                                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                            <button onClick={() => fileInputRef.current?.click()} className="btn" style={{ color: selectedFile ? 'var(--success)' : 'inherit' }}>
                                                <ImageIcon size={20} />
                                            </button>
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}

                                            />
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <input
                                                type="text"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}

                                            />
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                                step="0.01"

                                                style={{ textAlign: "right" }}
                                            />
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <input
                                                type="number"
                                                value={formData.stock}
                                                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}

                                                style={{ textAlign: "center" }}
                                            />
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "center" }}>
                                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                                                <button onClick={() => handleUpdateProduct(product.id)} className="btn" style={{ padding: "0.5rem", background: "rgba(34, 197, 94, 0.2)", color: "#4ade80" }}>
                                                    <Check size={18} />
                                                </button>
                                                <button onClick={cancelEdit} className="btn" style={{ padding: "0.5rem", background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}>
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ padding: "1rem" }}>
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '45px', height: '45px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <ImageIcon size={20} opacity={0.2} />
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "1rem", fontWeight: "500" }}>{product.name}</td>
                                        <td style={{ padding: "1rem", color: "var(--text-muted)" }}>{product.category}</td>
                                        <td style={{ padding: "1rem", textAlign: "right" }}>${product.price.toFixed(2)}</td>
                                        <td style={{ padding: "1rem", textAlign: "center" }}>
                                            <span style={{
                                                padding: "0.25rem 0.75rem",
                                                borderRadius: "99px",
                                                background: product.stock < 20 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                color: product.stock < 20 ? '#fca5a5' : 'white',
                                                fontWeight: "bold"
                                            }}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "center" }}>
                                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                                                <button 
                                                    onClick={() => startEdit(product)} 
                                                    className="btn" 
                                                    style={{ 
                                                        padding: "0.5rem", 
                                                        background: "rgba(59, 130, 246, 0.2)", 
                                                        color: "#60a5fa" 
                                                    }}>
                                                    <Edit2 size={18} 
                                                />
                                                </button>
                                                <button 
                                                    onClick={() => setDeletingProduct({ 
                                                        id: product.id, 
                                                        name: product.name 
                                                    })} 
                                                    className="btn btn-danger" 
                                                    style={{ 
                                                        padding: "0.5rem" 
                                                    }}>
                                                    <Trash2 size={18} 
                                                />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Confirmación para Borrar */}
            <Modal isOpen={!!deletingProduct} onClose={() => setDeletingProduct(null)} title="Confirmar Eliminación">
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
                    <p 
                        style={{ 
                            marginBottom: "2rem", 
                            color: "var(--text-muted)", 
                            fontSize: "1.1rem" 
                        }}
                    >
                        ¿Estás seguro de eliminar <strong style={{ color: "white" }}>"{deletingProduct?.name}"</strong>?
                        <br />
                        <span style={{ fontSize: "0.9rem" }}>Esta acción no se puede deshacer.</span>
                    </p>
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                        <button onClick={() => setDeletingProduct(null)} className="btn btn-secondary" style={{ minWidth: "120px" }}>
                            Cancelar
                        </button>
                        <button onClick={confirmDelete} className="btn btn-danger" style={{ minWidth: "120px" }}>
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}