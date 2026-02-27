"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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
    status: "pending" | "preparing" | "ready" | "served" | "paid";
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
    updateOrder: (orderId: string, updates: { items: { product: Product; quantity: number }[]; total: number }) => Promise<void>;
    deleteOrder: (id: string) => Promise<void>;
    updateOrderStatus: (orderId: string, status: Order["status"]) => Promise<void>;
    createProduct: (product: Omit<Product, "id">, imageFile?: File) => Promise<void>;
    updateProduct: (id: string, product: Partial<Omit<Product, "id">>, imageFile?: File) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    getSalesData: (startDate: Date, endDate: Date) => Promise<Order[]>;
    loading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Usamos useCallback para que las funciones no cambien en cada render
    const fetchProducts = useCallback(async () => {
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .order('name', { ascending: true });

        if (error) {
            console.error("Error al obtener los productos:", error);
            return;
        }
        if (data) setProducts([...data]);
    }, []);

    const fetchOrders = useCallback(async () => {
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

        const formattedOrders = data.map((order: any) => ({
            ...order,
            items: order.items.map((item: any) => ({
                ...item,
                product_name: item.product?.name || "Desconocido"
            }))
        }));

        setOrders(formattedOrders as Order[]);
    }, []);

    // 1. Carga inicial de datos
    // 1. Carga inicial de datos
    useEffect(() => {
        // DECLARACIÓN VITAL PARA EVITAR EL ERROR
        let isMounted = true;
        let retryCount = 0;
        const maxRetries = 3;

        const init = async () => {
            // Solo actualizamos el estado si el componente sigue montado
            if (isMounted) setLoading(true);
            try {
                await Promise.all([fetchProducts(), fetchOrders()]);
            } catch (error) {
                if (isMounted && retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(init, 1000);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        init();

        const channel = supabase
            .channel('db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => {
                    console.log("Cambio en pedidos detectado");
                    fetchOrders();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                () => {
                    console.log("Cambio en productos detectado");
                    fetchProducts();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("Conectado a Realtime correctamente");
                }
            });


        return () => {
            // Ahora la variable sí existe en este ámbito
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [fetchProducts, fetchOrders]);

    // --- Funciones CRUD (Escritura) ---
    const createOrder = async (table: string, items: { product: Product; quantity: number }[]) => {
        try {
            const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
            const user = (await supabase.auth.getUser()).data.user;

            // 1. Preparamos los items en el formato JSON que espera la función SQL (RPC)
            const itemsJson = items.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                price: item.product.price
            }));

            // 2. Llamamos a la función RPC en Supabase
            // Esta función se encarga de: Crear la orden, insertar los ítems y DESCONTAR el stock
            const { data: orderId, error: rpcError } = await supabase.rpc('create_full_order', {
                p_table_number: table,
                p_user_id: user?.id, // Obtenemos el ID del usuario actual
                p_items: itemsJson,
                p_total: total
            });

            if (rpcError) throw rpcError;

        } catch (error: any) {
            console.error("Error detallado en createOrder:", error.message);
            throw error;
        }
    };
    const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
        const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
        if (error) throw error;
    };

    const updateOrder = async (orderId: string, updates: { items: any[]; total: number }) => {
        try {
            // 1. Actualizamos el total de la orden
            const { error: orderError } = await supabase
                .from('orders')
                .update({ total: updates.total })
                .eq('id', orderId);
            
            if (orderError) throw orderError;

            // 2. Borramos los items antiguos
            const { error: deleteError } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', orderId);
                
            if (deleteError) throw deleteError;

            // 3. Mapeamos los items nuevos y viejos asegurando que encuentren su ID y precio
            const itemsToInsert = updates.items.map((item: any) => ({
                order_id: orderId,
                product_id: item.product?.id || item.product_id, // <-- Soporta datos locales o de DB
                quantity: item.quantity,
                price: item.price || item.product?.price || 0    // <-- Soporta datos locales o de DB
            }));

            // 4. Insertamos los items procesados
            if (itemsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('order_items')
                    .insert(itemsToInsert);
                    
                if (insertError) throw insertError;
            }

            await fetchOrders();
        } catch (error: any) {
            console.error("Error detallado en updateOrder:", error.message);
            throw error;
        }
    };

    const deleteOrder = async (id: string) => {
        try {
            console.log("1. Iniciando borrado para la orden ID:", id);

            // Borramos los items vinculados
            const { error: itemsError } = await supabase
                .from("order_items")
                .delete()
                .eq("order_id", id);

            if (itemsError) throw itemsError;
            console.log("2. Items de la orden borrados con éxito");

            // Borramos la orden principal obligando a Supabase a devolver lo que borró (.select)
            const { data: deletedData, error: deleteError } = await supabase
                .from("orders")
                .delete()
                .eq("id", id)
                .select();

            if (deleteError) throw deleteError;
            console.log("3. Respuesta de Supabase al borrar la orden:", deletedData);

            // Si deletedData está vacío, Supabase nos ignoró
            if (!deletedData || deletedData.length === 0) {
                throw new Error(`Supabase no eliminó la orden ${id}. Verifica RLS o si el ID es correcto.`);
            }

            // 4. Si llegamos aquí, sí se borró de la base de datos de verdad
            setOrders(prev => prev.filter(o => o.id !== id));
            console.log("4. Estado local actualizado");

        } catch (error: any) {
            console.error("🚨 Error detallado en deleteOrder:", error.message);
            throw error;
        }
    };

    const createProduct = async (product: Omit<Product, "id">, imageFile?: File) => {
        try {
            let finalImageUrl = "";

            // 1. Subida de imagen al Storage si el usuario la seleccionó
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                // Creamos un nombre único para evitar duplicados
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                // 2. Obtener la URL pública que generó el bucket
                const { data: urlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName);
                
                finalImageUrl = urlData.publicUrl;
            }

            // 3. Insertar el producto con la URL de la imagen en la tabla
            const { data, error } = await supabase
                .from("products")
                .insert({ 
                    ...product, 
                    image_url: finalImageUrl 
                })
                .select()
                .single();

            if (error) {
                console.error("Error creando el producto:", error);
                throw error;
            }
            
            if (data) {
                setProducts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            }
        } catch (error: any) {
            console.error("Error en createProduct:", error.message);
            throw error;
        }
    };

    const updateProduct = async (id: string, product: Partial<Omit<Product, "id">>, imageFile?: File) => {
        try {
            // 1. Creamos una copia de los datos que vamos a actualizar
            let updates: any = { ...product };

            // 2. Si el usuario seleccionó una NUEVA imagen, la subimos primero
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                // 3. Obtenemos la nueva URL pública
                const { data: urlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName);
                
                // 4. Inyectamos la nueva URL en el objeto que va a la base de datos
                updates.image_url = urlData.publicUrl;
            }

            // 5. Enviamos TODA la actualización (textos + nueva URL si la hay) a Supabase
            const { data, error } = await supabase
                .from("products")
                .update(updates)
                .eq("id", id)
                .select() // Importante para obtener el ID generado
                .single();

            if (error) {
                console.error("Error al actualizar el producto:", error);
                throw error;
            }

            if (data) {
                // 6. Actualizamos el estado local de React
                setProducts(prev => prev.map(p => p.id === id ? data : p));
            }
        } catch (error: any) {
            console.error("Error detallado en updateProduct:", error.message);
            throw error;
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
            updateOrder,
            deleteOrder,
            updateOrderStatus,
            createProduct,
            updateProduct,
            deleteProduct,
            getSalesData: async (start, end) => {
                const { data, error } = await supabase
                    .from("orders")
                    .select("*, items:order_items(*, product:products(name))")
                    .gte('created_at', start.toISOString())
                    .lte('created_at', end.toISOString())
                    .eq('status', 'paid')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return data as Order[];
            },
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
