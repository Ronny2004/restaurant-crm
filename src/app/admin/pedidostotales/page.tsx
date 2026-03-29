"use client";
import { useState, useMemo, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseProvider";
import { ChevronLeft, Clock, Package, Filter, Plus, X } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";

// 1. Tipos para los filtros (Solo Fecha y Estado)
type FilterCategory = 'fecha' | 'estado' | '';
type DateFilterType = 'day' | 'month' | 'year' | 'range' | 'all';

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
}

// 2. Componente Multi-Select nativo (CSS blindado)
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
            
            {isOpen && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={() => setIsOpen(false)} />}
        </div>
    );
};

export default function PedidosTotalesPage() {
    const { orders, auditorias, fetchAuditorias } = useSupabase();

    useEffect(() => {
        fetchAuditorias();
    }, [fetchAuditorias]);

    // FILTRO MAESTRO
    const historyOrders = useMemo(() => {
        const pagados = (orders || []).filter(o => o.is_paid);
        
        const sourceCancelados = auditorias || [];
        const cancelados = sourceCancelados.map((aud: any) => {
            let parsedItems = [];
            if (typeof aud.detalle === 'string') {
                try { parsedItems = JSON.parse(aud.detalle); } catch(e) {}
            } else {
                parsedItems = aud.detalle || aud.items || aud.productos || [];
            }

            return {
                id: aud.pedido_id || aud.id || Math.random().toString(), 
                table_number: aud.mesa || aud.table_number,
                is_paid: false,
                status: 'canceled', 
                items: parsedItems, 
                created_at: aud.fecha_hora || aud.created_at,
                cancelado_por: aud.cancelado_por,
                pedido_original: aud.pedido_original // Aquí capturamos la data
            };
        });

        return [...pagados, ...cancelados].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [orders, auditorias]);
    
    // 3. Estado de Filtros Dinámicos
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
        statusValues: []
    }]);

    const availableYears = useMemo(() => {
        const years = historyOrders.map(o => new Date(o.created_at).getFullYear());
        const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
        return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];
    }, [historyOrders]);

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
            statusValues: []
        }]);
    };

    const updateFilter = (id: string, field: keyof FilterBlock, value: any) => {
        setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const removeFilter = (id: string) => {
        setFilters(filters.filter(f => f.id !== id));
    };

    // 4. Lógica de Filtrado 
    const filteredOrders = useMemo(() => {
        return historyOrders.filter(order => {
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
                        const isSelected = f.statusValues.includes(currentStatus);

                        if (f.statusAction === 'include' && !isSelected) {
                            return false;
                        } else if (f.statusAction === 'exclude' && isSelected) {
                            return false;
                        }
                    }
                }
            }
            return true;
        });
    }, [historyOrders, filters]);

    return (
        <div className="container">
            <Header />

            {/* Panel de Filtros Profesional */}
            <div className="glass-panel" style={{ padding: "0.75rem", marginBottom: "1.5rem", borderRadius: "12px", position: "relative", zIndex: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    
                    <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.5rem 0", fontSize: "1.1rem" }}>
                        <Filter size={20} /> Filtros de Pedidos
                    </h3>

                    {filters.map((f) => (
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
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%"  }}>
                                            <input type="date" value={f.startDate} onChange={(e) => updateFilter(f.id, 'startDate', e.target.value)} className="btn btn-secondary" style={{ color: "white", padding: "0.4rem"}} />
                                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>a</span>
                                            <input type="date" value={f.endDate} onChange={(e) => updateFilter(f.id, 'endDate', e.target.value)} className="btn btn-secondary" style={{ color: "white", padding: "0.4rem" }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SELECTORES DE ESTADO (MULTI-SELECT) */}
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
                                        { label: 'Pagado', value: 'paid' },
                                        { label: 'Cancelado/Eliminado', value: 'canceled' }
                                    ]}
                                />
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

                    {filters.length < 2 && !filters.some(f => f.category === "") && (
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

            {/* Titulillo de resultados */}
            <div style={{ marginBottom: "1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                {filteredOrders.length} pedidos encontrados
            </div>

            {/* Grid de Tarjetas de Pedidos */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                        <div key={order.id} className="glass-panel" style={{ padding: "1.5rem", borderLeft: `4px solid ${order.is_paid ? 'var(--success)' : order.status === 'canceled' ? 'var(--danger)' : 'var(--primary)'}` }}>
                            
                            {/* Cabecera de la Tarjeta */}
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                                <h3 style={{ margin: 0 }}>Mesa {order.table_number}</h3>
                                <span style={{ 
                                    padding: "0.2rem 0.6rem", 
                                    borderRadius: "20px", 
                                    fontSize: "0.7rem", 
                                    background: order.is_paid ? 'rgba(34,197,94,0.2)' : order.status === 'canceled' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
                                    color: order.is_paid ? '#4ade80' : order.status === 'canceled' ? '#ef4444' : '#60a5fa'
                                }}>
                                    {order.is_paid ? 'Pagado' : order.status === 'canceled' ? 'Cancelado' : 'Pendiente'}
                                </span>
                            </div>

                            {/* Cuerpo dinámico según la imagen que me enviaste */}
                            {/* Cuerpo dinámico */}
                            <div style={{ marginBottom: "1rem" }}>
                                {order.status === 'canceled' ? (
                                    // 🔴 Diseño para Cancelados: Separando el texto y formateando la cantidad
                                    order.pedido_original ? (
                                        order.pedido_original.split(',').map((itemStr: string, idx: number) => {
                                            // Extraemos el nombre y la cantidad usando Regex
                                            const match = itemStr.match(/(.+?)\s*\(x(\d+)\)/);
                                            // Si coincide, armamos "2x Coca-Cola", si no, dejamos el texto normal
                                            const displayText = match ? `${match[2]}x ${match[1].trim()}` : itemStr.trim();

                                            return (
                                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", color: "#ef4444" }}>
                                                    <Package size={14} />
                                                    <span>{displayText}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ef4444" }}>
                                            <Package size={14} />
                                            <span>Sin registro</span>
                                        </div>
                                    )
                                ) : (
                                    // 🟢 Diseño para Pagados / Normales
                                    order.items?.map((item: any, idx: number) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", color: "var(--text-muted)" }}>
                                            <Package size={14} />
                                            <span>{item.quantity}x {item.product?.name || item.nombre_producto || item.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", opacity: 0.6, borderTop: "1px solid var(--border)", paddingTop: "0.8rem" }}>
                                <Clock size={14} />
                                {new Date(order.created_at).toLocaleString()}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass-panel" style={{ gridColumn: "1 / -1", padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No se encontraron pedidos que coincidan con los filtros.
                    </div>
                )}
            </div>
        </div>
    );
}