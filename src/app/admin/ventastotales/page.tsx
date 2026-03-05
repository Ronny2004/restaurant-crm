"use client";
import { useState, useMemo } from "react";
import { useSupabase } from "@/context/SupabaseProvider";
import { ChevronLeft, Calendar as CalendarIcon, RefreshCcw, Plus, X, Filter, Download } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

// Definimos la estructura del nuevo bloque de filtros
type FilterCategory = 'fecha' | 'estado' | 'monto' | '';
type DateFilterType = 'day' | 'month' | 'year' | 'range' | 'all';
type StatusFilterType = 'pending' | 'preparing' | 'served' | 'ready' | 'paid' | 'all';
type AmountFilterType = 'mayor' | 'menor' | 'rango' | 'all';

interface FilterBlock {
    id: string;
    category: FilterCategory;
    dateType: DateFilterType;
    selectedDate: string;
    selectedMonth: string;
    selectedYear: string;
    startDate: string;
    endDate: string;
    statusValue: StatusFilterType;
    amountType: AmountFilterType;
    amountMin: string;
    amountMax: string;
}

export default function VentasTotalesPage() {
    const { orders, fetchProducts } = useSupabase(); 

    // Estados para manejar los filtros dinámicos y compactos
    const [filters, setFilters] = useState<FilterBlock[]>([{
        id: Date.now().toString(),
        category: '',
        dateType: 'all',
        selectedDate: '',
        selectedMonth: '',
        selectedYear: new Date().getFullYear().toString(),
        startDate: '',
        endDate: '',
        statusValue: 'all',
        amountType: 'all',
        amountMin: '',
        amountMax: ''
    }]);

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
            case 'served': return 'Sirviendo';
            case 'ready': return 'Servido';
            default: return status;
        }
    };

    // Funciones para manejar los filtros dinámicos
    const addFilter = () => {
        setFilters([...filters, {
            id: Date.now().toString(),
            category: '',
            dateType: 'all',
            selectedDate: '',
            selectedMonth: '',
            selectedYear: new Date().getFullYear().toString(),
            startDate: '',
            endDate: '',
            statusValue: 'all',
            amountType: 'all',
            amountMin: '',
            amountMax: ''
        }]);
    };

    const updateFilter = (id: string, field: keyof FilterBlock, value: any) => {
        setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const removeFilter = (id: string) => {
        setFilters(filters.filter(f => f.id !== id));
    };

    const filteredSales = useMemo(() => {
        return orders.filter(order => {
            
            const orderDate = new Date(order.created_at);

            // Verificamos el pedido contra TODOS los filtros activos (Lógica Acumulativa "AND")
            for (const f of filters) {
                // Lógica de Fecha
                if (f.category === 'fecha') {
                    if (f.dateType === 'day' && f.selectedDate) {
                        if (orderDate.toDateString() !== new Date(f.selectedDate + "T00:00:00").toDateString()) return false;
                    } else if (f.dateType === 'month' && f.selectedMonth) {
                        const [y, m] = f.selectedMonth.split('-');
                        if (orderDate.getFullYear() !== parseInt(y) || (orderDate.getMonth() + 1) !== parseInt(m)) return false;
                    } else if (f.dateType === 'year' && f.selectedYear) {
                        if (orderDate.getFullYear() !== parseInt(f.selectedYear)) return false;
                    } else if (f.dateType === 'range' && f.startDate && f.endDate) {
                        const start = new Date(f.startDate + "T00:00:00");
                        const end = new Date(f.endDate + "T23:59:59");
                        if (orderDate < start || orderDate > end) return false;
                    }
                } 
                // Lógica de Estado
                else if (f.category === 'estado') {
                    if (f.statusValue === 'paid') {
                        if (!order.is_paid) return false;
                    } else if (f.statusValue !== 'all') {
                        if (order.is_paid || order.status !== f.statusValue) return false;
                    }
                } 
                // Lógica de Monto
                else if (f.category === 'monto') {
                    if (f.amountType === 'mayor') {
                        if (order.total <= 15) return false;
                    } else if (f.amountType === 'menor') {
                        if (order.total > 15) return false;
                    } else if (f.amountType === 'rango') {
                        const min = parseFloat(f.amountMin) || 0;
                        const max = parseFloat(f.amountMax) || Infinity;
                        if (order.total < min || order.total > max) return false;
                    }
                }
            }
            return true; 
        });
    }, [orders, filters]);

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
            { wch: 25 }, 
            { wch: 15 }, 
            { wch: 18 }, 
            { wch: 15 }  
        ];
        worksheet['!cols'] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Ventas");

        XLSX.writeFile(workbook, "Ventas Totales - Reporte LDM.xlsx");
    };

    return (
        <div className="container" style={{ padding: "1rem" }}>
            <header className="responsive-header" style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <Link href="/admin" className="btn btn-secondary">
                    <ChevronLeft size={20} /> Volver
                </Link>
                <h1>Historial de Ventas</h1>
            </header>

            {/* PANEL DE CONTROL DE FILTROS - Diseño Compacto e Inline */}
            <div className="glass-panel" style={{ padding: "0.75rem", marginBottom: "1.5rem", borderRadius: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    
                    <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.5rem 0", fontSize: "1.1rem" }}>
                        <Filter size={20} /> Panel de Control de Filtros
                    </h3>

                    {/* Renderizamos todos los filtros activos de forma compacta */}
                    {filters.map((f, index) => (
                        <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 40px", gap: "1rem", alignItems: "center", padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            
                            {/* 1. Selector principal - Categoría (Sin labels repetitivos) */}
                            <select 
                                value={f.category} 
                                onChange={(e) => updateFilter(f.id, 'category', e.target.value)}
                                className="btn btn-secondary"
                                style={{ background: "rgba(14, 26, 94, 0.66)", padding: "0.5rem", border: "1px solid var(--border)", fontSize: "0.9rem", color: "white" }}
                            >
                                <option value="">Escoja el filtro...</option>
                                <option value="fecha">Fecha/s</option>
                                <option value="estado">Estado</option>
                                <option value="monto">Monto</option>
                            </select>

                            {/* --- CONTROLES COMPACTOS PARA FECHA --- */}
                            {f.category === 'fecha' && (
                                <select 
                                    value={f.dateType} 
                                    onChange={(e) => updateFilter(f.id, 'dateType', e.target.value)}
                                    className="btn btn-secondary"
                                    style={{ background: "rgba(14, 26, 94, 0.66)", padding: "0.5rem", border: "1px solid var(--border)", fontSize: "0.9rem", color: "white" }}
                                >
                                    <option value="all">Ver Todo</option>
                                    <option value="day">Día Específico</option>
                                    <option value="month">Mes Específico</option>
                                    <option value="year">Año Específico</option>
                                    <option value="range">Rango de Fechas</option>
                                </select>
                            )}
                            {f.category === 'fecha' && (
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    {f.dateType === 'day' && <input type="date" value={f.selectedDate} onChange={(e) => updateFilter(f.id, 'selectedDate', e.target.value)} className="btn btn-secondary" style={{ color: "white", padding: "0.4rem" }} />}
                                    {f.dateType === 'month' && <input type="month" value={f.selectedMonth} onChange={(e) => updateFilter(f.id, 'selectedMonth', e.target.value)} className="btn btn-secondary" style={{ color: "white", padding: "0.4rem" }} />}
                                    {f.dateType === 'year' && (
                                        <select value={f.selectedYear} onChange={(e) => updateFilter(f.id, 'selectedYear', e.target.value)} className="btn btn-secondary" style={{ color: "white", padding: "0.4rem", textAlign: "center" }}>
                                            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                                        </select>
                                    )}
                                    {f.dateType === 'range' && (
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%"  }}>
                                            <input type="date" value={f.startDate} onChange={(e) => updateFilter(f.id, 'startDate', e.target.value)} className="btn btn-secondary" style={{ color: "white", padding: "0.4rem"}} />
                                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>a</span>
                                            <input type="date" value={f.endDate} onChange={(e) => updateFilter(f.id, 'endDate', e.target.value)} className="btn btn-secondary" style={{ color: "white", padding: "0.4rem" }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- CONTROLES COMPACTOS PARA ESTADO --- */}
                            {f.category === 'estado' && (
                                <select 
                                    value={f.statusValue} 
                                    onChange={(e) => updateFilter(f.id, 'statusValue', e.target.value)}
                                    className="btn btn-secondary"
                                    style={{ background: "rgba(14, 26, 94, 0.66)", padding: "0.5rem", border: "1px solid var(--border)", fontSize: "0.9rem", color: "white" }}
                                >
                                    <option value="all">Ver Todos</option>
                                    <option value="pending">Pendiente</option>
                                    <option value="preparing">En Cocina</option>
                                    <option value="served">Sirviendo</option>
                                    <option value="ready">Servido</option>
                                    <option value="paid">Pagado</option>
                                </select>
                            )}
                            {f.category === 'estado' && <div />} {/* Columna vacía */}

                            {/* --- CONTROLES COMPACTOS PARA MONTO --- */}
                            {f.category === 'monto' && (
                                <select 
                                    value={f.amountType} 
                                    onChange={(e) => updateFilter(f.id, 'amountType', e.target.value)}
                                    className="btn btn-secondary"
                                    style={{ background: "rgba(14, 26, 94, 0.66)", padding: "0.5rem", border: "1px solid var(--border)", fontSize: "0.9rem", color: "white" }}
                                >
                                    <option value="all">Todos</option>
                                    <option value="mayor">Mayores V. (&gt; $15)</option>
                                    <option value="menor">Menores V. (≤ $15)</option>
                                    <option value="rango">Rango de v.</option>
                                </select>
                            )}
                            {f.category === 'monto' && (
                                <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                                    {f.amountType === 'rango' && (
                                        <>
                                            <input type="number" placeholder="Min" value={f.amountMin} onChange={(e) => updateFilter(f.id, 'amountMin', e.target.value)} className="btn btn-secondary i-white" style={{ color: "white", textAlign: "center", padding: "0.4rem"}} />
                                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>a</span>
                                            <input type="number" placeholder="Max" value={f.amountMax} onChange={(e) => updateFilter(f.id, 'amountMax', e.target.value)} className="btn btn-secondary i-white" style={{ color: "white", textAlign: "center", padding: "0.4rem"}} />
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Celda vacía para ocupar la segunda columna si no se ha escogido categoría */}
                            {f.category === '' && <div />}
                            {/* Celda vacía para ocupar la tercera columna si no se ha escogido categoría */}
                            {f.category === '' && <div />}

                            {/* Botón para eliminar un filtro (visible solo si hay más de 1) */}
                            {filters.length > 1 && (
                                <button 
                                    onClick={() => removeFilter(f.id)} 
                                    className="btn btn-danger" 
                                    style={{ padding: "0.4rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }} 
                                    title="Quitar este filtro"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Botón verde para sumar otro filtro */}
                    {/* La condición envuelve todo el div. Solo se muestra si hay menos de 5 y NINGUNO está vacío */}
                    {filters.length < 5 && !filters.some(f => f.category === "") && (
                        <div>
                            <button 
                                onClick={addFilter}
                                className="btn btn-primary"
                                style={{ 
                                    display: "inline-flex", 
                                    alignItems: "center", 
                                    gap: "0.5rem", 
                                    background: "rgba(34, 197, 94, 0.2)",
                                    color: "#4ade80",
                                    border: "1px solid rgba(34, 197, 94, 0.4)",
                                    padding: "0.5rem 1rem"
                                }}
                            >
                                <Plus size={18} /> Agregar otro filtro
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* TABLA DE RESULTADOS - Reducida en padding general */}
            <div className="glass-panel" style={{ padding: "0", borderRadius: "12px" }}>
                <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{filteredSales.length} transacciones encontradas</span>
                        
                        <button 
                            onClick={handleExportExcel} 
                            disabled={filteredSales.length === 0}
                            title={filteredSales.length === 0 ? "Bloqueado: No existe ninguna venta" : "Realizar Reporte"}
                            className="btn btn-primary"
                            style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "0.5rem", 
                                padding: "0.4rem 1rem",
                                fontSize: "0.9rem",
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

                    <h2 style={{ color: "var(--primary)", margin: 0, fontSize: "1.6rem" }}>Total: ${totalCalculado.toFixed(2)}</h2>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                        <thead>
                            <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                                <th style={{ padding: "0.75rem 1rem", color: "white" }}>Fecha y Hora</th>
                                <th style={{ padding: "0.75rem 1rem", color: "white" }}>Mesa</th>
                                <th style={{ padding: "0.75rem 1rem", color: "white" }}>Estado</th>
                                <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "white" }}>Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length > 0 ? (
                                filteredSales.map(sale => (
                                    <tr key={sale.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }}>{new Date(sale.created_at).toLocaleString()}</td>
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }}>Mesa {sale.table_number}</td>
                                        <td style={{ padding: "0.75rem 1rem" }}>
                                            <span style={{
                                                padding: "0.2rem 0.6rem",
                                                borderRadius: "99px",
                                                fontSize: "0.8rem",
                                                fontWeight: "500",
                                                background: sale.is_paid 
                                                    ? "rgba(34, 197, 94, 0.2)" 
                                                    : sale.status === 'ready' || sale.status === 'served'
                                                        ? "rgba(59, 130, 246, 0.2)" // Azulito p/ listo/servido
                                                        : "rgba(234, 179, 8, 0.2)", // Amarillo p/ pendiente
                                                color: sale.is_paid 
                                                    ? "#4ade80" 
                                                    : sale.status === 'ready' || sale.status === 'served'
                                                        ? "#60a5fa"
                                                        : "#eab308"
                                            }}>
                                                {sale.is_paid ? "Pagado" : traducirEstado(sale.status)}
                                            </span>
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "bold", fontSize: "1.05rem" }}>${sale.total.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                                        No se encontraron ventas que coincidan con estos filtros.
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