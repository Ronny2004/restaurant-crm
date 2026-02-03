# Plan de Despliegue Final: DeliciasMoran.com

Tras revisar la seguridad de tu repositorio y la estructura del proyecto, este es el plan definitivo para el lanzamiento profesional.

## 1. Seguridad del Repositorio (Verificación)
Tu `.gitignore` actual es **correcto y seguro**. 
- Los archivos con el código fuente de la App Android se subirán a GitHub (permitiendo que otros colaboren o que tú tengas un respaldo).
- **Lo privado queda fuera**: Archivos como `SupabaseClient.kt` (con tus llaves), `local.properties` y posibles certificados (`.jks`) están protegidos y **nunca** llegarán a la nube pública.

---

## 2. Compra del Dominio: La opción más segura
Para `deliciasMoran.com`, te recomiendo **100% Cloudflare**.

*   **¿Por qué es el más seguro?**: Es el escudo de internet. Al usar Cloudflare, tu servidor real queda oculto tras su red, protegiéndote de ataques DDoS y hackeos.
*   **Precio**: Es el único que no te cobra comisión (pagas el precio de costo del dominio).
*   **Configuración**: Su panel de DNS es el más rápido del mundo.

---

## 3. Despliegue en Vercel (Paso a Paso)

Aunque creamos un `Dockerfile`, **Vercel es más inteligente**. Al detectar que es un proyecto Next.js, ignorará el Dockerfile y usará sus propios servidores optimizados.

1.  **Conexión**: Entra en [Vercel](https://vercel.com), dale a "Add New Project" y selecciona tu repositorio de GitHub.
2.  **Configuración de Build**: Vercel detectará automáticamente que es Next.js. No cambies nada en "Build and Output Settings".
3.  **Variables de Entorno (EL PASO MÁS IMPORTANTE)**:
    En la pestaña "Environment Variables", debes añadir las llaves que usas en tu `.env.local`:
    *   Key: `NEXT_PUBLIC_SUPABASE_URL` | Value: `(tu url de supabase)`
    *   Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Value: `(tu llave anonima)`
4.  **Despliegue**: Dale a **Deploy**. En menos de 2 minutos, tu web estará viva en una URL temporal de Vercel.

---

## 4. Conectar Cloudflare con Vercel

1.  En Vercel, ve a **Settings > Domains**.
2.  Escribe `deliciasMoran.com` y dale a Add.
3.  Vercel te dará un registro **CNAME** (ej: `cname.vercel-dns.com`).
4.  Entra en Cloudflare, ve a la sección **DNS** de tu dominio y crea un registro:
    *   **Type**: CNAME
    *   **Name**: @ (o el nombre de tu dominio)
    *   **Target**: Lo que te dio Vercel.
    *   **Proxy Status**: Orange cloud (Checked).

---

## 5. Resumen de Roles
- **Vercel**: Se encarga de que tu página web esté siempre en línea, sea rápida y se actualice sola cuando subas cambios a GitHub.
- **Cloudflare**: Protege tu dominio y dirige el tráfico hacia Vercel de forma segura.
- **GitHub**: Guarda tu código y actúa como el puente hacia Vercel.

> [!IMPORTANT]
> **Recordatorio**: Para la App Android, recuerda que siempre que descargues el código en una computadora nueva, deberás volver a crear el archivo `SupabaseClient.kt` con tus credenciales, ya que Git lo está ignorando por tu seguridad.
