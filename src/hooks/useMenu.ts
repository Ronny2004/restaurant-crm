"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/types";

// ---------------------------------------------------------------------------
// useMenu — Manages the restaurant's product catalog.
//
// Design decision: NO real-time WebSocket channel here.
// The menu of a restaurant changes infrequently (a chef edits a dish once a
// shift, not 60 times a minute). All mutations apply Optimistic UI updates
// so the admin panel feels instant without the overhead of a persistent WS
// connection. If a re-sync is needed, the caller can invoke fetchProducts().
// ---------------------------------------------------------------------------

export const useMenu = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(false);

    // ── Read ───────────────────────────────────────────────────────────────

    const fetchProducts = useCallback(async () => {
        setLoadingMenu(true);
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .order("name", { ascending: true });

        if (error) {
            console.error("Error al obtener los productos:", error);
        } else if (data) {
            setProducts(data as Product[]);
        }
        setLoadingMenu(false);
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // ── Helpers ────────────────────────────────────────────────────────────

    /** Uploads an image to the product-images bucket and returns its public URL. */
    const uploadProductImage = async (imageFile: File): Promise<string> => {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    };

    // ── Create ─────────────────────────────────────────────────────────────

    const createProduct = async (
        product: Omit<Product, "id">,
        imageFile?: File
    ): Promise<void> => {
        let image_url = "";
        if (imageFile) image_url = await uploadProductImage(imageFile);

        const { data, error } = await supabase
            .from("products")
            .insert({ ...product, image_url })
            .select()
            .single();

        if (error) {
            console.error("Error creando el producto:", error);
            throw error;
        }

        // Optimistic insert — sorted alphabetically to match server order
        if (data) {
            setProducts((prev) =>
                [...prev, data as Product].sort((a, b) => a.name.localeCompare(b.name))
            );
        }
    };

    // ── Update ─────────────────────────────────────────────────────────────

    const updateProduct = async (
        id: string,
        product: Partial<Omit<Product, "id">>,
        imageFile?: File
    ): Promise<void> => {
        const updates: Partial<Product> = { ...product };
        if (imageFile) updates.image_url = await uploadProductImage(imageFile);

        const { data, error } = await supabase
            .from("products")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error al actualizar el producto:", error);
            throw error;
        }

        // Optimistic replace
        if (data) {
            setProducts((prev) => prev.map((p) => (p.id === id ? (data as Product) : p)));
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────

    const deleteProduct = async (id: string): Promise<void> => {
        // Guard: do not allow deletion if the product has order history
        const { count, error: countError } = await supabase
            .from("order_items")
            .select("*", { count: "exact", head: true })
            .eq("product_id", id);

        if (countError) throw countError;

        if (count && count > 0) {
            throw new Error(
                "No se puede eliminar: Este producto ya ha sido vendido y tiene historial " +
                "(Comuníquese con el ADMINISTRADOR del App)."
            );
        }

        const { error: deleteError } = await supabase
            .from("products")
            .delete()
            .eq("id", id);

        if (deleteError) throw deleteError;

        // Optimistic remove
        setProducts((prev) => prev.filter((p) => p.id !== id));
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
