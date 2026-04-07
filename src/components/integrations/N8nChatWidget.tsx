"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import "@/components/integrations/n8n-chat.css";

// N8nChatWidget is loaded via next/dynamic with { ssr: false } in each
// consuming page (/admin, /cajero). This file must stay a plain Client
// Component — no direct dynamic() call here — so the parent can decide
// whether and when to mount it.
//
// Route restriction: this component renders null on /login automatically
// so it is safe to import anywhere, but the dynamic import in admin/cajero
// pages means it is never downloaded by /cocina or /mesero at all.

const WEBHOOK_URL =
    "https://melodyai.app.n8n.cloud/webhook/c0edce0b-4e82-4438-9ef8-c7c3c94b6db9/chat";

export const N8nChatWidget = () => {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === "undefined" || pathname === "/login") return;

        import("@n8n/chat").then(({ createChat }) => {
            createChat({
                webhookUrl: WEBHOOK_URL,
                target: "#n8n-chat-widget",
                defaultLanguage: "es",
                initialMessages: [
                    "Hola! 👋",
                    "Soy tu asistente virtual para el CRM del restaurante.",
                    "¿En qué puedo ayudarte hoy?",
                ],
                i18n: {
                    es: {
                        title: "Chatbot CRM",
                        subtitle: "Inicia un chat. Estoy activo 24/7 para ti!.",
                        footer: "",
                        getStarted: "New Conversation",
                        inputPlaceholder: "Empieza a chatear...",
                        closeButtonTooltip: "Cerrar chat",
                    },
                    en: {
                        title: "Chatbot CRM",
                        subtitle: "Start a chat. We're here to help you 24/7.",
                        footer: "",
                        getStarted: "New Conversation",
                        inputPlaceholder: "Type your question..",
                        closeButtonTooltip: "Close chat",
                    },
                },
                enableStreaming: false,
            });
        });
    }, [pathname]);

    if (pathname === "/login") return null;

    return (
        <div 
            id="n8n-chat-widget" 
            style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999 }} 
        />
    );
};
