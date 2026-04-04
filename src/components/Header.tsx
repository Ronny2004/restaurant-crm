"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { 
    ChevronLeft, 
    Home, 
    LayoutDashboard, 
    ClipboardList, 
    UserCircle, 
    LogOut, 
    Settings, 
    User,
    Utensils, 
    Receipt,
    ChevronDown
} from "lucide-react";
import Link from "next/link";

export function Header() {
    const { profile, signOut } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    
    // Estados para los menús desplegables
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);
    
    if (!profile) return null;

    const isAdmin = profile.role === "admin";

    // 1. Lógica dinámica para Títulos y Botón de Volver
    let title = "Sistema LDM";
    let showBackButton = false;

    if (pathname.includes('/admin')) {
        title = "Administrador";
        if (pathname.includes('/ventastotales')) title = "Historial de Ventas";
        if (pathname.includes('/pedidostotales')) title = "Historial de Pedidos";
        // if (pathname.includes('/productos')) title = "Gestión de Productos";
        
        showBackButton = isAdmin; 
    } 
    else if (pathname.includes('/mesero')) {
        title = "Mesero - Nuevo Pedido";
        showBackButton = isAdmin; 
    } 
    else if (pathname.includes('/cocina')) {
        title = "Cocina - Comandas Activas";
        showBackButton = isAdmin; 
    } 
    else if (pathname.includes('/cajero')) {
        title = "Caja - Cobros y Facturación";
        showBackButton = isAdmin; 
    } 
    else {
        showBackButton = isAdmin && pathname !== "/";
    }

    // 2. Rutas de navegación actualizadas con Submenús
    const navItems = [
        { label: 'Inicio', icon: Home, href: '/' },
        { 
            label: 'Admin', 
            icon: LayoutDashboard, 
            href: '/admin',
            subItems: [
                { label: 'Historial de Ventas', href: '/admin/ventastotales' },
                { label: 'Historial de Pedidos', href: '/admin/pedidostotales' }
            ]
        },
        { label: 'Mesero', icon: ClipboardList, href: '/mesero' },
        { label: 'Cocinero', icon: Utensils, href: '/cocina' },
        { label: 'Cajero', icon: Receipt, href: '/cajero' },
    ];

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <header style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "1rem 1.5rem", 
            background: "rgba(15, 23, 42, 0.4)", 
            borderBottom: "1px solid var(--border)",
            marginBottom: "2rem",
            backdropFilter: "blur(12px)",
            position: "relative", 
            zIndex: 50 
        }}>
            
            {/* LADO IZQUIERDO: Título y Volver */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                {showBackButton && (
                    <button 
                        onClick={() => router.back()}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                    >
                        <ChevronLeft size={20} /> Volver
                    </button>
                )}
                <h1>{title}</h1>
            </div>

            {/* LADO DERECHO: Navegación + Perfil */}
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                
                {/* Menú de Admin */}
                {isAdmin && (
                    <nav style={{ display: "flex", gap: "1.5rem" }}>
                        {navItems.map((item, idx) => {
                            const Icon = item.icon;
                            const hasSubItems = !!item.subItems;
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
                            
                            return (
                                <div 
                                    key={idx} 
                                    style={{ position: "relative" }}
                                    onMouseEnter={() => hasSubItems && setOpenNavDropdown(item.label)}
                                    onMouseLeave={() => hasSubItems && setOpenNavDropdown(null)}
                                >
                                    <Link 
                                        href={item.href}
                                        style={{ 
                                            display: "flex", 
                                            flexDirection: "column", 
                                            alignItems: "center", 
                                            gap: "0.4rem",
                                            color: isActive ? "white" : "var(--text-muted)",
                                            textDecoration: "none",
                                            transition: "all 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = "white";
                                            e.currentTarget.style.transform = "translateY(-2px)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = isActive ? "white" : "var(--text-muted)";
                                            e.currentTarget.style.transform = "translateY(0)";
                                        }}
                                    >
                                        <Icon size={22} />
                                        <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "0.8rem", fontWeight: isActive ? "600" : "400" }}>
                                            {item.label}
                                            {hasSubItems && <ChevronDown size={12} />}
                                        </span>
                                    </Link>

                                    {/* Submenú Dropdown (Estilo Nav) */}
                                    {hasSubItems && openNavDropdown === item.label && (
                                        <div style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            paddingTop: "0.8rem", // Puente invisible para no perder el hover
                                            zIndex: 1
                                        }}>
                                            <div style={{
                                                background: "#0f172a",
                                                border: "1px solid var(--border)",
                                                borderRadius: "8px",
                                                padding: "0.5rem",
                                                minWidth: "180px",
                                                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.8)",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "0.2rem"
                                            }}>
                                                {item.subItems?.map((sub, sIdx) => (
                                                    <Link 
                                                        key={sIdx} 
                                                        href={sub.href}
                                                        style={{ 
                                                            padding: "0.6rem", 
                                                            color: "white", 
                                                            textDecoration: "none", 
                                                            fontSize: "0.9rem",
                                                            borderRadius: "4px",
                                                            transition: "background 0.2s"
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                                    >
                                                        {sub.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                )}

                {isAdmin && <div style={{ height: "40px", width: "1px", background: "var(--border)" }} />}

                {/* CONTENEDOR DEL PERFIL Y SUBMENÚ */}
                <div style={{ position: "relative" }}>
                    <button 
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        title={`Rol actual: ${profile.role}`}
                        style={{ 
                            background: "transparent", 
                            border: "none", 
                            color: isProfileMenuOpen ? "white" : "var(--text-muted)", 
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "0.4rem",
                            transition: "color 0.2s ease",
                            position: "relative",
                            zIndex: 2 
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "white"}
                        onMouseLeave={(e) => e.currentTarget.style.color = isProfileMenuOpen ? "white" : "var(--text-muted)"}
                    >
                        <UserCircle size={24} />
                        <span style={{ fontSize: "0.8rem" }}>Perfil</span>
                    </button>

                    {/* Menú Desplegable de Perfil */}
                    {isProfileMenuOpen && (
                        <div style={{
                            position: "absolute",
                            top: "120%",
                            right: 0,
                            zIndex: 1, 
                            background: "#0f172a",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            padding: "0.5rem",
                            minWidth: "160px",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.8)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.2rem"
                        }}>
                            <button 
                                className="dropdown-item"
                                style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem", width: "100%", background: "transparent", border: "none", color: "white", cursor: "pointer", textAlign: "left", borderRadius: "4px", transition: "background 0.2s" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                                <User size={16} /> Datos Personales
                            </button>
                            
                            <button 
                                className="dropdown-item"
                                style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem", width: "100%", background: "transparent", border: "none", color: "white", cursor: "pointer", textAlign: "left", borderRadius: "4px", transition: "background 0.2s" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                                <Settings size={16} /> Configuración                            </button>
                            
                            <div style={{ height: "1px", background: "var(--border)", margin: "0.3rem 0" }} />
                            
                            <button 
                                onClick={handleLogout}
                                className="dropdown-item"
                                style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem", width: "100%", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", textAlign: "left", borderRadius: "4px", transition: "background 0.2s" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                                <LogOut size={16} /> Cerrar Sesión
                            </button>
                        </div>
                    )}

                    {/* Overlay invisible */}
                    {isProfileMenuOpen && (
                        <div 
                            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} 
                            onClick={() => setIsProfileMenuOpen(false)} 
                        />
                    )}
                </div>

            </div>
        </header>
    );
}