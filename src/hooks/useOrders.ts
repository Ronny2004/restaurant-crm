"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Auditoria_Pedidos, Order, OrderItem, Product } from "@/types";

type OrderRow = Omit<Order, "status" | "status_description" | "items"> & {
    status_order?: { status?: Order["status"]; description?: string } | null;
    items?: Array<Omit<OrderItem, "product_name"> & { product?: { name?: string } | null }>;
};

type OrderMutationItem = {
    product_id: string;
    quantity: number;
    price: number;
};

type RealtimeRow = Record<string, unknown>;

type SupabaseFailure = {
    code?: string;
    message?: string;
};

const ORDER_SELECT = `
    *,
    status_order (status, description),
    items:order_items (*, product:products (name))
`;

function normalizeOrder(row: OrderRow): Order {
    return {
        ...row,
        status: row.status_order?.status ?? "pending",
        status_description: row.status_order?.description ?? "",
        items: (row.items ?? []).map((item) => ({
            ...item,
            product_name: item.product?.name ?? "Desconocido",
        })),
    };
}

function rowId(row: RealtimeRow, field = "id"): string | null {
    const value = row[field];
    return typeof value === "string" ? value : null;
}

function isMissingRpc(error: SupabaseFailure): boolean {
    return error.code === "PGRST202"
        || error.code === "42883"
        || Boolean(error.message?.toLowerCase().includes("could not find the function"));
}

