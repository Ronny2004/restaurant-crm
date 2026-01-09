"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
    message: string;
    type: ToastType;
    isVisible: boolean;
    onClose: () => void;
}

export function Toast({ message, type, isVisible, onClose }: ToastProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                handleClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose();
            setIsExiting(false);
        }, 300); // Match animation duration
    };

    if (!isVisible && !isExiting) return null;

    const getIcon = () => {
        switch (type) {
            case "success": return <CheckCircle size={20} className="text-emerald-400" />;
            case "error": return <AlertCircle size={20} className="text-red-400" />;
            case "warning": return <AlertTriangle size={20} className="text-amber-400" />;
            default: return <Info size={20} className="text-blue-400" />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case "success": return { borderLeft: "4px solid #34d399" };
            case "error": return { borderLeft: "4px solid #f87171" };
            case "warning": return { borderLeft: "4px solid #fbbf24" };
            default: return { borderLeft: "4px solid #60a5fa" };
        }
    };

    return (
        <div
            onClick={handleClose}
            className={`glass-panel toast-anim ${isExiting ? 'toast-exit' : 'toast-enter'}`}
            style={{
                position: "fixed",
                bottom: "2rem",
                right: "2rem",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem 1.5rem",
                minWidth: "300px",
                cursor: "pointer",
                ...getStyles()
            }}
        >
            {getIcon()}
            <p style={{ margin: 0, fontWeight: 500, flex: 1 }}>{message}</p>
        </div>
    );
}
