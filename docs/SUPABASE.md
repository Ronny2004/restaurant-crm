# Contrato de Supabase

Supabase es la fuente de verdad del sistema. Este documento describe el contrato que consume la web; no intenta duplicar el esquema completo de producción.

## Variables públicas

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

La clave `service_role` nunca debe incluirse en la web ni en archivos versionados.

## Auth y perfiles

Supabase Auth administra las sesiones. `profiles.id` corresponde a `auth.users.id`.

Campos consumidos de `profiles`:

- `id`, `email`, `username`, `full_name`
- `role`: `admin`, `waiter`, `chef` o `cashier`

La función `get_email_by_username(p_username text)` permite iniciar sesión con nombre de usuario. Solo debe devolver el correo exacto necesario para autenticar y debe tener una política de ejecución limitada.

## Tablas y vistas consumidas

- `profiles`
- `products`
- `orders`
- `order_items`
- `status_order`
- `payment_type`
- `reporte_ventas`
- `auditoria_pedidos`
- `historial_auditoria_pedidos`

Relaciones utilizadas:

- `orders.status_id -> status_order.id`
- `orders.payment_type_id -> payment_type.id`
- `order_items.order_id -> orders.id`
- `order_items.product_id -> products.id`

El bucket público `product-images` almacena imágenes del menú. Solo administradores pueden crear o eliminar objetos.

## Funciones transaccionales

Cada función siguiente debe implementarse en PostgreSQL con `SECURITY DEFINER`, `SET search_path = public`, validación explícita del rol y permisos de ejecución únicamente para `authenticated`. Ante cualquier error debe lanzar una excepción; PostgreSQL revertirá toda la función.

Mientras estas funciones se instalan, la web detecta específicamente el error de “función inexistente” y utiliza las operaciones compatibles con la base actual. Cualquier otro error de Supabase se propaga y no activa el modo de compatibilidad.

### `create_order_transaction`

Parámetros:

- `p_table_number text`
- `p_items jsonb`: elementos con `product_id`, `quantity` y `price`

Devuelve el UUID del pedido. En una sola transacción debe validar al mesero, bloquear los productos, comprobar stock y precios, crear `orders` y `order_items`, descontar stock y crear `reporte_ventas`.

### `update_order_transaction`

Parámetros:

- `p_order_id uuid`
- `p_items jsonb`

Debe validar al propietario o administrador, rechazar pedidos pagados, bloquear pedido y productos, restaurar/descontar diferencias de stock, reemplazar los artículos, recalcular el total en servidor, actualizar `reporte_ventas` y escribir tanto la auditoría actual como su historial.

### `cancel_order_transaction`

Parámetro `p_order_id uuid`.

Debe validar al propietario o administrador, rechazar pedidos pagados, restaurar stock, registrar usuario y estado cancelado en reportes/auditoría y eliminar o marcar el pedido según la política de retención vigente.

### `update_order_status_transaction`

Parámetros `p_order_id uuid` y `p_status text`.

Debe resolver el identificador desde `status_order`; la web no contiene identificadores numéricos quemados. También valida las transiciones permitidas y actualiza al responsable correspondiente en `reporte_ventas`.

### `pay_order_transaction`

Parámetros `p_order_id uuid` y `p_payment_type_id integer`.

Debe permitir únicamente caja o administración, comprobar que el pedido esté listo y no pagado, validar el método, marcar el pago y actualizar cajero y tipo de pago en `reporte_ventas`.

### `delete_product_transaction`

Parámetro `p_product_id uuid`.

Debe permitir únicamente administración y rechazar productos con historial en `order_items` antes de eliminar.

## Row Level Security

RLS debe estar habilitado en todas las tablas expuestas. Matriz mínima:

| Recurso | Lectura | Escritura |
| --- | --- | --- |
| `profiles` | perfil propio; administración según necesidad | perfil propio limitado o administración |
| `products` | personal autenticado | administración |
| `orders`, `order_items` | personal autenticado | exclusivamente mediante RPC autorizadas |
| estados y métodos de pago | personal autenticado | administración |
| reportes y auditoría | administración; personal solo cuando sea imprescindible | exclusivamente mediante RPC |

Los controles visuales de Next.js mejoran la navegación, pero no sustituyen RLS ni las validaciones dentro de las funciones.

## Realtime

En la publicación `supabase_realtime` deben estar:

- `products`
- `orders`
- `order_items`
- `auditoria_pedidos`
- `reporte_ventas`

En la configuración inspeccionada el 19 de julio de 2026 faltaban
`order_items` y `auditoria_pedidos`. Se agregan una sola vez desde el SQL
Editor:

```sql
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.auditoria_pedidos;
```

La web mantiene un canal por dominio. Los eventos de `orders` y `order_items` se agrupan durante una ventana corta y solo vuelven a consultar el pedido afectado. Los productos y registros simples se aplican directamente desde el payload.

Para procesar eliminaciones, las tablas correspondientes deben usar una identidad de réplica que incluya la llave primaria.

## Lista de verificación en Supabase

1. Verificar tablas, relaciones, índices y restricciones.
2. Instalar o actualizar las seis funciones transaccionales.
3. Revocar escrituras directas que ahora pasan por RPC.
4. Revisar RLS con una cuenta de cada rol.
5. Activar las cinco tablas en Realtime.
6. Probar rollback provocando un error intermedio dentro de cada función.