export const useOrders = () => {
    const [ordersMap, setOrdersMap] = useState<Record<string, Order>>({});
    const [auditsMap, setAuditsMap] = useState<Record<string, Auditoria_Pedidos>>({});
    const [loadingOrders, setLoadingOrders] = useState(true);
    const refreshTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

    const fetchOrderById = useCallback(async (id: string): Promise<Order | null> => {
        const { data, error } = await supabase
            .from("orders")
            .select(ORDER_SELECT)
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;
        return data ? normalizeOrder(data as OrderRow) : null;
    }, []);

    const refreshOrder = useCallback(async (id: string) => {
        const order = await fetchOrderById(id);
        setOrdersMap((current) => {
            if (order) return { ...current, [id]: order };
            const next = { ...current };
            delete next[id];
            return next;
        });
    }, [fetchOrderById]);

    const scheduleOrderRefresh = useCallback((id: string) => {
        const existingTimer = refreshTimers.current.get(id);
        if (existingTimer) clearTimeout(existingTimer);

        const timer = setTimeout(() => {
            refreshTimers.current.delete(id);
            void refreshOrder(id);
        }, 80);
        refreshTimers.current.set(id, timer);
    }, [refreshOrder]);

    const fetchOrders = useCallback(async () => {
        const { data, error } = await supabase
            .from("orders")
            .select(ORDER_SELECT)
            .order("created_at", { ascending: false });

        if (error) throw error;
        const next = Object.fromEntries(
            (data as OrderRow[]).map((row) => {
                const order = normalizeOrder(row);
                return [order.id, order];
            }),
        );
        setOrdersMap(next);
    }, []);

    const fetchAuditorias = useCallback(async () => {
        const { data, error } = await supabase
            .from("auditoria_pedidos")
            .select("*")
            .order("fecha_hora", { ascending: false });

        if (error) throw error;
        setAuditsMap(Object.fromEntries(
            (data as Auditoria_Pedidos[]).map((audit) => [audit.id, audit]),
        ));
    }, []);

    useEffect(() => {
        let active = true;

        queueMicrotask(() => {
            Promise.all([fetchOrders(), fetchAuditorias()])
                .catch((error: unknown) => console.error("No se pudieron cargar los pedidos:", error))
                .finally(() => {
                    if (active) setLoadingOrders(false);
                });
        });

        const handleOrderChange = (
            payload: RealtimePostgresChangesPayload<RealtimeRow>,
        ) => {
            const id = rowId(payload.eventType === "DELETE" ? payload.old : payload.new);
            if (!id) return;

            if (payload.eventType === "DELETE") {
                setOrdersMap((current) => {
                    const next = { ...current };
                    delete next[id];
                    return next;
                });
                return;
            }
            scheduleOrderRefresh(id);
        };

        const handleItemChange = (
            payload: RealtimePostgresChangesPayload<RealtimeRow>,
        ) => {
            const row = payload.eventType === "DELETE" ? payload.old : payload.new;
            const orderId = rowId(row, "order_id");
            if (orderId) scheduleOrderRefresh(orderId);
        };

        const handleAuditChange = (
            payload: RealtimePostgresChangesPayload<RealtimeRow>,
        ) => {
            const id = rowId(payload.eventType === "DELETE" ? payload.old : payload.new);
            if (!id) return;

            setAuditsMap((current) => {
                const next = { ...current };
                if (payload.eventType === "DELETE") delete next[id];
                else next[id] = payload.new as Auditoria_Pedidos;
                return next;
            });
        };

        const channel = supabase
            .channel("restaurant-orders")
            .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, handleOrderChange)
            .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, handleItemChange)
            .on("postgres_changes", { event: "*", schema: "public", table: "auditoria_pedidos" }, handleAuditChange)
            .subscribe();

        const timers = refreshTimers.current;
        return () => {
            active = false;
            timers.forEach(clearTimeout);
            timers.clear();
            void supabase.removeChannel(channel);
        };
    }, [fetchAuditorias, fetchOrders, scheduleOrderRefresh]);

    const runOrderTransaction = useCallback(async (
        functionName: string,
        parameters: Record<string, unknown>,
        orderId?: string,
        fallback?: () => Promise<string | null | void>,
    ) => {
        const { data, error } = await supabase.rpc(functionName, parameters);
        let fallbackId: string | null | void = null;
        if (error) {
            if (!fallback || !isMissingRpc(error)) throw error;
            fallbackId = await fallback();
        }

        const affectedId = orderId
            ?? (typeof data === "string" ? data : null)
            ?? (typeof fallbackId === "string" ? fallbackId : null);
        if (affectedId) await refreshOrder(affectedId);
        return affectedId;
    }, [refreshOrder]);

    const getCurrentUsername = useCallback(async () => {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return "Desconocido";

        const { data } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", authData.user.id)
            .maybeSingle();
        return data?.username ?? "Desconocido";
    }, []);

    const createOrder = useCallback(async (
        table: string,
        items: { product: Product; quantity: number }[],
    ) => {
        const payload: OrderMutationItem[] = items.map(({ product, quantity }) => ({
            product_id: product.id,
            quantity,
            price: product.price,
        }));
        await runOrderTransaction("create_order_transaction", {
            p_table_number: table,
            p_items: payload,
        }, undefined, async () => {
            const { data: authData } = await supabase.auth.getUser();
            const total = payload.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const { data: orderId, error } = await supabase.rpc("create_full_order", {
                p_table_number: table,
                p_user_id: authData.user?.id,
                p_items: payload,
                p_total: total,
            });
            if (error) throw error;
            if (typeof orderId !== "string") throw new Error("Supabase no devolvió el pedido creado.");

            const { error: reportError } = await supabase.from("reporte_ventas").insert({
                pedido_id: orderId,
                mesa: table,
                mesero: await getCurrentUsername(),
                estado: "pending",
                monto: total,
            });
            if (reportError) throw reportError;
            return orderId;
        });
    }, [getCurrentUsername, runOrderTransaction]);

    const updateOrder = useCallback(async (
        orderId: string,
        updates: { items: OrderMutationItem[]; total: number },
    ) => {
        await runOrderTransaction("update_order_transaction", {
            p_order_id: orderId,
            p_items: updates.items.map(({ product_id, quantity, price }) => ({
                product_id,
                quantity,
                price,
            })),
        }, orderId, async () => {
            const { data: order } = await supabase
                .from("orders")
                .select("table_number")
                .eq("id", orderId)
                .single();
            const { data: previousItems, error: previousError } = await supabase
                .from("order_items")
                .select("product_id, quantity, price, products(name)")
                .eq("order_id", orderId);
            if (previousError) throw previousError;

            const original = previousItems?.map((item) => {
                const product = item.products as unknown as { name?: string } | null;
                return `${product?.name ?? "Producto"} (x${item.quantity})`;
            }).join(", ") || "Sin artículos originales";
            const updated = updates.items
                .map((item) => `${item.product_id} (x${item.quantity})`)
                .join(", ");
            const total = updates.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0,
            );

            const { error: deleteError } = await supabase
                .from("order_items")
                .delete()
                .eq("order_id", orderId);
            if (deleteError) throw deleteError;
            const { error: insertError } = await supabase.from("order_items").insert(
                updates.items.map(({ product_id, quantity, price }) => ({
                    order_id: orderId,
                    product_id,
                    quantity,
                    price,
                })),
            );
            if (insertError) {
                if (previousItems?.length) {
                    const { error: restoreError } = await supabase.from("order_items").insert(
                        previousItems.map(({ product_id, quantity, price }) => ({
                            order_id: orderId,
                            product_id,
                            quantity,
                            price,
                        })),
                    );
                    if (restoreError) {
                        console.error("No se pudieron restaurar los artículos originales:", restoreError);
                    }
                }
                throw insertError;
            }

            // Se actualiza la cabecera al final para que el evento Realtime de
            // `orders` se emita cuando los artículos definitivos ya existen.
            const { error: orderError } = await supabase
                .from("orders")
                .update({ total })
                .eq("id", orderId);
            if (orderError) throw orderError;

            const { error: reportError } = await supabase
                .from("reporte_ventas")
                .update({ monto: total })
                .eq("pedido_id", orderId);
            if (reportError) {
                console.error("El pedido se guardó, pero no se actualizó su reporte:", reportError);
            }

            if (original !== updated) {
                const audit = {
                    pedido_id: orderId,
                    mesa: order?.table_number ?? "Desconocida",
                    usuario: await getCurrentUsername(),
                    estado_pedido: "Editado",
                    pedido_original: original,
                    pedido_actualizado: updated,
                    fecha_hora: new Date().toISOString(),
                };
                const { data: currentAudit, error: findAuditError } = await supabase
                    .from("auditoria_pedidos")
                    .select("id")
                    .eq("pedido_id", orderId)
                    .maybeSingle();
                if (findAuditError) {
                    console.error("El pedido se guardó, pero no se pudo consultar la auditoría:", findAuditError);
                    return;
                }

                const auditQuery = currentAudit
                    ? supabase.from("auditoria_pedidos").update(audit).eq("id", currentAudit.id)
                    : supabase.from("auditoria_pedidos").insert(audit);
                const { error: auditError } = await auditQuery;
                if (auditError) {
                    console.error("El pedido se guardó, pero no se pudo actualizar la auditoría:", auditError);
                    return;
                }
                const { error: historyError } = await supabase
                    .from("historial_auditoria_pedidos")
                    .insert(audit);
                if (historyError) {
                    console.error("El pedido se guardó, pero no se pudo registrar el historial:", historyError);
                }
            }
        });
    }, [getCurrentUsername, runOrderTransaction]);

    const deleteOrder = useCallback(async (orderId: string) => {
        await runOrderTransaction("cancel_order_transaction", { p_order_id: orderId }, orderId, async () => {
            const username = await getCurrentUsername();
            const { error: reportError } = await supabase
                .from("reporte_ventas")
                .update({ estado: "canceled", cancelado_por: username })
                .eq("pedido_id", orderId);
            if (reportError) throw reportError;
            const { error } = await supabase.from("orders").delete().eq("id", orderId);
            if (error) throw error;
        });
    }, [getCurrentUsername, runOrderTransaction]);

    const updateOrderStatus = useCallback(async (orderId: string, status: Order["status"]) => {
        await runOrderTransaction("update_order_status_transaction", {
            p_order_id: orderId,
            p_status: status,
        }, orderId, async () => {
            const { data: statusRow, error: statusError } = await supabase
                .from("status_order")
                .select("id")
                .eq("status", status)
                .single();
            if (statusError) throw statusError;
            const { error } = await supabase
                .from("orders")
                .update({ status_id: statusRow.id })
                .eq("id", orderId);
            if (error) throw error;

            const reportUpdate: Record<string, string> = { estado: status };
            if (status === "preparing" || status === "served") {
                reportUpdate.cocinero = await getCurrentUsername();
            }
            const { error: reportError } = await supabase
                .from("reporte_ventas")
                .update(reportUpdate)
                .eq("pedido_id", orderId);
            if (reportError) throw reportError;
        });
    }, [getCurrentUsername, runOrderTransaction]);

    const markOrderAsPaid = useCallback(async (orderId: string, paymentTypeId: number) => {
        await runOrderTransaction("pay_order_transaction", {
            p_order_id: orderId,
            p_payment_type_id: paymentTypeId,
        }, orderId, async () => {
            const { data: paymentType, error: paymentError } = await supabase
                .from("payment_type")
                .select("type")
                .eq("id", paymentTypeId)
                .single();
            if (paymentError) throw paymentError;
            const { error } = await supabase
                .from("orders")
                .update({ is_paid: true, payment_type_id: paymentTypeId })
                .eq("id", orderId);
            if (error) throw error;
            const { error: reportError } = await supabase
                .from("reporte_ventas")
                .update({
                    cajero: await getCurrentUsername(),
                    tipo_pago: paymentType.type,
                })
                .eq("pedido_id", orderId);
            if (reportError) throw reportError;
        });
    }, [getCurrentUsername, runOrderTransaction]);

    const getSalesData = useCallback(async (start: Date, end: Date): Promise<Order[]> => {
        const { data, error } = await supabase
            .from("orders")
            .select(ORDER_SELECT)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .eq("is_paid", true)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return (data as OrderRow[]).map(normalizeOrder);
    }, []);

    const orders = useMemo(
        () => Object.values(ordersMap).sort(
            (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
        ),
        [ordersMap],
    );
    const auditorias = useMemo(
        () => Object.values(auditsMap).sort(
            (a, b) => Date.parse(b.fecha_hora) - Date.parse(a.fecha_hora),
        ),
        [auditsMap],
    );

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
