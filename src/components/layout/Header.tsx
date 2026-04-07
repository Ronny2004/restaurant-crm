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
    ChevronDown,
    Menu, 
    X
} from "lucide-react";


export function Header() {
    const { profile, signOut } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    
    // Estados para los menús desplegables
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // ESTADO PARA HAMBURGUESA
    
    if (!profile) return null;

    const isAdmin = profile.role === "admin";

    // 1. Lógica dinámica para Títulos y Botón de Volver
    let title = "Sistema LDM";
    let showBackButton = false;

    if (pathname.includes('/admin')) {
        title = "Administrador";
        if (pathname.includes('/ventastotales')) title = "Historial de Ventas";
        if (pathname.includes('/pedidostotales')) title = "Historial de Pedidos";
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

    // Función mágica para forzar la recarga completa de la página
    const forceReloadNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault(); // Detenemos el comportamiento por defecto
        window.location.href = href; // Obligamos al navegador a hacer una petición nueva al servidor
    };

    return (
        <>

            <header className="header-container">
                
                {/* LADO IZQUIERDO: Título y Volver */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {showBackButton && (
                        <button 
                            onClick={() => router.back()}
                            className="btn btn-secondary"
                            style={{ padding: "0.5rem", display: "flex", alignItems: "center", gap: "0.2rem", borderRadius: "8px" }}
                        >
                            <ChevronLeft size={20} /> <span className="back-btn-text">Volver</span>
                        </button>
                    )}
                    <h1 className="header-title" style={{ margin: 0 }}>{title}</h1>
                </div>

                {/* LADO DERECHO: Navegación + Perfil + Hamburguesa */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    
                    {/* MENÚ DE ESCRITORIO */}
                    {isAdmin && (
                        <nav className="desktop-nav">
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
                                        {/* Usamos <a> en lugar de <Link> para forzar recarga */}
                                        <a 
                                            href={item.href}
                                            onClick={(e) => forceReloadNavigation(e, item.href)}
                                            style={{ 
                                                display: "flex", 
                                                flexDirection: "column", 
                                                alignItems: "center", 
                                                gap: "0.4rem",
                                                color: isActive ? "white" : "var(--text-muted)",
                                                textDecoration: "none",
                                                transition: "all 0.2s ease",
                                                cursor: "pointer"
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
                                        </a>

                                        {/* Submenú Dropdown Desktop */}
                                        {hasSubItems && openNavDropdown === item.label && (
                                            <div style={{
                                                position: "absolute",
                                                top: "100%",
                                                left: "50%",
                                                transform: "translateX(-50%)",
                                                paddingTop: "0.8rem",
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
                                                        <a 
                                                            key={sIdx} 
                                                            href={sub.href}
                                                            onClick={(e) => forceReloadNavigation(e, sub.href)}
                                                            style={{ 
                                                                padding: "0.6rem", 
                                                                color: "white", 
                                                                textDecoration: "none", 
                                                                fontSize: "0.9rem",
                                                                borderRadius: "4px",
                                                                transition: "background 0.2s",
                                                                cursor: "pointer"
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                                        >
                                                            {sub.label}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
                    )}

                    {isAdmin && <div className="nav-divider" style={{ height: "40px", width: "1px", background: "var(--border)" }} />}

                    {/* BOTÓN HAMBURGUESA (Solo visible en móviles) */}
                    {isAdmin && (
                        <button 
                            className="mobile-toggle"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    )}

                    {/* CONTENEDOR DEL PERFIL Y SUBMENÚ (Se mantiene en ambos) */}
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
                                zIndex: 60, 
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
                                    style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem", width: "100%", background: "transparent", border: "none", color: "white", cursor: "pointer", textAlign: "left", borderRadius: "4px", transition: "background 0.2s" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                    <User size={16} /> Datos Personales
                                </button>
                                
                                <button 
                                    style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem", width: "100%", background: "transparent", border: "none", color: "white", cursor: "pointer", textAlign: "left", borderRadius: "4px", transition: "background 0.2s" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                    <Settings size={16} /> Configuración            
                                </button>
                                
                                <div style={{ height: "1px", background: "var(--border)", margin: "0.3rem 0" }} />
                                
                                <button 
                                    onClick={handleLogout}
                                    style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem", width: "100%", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", textAlign: "left", borderRadius: "4px", transition: "background 0.2s" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                    <LogOut size={16} /> Cerrar Sesión
                                </button>
                            </div>
                        )}

                        {/* Overlay invisible Perfil */}
                        {isProfileMenuOpen && (
                            <div 
                                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }} 
                                onClick={() => setIsProfileMenuOpen(false)} 
                            />
                        )}
                    </div>
                </div>

                {/* MENÚ DESPLEGABLE MÓVIL */}
                <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                    {isAdmin && navItems.map((item, idx) => {
                        const Icon = item.icon;
                        const hasSubItems = !!item.subItems;
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
                        
                        return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <a 
                                    href={item.href}
                                    onClick={(e) => forceReloadNavigation(e, item.href)}
                                    style={{
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '1rem',
                                        color: isActive ? 'white' : 'var(--text-muted)',
                                        textDecoration: 'none', 
                                        padding: '0.8rem 1rem',
                                        background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                        borderLeft: isActive ? '4px solid #3b82f6' : '4px solid transparent',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <Icon size={20} />
                                    <span style={{ fontWeight: isActive ? '600' : '400', fontSize: '1rem' }}>{item.label}</span>
                                </a>
                                
                                {/* Subitems renderizados en móvil debajo del principal */}
                                {hasSubItems && (
                                    <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '3.5rem', gap: '0.5rem' }}>
                                        {item.subItems?.map((sub, sIdx) => {
                                            const isSubActive = pathname === sub.href;
                                            return (
                                                <a 
                                                    key={sIdx}
                                                    href={sub.href}
                                                    onClick={(e) => forceReloadNavigation(e, sub.href)}
                                                    style={{
                                                        color: isSubActive ? 'white' : 'var(--text-muted)',
                                                        textDecoration: 'none',
                                                        fontSize: '0.9rem',
                                                        padding: '0.4rem 0'
                                                    }}
                                                >
                                                    • {sub.label}
                                                </a>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </header>
        </>
    );
}