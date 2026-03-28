"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChefHat, UtensilsCrossed, Monitor, Calculator, LogOut, Loader2, UserCircle, Settings, User } from "lucide-react";

export default function Home() {
  const { profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
    } else if (!loading && profile) {
      // Auto-redirect non-admin users to their specific interface
      if (profile.role === "waiter") {
        router.push("/mesero");
      } else if (profile.role === "chef") {
        router.push("/cocina");
      } else if (profile.role === "cashier") {
        router.push("/cajero");
      }
      // Admin stays on this page to see all options
    }
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div className="container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={48} style={{ animation: "spin 1s linear infinite", color: "var(--primary)", marginBottom: "1rem" }} />
          <p style={{ color: "var(--text-muted)" }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== "admin") {
    return null; // Will redirect
  }

  const roles = [
    {
      title: "Administrador",
      href: "/admin",
      icon: <Monitor size={48} />,
      desc: "Gestión de inventario y estadísticas",
      color: "var(--primary)"
    },
    {
      title: "Mesero",
      href: "/mesero",
      icon: <UtensilsCrossed size={48} />,
      desc: "Toma de pedidos y atención",
      color: "#3b82f6" // Blue
    },
    {
      title: "Cocina",
      href: "/cocina",
      icon: <ChefHat size={48} />,
      desc: "Visualización de comandas",
      color: "#ef4444" // Red
    },
    {
      title: "Cajero",
      href: "/cajero",
      icon: <Calculator size={48} />,
      desc: "Cobros y cierre de caja",
      color: "#22c55e" // Green
    }
  ];

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <main className="container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "absolute", top: "2rem", right: "2.5rem" }}>
        <div style={{ position: "relative" }}>
            <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                title={profile ? `Rol actual: ${profile.role}` : "Perfil"}
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
                <UserCircle size={28} /> {/* Un poquito más grande para el splash screen */}
                <span style={{ fontSize: "0.85rem" }}>Profile</span>
            </button>

            {/* Menú Desplegable */}
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
                        <User size={16} /> Profile
                    </button>
                    
                    <button 
                        className="dropdown-item"
                        style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem", width: "100%", background: "transparent", border: "none", color: "white", cursor: "pointer", textAlign: "left", borderRadius: "4px", transition: "background 0.2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                        <Settings size={16} /> Settings
                    </button>
                    
                    <div style={{ height: "1px", background: "var(--border)", margin: "0.3rem 0" }} />
                    
                    <button 
                        onClick={signOut}
                        className="dropdown-item"
                        style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem", width: "100%", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", textAlign: "left", borderRadius: "4px", transition: "background 0.2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                        <LogOut size={16} /> Logout
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

      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", textAlign: "center" }}>
        Restaurante <span style={{ color: "var(--primary)" }}>CRM</span>
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1rem", textAlign: "center", maxWidth: "600px" }}>
        Bienvenido, <strong style={{ color: "var(--primary)" }}>{profile.username || profile.full_name || profile.email}</strong>
      </p>
      <p style={{ color: "var(--text-muted)", marginBottom: "3rem", textAlign: "center", maxWidth: "600px" }}>
        Selecciona el panel al que deseas acceder.
      </p>

      <div className="grid-menu" style={{ width: "100%", maxWidth: "1000px" }}>
        {roles.map((role) => (
          <Link href={role.href} key={role.title} style={{ textDecoration: "none" }}>
            <div className="glass-panel" style={{
              padding: "2rem",
              textAlign: "center",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              transition: "transform 0.2s, background 0.2s"
            }}>
              <div style={{
                color: role.color,
                background: `color-mix(in srgb, ${role.color}, transparent 80%)`,
                padding: "1rem",
                borderRadius: "50%"
              }}>
                {role.icon}
              </div>
              <h2 style={{ fontSize: "1.5rem" }}>{role.title}</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>{role.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
