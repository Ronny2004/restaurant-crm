"use server"; // <-- ESTO ES VITAL

import emailjs from '@emailjs/nodejs';
import { supabase } from "@/lib/supabaseClient";

export async function handlePasswordResetRequest(identifier: string) {
    try {
        let targetEmail = identifier;

        // 1. Buscar email si recibimos username (usando tu RPC existente)
        if (!identifier.includes("@")) {
            const { data: emailAsociado, error: searchError } = await supabase
                .rpc('get_email_by_username', { p_username: identifier });
            
            if (searchError || !emailAsociado) return { error: "Usuario no encontrado" };
            targetEmail = emailAsociado;
        }

        // 2. Insertar en la tabla password_resets
        const { data: resetData, error: insertError } = await supabase
            .from("password_resets")
            .insert([{ email: targetEmail }])
            .select("token")
            .single();

        if (insertError) throw insertError;

        // 3. Preparar Link
        const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${resetData.token}`;

        // 4. Enviar con EmailJS (Server-side)
        await emailjs.send(
            process.env.EMAILJS_SERVICE_ID!,
            process.env.EMAILJS_TEMPLATE_ID!,
            {
                user_email: targetEmail,
                reset_link: resetLink,
            },
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY!,
                privateKey: process.env.EMAILJS_PRIVATE_KEY!, 
            }
        );

        return { success: true };

    } catch (error: any) {
        console.error("Error en Reset Action:", error);
        return { error: "No se pudo enviar el correo de recuperación." };
    }
}