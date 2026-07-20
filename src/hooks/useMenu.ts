"use client";

import { useCallback, useEffect, useState } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/types";

export const useMenu = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(true);

    const fetchProducts = useCallback(async () => {
        setLoadingMenu(true);
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .order("name", { ascending: true });
        setLoadingMenu(false);

        if (error) throw error;
        setProducts(data as Product[]);
    }, []);

    useEffect(() => {
        queueMicrotask(() => {
            void fetchProducts().catch((error: unknown) => {
                console.error("No se pudo cargar el menú:", error);
            });
        });

        const applyChange = (
            payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
        ) => {
            const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Partial<Product>;
            if (!row.id) return;

            setProducts((current) => {
                if (payload.eventType === "DELETE") {
                    return current.filter((product) => product.id !== row.id);
                }

                const changed = payload.new as Product;
                return [...current.filter((product) => product.id !== changed.id), changed]
                    .sort((a, b) => a.name.localeCompare(b.name));
            });
        };

        const channel = supabase
            .channel("restaurant-products")
            .on("postgres_changes", { event: "*", schema: "public", table: "products" }, applyChange)
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [fetchProducts]);

    const uploadProductImage = async (imageFile: File): Promise<string> => {
        const extension = imageFile.name.split(".").pop() || "bin";
        const fileName = `${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
            .from("product-images")
            .upload(fileName, imageFile);
        if (error) throw error;

        return supabase.storage.from("product-images").getPublicUrl(fileName).data.publicUrl;
    };

    const createProduct = async (
        product: Omit<Product, "id">,
        imageFile?: File,
    ): Promise<void> => {
        const image_url = imageFile ? await uploadProductImage(imageFile) : "";
        const { data, error } = await supabase
            .from("products")
            .insert({ ...product, image_url })
            .select()
            .single();
        if (error) throw error;

        const created = data as Product;
        setProducts((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const updateProduct = async (
        id: string,
        product: Partial<Omit<Product, "id">>,
        imageFile?: File,
    ): Promise<void> => {
        const updates: Partial<Product> = { ...product };
        if (imageFile) updates.image_url = await uploadProductImage(imageFile);

        const { data, error } = await supabase
            .from("products")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;

        setProducts((current) => current.map((item) => (
            item.id === id ? data as Product : item
        )));
    };

    const deleteProduct = async (id: string): Promise<void> => {
        const { error } = await supabase.rpc("delete_product_transaction", {
            p_product_id: id,
        });
        if (error) {
            const missingFunction = error.code === "PGRST202"
                || error.code === "42883"
                || error.message.toLowerCase().includes("could not find the function");
            if (!missingFunction) throw error;

            const { count, error: countError } = await supabase
                .from("order_items")
                .select("*", { count: "exact", head: true })
                .eq("product_id", id);
            if (countError) throw countError;
            if (count) {
                throw new Error("No se puede eliminar un producto que tiene historial de ventas.");
            }

            const { error: deleteError } = await supabase
                .from("products")
                .delete()
                .eq("id", id);
            if (deleteError) throw deleteError;
        }
        setProducts((current) => current.filter((product) => product.id !== id));
    };

    return {
        products,
        loadingMenu,
        fetchProducts,
        createProduct,
        updateProduct,
        deleteProduct,
    };
};
