"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const [isRendered, setIsRendered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            setTimeout(() => setIsRendered(false), 300);
        }
    }, [isOpen]);

    if (!isRendered) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.3s ease",
            padding: "1rem"
        }} onClick={onClose}>
            <div
                className="glass-panel"
                style={{
                    width: "100%",
                    maxWidth: "400px",
                    padding: "1.5rem",
                    transform: isVisible ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)",
                    transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 600 }}>{title}</h3>
                    <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
