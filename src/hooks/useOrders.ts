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
};

type RealtimeRow = Record<string, unknown>;

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

type UseOrdersOptions = {
    includeAudits?: boolean;
};

export const useOrders = ({ includeAudits = false }: UseOrdersOptions = {}) => {
    const [ordersMap, setOrdersMap] = useState<Record<string, Order>>({});
    const [auditsMap, setAuditsMap] = useState<Record<string, Auditoria_Pedidos>>({});
    const [loadingOrders, setLoadingOrders] = useState(true);
    const refreshTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
    const ignoredRealtimeUntil = useRef(new Map<string, number>());

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
        if (!includeAudits) {
            setAuditsMap({});
            return;
        }

        const { data, error } = await supabase
            .from("auditoria_pedidos")
            .select("*")
            .order("fecha_hora", { ascending: false });

        if (error) throw error;
        setAuditsMap(Object.fromEntries(
            (data as Auditoria_Pedidos[]).map((audit) => [audit.id, audit]),
        ));
    }, [includeAudits]);

    useEffect(() => {
        let active = true;

        queueMicrotask(() => {
            const initialRequests = includeAudits
                ? [fetchOrders(), fetchAuditorias()]
                : [fetchOrders()];

            Promise.all(initialRequests)
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

            const ignoreUntil = ignoredRealtimeUntil.current.get(id);
            if (ignoreUntil && ignoreUntil > Date.now()) {
                ignoredRealtimeUntil.current.delete(id);
                return;
            }

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

        let channel = supabase
            .channel("restaurant-orders")
            .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, handleOrderChange);

        if (includeAudits) {
            channel = channel.on(
                "postgres_changes",
                { event: "*", schema: "public", table: "auditoria_pedidos" },
                handleAuditChange,
            );
        }

        channel.subscribe();

        const timers = refreshTimers.current;
        const ignoredEvents = ignoredRealtimeUntil.current;
        return () => {
            active = false;
            timers.forEach(clearTimeout);
            timers.clear();
            ignoredEvents.clear();
            void supabase.removeChannel(channel);
        };
    }, [fetchAuditorias, fetchOrders, includeAudits, scheduleOrderRefresh]);

    const runOrderTransaction = useCallback(async (
        functionName: string,
        parameters: Record<string, unknown>,
        orderId?: string,
    ) => {
        const { data, error } = await supabase.rpc(functionName, parameters);
        if (error) throw error;

        const affectedId = orderId
            ?? (typeof data === "string" ? data : null)
            ?? null;
        if (affectedId) {
            ignoredRealtimeUntil.current.set(affectedId, Date.now() + 750);
            const pendingTimer = refreshTimers.current.get(affectedId);
            if (pendingTimer) {
                clearTimeout(pendingTimer);
                refreshTimers.current.delete(affectedId);
            }
            await refreshOrder(affectedId);
        }
        return affectedId;
    }, [refreshOrder]);

    const createOrder = useCallback(async (
        table: string,
        items: { product: Product; quantity: number }[],
    ) => {
        const payload: OrderMutationItem[] = items.map(({ product, quantity }) => ({
            product_id: product.id,
            quantity,
        }));
        await runOrderTransaction("create_order_transaction", {
            p_table_number: table,
            p_items: payload,
        });
    }, [runOrderTransaction]);

    const updateOrder = useCallback(async (
        orderId: string,
        updates: { items: OrderMutationItem[]; expectedUpdatedAt: string },
    ) => {
        await runOrderTransaction("update_order_transaction", {
            p_order_id: orderId,
            p_items: updates.items.map(({ product_id, quantity }) => ({
                product_id,
                quantity,
            })),
            p_expected_updated_at: updates.expectedUpdatedAt,
        });
    }, [runOrderTransaction]);

    const deleteOrder = useCallback(async (orderId: string) => {
        await runOrderTransaction("cancel_order_transaction", { p_order_id: orderId }, orderId);
    }, [runOrderTransaction]);

    const updateOrderStatus = useCallback(async (orderId: string, status: Order["status"]) => {
        await runOrderTransaction("update_order_status_transaction", {
            p_order_id: orderId,
            p_status: status,
        });
    }, [runOrderTransaction]);

    const markOrderAsPaid = useCallback(async (orderId: string, paymentTypeId: number) => {
        await runOrderTransaction("pay_order_transaction", {
            p_order_id: orderId,
            p_payment_type_id: paymentTypeId,
        });
    }, [runOrderTransaction]);

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
