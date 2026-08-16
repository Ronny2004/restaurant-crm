# Autenticación y administración de usuarios

## Arquitectura

Supabase Auth continúa siendo la autoridad de identidad y el emisor de las
sesiones. Next.js valida PIN, códigos temporales y permisos administrativos en
Route Handlers server-side, y finalmente crea una sesión Supabase almacenada en
cookies mediante `@supabase/ssr`.

Las claves `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_PIN_PEPPER` y SMTP son secretos de
servidor. Nunca deben exponerse con el prefijo `NEXT_PUBLIC_`.

## Métodos de acceso

- Empleados: PIN único de seis dígitos.
- Empleados: usuario/correo y contraseña.
- Empleados: código de emergencia de un solo uso generado por un administrador.
- Administradores: exclusivamente `/admin/login` con usuario/correo y contraseña.
- Recuperación: PIN temporal enviado por correo, válido durante cinco minutos,
  seguido obligatoriamente por el cambio de PIN.

El PIN y la contraseña de empleados expiran independientemente cada 30 días.
Los administradores están exentos de expiración.

El login administrativo admite cinco intentos dentro de una ventana de cinco
minutos. Al excederlos, bloquea esa combinación de IP e identificador durante
60 segundos; un acceso correcto limpia inmediatamente el contador.

## Administración de usuarios

La página `/admin/usuarios` permite:

- Crear usuarios generando automáticamente usuario, contraseña temporal y PIN
  temporal para roles operativos, y enviar esas credenciales al correo registrado.
- Actualizar nombre, usuario, teléfono y rol.
- Cambiar el correo en Supabase Auth y sincronizarlo con `profiles`.
- Activar y desactivar cuentas.
- Regenerar el acceso de una cuenta activa. Esto cierra sus sesiones, reemplaza la
  contraseña y el PIN, exige cambiarlos en el siguiente ingreso y envía las nuevas
  credenciales por correo. Si el correo falla, se entregan una sola vez al
  administrador para comunicarlas por un canal seguro.
- Generar códigos de emergencia de un solo uso.
- Eliminar usuarios, excepto la propia cuenta administrativa en uso.

Las contraseñas existentes nunca se muestran ni se recuperan. La regeneración
administrativa siempre crea credenciales temporales nuevas y queda registrada en
la auditoría.

La eliminación interna usada durante la creación no es una función del panel:
actúa exclusivamente como compensación si falla el aprovisionamiento de una
cuenta nueva antes de entregársela al usuario. Así no quedan identidades
incompletas entre Auth, `profiles` y `user_credentials`.

Los cambios de `profiles` se auditan atómicamente mediante trigger. Los Route
Handlers agregan además el contexto de la solicitud (`request_id`, IP y agente
de usuario); si ese enriquecimiento secundario falla, la operación confirmada
no se reporta erróneamente como fallida.

## Variables de entorno

Copiar las variables documentadas en `env.example.txt`.

Para Gmail:

1. Utilizar una cuenta dedicada a notificaciones.
2. Activar la verificación en dos pasos.
3. Generar una contraseña de aplicación.
4. Guardarla como `SMTP_APP_PASSWORD`.

Para desarrollo local, Mailpit queda expuesto en SMTP `127.0.0.1:54325` y su
interfaz web continúa en `http://127.0.0.1:54324`. Después de cambiar
`supabase/config.toml` es necesario reiniciar el stack local.

## Migraciones

- `20260725233000_authentication_user_module.sql`: cuentas, credenciales,
  challenges, códigos temporales, rate limiting y auditoría.
- `20260725234000_active_account_rls.sql`: bloquea inmediatamente el acceso
  operativo de cuentas desactivadas y normaliza unicidad de correo/usuario.
- `20260816213000_user_credential_delivery.sql`: habilita la revocación segura de
  sesiones durante la regeneración administrativa y amplía la auditoría.

Primero deben probarse localmente. Para producción se aplican mediante el flujo
normal de migraciones de Supabase, después de respaldar el esquema y los datos.

## Pruebas

- `supabase/tests/authentication_security.sql`
- `supabase/tests/operational_security.sql`
- `supabase/tests/user_credential_delivery.sql`

Ambas pruebas se ejecutan dentro de una transacción y terminan con `ROLLBACK`.
