"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Order, Product, Auditoria_Pedidos } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a single fully-joined order row by id.
 * Used by the Realtime handler so we avoid full-table refetches.
 */
const fetchOrderById = async (id: string): Promise<Order | null> => {
    const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            status_order (
                status,
                description
            ),
            items:order_items (
                *,
                product:products (name)
            )
        `)
        .eq("id", id)
        .single();

    if (error || !data) return null;

    let matchedProfile = null;
    if (data.created_by) {
        const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", data.created_by)
            .single();
        matchedProfile = profileData;
    }

    return {
        ...data,
        created_by: data.created_by,
        profiles: matchedProfile,
        updated_at: data.updated_at,
        status: data.status_order?.status ?? "pending",
        status_description: data.status_order?.description ?? "",
        items: (data.items ?? []).map((item: any) => ({
            ...item,
            product_name: item.product?.name ?? "Desconocido",
        })),
    } as Order;
};

/** Returns the authenticated user's username from the profiles table. */
const getCurrentUsername = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

    return data?.username ?? "Usuario Desconocido";
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useOrders = () => {
    const [ordersMap, setOrdersMap] = useState<Record<string, Order>>({});
    const [auditoriasMap, setAuditoriasMap] = useState<Record<string, Auditoria_Pedidos>>({});
    const [loadingOrders, setLoadingOrders] = useState(true);

    // ── Initial full fetches (only called once on mount) ───────────────────

    const fetchOrders = useCallback(async () => {
        const { data, error } = await supabase
            .from("orders")
            .select(`
                *,
                status_order (
                    status,
                    description
                ),
                items:order_items (
                    *,
                    product:products (name)
                )
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error obteniendo las ordenes:", error);
            return;
        }

        const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url");

        const newMap: Record<string, Order> = {};
        data.forEach((order: any) => {
            const userProfile = profilesData?.find((p: any) => p.id === order.created_by);
            newMap[order.id] = {
                ...order,
                created_by: order.created_by,
                profiles: userProfile,
                updated_at: order.updated_at,
                status: order.status_order?.status ?? "pending",
                status_description: order.status_order?.description ?? "",
                items: (order.items ?? []).map((item: any) => ({
                    ...item,
                    product_name: item.product?.name ?? "Desconocido",
                })), 
            };
        });

        setOrdersMap(newMap);
    }, []);

    const fetchAuditorias = useCallback(async () => {
        const { data, error } = await supabase
            .from("auditoria_pedidos")
            .select("*")
            .order("fecha_hora", { ascending: false });

        if (error) {
            console.error("Error al obtener la auditoría:", error);
            return;
        }

        if (data) {
            const newMap: Record<string, Auditoria_Pedidos> = {};
            data.forEach((aud: Auditoria_Pedidos) => {
                newMap[aud.id] = aud;
            });
            setAuditoriasMap(newMap);
        }
    }, []);

    // ── Real-time subscriptions (payload-based, zero full-table refetch) ───

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            if (isMounted) setLoadingOrders(true);
            await Promise.all([fetchOrders(), fetchAuditorias()]);
            if (isMounted) setLoadingOrders(false);
        };
        init();

        const channel = supabase
            .channel("db-orders-changes")
            // ── orders table ────────────────────────────────────────────────
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "orders" },
                async (payload) => {
                    // A new order arrives: fetch the single row to get joined data
                    const newOrder = await fetchOrderById(payload.new.id);
                    if (newOrder) {
                        setOrdersMap((prev) => ({ ...prev, [newOrder.id]: newOrder }));
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "orders" },
                async (payload) => {
                    // An order was updated: fetch the single row for fresh joined data
                    const updatedOrder = await fetchOrderById(payload.new.id);
                    if (updatedOrder) {
                        setOrdersMap((prev) => ({ ...prev, [updatedOrder.id]: updatedOrder }));
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "orders" },
                (payload) => {
                    // Pure state mutation — zero DB round-trip needed
                    const deletedId: string = payload.old.id;
                    setOrdersMap((prev) => {
                        const next = { ...prev };
                        delete next[deletedId];
                        return next;
                    });
                }
            )
            // ── auditoria_pedidos table ──────────────────────────────────────
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "auditoria_pedidos" },
                (payload) => {
                    const newAudit = payload.new as Auditoria_Pedidos;
                    setAuditoriasMap((prev) => ({ ...prev, [newAudit.id]: newAudit }));
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "auditoria_pedidos" },
                (payload) => {
                    const updatedAudit = payload.new as Auditoria_Pedidos;
                    setAuditoriasMap((prev) => ({ ...prev, [updatedAudit.id]: updatedAudit }));
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "auditoria_pedidos" },
                (payload) => {
                    const deletedId: string = payload.old.id;
                    setAuditoriasMap((prev) => {
                        const next = { ...prev };
                        delete next[deletedId];
                        return next;
                    });
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log("Realtime de Orders y Auditorías activo.");
                }
            });

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [fetchOrders, fetchAuditorias]);

    // ── Derived arrays (memoized) ──────────────────────────────────────────

    const orders = useMemo(
        () => Object.values(ordersMap).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        [ordersMap]
    );

    const auditorias = useMemo(
        () => Object.values(auditoriasMap).sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()),
        [auditoriasMap]
    );

    // ── CRUD mutations ─────────────────────────────────────────────────────

    const createOrder = async (table: string, items: { product: Product; quantity: number }[], fechaExacta?: string) => {
        const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const user = (await supabase.auth.getUser()).data.user;

        const itemsJson = items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
        }));

        const { data: orderId, error: rpcError } = await supabase.rpc("create_full_order", {
            p_table_number: table,
            p_user_id: user?.id,
            p_items: itemsJson,
            p_total: total,
        });

        if (rpcError) throw rpcError;

        if (orderId) {
            if (fechaExacta) {
                await supabase.from('orders').update({ created_at: fechaExacta }).eq('id', orderId);
            }

            const username = await getCurrentUsername();

            await supabase.from("reporte_ventas").insert({
                pedido_id: orderId,
                mesa: table,
                mesero: username ?? "Desconocido",
                estado: "pending",
                monto: total,
                created_at: fechaExacta || new Date().toISOString(), 
            });

            // The INSERT Realtime event will update the map automatically.
            // We call fetchOrderById defensively in case the socket has latency.
            const newOrder = await fetchOrderById(orderId);
            if (newOrder) {
                setOrdersMap((prev) => ({ ...prev, [newOrder.id]: newOrder }));
            }
        }
    };
    
    const updateOrder = async (orderId: string, updates: { items: any[]; total: number }, fechaExacta?: string) => {
        const { data: orderData } = await supabase
            .from("orders")
            .select("table_number")
            .eq("id", orderId)
            .single();
        const tableNumber = orderData?.table_number ?? "Desconocida";

        const userName = await getCurrentUsername() ?? "Usuario desconocido";

        // Snapshot of old items for audit trail
        const { data: oldItemsData } = await supabase
            .from("order_items")
            .select("product_id, quantity, products(name)")
            .eq("order_id", orderId);

        const pedidoOriginal = oldItemsData?.length
            ? oldItemsData.map((i: any) => `${i.products?.name ?? "Producto"} (x${i.quantity})`).join(", ")
            : "Sin items originales";

        const pedidoActualizado = updates.items
            .map((item: any) => `${item.product?.name ?? item.product_name ?? "Producto"} (x${item.quantity})`)
            .join(", ");

        // Apply mutations
        const { error: orderError } = await supabase
            .from("orders")
            .update({ 
                total: updates.total, 
                updated_at: fechaExacta || new Date().toISOString()
            })
            .eq("id", orderId);
        if (orderError) throw orderError;

        await supabase.from("reporte_ventas").update({ monto: updates.total }).eq("pedido_id", orderId);

        const { error: deleteError } = await supabase.from("order_items").delete().eq("order_id", orderId);
        if (deleteError) throw deleteError;

        const itemsToInsert = updates.items.map((item: any) => ({
            order_id: orderId,
            product_id: item.product?.id ?? item.product_id,
            quantity: item.quantity,
            price: item.price ?? item.product?.price ?? 0,
        }));

        if (itemsToInsert.length > 0) {
            const { error: insertError } = await supabase.from("order_items").insert(itemsToInsert);
            if (insertError) throw insertError;
        }

        // Audit trail (only if items changed)
        if (pedidoOriginal !== pedidoActualizado) {
            const { data: existingAudit } = await supabase
                .from("auditoria_pedidos")
                .select("id")
                .eq("pedido_id", orderId)
                .maybeSingle();

            const auditPayload = {
                usuario: userName,
                estado_pedido: "Editado",
                pedido_original: pedidoOriginal,
                pedido_actualizado: pedidoActualizado,
                fecha_hora: fechaExacta || new Date().toISOString(),
            };

            if (existingAudit) {
                await supabase.from("auditoria_pedidos").update(auditPayload).eq("id", existingAudit.id);
            } else {
                await supabase.from("auditoria_pedidos").insert({ pedido_id: orderId, mesa: tableNumber, ...auditPayload });
            }

            await supabase.from("historial_auditoria_pedidos").insert({ pedido_id: orderId, mesa: tableNumber, ...auditPayload });
        }

        // The Realtime UPDATE handler will apply the changes to the map.
        // Defensive single-row refresh in case of socket lag.
        const fresh = await fetchOrderById(orderId);
        if (fresh) setOrdersMap((prev) => ({ ...prev, [fresh.id]: fresh }));
    };

    const deleteOrder = async (id: string, fechaExacta?: string) => {
        const username = await getCurrentUsername();

        // 1. Buscamos qué mesa es ANTES de borrarla (lo necesitamos para la auditoría)
        const { data: orderData } = await supabase.from("orders").select("table_number").eq("id", id).single();
        const tableNumber = orderData?.table_number ?? "Desconocida";

        // 👇 2. EL ESCUDO PROTECTOR: Creamos la auditoría manualmente con TU fecha 👇
        await supabase.from("auditoria_pedidos").insert({
            pedido_id: id,
            mesa: tableNumber,
            usuario: username ?? "Desconocido",
            estado_pedido: "Cancelado",
            pedido_original: "Orden eliminada",
            pedido_actualizado: "N/A",
            // ESTA ES LA CLAVE: Forzamos la hora de Ecuador para la línea de tiempo
            fecha_hora: fechaExacta || new Date().toISOString() 
        });

        // 3. Ahora sí, borramos la orden original
        const { data: deletedData, error: deleteError } = await supabase
            .from("orders")
            .delete()
            .eq("id", id)
            .select();

        if (deleteError) throw deleteError;
        if (!deletedData?.length) throw new Error(`No se pudo eliminar la orden ${id}.`);

        // 4. Actualizamos el reporte de ventas con tu fecha
        const updatePayload: any = { 
            estado: "canceled", 
            cancelado_por: username ?? "Desconocido" 
        };
        
        if (fechaExacta) {
            updatePayload.fecha_hora = fechaExacta; 
        }

        await supabase
            .from("reporte_ventas")
            .update(updatePayload)
            .eq("pedido_id", id);

        // 5. Actualizamos la interfaz
        setOrdersMap((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const STATUS_TO_ID: Record<string, number> = {
        pending: 1,
        preparing: 2,
        served: 3,
        ready: 4,
    };

    const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
        const newStatusId = STATUS_TO_ID[newStatus];

        const { error } = await supabase
            .from("orders")
            .update({ status_id: newStatusId })
            .eq("id", orderId);

        if (error) throw error;

        const username = await getCurrentUsername();
        const reporteUpdates: Record<string, any> = { estado: newStatus };
        if (newStatus === "preparing" || newStatus === "served") {
            reporteUpdates.cocinero = username ?? "Desconocido";
        }
        await supabase.from("reporte_ventas").update(reporteUpdates).eq("pedido_id", orderId);

        // Optimistic local update — no DB round-trip needed for the UI
        setOrdersMap((prev) => {
            if (!prev[orderId]) return prev;
            return { ...prev, [orderId]: { ...prev[orderId], status: newStatus, status_id: newStatusId } };
        });
    };

    const markOrderAsPaid = async (orderId: string, paymentMethodId: number) => {
        const { error } = await supabase
            .from("orders")
            .update({ is_paid: true, payment_type_id: paymentMethodId })
            .eq("id", orderId);

        if (error) throw error;

        const username = await getCurrentUsername();

        const { data: ptRow } = await supabase
            .from("payment_type")
            .select("type")
            .eq("id", paymentMethodId)
            .single();

        await supabase
            .from("reporte_ventas")
            .update({ cajero: username ?? "Desconocido", tipo_pago: ptRow?.type ?? "-" })
            .eq("pedido_id", orderId);

        // Optimistic local update
        setOrdersMap((prev) => {
            if (!prev[orderId]) return prev;
            return { ...prev, [orderId]: { ...prev[orderId], is_paid: true } };
        });
    };

    const getSalesData = async (start: Date, end: Date): Promise<Order[]> => {
        const { data, error } = await supabase
            .from("orders")
            .select("*, items:order_items(*, product:products(name))")
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .eq("is_paid", true)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data as Order[];
    };

    return {
        orders,
        auditorias,
        loadingOrders,
        fetchOrders,
        fetchAuditorias,
        createOrder,
        updateOrder,
        deleteOrder,
        updateOrderStatus,
        markOrderAsPaid,
        getSalesData,
    };
};
