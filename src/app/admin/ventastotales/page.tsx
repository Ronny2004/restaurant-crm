"use client";
import { useState, useMemo } from "react";
import { useSupabase } from "@/context/SupabaseProvider";
import { ChevronLeft, Calendar as CalendarIcon, RefreshCcw, Filter } from "lucide-react";
import Link from "next/link";

export default function VentasTotalesPage() {
    // 1. Corregido: Extraemos fetchProducts para evitar el error de "Cannot find name"
    const { orders, fetchProducts } = useSupabase(); 
    
    const [filterType, setFilterType] = useState<'day' | 'month' | 'year' | 'range' | 'all'>('all');
    const [selectedDate, setSelectedDate] = useState<string>(""); 
    const [selectedMonth, setSelectedMonth] = useState<string>(""); 
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // 2. Generar lista de años dinámicamente basada en los pedidos existentes
    const availableYears = useMemo(() => {
        const years = orders.map(o => new Date(o.created_at).getFullYear());
        const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
        // Si no hay pedidos, al menos mostrar el año actual
        return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];
    }, [orders]);

    const filteredSales = useMemo(() => {
        return orders.filter(order => {
            if (order.status !== 'paid') return false;
            const orderDate = new Date(order.created_at);

            switch (filterType) {
                case 'day':
                    return selectedDate ? orderDate.toDateString() === new Date(selectedDate + "T00:00:00").toDateString() : true;
                case 'month':
                    if (!selectedMonth) return true;
                    const [y, m] = selectedMonth.split('-');
                    return orderDate.getFullYear() === parseInt(y) && (orderDate.getMonth() + 1) === parseInt(m);
                case 'year':
                    return orderDate.getFullYear() === parseInt(selectedYear);
                case 'range':
                    const start = startDate ? new Date(startDate + "T00:00:00") : null;
                    const end = endDate ? new Date(endDate + "T23:59:59") : null;
                    if (start && end) return orderDate >= start && orderDate <= end;
                    return true;
                default:
                    return true;
            }
        });
    }, [orders, filterType, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

    const totalCalculado = filteredSales.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <div className="container">
            <header className="responsive-header" style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                <Link href="/admin" className="btn btn-secondary">
                    <ChevronLeft size={20} /> Volver
                </Link>
                <h1>Historial de Ventas</h1>
            </header>

            <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Filtrar por:</span>
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="btn btn-secondary"
                            style={{ background: "rgba(14, 26, 94, 0.66)", padding: "0.6rem", border: "1px solid var(--border)" }}
                        >
                            <option value="all">Ver Todo</option>
                            <option value="day">Día Específico</option>
                            <option value="month">Mes Específico</option>
                            <option value="year">Año Específico</option>
                            <option value="range">Rango de Fechas</option>
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", alignItems: "center", flex: 1 }}>
                        {filterType === 'day' && (
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="btn btn-secondary" style={{ color: "white" }} />
                        )}

                        {filterType === 'month' && (
                            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="btn btn-secondary" style={{ color: "white" }} />
                        )}

                        {filterType === 'year' && (
                            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="btn btn-secondary" style={{ color: "black" }}>
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        )}

                        {filterType === 'range' && (
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="btn btn-secondary" />
                                <span>a</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="btn btn-secondary" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: "0" }}>
                <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{filteredSales.length} transacciones</span>
                    <h2 style={{ color: "var(--primary)", margin: 0 }}>Total: ${totalCalculado.toFixed(2)}</h2>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.02)" }}>
                                <th style={{ padding: "1rem" }}>Fecha y Hora</th>
                                <th style={{ padding: "1rem" }}>Mesa</th>
                                <th style={{ padding: "1rem", textAlign: "right" }}>Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length > 0 ? (
                                filteredSales.map(sale => (
                                    <tr key={sale.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={{ padding: "1rem" }}>{new Date(sale.created_at).toLocaleString()}</td>
                                        <td style={{ padding: "1rem" }}>Mesa {sale.table_number}</td>
                                        <td style={{ padding: "1rem", textAlign: "right", fontWeight: "bold" }}>${sale.total.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                                        No se encontraron ventas en este periodo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}