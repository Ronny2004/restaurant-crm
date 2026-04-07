"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ReporteVenta } from "@/types";

export const useSalesReports = () => {
    // Usamos el 'pedido_id' como llave primaria en este Record
    const [reportesMap, setReportesMap] = useState<Record<string, ReporteVenta>>({});
    const [loadingReports, setLoadingReports] = useState(true);

    const fetchReportes = useCallback(async () => {
        const { data, error } = await supabase
            .from("reporte_ventas")
            .select("*")
            .order("fecha_hora", { ascending: false });

        if (error) {
            console.error("Error al obtener los reportes:", error);
            return;
        }

        if (data) {
            const newMap: Record<string, ReporteVenta> = {};
            data.forEach((rep: ReporteVenta) => {
                newMap[rep.pedido_id] = rep; 
            });
            setReportesMap(newMap);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            if (isMounted) setLoadingReports(true);
            await fetchReportes();
            if (isMounted) setLoadingReports(false);
        };
        init();

        const channel = supabase
            .channel("db-reports-changes")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "reporte_ventas" },
                (payload) => {
                    const newRep = payload.new as ReporteVenta;
                    setReportesMap((prev) => ({ ...prev, [newRep.pedido_id]: newRep }));
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "reporte_ventas" },
                (payload) => {
                    const updated = payload.new as ReporteVenta;
                    setReportesMap((prev) => ({ ...prev, [updated.pedido_id]: updated }));
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "reporte_ventas" },
                (payload) => {
                    const deletedId = payload.old.pedido_id;
                    setReportesMap((prev) => {
                        const next = { ...prev };
                        delete next[deletedId];
                        return next;
                    });
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log("Realtime de reporte_ventas conectado");
                }
            });

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [fetchReportes]);

    const reportes = useMemo(() => {
        return Object.values(reportesMap).sort(
            (a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
        );
    }, [reportesMap]);

    return {
        reportes,
        loadingReports,
        fetchReportes
    };
};
