# Contrato de Supabase

Supabase es la fuente de verdad del sistema. El esquema versionado está en
`supabase/migrations/` y debe aplicarse primero en local, después en producción
y antes de desplegar una versión de Next.js que dependa de una migración nueva.

## Variables

El navegador utiliza exclusivamente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

La clave `service_role` nunca debe usar el prefijo `NEXT_PUBLIC_`, enviarse al
navegador ni almacenarse en Git. Cuando se implemente la administración de
usuarios se utilizará únicamente desde una ruta de servidor de Next.js.

## Auth y perfiles

Supabase Auth administra identidades y sesiones. `profiles.id` corresponde a
`auth.users.id` y se elimina en cascada con la identidad.

El trigger `on_auth_user_created` crea el perfil automáticamente:

- rol predeterminado `waiter`;
- username normalizado desde metadatos o correo;
- `search_path` vacío y ejecución restringida.

El registro público está deshabilitado. Las identidades nuevas deben crearse
mediante Auth Admin después de validar en servidor que el solicitante sea
administrador.

Solo administradores pueden modificar perfiles. Cada creación, actualización
o eliminación se registra de forma inmutable en `user_management_audit`.

`get_email_by_username(p_username text)` existe únicamente para conservar el
inicio de sesión por username. Es la única RPC de negocio ejecutable por
`anon`.

## Catálogos

Los estados y métodos de pago se insertan mediante migraciones idempotentes:

- `pending`
- `preparing`
- `served`
- `ready`
- `paid`
- `editing`
- `efectivo`
- `transferencia`

Las funciones resuelven estados por su nombre; la web no depende de IDs
numéricos quemados.

## Escrituras de pedidos

El navegador tiene lectura sobre `orders` y `order_items`, pero no puede
insertar, actualizar ni eliminar filas directamente. Cada acción utiliza una
RPC `SECURITY DEFINER`, con `SET search_path = ''`, autorización explícita y
rollback automático.

### `create_order_transaction(p_table_number text, p_items jsonb)`

- Roles: `waiter`, `admin`.
- Obtiene precios y nombres desde `products`.
- Bloquea productos en orden estable.
- Valida cantidades, duplicados y stock.
- Calcula el total.
- Crea pedido, artículos y reporte en una transacción.

El cliente solo envía `product_id` y `quantity`.

### `update_order_transaction(p_order_id uuid, p_items jsonb, p_expected_updated_at timestamptz)`

- Roles: mesero propietario o administrador.
- Solo permite pedidos `pending` y no pagados.
- Detecta ediciones concurrentes mediante `updated_at`.
- Bloquea pedido y productos.
- Recalcula stock, precios y total.
- Actualiza reporte, resumen de auditoría e historial en la misma transacción.

### `cancel_order_transaction(p_order_id uuid)`

- El mesero solo puede cancelar pedidos propios en `pending`.
- El administrador puede cancelar cualquier pedido no pagado.
- Conserva el reporte como `canceled`.
- Guarda resumen e historial de auditoría.
- Elimina el pedido y restaura stock dentro de la misma transacción.

### `update_order_status_transaction(p_order_id uuid, p_status text)`

Transiciones ordinarias:

| Rol | Transición |
| --- | --- |
| Cocina | `pending → preparing → served` |
| Mesero | `served → ready` |
| Administración | Estados operativos no pagados |

El estado `paid` solo se alcanza mediante la RPC de cobro.

### `pay_order_transaction(p_order_id uuid, p_payment_type_id integer)`

- Roles: `cashier`, `admin`.
- Exige estado `ready`.
- Valida el método de pago.
- Cambia estado a `paid`, marca `is_paid` y actualiza el reporte.

### `delete_product_transaction(p_product_id uuid)`

- Rol: `admin`.
- Rechaza productos utilizados en cualquier `order_items`.

## Row Level Security

RLS está habilitado en todas las tablas expuestas.

| Recurso | Lectura | Escritura |
| --- | --- | --- |
| `profiles` | personal autenticado | administración |
| `products` | personal autenticado | administración |
| `orders`, `order_items` | personal autenticado | RPC autorizadas |
| `status_order`, `payment_type` | personal autenticado | migraciones/servicio |
| reportes y auditoría de pedidos | administración | RPC/triggers |
| `user_management_audit` | administración | trigger |
| `registro_sesiones` | propietario | propietario |
| `password_resets` | servicio | servicio |

