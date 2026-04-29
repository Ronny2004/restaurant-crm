"use client";

import { useState } from "react";
import { UserCircle, X, Clock, AlertTriangle } from "lucide-react";
// MAGIA AQUÍ: Importamos el modal completo y la función de estilos desde tu otro archivo
import { EmployeeDetailModal, getRoleStyles } from "./auditoriaEmpleados";

const mockEmployees = [
    { id: "patto_waiter", full_name: "PATTO EL MESERO", username: "pattowaiter", role: "waiter", birth_date: "1998-05-14" },
    { id: "patto_chef", full_name: "PATTO EL COCINERO", username: "pattochef", role: "chef", birth_date: "1992-11-03" },
    { id: "patto_cashier", full_name: "PATTO EL CAJERO", username: "pattocashier", role: "cashier", birth_date: "2001-08-25" },
];

const mockKitchenOrders = [
    { id: 1, summary: "2x Hamburguesa LDM, 1x Cola", full_order: "2x Hamburguesa LDM (Sin cebolla), 1x Coca Cola Zero, 1x Papas Fritas Grandes", chef: mockEmployees[1], prep_time: "14 min" },
    { id: 2, summary: "1x Pizza Familiar...", full_order: "1x Pizza Familiar Mitad Pepperoni Mitad Hawaiana", chef: mockEmployees[1], prep_time: "22 min" },
    { id: 3, summary: "3x Ensalada César", full_order: "3x Ensalada César con Pollo Extra", chef: mockEmployees[1], prep_time: "8 min" },
];

const mockStockAlerts = [
    { id: 1, item: "Tomates Riñón", status: "Crítico", qty: "2 kg", requested_by: "Sistema" },
    { id: 2, item: "Queso Mozzarella", status: "Bajo", qty: "5 kg", requested_by: "PATTO EL COCINERO" },
];

export function AdminMetricsModals({ activeModal, onClose }: { activeModal: string, onClose: () => void }) {
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
            <div className="glass-panel" style={{ padding: "2.5rem", maxWidth: "900px", width: "90%", maxHeight: "85vh", overflowY: "auto", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.5rem" }}>
                    <X size={28} />
                </button>

                {activeModal === 'employees' && (
                    <>
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><UserCircle color="#8b5cf6" /> Personal Activo Ahora</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {mockEmployees.map(emp => {
                                const style = getRoleStyles(emp.role);
                                return (
                                    <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="glass-panel" style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderLeft: `4px solid ${style.color}` }}>
                                        <div>
                                            <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem" }}>{emp.full_name}</h4>
                                            <span style={{ fontSize: "0.85rem", color: style.color }}>{style.label}</span>
                                        </div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Ver detalles ➔</div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {activeModal === 'kitchen' && (
                    <>
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Clock color="#f97316" /> Tiempos de Preparación</h2>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                                        <th style={{ padding: "1rem 0.5rem" }}>#</th>
                                        <th style={{ padding: "1rem 0.5rem" }}>Pedido</th>
                                        <th style={{ padding: "1rem 0.5rem" }}>Cocinero</th>
                                        <th style={{ padding: "1rem 0.5rem" }}>Preparación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockKitchenOrders.map(order => (
                                        <tr key={order.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                            <td style={{ padding: "1rem 0.5rem", color: "var(--text-muted)" }}>{order.id}</td>
                                            <td style={{ padding: "1rem 0.5rem" }}>
                                                <div onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} style={{ cursor: "pointer", fontWeight: "bold" }}>
                                                    {order.summary} <span style={{ fontSize: "0.8rem", color: "var(--primary)" }}>{expandedOrder === order.id ? "(Ocultar)" : "(Ver más)"}</span>
                                                </div>
                                                {expandedOrder === order.id && <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: "4px" }}>{order.full_order}</div>}
                                            </td>
                                            <td style={{ padding: "1rem 0.5rem" }}>
                                                <span onClick={() => setSelectedEmployee(order.chef)} style={{ color: "#3b82f6", cursor: "pointer", textDecoration: "underline" }}>{order.chef.full_name}</span>
                                            </td>
                                            <td style={{ padding: "1rem 0.5rem", fontWeight: "bold", color: parseInt(order.prep_time) > 15 ? "#ef4444" : "#10b981" }}>{order.prep_time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeModal === 'stock' && (
                    <>
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><AlertTriangle color="#ef4444" /> Alertas de Inventario</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {mockStockAlerts.map(alert => (
                                <div key={alert.id} className="glass-panel" style={{ padding: "1.5rem", borderLeft: `4px solid ${alert.status === 'Crítico' ? '#ef4444' : '#f59e0b'}` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                        <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{alert.item}</h3>
                                        <span style={{ background: alert.status === 'Crítico' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: alert.status === 'Crítico' ? '#ef4444' : '#f59e0b', padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>{alert.status}</span>
                                    </div>
                                    <p style={{ margin: "0 0 0.2rem 0", color: "var(--text-muted)" }}>Cantidad actual estimada: <strong>{alert.qty}</strong></p>
                                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Reportado por: {alert.requested_by}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* AHORA SÍ: Renderizamos el modal hermoso sobreponiéndose al actual */}
            {selectedEmployee && (
                <EmployeeDetailModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
            )}
        </div>
    );
}