"use client";
import { useState, useMemo } from "react";
import { useSupabase } from "@/context/SupabaseProvider";
import { ChevronLeft, Calendar as CalendarIcon, RefreshCcw, Filter, Download } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function VentasTotalesPage() {
    const { orders, fetchProducts } = useSupabase(); 
    
    const [filterType, setFilterType] = useState<'day' | 'month' | 'year' | 'range' | 'all'>('all');
    const [selectedDate, setSelectedDate] = useState<string>(""); 
    const [selectedMonth, setSelectedMonth] = useState<string>(""); 
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const availableYears = useMemo(() => {
        const years = orders.map(o => new Date(o.created_at).getFullYear());
        const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
        return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];
    }, [orders]);

    // Función auxiliar para traducir los estados de cocina
    const traducirEstado = (status: string) => {
        switch(status) {
            case 'pending': return 'Pendiente';
            case 'preparing': return 'Preparando';
            case 'ready': return 'Listo p/ Servir';
            case 'served': return 'Servido';
            default: return status;
        }
    };

    const filteredSales = useMemo(() => {
        return orders.filter(order => {
            // ELIMINAMOS EL FILTRO: Ahora se mostrarán todos los pedidos (Pagados y No Pagados)
            // if (!order.is_paid) return false; 
            
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

    const handleExportExcel = () => {
        if (filteredSales.length === 0) return;

        const dataToExport = filteredSales.map(sale => ({
            "Fecha y Hora": new Date(sale.created_at).toLocaleString(),
            "Mesa": `Mesa ${sale.table_number}`,
            "Estado": sale.is_paid ? "Pagado" : traducirEstado(sale.status),
            "Total ($)": sale.total
        }));

        dataToExport.push({
            "Fecha y Hora": "TOTAL GENERAL",
            "Mesa": "",
            "Estado": "", 
            "Total ($)": parseFloat(totalCalculado.toFixed(2))
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        const columnWidths = [
            { wch: 25 }, // Fecha y Hora
            { wch: 15 }, // Mesa
            { wch: 18 }, // Estado
            { wch: 15 }  // Total
        ];
        worksheet['!cols'] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Ventas");

        XLSX.writeFile(workbook, "Ventas Totales - Reporte LDM.xlsx");
    };

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
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Filtrar por fechas:</span>
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
                <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>{filteredSales.length} transacciones</span>
                        
                        <button 
                            onClick={handleExportExcel} 
                            disabled={filteredSales.length === 0}
                            className="btn btn-primary"
                            style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "0.5rem", 
                                padding: "0.5rem 1rem",
                                opacity: filteredSales.length === 0 ? 0.5 : 1,
                                cursor: filteredSales.length === 0 ? "not-allowed" : "pointer",
                                background: "rgba(34, 197, 94, 0.2)",
                                color: "#4ade80",
                                border: "1px solid rgba(34, 197, 94, 0.4)"
                            }}
                        >
                            <Download size={18} />
                            Reporte Excel
                        </button>
                    </div>

                    <h2 style={{ color: "var(--primary)", margin: 0 }}>Total: ${totalCalculado.toFixed(2)}</h2>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.02)" }}>
                                <th style={{ padding: "1rem" }}>Fecha y Hora</th>
                                <th style={{ padding: "1rem" }}>Mesa</th>
                                <th style={{ padding: "1rem" }}>Estado</th>
                                <th style={{ padding: "1rem", textAlign: "right" }}>Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length > 0 ? (
                                filteredSales.map(sale => (
                                    <tr key={sale.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={{ padding: "1rem" }}>{new Date(sale.created_at).toLocaleString()}</td>
                                        <td style={{ padding: "1rem" }}>Mesa {sale.table_number}</td>
                                        <td style={{ padding: "1rem" }}>
                                            <span style={{
                                                padding: "0.25rem 0.75rem",
                                                borderRadius: "99px",
                                                fontSize: "0.85rem",
                                                fontWeight: "500",
                                                background: sale.is_paid 
                                                    ? "rgba(34, 197, 94, 0.2)" 
                                                    : sale.status === 'ready' || sale.status === 'served'
                                                        ? "rgba(59, 130, 246, 0.2)" // Azulito para listo/servido
                                                        : "rgba(234, 179, 8, 0.2)", // Amarillo para pendiente/preparando
                                                color: sale.is_paid 
                                                    ? "#4ade80" 
                                                    : sale.status === 'ready' || sale.status === 'served'
                                                        ? "#60a5fa"
                                                        : "#eab308"
                                            }}>
                                                {sale.is_paid ? "Pagado" : traducirEstado(sale.status)}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "right", fontWeight: "bold" }}>${sale.total.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
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