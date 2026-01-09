"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

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
    createOrder: (table: string, items: { product: Product; quantity: number }[]) => Promise<void>;
    updateOrderStatus: (orderId: string, status: Order["status"]) => Promise<void>;
    createProduct: (product: Omit<Product, "id">) => Promise<void>;
    updateProduct: (id: string, product: Partial<Omit<Product, "id">>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    loading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Mock Data for Demo Mode
const MOCK_PRODUCTS: Product[] = [
    { id: "1", name: "Hamburguesa Clásica", price: 12.50, category: "Principal", stock: 50 },
    { id: "2", name: "Papas Fritas", price: 5.00, category: "Acompañante", stock: 100 },
    { id: "3", name: "Refresco", price: 3.00, category: "Bebida", stock: 200 },
    { id: "4", name: "Tacos de Pollo", price: 8.00, category: "Principal", stock: 40 },
    { id: "5", name: "Agua Mineral", price: 2.00, category: "Bebida", stock: 150 },
];

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDemo, setIsDemo] = useState(false);

    useEffect(() => {
        const init = async () => {
            // Check if Supabase keys are configured (and not the fallback)
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            // If no env var, or if it matches our fallback in client.ts (which we can't see here directly but can infer if it fails or if we strictly check 'undefined' before client load? No, process.env is available)
            // Actually, if we set fallback in client.ts, the client object is validish.
            // But here we check process.env directly.
            if (!url || url === 'https://example.com' || url === '') {
                console.warn("Supabase keys missing or default. Using Demo Mode.");
                setProducts(MOCK_PRODUCTS);
                setIsDemo(true);
                setLoading(false);
                return;
            }

            await fetchProducts();
            await fetchOrders();
            subscribeToOrders();
            setLoading(false);
        };

        init();
    }, []);

    const fetchProducts = async () => {
        const { data, error } = await supabase.from("products").select("*");
        if (data) setProducts(data);
        else if (error) console.error("Error fetching products:", error);
    };

    const fetchOrders = async () => {
        const { data: ordersData, error } = await supabase.from("orders").select("*").order('created_at', { ascending: false });
        if (error) {
            console.error("Error fetching orders:", error);
            return;
        }

        // Fetch items for each order (simplified for demo, usually use join)
        const fullOrders = await Promise.all(ordersData.map(async (order) => {
            const { data: items } = await supabase.from("order_items").select("*, products(name)").eq("order_id", order.id);
            const methodizedItems = items?.map(item => ({
                ...item,
                product_name: item.products?.name || "Unknown"
            })) || [];
            return { ...order, items: methodizedItems };
        }));

        setOrders(fullOrders as Order[]);
    };

    const subscribeToOrders = () => {
        // Realtime subscription setup
        const channel = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                console.log('Change received!', payload);
                fetchOrders(); // Refresh all for simplicity
            })
            .subscribe();

        // return () => supabase.removeChannel(channel);
    };

    const createOrder = async (table: string, items: { product: Product; quantity: number }[]) => {
        const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

        if (isDemo) {
            const newOrder: Order = {
                id: Math.random().toString(36).substr(2, 9),
                table_number: table,
                status: "pending",
                total,
                created_at: new Date().toISOString(),
                items: items.map(i => ({
                    id: Math.random().toString(),
                    product_id: i.product.id,
                    product_name: i.product.name,
                    quantity: i.quantity,
                    price: i.product.price
                }))
            };
            setOrders(prev => [newOrder, ...prev]);
            return;
        }

        // Supabase Insert
        const { data: order, error } = await supabase
            .from("orders")
            .insert({ table_number: table, total, status: "pending" })
            .select()
            .single();

        if (error || !order) {
            console.error("Error creating order", error);
            return;
        }

        const orderItems = items.map(item => ({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price
        }));

        await supabase.from("order_items").insert(orderItems);
        // Realtime will trigger update
    };

    const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
        if (isDemo) {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
            return;
        }

        await supabase.from("orders").update({ status }).eq("id", orderId);
    };

    const createProduct = async (product: Omit<Product, "id">) => {
        if (isDemo) {
            const newProduct: Product = {
                ...product,
                id: Math.random().toString(36).substr(2, 9)
            };
            setProducts(prev => [...prev, newProduct]);
            return;
        }

        const { error } = await supabase.from("products").insert(product);
        if (error) {
            console.error("Error creating product:", error);
            throw error;
        }
        await fetchProducts();
    };

    const updateProduct = async (id: string, product: Partial<Omit<Product, "id">>) => {
        if (isDemo) {
            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...product } : p));
            return;
        }

        const { error } = await supabase.from("products").update(product).eq("id", id);
        if (error) {
            console.error("Error updating product:", error);
            throw error;
        }
        await fetchProducts();
    };

    const deleteProduct = async (id: string) => {
        if (isDemo) {
            setProducts(prev => prev.filter(p => p.id !== id));
            return;
        }

        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) {
            console.error("Error deleting product:", error);
            throw error;
        }
        await fetchProducts();
    };

    return (
        <SupabaseContext.Provider value={{ products, orders, createOrder, updateOrderStatus, createProduct, updateProduct, deleteProduct, loading }}>
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
