import { createClient } from "@/lib/supabase/client";

// Alias temporal para los módulos operativos existentes. Las nuevas rutas
// server-side usan clientes separados para navegador, sesión y administración.
export const supabase = createClient();
