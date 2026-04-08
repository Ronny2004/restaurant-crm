"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function validateToken() {
      if (!token) return setLoading(false);

      const { data, error } = await supabase
        .from("password_resets")
        .select("email, expires_at, used")
        .eq("token", token)
        .single();

      if (!error && data && !data.used && new Date(data.expires_at) > new Date()) {
        setIsValid(true);
        setEmail(data.email);
      }
      setLoading(false);
    }
    validateToken();
  }, [token]);

  const handleUpdate = async () => {
    // 1. Actualizar en Auth de Supabase (requiere que el usuario esté identificado o usar Service Role)
    // Nota: Por seguridad, aquí usamos updateUser que funciona si el token es válido
    const { error: authError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (authError) return alert("Error: " + authError.message);

    // 2. Quemar el token
    await supabase.from("password_resets").update({ used: true }).eq("token", token);

    alert("Contraseña actualizada con éxito");
    router.push("/login");
  };

  if (loading) return <p>Validando enlace...</p>;
  if (!isValid) return <p>El enlace es inválido o ha expirado.</p>;

  return (
    <div className="flex flex-col gap-4 p-8">
      <h1>Nueva Contraseña para {email}</h1>
      <input 
        type="password" 
        placeholder="Escribe tu nueva clave"
        className="border p-2 text-black"
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <button onClick={handleUpdate} className="bg-blue-500 p-2 rounded">
        Guardar Cambios
      </button>
    </div>
  );
}