"use server";

import { createClient } from "@supabase/supabase-js";

// IMPORTANTE: Usa service_role_key, no la anon_key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function updatePasswordAdmin(token: string, newPassword: string) {
  try {
    // 1. Validar token y obtener el email
    const { data: resetReq, error: tokenError } = await supabaseAdmin
      .from("password_resets")
      .select("email, used, expires_at")
      .eq("token", token)
      .single();

    if (tokenError || !resetReq || resetReq.used || new Date(resetReq.expires_at) < new Date()) {
      return { error: "El token es inválido o ha expirado." };
    }

    // 2. Obtener el usuario por email de forma segura
    const { data: userList, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    // Usamos .trim() y .toLowerCase() para evitar errores de espacios o mayúsculas
    const targetUser = userList.users.find(
    (u) => u.email?.trim().toLowerCase() === resetReq.email.trim().toLowerCase()
    );

    if (userError || !targetUser) {
        console.error("Email buscado:", resetReq.email);
        console.error("Emails disponibles:", userList.users.map(u => u.email));
        return { error: "No se encontró una cuenta de autenticación para este correo." };
    }

    // 3. Actualizar contraseña por ID
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.id,
    { password: newPassword }
    );

    if (updateError) throw updateError;

    // 4. Marcar token como usado
    await supabaseAdmin
      .from("password_resets")
      .update({ used: true })
      .eq("token", token);

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}