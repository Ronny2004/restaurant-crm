"use client";

import { useState } from "react";
import { UserCircle, Target, Activity, Clock, CheckCircle, Loader2, X, Gift } from "lucide-react";

// 1. EXPORTAMOS LOS DATOS Y FUNCIONES PARA COMPARTIRLOS
export const mockEmployeesStats: Record<string, { totalOrders: number, performance: string, activeHours: string }> = {
    'patto_waiter': { totalOrders: 28, performance: "Alta 🔥", activeHours: "6h" },
    'patto_chef': { totalOrders: 45, performance: "Elite ⚡", activeHours: "8h" },
    'patto_cashier': { totalOrders: 15, performance: "Normal", activeHours: "4h" },
};

export const getRoleStyles = (role: string) => {
    switch (role) {
        case 'waiter': return { label: 'Mesero', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' };
        case 'chef': return { label: 'Cocinero', color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)' };
        case 'cashier': return { label: 'Cajero', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' };
        default: return { label: role, color: 'white', bg: 'rgba(255,255,255,0.1)' };
    }
};

export const formatearFecha = (fechaString: string) => {
    if (!fechaString) return 'No registrado';
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(fechaString + 'T00:00:00').toLocaleDateString('es-ES', opciones);
};

// 2. EXPORTAMOS EL MODAL HERMOSO (Nota el zIndex en 200 para que quede por encima de todo)
export const EmployeeDetailModal = ({ employee, onClose }: { employee: any, onClose: () => void }) => {
    const roleStyle = getRoleStyles(employee.role);
    const stats = mockEmployeesStats[employee.id] || { totalOrders: 0, performance: "-", activeHours: "0h" };
    
    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
            <div className="glass-panel" style={{ padding: "3rem", maxWidth: "800px", width: "90%", maxHeight: "90vh", overflowY: "auto", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>
                    <X size={24} />
                </button>
                
                <div style={{ display: "flex", alignItems: "center", gap: "2rem", marginBottom: "2.5rem" }}>
                    <div style={{ width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", border: `3px solid ${roleStyle.color}`, background: "#1e293b", flexShrink: 0 }}>
                        {employee.avatar_url ? (
                            <img src={employee.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><UserCircle size={50} color="var(--text-muted)" /></div>
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: "2rem", margin: "0 0 0.5rem 0" }}>{employee.full_name}</h1>
                        <p style={{ color: "var(--text-muted)", margin: "0 0 1rem 0", fontSize: "1rem" }}>@{employee.username} • Miembro del equipo</p>
                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                            <span style={{ background: roleStyle.bg, color: roleStyle.color, padding: "0.3rem 0.8rem", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>{roleStyle.label}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <Gift size={16} color="#f472b6" /> Cumpleaños: <strong style={{ color: "white", fontWeight: "normal" }}>{formatearFecha(employee.birth_date)}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div><p style={{ color: "var(--text-muted)", margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Pedidos Gestionados</p><span style={{ fontSize: "2.5rem", fontWeight: "bold", lineHeight: "1" }}>{stats.totalOrders}</span></div>
                            <div style={{ padding: "0.75rem", borderRadius: "12px", background: "rgba(16, 185, 129, 0.1)" }}><CheckCircle color="#10b981" size={28} /></div>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1, minWidth: 0, paddingRight: "1rem" }}><p style={{ color: "var(--text-muted)", margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Productividad</p><span style={{ fontSize: "1.6rem", fontWeight: "bold", lineHeight: "1.2", color: "var(--primary)", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stats.performance === '-' ? <Loader2 className="animate-spin" size={28} color="white" /> : stats.performance}</span></div>
                            <div style={{ padding: "0.75rem", borderRadius: "12px", background: "rgba(59, 130, 246, 0.1)", flexShrink: 0 }}><Activity color="#3b82f6" size={28} /></div>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div><p style={{ color: "var(--text-muted)", margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Tiempo en Turno</p><span style={{ fontSize: "2.5rem", fontWeight: "bold", lineHeight: "1" }}>{stats.activeHours}</span></div>
                            <div style={{ padding: "0.75rem", borderRadius: "12px", background: "rgba(245, 158, 11, 0.1)" }}><Clock color="#f59e0b" size={28} /></div>
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}><Target size={24} color="var(--primary)" /> Rendimiento Histórico</h2>
                <div className="glass-panel" style={{ padding: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><Activity size={48} style={{ marginRight: "1rem" }}/> [Gráfica de rendimiento simulada]</div>
            </div>
        </div>
    );
};

// 3. TU COMPONENTE ORIGINAL QUE USA EL MODAL
export function AuditoriaEmpleados() {
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

    const employees = [
        { id: "patto_waiter", full_name: "PATTO EL MESERO", username: "pattowaiter", role: "waiter", birth_date: "1998-05-14" },
        { id: "patto_chef", full_name: "PATTO EL COCINERO", username: "pattochef", role: "chef", birth_date: "1992-11-03" },
        { id: "patto_cashier", full_name: "PATTO EL CAJERO", username: "pattocashier", role: "cashier", birth_date: "2001-08-25" },
    ];

    const EmployeeCard = ({ employee }: { employee: any }) => {
        const roleStyle = getRoleStyles(employee.role);
        return (
            <div onClick={() => setSelectedEmployee(employee)} className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.5rem", cursor: "pointer", borderLeft: `4px solid ${roleStyle.color}`, transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", overflow: "hidden", border: `2px solid ${roleStyle.color}`, background: "#1e293b", flexShrink: 0 }}>
                    {employee.avatar_url ? <img src={employee.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><UserCircle size={30} color="var(--text-muted)" /></div>}
                </div>
                <div><h3 style={{ fontSize: "1.2rem", margin: "0 0 0.3rem 0" }}>{employee.full_name}</h3><p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>@{employee.username}</p></div>
            </div>
        );
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <h2 style={{ fontSize: "1.8rem", margin: 0 }}>Auditoría del Equipo (Cajeros, Cocineros y Meseros)</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                {employees.map((employee) => <EmployeeCard key={employee.id} employee={employee} />)}
            </div>

            {selectedEmployee && <EmployeeDetailModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}
        </div>
    );
}