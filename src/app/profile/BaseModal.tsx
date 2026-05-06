"use client";

import { X } from "lucide-react";

interface BaseModalProps {
    onClose: () => void;
    children: React.ReactNode;
}

export function BaseModal({ onClose, children }: BaseModalProps) {
    return (
        <div 
            style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }} 
            onClick={onClose}
        >
            <div 
                className="glass-panel" 
                style={{ padding: "2.5rem", maxWidth: "900px", width: "90%", maxHeight: "85vh", overflowY: "auto", position: "relative" }} 
                onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer clic adentro
            >
                <button 
                    onClick={onClose} 
                    style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.5rem" }}
                >
                    <X size={28} />
                </button>
                
                {/* EL CONTENIDO DINÁMICO APARECERÁ AQUÍ */}
                {children}
            </div>
        </div>
    );
}