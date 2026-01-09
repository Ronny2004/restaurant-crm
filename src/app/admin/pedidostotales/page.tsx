"use client";
import { useState, useMemo } from "react";
import { useSupabase } from "@/context/SupabaseProvider";
import { ChevronLeft, Clock, Package, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";

export default function PedidosTotalesPage() {
    // Extraemos fetchProducts para solucionar el error de la foto
    const { orders, fetchProducts } = useSupabase();
    
    // Estados para el filtrado profesional
    const [filterType, setFilterType] = useState<'day' | 'month' | 'year' | 'range' | 'all'>('all');
    const [selectedDate, setSelectedDate] = useState<string>(""); 
    const [selectedMonth, setSelectedMonth] = useState<string>(""); 
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Generar lista de años dinámicos basados en tus pedidos reales
    const availableYears = useMemo(() => {
        const years = orders.map(o => new Date(o.created_at).getFullYear());
        const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
        return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];
    }, [orders]);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
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

    return (
        <div className="container">
            <header className="responsive-header" style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                <Link href="/admin" className="btn btn-secondary">
                    <ChevronLeft size={20} /> Volver
                </Link>
                <h1>Historial de Pedidos</h1>
            </header>

            {/* Panel de Filtros Profesional */}
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

            {/* Grid de Tarjetas de Pedidos */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                        <div key={order.id} className="glass-panel" style={{ padding: "1.5rem", borderLeft: `4px solid ${order.status === 'paid' ? 'var(--success)' : 'var(--primary)'}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                                <h3 style={{ margin: 0 }}>Mesa {order.table_number}</h3>
                                <span style={{ 
                                    padding: "0.2rem 0.6rem", 
                                    borderRadius: "20px", 
                                    fontSize: "0.7rem", 
                                    background: order.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                                    color: order.status === 'paid' ? '#4ade80' : '#60a5fa'
                                }}>
                                    {order.status.toUpperCase()}
                                </span>
                            </div>

                            <div style={{ marginBottom: "1rem" }}>
                                {order.items?.map((item: any, idx: number) => (
                                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", color: "var(--text-muted)" }}>
                                        <Package size={14} />
                                        <span>{item.quantity}x {item.product?.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", opacity: 0.6, borderTop: "1px solid var(--border)", paddingTop: "0.8rem" }}>
                                <Clock size={14} />
                                {new Date(order.created_at).toLocaleString()}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass-panel" style={{ gridColumn: "1 / -1", padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No se encontraron pedidos en este periodo.
                    </div>
                )}
            </div>
        </div>
    );
}