"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Types
export type Product = {
    id: string;
    name: string;
    price: number;
    category: string;
    stock: number;
    image_url?: string;
};

export type OrderItem = {
    id: string;
    product_id: string;
    product_name: string; // denormalized for ease
    quantity: number;
    price: number;
};

export type Order = {
    id: string;
    table_number: string;
    status: "pending" | "preparing" | "ready" | "paid";
    total: number;
    created_at: string;
    items: OrderItem[];
};

type SupabaseContextType = {
    products: Product[];
    orders: Order[];
    fetchProducts: () => Promise<void>; 
    fetchOrders: () => Promise<void>;
    createOrder: (table: string, items: { product: Product; quantity: number }[]) => Promise<void>;
    updateOrderStatus: (orderId: string, status: Order["status"]) => Promise<void>;
    createProduct: (product: Omit<Product, "id">) => Promise<void>;
    updateProduct: (id: string, product: Partial<Omit<Product, "id">>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    getSalesData: (startDate: Date, endDate: Date) => Promise<Order[]>;
    loading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Carga inicial de datos
    useEffect(() => {
        const init = async () => {
            try {
                // Cargamos ambos al inicio
                await Promise.all([fetchProducts(), fetchOrders()]);
            } catch (error) {
                console.error("Error inicializando datos:", error);
            } finally {
                setLoading(false);
            }
        };

        init();

        // Configuración de Realtime
        const channel = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, 
                () => {
                console.log("Cambio detectado en pedidos");
                fetchOrders(); 
            }
        )
        .on(
            'postgres_changes', 
            { event: '*', schema: 'public', table: 'products' }, 
            () => {
                console.log("Cambio detectado en productos (Menú)");
                fetchProducts(); // <--- ESTO actualiza el menú del mesero automáticamente
            }
        )
            .subscribe();

            // Limpieza de suscripción (Corrección para el error de la imagen)
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchProducts = async () => {
        const { data, error } = await supabase
        .from("products")
        .select("*")
        .order('name', { ascending: true }); // 1. Ordenar para que no "salten" los items

        if (error) {
        console.error("Error al obtener los productos:", error);
        return;
    }
        if (data) {
            setProducts([...data]);
        }
        else if (error) console.error("Error al obtener los productos:", error);
    };

// Obtenemos órdenes con sus ítems y el nombre del producto en una sola consulta
const fetchOrders = async () => {
        const { data, error } = await supabase
            .from("orders")
            .select(`
                *,
                items:order_items (
                    *,
                    product:products (name)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error obteniendo las ordenes:", error);
            return;
        }

        // Mapeamos para que coincida con tu interfaz 'Order'
        const formattedOrders = data.map((order: any) => ({
            ...order,
            items: order.items.map((item: any) => ({
                ...item,
                product_name: item.product?.name || "Desconocido"
            }))
        }));

        setOrders(formattedOrders as Order[]);
    };

    // --- Funciones CRUD (Escritura) ---
    const createOrder = async (table: string, items: { product: Product; quantity: number }[]) => {
        const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

        // 1. Insertamos el pedido principal
        const { data: order, error } = await supabase
            .from("orders")
            .insert({ table_number: table, total, status: "pending" })
            .select()
            .single();

        if (error || !order) throw error;

        // 2. Preparamos los items para la tabla intermedia
        const orderItems = items.map(item => ({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price
        }));

        const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
        if (itemsError) throw itemsError;
        // 3. ACTUALIZACIÓN OPTIMISTA DEL ESTADO
    // Creamos un objeto que simule el pedido completo con sus items para que aparezca en la UI
    const newOrderForState = {
        ...order,
        items: items.map(i => ({
            product_name: i.product.name, // Esto es vital para que se vea el nombre en la lista
            quantity: i.quantity,
            price: i.product.price
        }))
    };

    // Actualizamos el estado local instantáneamente
    setOrders(prev => [newOrderForState, ...prev]);
    
    return order; // Retornamos el pedido por si el componente necesita el ID
};
    const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
        const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
        if (error) throw error;
    };

    const createProduct = async (product: Omit<Product, "id">) => {
        const { data,error } = await supabase
        .from("products")
        .insert(product)
        .select() // Importante para obtener el ID generado
        .single();
        if (error) {
            console.error("Error creando el producto:", error);
            throw error;
        }
        if (data) {
        setProducts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
    };

    const updateProduct = async (id: string, product: Partial<Omit<Product, "id">>) => {
        const { data,error } = await supabase
        .from("products")
        .update(product)
        .eq("id", id)
        .select() // Importante para obtener el ID generado
        .single();
        if (error) {
            console.error("Error al actualizar el producto:", error);
            throw error;
        }
        if (data) {
        setProducts(prev => prev.map(p => p.id === id ? data : p));
    }
    };

const deleteProduct = async (id: string) => {
    try {
        // 1. Validamos si el producto tiene items vinculados en pedidos
        const { count, error: countError } = await supabase
            .from("order_items")
            .select("*", { count: 'exact', head: true })
            .eq("product_id", id);

        if (countError) throw countError;

        // 2. Si el conteo es mayor a 0, detenemos el proceso
        if (count && count > 0) {
            throw new Error("No se puede eliminar: Este producto ya ha sido vendido y tiene historial (Comuniquese con el ADMINISTRADOR del App).");
        }

        // 3. Si está limpio, procedemos a borrar
        const { error: deleteError } = await supabase
            .from("products")
            .delete()
            .eq("id", id);

        if (deleteError) throw deleteError;

        // 4. Solo si todo salió bien, actualizamos el estado local
        setProducts(prev => prev.filter(p => p.id !== id));
        
    } catch (error: any) {
        console.error("Error en deleteProduct:", error.message);
        // Lanzamos el error para que el componente (AdminPage) lo capture y muestre el Toast
        throw error;
    }
};
const getSalesData = async (startDate: Date, endDate: Date) => {
    const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            items:order_items (
                *,
                product:products (name)
            )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'paid') // Solo ventas concretadas
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Order[];
};

    return (
        <SupabaseContext.Provider value={{ 
            products, 
            orders, 
            fetchProducts,
            fetchOrders,
            createOrder, 
            updateOrderStatus, 
            createProduct, 
            updateProduct, 
            deleteProduct,
            getSalesData, 
            loading 
            }}>
            {children}
        </SupabaseContext.Provider>
    );
}
export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (context === undefined) {
        throw new Error("useSupabase must be used within a SupabaseProvider");
    }
    return context;
};
