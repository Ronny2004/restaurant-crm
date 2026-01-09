"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Toast, ToastType } from "@/components/ui/Toast";

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toastState, setToastState] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: "",
        type: "info",
        isVisible: false,
    });

    const toast = (message: string, type: ToastType = "info") => {
        setToastState({ message, type, isVisible: true });
    };

    const closeToast = () => {
        setToastState((prev) => ({ ...prev, isVisible: false }));
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <Toast
                message={toastState.message}
                type={toastState.type}
                isVisible={toastState.isVisible}
                onClose={closeToast}
            />
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context.toast;
};
