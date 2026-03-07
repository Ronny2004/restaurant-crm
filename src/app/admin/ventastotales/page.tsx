"use client";
import { useState, useMemo, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseProvider";
import { ChevronLeft, Calendar as CalendarIcon, RefreshCcw, Plus, X, Filter, Download } from "lucide-react";
import Link from "next/link";

// Definimos la estructura del nuevo bloque de filtros
type FilterCategory = 'fecha' | 'estado' | 'monto' | '';
type DateFilterType = 'day' | 'month' | 'year' | 'range' | 'all';
type StatusFilterType = 'pending' | 'preparing' | 'served' | 'ready' | 'paid' | 'canceled' | 'all'; 
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
    // NUEVO: Agregamos la acción para el estado (mostrar vs ocultar)
    statusAction: 'include' | 'exclude';
    statusValue: StatusFilterType;
    amountType: AmountFilterType;
    amountMin: string;
    amountMax: string;
}

export default function VentasTotalesPage() {
    const { reportes } = useSupabase(); 

    const [filters, setFilters] = useState<FilterBlock[]>([{
        id: Date.now().toString(),
        category: '',
        dateType: 'all',
        selectedDate: '',
        selectedMonth: '',
        selectedYear: new Date().getFullYear().toString(),
        startDate: '',
        endDate: '',
        statusAction: 'include', // Valor por defecto
        statusValue: 'all',
        amountType: 'all',
        amountMin: '',
        amountMax: ''
    }]);

    const ventas = useMemo(() => {
        if (!reportes) return [];
        return reportes.map(r => ({
            id: r.pedido_id,
            created_at: r.fecha_hora,
            table_number: r.mesa,
            mesero: r.mesero || '-',
            cocinero: r.cocinero || '-',
            cajero: r.cajero || '-',
            cancelado_por: r.cancelado_por || '-',
            status: r.estado,
            is_paid: r.cajero !== '-', 
            total: Number(r.monto) || 0
        }));
    }, [reportes]);

    const availableYears = useMemo(() => {
        const years = ventas.map(o => new Date(o.created_at).getFullYear());
        const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
        return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];
    }, [ventas]);

    const traducirEstado = (status: string) => {
        switch(status) {
            case 'pending': return 'Pendiente';
            case 'preparing': return 'Preparando';
            case 'served': return 'Sirviendo';
            case 'ready': return 'Servido';
            case 'canceled': return 'Cancelado/Eliminado'; 
            default: return status;
        }
    };

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
            statusAction: 'include', // Valor por defecto en nuevos filtros
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
        return ventas.filter(order => {
            
            const orderDate = new Date(order.created_at);

            for (const f of filters) {
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
                // NUEVA LÓGICA DE ESTADO: Muestra u Oculta según la acción seleccionada
                else if (f.category === 'estado') {
                    if (f.statusValue !== 'all') {
                        let matchesStatus = false;
                        
                        if (f.statusValue === 'paid') {
                            matchesStatus = order.is_paid;
                        } else {
                            matchesStatus = (!order.is_paid && order.status === f.statusValue);
                        }

                        if (f.statusAction === 'include' && !matchesStatus) {
                            return false; // Descartar si solo queremos ver este estado y no coincide
                        } else if (f.statusAction === 'exclude' && matchesStatus) {
                            return false; // Descartar si queremos ocultar este estado y sí coincide
                        }
                    }
                } 
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
    }, [ventas, filters]); 

    const totalCalculado = filteredSales.reduce((acc, curr) => acc + curr.total, 0);

    const handleExportExcel = async () => {

        if (filteredSales.length === 0) return;

        const ExcelJS = (await import("exceljs")).default;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Reporte de Ventas");

        const tableRows = filteredSales.map(sale => [
            new Date(sale.created_at).toLocaleString(),
            `Mesa ${sale.table_number}`,
            sale.mesero,
            sale.cocinero,
            sale.cajero,
            sale.cancelado_por,
            sale.is_paid ? "Pagado" : traducirEstado(sale.status),
            sale.total
        ]);

        worksheet.addTable({
            name: 'TablaDeVentas',
            ref: 'A1', 
            headerRow: true,
            totalsRow: false, 
            style: {
                theme: 'TableStyleMedium2', 
                showRowStripes: true,
            },
            columns: [
                { name: 'Fecha y Hora', filterButton: true },
                { name: 'Mesa', filterButton: true },
                { name: 'Mesero', filterButton: true },
                { name: 'Cocinero', filterButton: true },
                { name: 'Cajero', filterButton: true },
                { name: 'Cancelado Por', filterButton: true },
                { name: 'Estado', filterButton: true },
                { name: 'Total ($)', filterButton: true }
            ],
            rows: tableRows
        });

        worksheet.columns = [
            { width: 22 }, // Fecha
            { width: 12 }, // Mesa
            { width: 15 }, // Mesero
            { width: 15 }, // Cocinero
            { width: 15 }, // Cajero
            { width: 18 }, // Cancelado Por
            { width: 15 }, // Estado
            { width: 12 }  // Total
        ];

        worksheet.getColumn(8).numFmt = '"$"#,##0.00';
        worksheet.views = [{ state: "frozen", ySplit: 1 }];

        const totalRowNumber = tableRows.length + 2; 
        const totalRow = worksheet.getRow(totalRowNumber);
        
        totalRow.getCell(1).value = "TOTAL GENERAL";
        totalRow.getCell(8).value = parseFloat(totalCalculado.toFixed(2));
        
        totalRow.font = { bold: true };
        totalRow.eachCell((cell) => {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "E7E6E6" } 
            };
            cell.border = {
                top: { style: "medium" },
                bottom: { style: "medium" }
            };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Ventas Totales - Reporte LDM.xlsx";
        a.click();
    };

    return (
        <div className="container" style={{ padding: "1rem" }}>
            <header className="responsive-header" style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <Link href="/admin" className="btn btn-secondary">
                    <ChevronLeft size={20} /> Volver
                </Link>
                <h1>Historial de Ventas</h1>
            </header>

            <div className="glass-panel" style={{ padding: "0.75rem", marginBottom: "1.5rem", borderRadius: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    
                    <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.5rem 0", fontSize: "1.1rem" }}>
                        <Filter size={20} /> Panel de Control de Filtros
                    </h3>

                    {filters.map((f, index) => (
                        <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 40px", gap: "1rem", alignItems: "center", padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            
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

                            {/* NUEVO UI DE ESTADO: Agregamos el selector intermedio */}
                            {f.category === 'estado' && (
                                <select 
                                    value={f.statusAction} 
                                    onChange={(e) => updateFilter(f.id, 'statusAction', e.target.value)}
                                    className="btn btn-secondary"
                                    style={{ background: "rgba(14, 26, 94, 0.66)", padding: "0.5rem", border: "1px solid var(--border)", fontSize: "0.9rem", color: "white" }}
                                >
                                    <option value="include">Solo Mostrar...</option>
                                    <option value="exclude">Ocultar (Quitar)...</option>
                                </select>
                            )}
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
                                    <option value="canceled">Cancelado/Eliminado</option> 
                                </select>
                            )}

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

                            {f.category === '' && <div />}
                            {f.category === '' && <div />}

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
                    {/* La condición envuelve todo el div. Solo se muestra si hay menos de 3 y NINGUNO está vacío */}
                    {filters.length < 3 && !filters.some(f => f.category === "") && (
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
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
                        <thead>
                            <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                                <th style={{ padding: "0.75rem 1rem", color: "white" }}>Fecha y Hora</th>
                                <th style={{ padding: "0.75rem 1rem", color: "white" }}>Mesa</th>
                                <th style={{ padding: "0.75rem 1rem", color: "white" }}>Mesero</th>
                                <th style={{ padding: "0.75rem 1rem", color: "white" }}>Cocinero</th>
                                <th style={{ padding: "0.75rem 1rem", color: "white" }}>Cajero</th>
                                <th style={{ padding: "0.75rem 1rem", color: "white" }}>Cancelado Por</th>
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
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }}>{sale.mesero}</td>
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }}>{sale.cocinero}</td>
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }}>{sale.cajero}</td>
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }}>
                                            {sale.status === 'canceled' ? (
                                                <span style={{ color: "#ef4444", fontWeight: "bold" }}>{sale.cancelado_por}</span>
                                            ) : (
                                                <span style={{ color: "var(--text-muted)" }}>-</span>
                                            )}
                                        </td>

                                        <td style={{ padding: "0.75rem 1rem" }}>
                                            <span style={{
                                                padding: "0.2rem 0.6rem",
                                                borderRadius: "99px",
                                                fontSize: "0.8rem",
                                                fontWeight: "500",
                                                background: sale.is_paid 
                                                    ? "rgba(34, 197, 94, 0.2)" 
                                                    : sale.status === 'canceled'
                                                        ? "rgba(239, 68, 68, 0.2)" 
                                                    : sale.status === 'ready' || sale.status === 'served'
                                                        ? "rgba(59, 130, 246, 0.2)" // Azulito p/ listo/servido
                                                        : "rgba(234, 179, 8, 0.2)", // Amarillo p/ pendiente
                                                color: sale.is_paid 
                                                    ? "#4ade80" 
                                                    : sale.status === 'canceled'
                                                        ? "#ef4444" 
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
                                    <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.95rem" }}>
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