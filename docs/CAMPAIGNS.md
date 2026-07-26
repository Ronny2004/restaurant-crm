# Campañas

## Flujo

El administrador accede a `/admin/campanas`, define título, descripción y
premio, y recibe:

- un enlace público único `/campanas/{slug}`;
- un código QR generado localmente, sin servicios externos;
- una vista de respuestas y conteo de participantes.

Las campañas pueden editarse y cambiar entre `active` y `closed`. El enlace
permanece estable aunque cambie el encabezado. Una campaña cerrada deja de
aceptar y mostrar su formulario, pero conserva las respuestas.

## Plantilla pública

Todos los formularios solicitan:

- nombres;
- correo electrónico;
- teléfono;
- plato favorito, limitado a productos cuya categoría sea `Platos`;
- sector: Calderón, Morán, San Juan, Carapungo u Otros;
- especificación obligatoria cuando se elige Otros;
- sugerencias;
- consentimiento para almacenar los datos con fines de análisis y campaña.

Cada correo puede responder una sola vez por campaña.

## Seguridad y privacidad

Las tablas `campaigns` y `campaign_responses` no tienen acceso anónimo directo.
Las respuestas pasan por un Route Handler que valida longitudes, formato,
campaña activa, producto permitido, consentimiento y límite de solicitudes.

Los administradores activos pueden consultar campañas y respuestas. No existe
eliminación desde la aplicación; cerrar una campaña preserva los datos.

La IP y el agente de usuario se guardan como contexto de seguridad. Estos datos
deben conservarse solamente durante el periodo definido por la política de
privacidad del restaurante.

## Producción

Aplicar la migración:

`supabase/migrations/20260726003000_campaigns_module.sql`

El QR utiliza el origen actual del navegador, por lo que en local genera
`http://localhost:3000/...` y en producción utilizará automáticamente el dominio
de Vercel.

## Pruebas

- `supabase/tests/campaign_security.sql`
- `scripts/test-campaign-integration.ps1`