Los roles `anon` y `authenticated` no tienen `TRUNCATE`, `TRIGGER`,
`REFERENCES` ni permisos amplios sobre los objetos actuales. Los privilegios
predeterminados del rol de migraciones `postgres` también están revocados. Cada
migración futura debe continuar declarando sus `REVOKE` y `GRANT`
explícitamente, especialmente si el objeto se crea desde Dashboard con otro
propietario.

## Inventario y auditoría

`tr_update_stock` mantiene stock al insertar, eliminar o cambiar artículos,
incluido un cambio de `product_id`. Las RPC bloquean previamente los productos
para evitar carreras y los checks impiden stock negativo.

`auditoria_pedidos` conserva una fila resumen por pedido.
`historial_auditoria_pedidos` es append-only y conserva cada edición o
cancelación. Los clientes no escriben ninguna de las dos tablas.

`reporte_ventas` conserva incluso los pedidos cancelados, pero solo las RPC
pueden modificarlo.

## Eliminación administrativa de usuarios

La migración `20260816200000_admin_user_deletion.sql` incorpora
`delete_managed_user_admin(p_user_id, p_actor_id)`. Solo `service_role` puede
ejecutarla y la propia función comprueba que el actor sea un administrador
activo. También impide que un administrador elimine su propia cuenta.

La operación elimina transaccionalmente la identidad de `auth.users`; las
credenciales, challenges y códigos temporales desaparecen por cascada. El
perfil se elimina, pero los pedidos, campañas, mesas, QR, sorteos y auditorías
históricas se conservan. Las referencias al perfil eliminado quedan nulas y la
auditoría conserva una instantánea del usuario y del administrador responsable.

`supabase/tests/admin_user_deletion.sql` valida permisos, autoeliminación,
limpieza de la identidad y conservación de la auditoría dentro de
`BEGIN/ROLLBACK`.

## Realtime

La publicación contiene:

- `products`
- `orders`
- `auditoria_pedidos`
- `reporte_ventas`

`order_items` no se publica. Toda RPC que modifica artículos toca `orders` al
final; ese único evento hace que la web consulte el pedido completo después
del commit. Esto evita ráfagas de eventos parciales.

Los módulos operativos solo se suscriben a pedidos. La suscripción y consulta
de auditoría se activa exclusivamente en la página administrativa que la usa.

## Fechas

Las columnas `timestamptz` usan `now()` y `updated_at` usa
`clock_timestamp()`. PostgreSQL conserva instantes UTC; la conversión a
`America/Guayaquil` se hace únicamente en presentación.

## Pruebas

`supabase/tests/operational_security.sql` ejecuta dentro de
`BEGIN/ROLLBACK`:

- matriz de permisos;
- creación con precio manipulado;
- stock insuficiente;
- edición y concurrencia optimista;
- transiciones por rol;
- pago;
- cancelación y restauración de stock;
- auditoría e historial;
- eliminación protegida de productos.

No deja datos de prueba.

## Producción

1. Respaldar esquema y datos.
2. Verificar el historial remoto de migraciones. La migración
   `20260725175500_esquema_inicial.sql` es la fotografía de la base que ya
   existe y no debe ejecutarse nuevamente sobre producción; si no figura en el
   historial, se marca como aplicada antes del push.
3. Aplicar, en orden, las migraciones posteriores a la fotografía inicial.
4. Confirmar que el registro público de Auth esté deshabilitado.
5. Ejecutar la regresión con cuentas/datos de prueba aislados.
6. Desplegar Next.js después de las migraciones.
7. Verificar Realtime y una operación real por rol.

Nunca debe aplicarse primero el frontend si las RPC nuevas todavía no existen.

## Campañas

La migración `20260726003000_campaigns_module.sql` crea `campaigns` y
`campaign_responses`, junto con sus índices, restricciones y políticas RLS.
El flujo funcional y las reglas de privacidad están documentados en
`docs/CAMPAIGNS.md`.
