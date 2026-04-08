"use server";

import emailjs from '@emailjs/nodejs';
import { supabase } from "@/lib/supabaseClient";

export async function handlePasswordResetRequest(identifier: string) {
    try {
        let targetEmail = identifier;

        // 1. Buscamos el email usando tu RPC de AuthContext
        if (!identifier.includes("@")) {
            // Usamos el nombre exacto de tu función en Supabase
            const { data: emailAsociado, error: rpcError } = await supabase
                .rpc('get_email_by_username', { p_username: identifier });

            if (rpcError || !emailAsociado) {
                // Si el RPC falla o no devuelve nada, el usuario no existe
                return { error: "No pudimos encontrar un usuario con ese nombre." };
            }
            targetEmail = emailAsociado;
        }

        // 2. Insertar en la tabla de control (Verifica que creaste la tabla password_resets)
        const { data: resetData, error: insertError } = await supabase
            .from("password_resets")
            .insert([{ email: targetEmail }])
            .select("token")
            .single();

        if (insertError) {
            console.error("Error BD:", insertError.message);
            return { error: "Error de base de datos al generar el token." };
        }

        // 3. Preparar Link
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const resetLink = `${baseUrl}/reset-password?token=${resetData.token}`;

        // 4. Enviar con EmailJS
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
        // Esto te dirá el error real de EmailJS en el cuadro rojo de tu pantalla
        const errorMsg = error?.text || error?.message || "Error desconocido";
        console.error("DETALLE:", error);
        return { error: `Fallo de EmailJS: ${errorMsg}` };
    }
}