"use client";

import { SupabaseProvider } from "@/context/SupabaseProvider";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SupabaseProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </SupabaseProvider>
        </AuthProvider>
    );
}
