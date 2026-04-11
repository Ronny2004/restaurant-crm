"use client";
import { useState, useMemo, useEffect } from "react";
import { useSalesReports } from "@/hooks/useSalesReports";
import { ChevronLeft, Calendar as CalendarIcon, RefreshCcw, Plus, X, Filter, Download, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";

// Definimos la estructura del nuevo bloque de filtros
type FilterCategory = 'fecha' | 'estado' | 'monto' | 'usuario' | 'tipo_pago' | '';
type DateFilterType = 'day' | 'month' | 'year' | 'range' | 'all';
type StatusFilterType = 'pending' | 'preparing' | 'served' | 'ready' | 'paid' | 'canceled' | 'editing' | 'all'; // Añadido 'editing'
type AmountFilterType = 'mayor' | 'menor' | 'rango' | 'all';
type UserRoleFilterType = 'any' | 'mesero' | 'cocinero' | 'cajero' | 'cancelado_por';

interface FilterBlock {
    id: string;
    category: FilterCategory;
    dateType: DateFilterType;
    selectedDate: string;
    selectedMonth: string;
    selectedYear: string;
    startDate: string;
    endDate: string;
    statusAction: 'include' | 'exclude';
    statusValues: string[];
    amountType: AmountFilterType;
    amountMin: string;
    amountMax: string;
    userRoleType: UserRoleFilterType;
    userNameInput: string;
    paymentValues: string[];
}

// Componente Multi-Select nativo (CSS blindado)
const MultiSelectDropdown = ({
    options,
    selectedValues,
    onChange,
    placeholder
}: {
    options: { label: string, value: string }[],
    selectedValues: string[],
    onChange: (vals: string[]) => void,
    placeholder: string
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (val: string) => {
        if (selectedValues.includes(val)) {
            onChange(selectedValues.filter(v => v !== val));
        } else {
            onChange([...selectedValues, val]);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="btn btn-secondary"
                style={{ background: "rgba(14, 26, 94, 0.66)", padding: "0.5rem", border: "1px solid var(--border)", fontSize: "0.9rem", color: "white", display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', height: '100%' }}
            >
                <span>{selectedValues.length === 0 ? placeholder : `${selectedValues.length} seleccionados`}</span>
                <span style={{ fontSize: '0.8rem' }}>▼</span>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '105%', left: 0, zIndex: 9999,
                    background: '#0f172a', border: "1px solid var(--border)",
                    borderRadius: "8px", padding: "0.5rem", width: '100%',
                    maxHeight: "250px", overflowY: "auto",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.8)",
                    display: 'flex', flexDirection: 'column'
                }}>
                    {options.map(opt => (
                        <label
                            key={opt.value}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                                gap: '10px', padding: '8px', cursor: 'pointer', color: 'white',
                                borderRadius: '4px', margin: 0, width: '100%', boxSizing: 'border-box'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(opt.value)}
                                onChange={() => toggleOption(opt.value)}
                                style={{ margin: 0, cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                            <span style={{ fontSize: '0.9rem', textAlign: 'left' }}>
                                {opt.label}
                            </span>
                        </label>
                    ))}
                </div>
            )}

            {/* Overlay invisible para cerrar al hacer clic afuera */}
            {isOpen && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={() => setIsOpen(false)} />}
        </div>
    );
};

export default function VentasTotalesPage() {
    const { reportes } = useSalesReports();

    const [filters, setFilters] = useState<FilterBlock[]>([{
        id: Date.now().toString(),
        category: '',
        dateType: 'all',
        selectedDate: '',
        selectedMonth: '',
        selectedYear: new Date().getFullYear().toString(),
        startDate: '',
        endDate: '',
        statusAction: 'include',
        statusValues: [],
        amountType: 'all',
        amountMin: '',
        amountMax: '',
        userRoleType: 'any',
        userNameInput: '',
        paymentValues: []
    }]);

    // Estado para ordenamiento, por defecto por fecha ascendente (del más antiguo al más nuevo)
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

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
            total: Number(r.monto) || 0,
            tipo_pago: r.tipo_pago || '-'
        }));
    }, [reportes]);
    
    const availableYears = useMemo(() => {
        const years = ventas.map(o => new Date(o.created_at).getFullYear());
        const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
        return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];
    }, [ventas]);

    const traducirEstado = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente';
            case 'preparing': return 'Preparando';
            case 'served': return 'Sirviendo';
            case 'ready': return 'Servido';
            case 'canceled': return 'Cancelado/Eliminado';
            case 'editing': return 'Editando...';
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
            statusAction: 'include',
            statusValues: [],
            amountType: 'all',
            amountMin: '',
            amountMax: '',
            userRoleType: 'any',
            userNameInput: '',
            paymentValues: []
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
                else if (f.category === 'estado') {
                    if (f.statusValues.length > 0) {
                        const currentStatus = order.is_paid ? 'paid' : order.status;
                        const isSelected = f.statusValues.includes(currentStatus) || (f.statusValues.includes('editing'));

                        if (f.statusAction === 'include' && !isSelected) {
                            return false;
                        } else if (f.statusAction === 'exclude' && isSelected) {
                            return false;
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
                else if (f.category === 'usuario') {
                    if (f.userNameInput.trim() !== '') {
                        const searchTerm = f.userNameInput.toLowerCase().trim();

                        if (f.userRoleType === 'any') {
                            const matchMesero = order.mesero.toLowerCase().includes(searchTerm);
                            const matchCocinero = order.cocinero.toLowerCase().includes(searchTerm);
                            const matchCajero = order.cajero.toLowerCase().includes(searchTerm);
                            const matchCancelado = order.cancelado_por.toLowerCase().includes(searchTerm);

                            if (!matchMesero && !matchCocinero && !matchCajero && !matchCancelado) return false;
                        } else {
                            const targetField = String(order[f.userRoleType] || '').toLowerCase();
                            if (!targetField.includes(searchTerm)) return false;
                        }
                    }
                }
                else if (f.category === 'tipo_pago') {
                    if (f.paymentValues.length > 0) {
                        const tipoPago = (order.tipo_pago || '-').toLowerCase();
                        if (!f.paymentValues.includes(tipoPago)) return false;
                    }
                }
            }
            return true;
        });
    }, [ventas, filters]);

    // Lista ordenada (Asegurándonos de que esté debajo de filteredSales para que funcione correctamente)
    const sortedSales = useMemo(() => {
        let sortableItems = [...filteredSales];

        if (sortConfig !== null) {
            sortableItems.sort((a: any, b: any) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredSales, sortConfig]);

    const totalCalculado = sortedSales.reduce((acc, curr) => acc + curr.total, 0);

    const handleExportExcel = async () => {

        if (sortedSales.length === 0) return;

        const ExcelJS = (await import("exceljs")).default;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Reporte de Ventas");

        const tableRows = sortedSales.map(sale => [
            new Date(sale.created_at).toLocaleString(),
            `Mesa ${sale.table_number}`,
            sale.mesero,
            sale.cocinero,
            sale.cajero,
            sale.cancelado_por,
            sale.is_paid ? "Pagado" : traducirEstado(sale.status),
            sale.tipo_pago,
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
                { name: 'Tipo Pago', filterButton: true },
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
            { width: 15 }, // Tipo Pago
            { width: 12 }  // Total
        ];

        worksheet.getColumn(9).numFmt = '"$"#,##0.00';
        worksheet.views = [{ state: "frozen", ySplit: 1 }];

        const totalRowNumber = tableRows.length + 2;
        const totalRow = worksheet.getRow(totalRowNumber);

        totalRow.getCell(1).value = "TOTAL GENERAL";
        totalRow.getCell(9).value = parseFloat(totalCalculado.toFixed(2));

        totalRow.font = { bold: true };
        totalRow.eachCell((cell: any) => {
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
            <Header />

            <div className="glass-panel" style={{ padding: "0.75rem", marginBottom: "1.5rem", borderRadius: "12px", position: "relative", zIndex: 20 }}>
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
                                <option value="tipo_pago">Tipo de Pago</option>
                                <option value="usuario">Usuario</option>
                            </select>

                            {/* SELECTORES DE FECHA */}
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
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%" }}>
                                            <input type="date" value={f.startDate} onChange={(e) => updateFilter(f.id, 'startDate', e.target.value)} className="btn btn-secondary" style={{ color: "white", padding: "0.4rem" }} />
                                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>a</span>
                                            <input type="date" value={f.endDate} onChange={(e) => updateFilter(f.id, 'endDate', e.target.value)} className="btn btn-secondary" style={{ color: "white", padding: "0.4rem" }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SELECTORES DE ESTADO */}
                            {f.category === 'estado' && (
                                <select
                                    value={f.statusAction}
                                    onChange={(e) => updateFilter(f.id, 'statusAction', e.target.value)}
                                    className="btn btn-secondary"
                                    style={{ background: "rgba(14, 26, 94, 0.66)", padding: "0.5rem", border: "1px solid var(--border)", fontSize: "0.9rem", color: "white" }}
                                >
                                    <option value="include">Mostrar marcados</option>
                                    <option value="exclude">Ocultar marcados</option>
                                </select>
                            )}
                            {f.category === 'estado' && (
                                <MultiSelectDropdown
                                    placeholder="Seleccionar estados..."
                                    selectedValues={f.statusValues}
                                    onChange={(vals) => updateFilter(f.id, 'statusValues', vals)}
                                    options={[
                                        { label: 'Pendiente', value: 'pending' },
                                        { label: 'En Cocina', value: 'preparing' },
                                        { label: 'Sirviendo', value: 'served' },
                                        { label: 'Servido', value: 'ready' },
                                        { label: 'Pagado', value: 'paid' },
                                        { label: 'Cancelado/Eliminado', value: 'canceled' },
                                        { label: 'Editando...', value: 'editing' }
                                    ]}
                                />
                            )}

                            {/* SELECTORES DE MONTO */}
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
                                            <input type="number" placeholder="Min" value={f.amountMin} onChange={(e) => updateFilter(f.id, 'amountMin', e.target.value)} className="btn btn-secondary i-white" style={{ color: "white", textAlign: "center", padding: "0.4rem" }} />
                                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>a</span>
                                            <input type="number" placeholder="Max" value={f.amountMax} onChange={(e) => updateFilter(f.id, 'amountMax', e.target.value)} className="btn btn-secondary i-white" style={{ color: "white", textAlign: "center", padding: "0.4rem" }} />
                                        </>
                                    )}
                                </div>
                            )}

                            {/* SELECTOR DE USUARIO */}
                            {f.category === 'usuario' && (
                                <select
                                    value={f.userRoleType}
                                    onChange={(e) => updateFilter(f.id, 'userRoleType', e.target.value)}
                                    className="btn btn-secondary"
                                    style={{ background: "rgba(14, 26, 94, 0.66)", padding: "0.5rem", border: "1px solid var(--border)", fontSize: "0.9rem", color: "white" }}
                                >
                                    <option value="any">Cualquier Rol</option>
                                    <option value="mesero">Mesero</option>
                                    <option value="cocinero">Cocinero</option>
                                    <option value="cajero">Cajero</option>
                                    <option value="cancelado_por">Cancelado Por</option>
                                </select>
                            )}
                            {f.category === 'usuario' && (
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%" }}>
                                    <input
                                        type="text"
                                        placeholder="Escriba el nombre o usuario..."
                                        value={f.userNameInput}
                                        onChange={(e) => updateFilter(f.id, 'userNameInput', e.target.value)}
                                        className="btn btn-secondary i-white"
                                        style={{ color: "white", padding: "0.4rem", width: "100%" }}
                                    />
                                </div>
                            )}

                            {/* SELECTORES DE TIPO DE PAGO */}
                            {f.category === 'tipo_pago' && (
                                <MultiSelectDropdown
                                    placeholder="Seleccionar tipos..."
                                    selectedValues={f.paymentValues}
                                    onChange={(vals) => updateFilter(f.id, 'paymentValues', vals)}
                                    options={[
                                        { label: 'Efectivo', value: 'efectivo' },
                                        { label: 'Transferencia', value: 'transferencia' },
                                        { label: 'Sin Pagar / Pendiente', value: '-' }
                                    ]}
                                />
                            )}
                            {f.category === 'tipo_pago' && <div />}

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
                        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{sortedSales.length} transacciones encontradas</span>

                        <button
                            onClick={handleExportExcel}
                            disabled={sortedSales.length === 0}
                            title={sortedSales.length === 0 ? "Bloqueado: No existe ninguna venta" : "Realizar Reporte"}
                            className="btn btn-primary"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.4rem 1rem",
                                fontSize: "0.9rem",
                                opacity: sortedSales.length === 0 ? 0.5 : 1,
                                cursor: sortedSales.length === 0 ? "not-allowed" : "pointer",
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
                                <th onClick={() => requestSort('created_at')} style={{ padding: "0.75rem 1rem", color: "white", cursor: "pointer", userSelect: "none" }}>
                                    Fecha y Hora <ArrowUpDown size={14} style={{ display: "inline", opacity: 0.5 }} />
                                </th>
                                <th onClick={() => requestSort('table_number')} style={{ padding: "0.75rem 1rem", color: "white", cursor: "pointer", userSelect: "none" }}>
                                    Mesa <ArrowUpDown size={14} style={{ display: "inline", opacity: 0.5 }} />
                                </th>
                                <th onClick={() => requestSort('mesero')} style={{ padding: "0.75rem 1rem", color: "white", cursor: "pointer", userSelect: "none" }}>
                                    Mesero <ArrowUpDown size={14} style={{ display: "inline", opacity: 0.5 }} />
                                </th>
                                <th onClick={() => requestSort('cocinero')} style={{ padding: "0.75rem 1rem", color: "white", cursor: "pointer", userSelect: "none" }}>
                                    Cocinero <ArrowUpDown size={14} style={{ display: "inline", opacity: 0.5 }} />
                                </th>
                                <th onClick={() => requestSort('cajero')} style={{ padding: "0.75rem 1rem", color: "white", cursor: "pointer", userSelect: "none" }}>
                                    Cajero <ArrowUpDown size={14} style={{ display: "inline", opacity: 0.5 }} />
                                </th>
                                <th onClick={() => requestSort('cancelado_por')} style={{ padding: "0.75rem 1rem", color: "white", cursor: "pointer", userSelect: "none" }}>
                                    Cancelado Por <ArrowUpDown size={14} style={{ display: "inline", opacity: 0.5 }} />
                                </th>
                                <th onClick={() => requestSort('status')} style={{ padding: "0.75rem 1rem", color: "white", cursor: "pointer", userSelect: "none" }}>
                                    Estado <ArrowUpDown size={14} style={{ display: "inline", opacity: 0.5 }} />
                                </th>
                                <th onClick={() => requestSort('tipo_pago')} style={{ padding: "0.75rem 1rem", color: "white", cursor: "pointer", userSelect: "none" }}>
                                    Tipo Pago <ArrowUpDown size={14} style={{ display: "inline", opacity: 0.5 }} />
                                </th>
                                <th onClick={() => requestSort('total')} style={{ padding: "0.75rem 1rem", textAlign: "right", color: "white", cursor: "pointer", userSelect: "none" }}>
                                    Monto <ArrowUpDown size={14} style={{ display: "inline", opacity: 0.5 }} />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedSales.length > 0 ? (
                                sortedSales.map(sale => (
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
                                                        : sale.status === 'editing'
                                                            ? "rgba(255, 255, 255, 0.1)" // Grisáceo para edición
                                                            : sale.status === 'ready' || sale.status === 'served'
                                                                ? "rgba(59, 130, 246, 0.2)" // Azulito p/ listo/servido
                                                                : "rgba(234, 179, 8, 0.2)", // Amarillo p/ pendiente
                                                color: sale.is_paid
                                                    ? "#4ade80"
                                                    : sale.status === 'canceled'
                                                        ? "#ef4444"
                                                        : sale.status === 'editing'
                                                            ? "var(--text-muted)" // Texto atenuado para edición
                                                            : sale.status === 'ready' || sale.status === 'served'
                                                                ? "#60a5fa"
                                                                : "#eab308"
                                            }}>
                                                {sale.is_paid ? "Pagado" : traducirEstado(sale.status)}
                                            </span>
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem", textTransform: "capitalize" }}>{sale.tipo_pago}</td>
                                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "bold", fontSize: "1.05rem" }}>${sale.total.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.95rem" }}>
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