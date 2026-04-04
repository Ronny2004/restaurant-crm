"use client";

import { useEffect } from 'react';
import { createChat } from '@n8n/chat';
import { usePathname } from 'next/navigation';
import '@n8n/chat/dist/style.css';

export const N8nChat = () => {
    const pathname = usePathname();

    useEffect(() => {
        // Solo ejecutamos createChat si estamos en el navegador
        if (typeof window !== 'undefined' && pathname !== '/login') {
            import('@n8n/chat').then(({ createChat }) => {
                createChat({
                    webhookUrl: 'https://melodyai.app.n8n.cloud/webhook/c0edce0b-4e82-4438-9ef8-c7c3c94b6db9/chat', // ¡No olvides poner tu URL!
                    webhookConfig: {
                    method: 'POST',
                    headers: {}
                    },
                    target: '#n8n-chat',
                    mode: 'window',
                    chatInputKey: 'chatInput',
                    chatSessionKey: 'sessionId',
                    loadPreviousSession: true,
                    metadata: {},
                    showWelcomeScreen: false,
                    defaultLanguage: 'es',
                    initialMessages: [
                    'Hola! 👋',
                    'Soy tu asistente virtual para el CRM del restaurante.', 
                    '¿En qué puedo ayudarte hoy?'
                    ],
                    i18n: {
                        es: {
                            title: 'Chatbot CRM',
                            subtitle: "Inicia un chat. Estoy activo 24/7 para ti!.",
                            footer: '',
                            getStarted: 'New Conversation',
                            inputPlaceholder: 'Empieza a chatear...',
                            closeButtonTooltip: 'Close chat',
                        },
                        en: {
                            title: 'Hi there! 👋',
                            subtitle: "Start a chat. We're here to help you 24/7.",
                            footer: '',
                            getStarted: 'New Conversation',
                            inputPlaceholder: 'Type your question..',
                            closeButtonTooltip: 'Close chat', // <-- ESTA ES LA PROPIEDAD QUE FALTA
                        },
                    },
                    enableStreaming: false,
                });
            });
        }
    }, [pathname]);

    if (pathname === '/login') return null;

  // Aquí devolvemos el div donde se montará el chat
  return <div id="n8n-chat"></div>;
};