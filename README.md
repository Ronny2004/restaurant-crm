# Delicias Morán

Sistema interno para coordinar pedidos, cocina, caja, inventario y reportes del restaurante Delicias Morán.

## Módulos

- **Administrador:** productos, inventario, pedidos, auditoría y ventas.
- **Mesero:** creación y modificación de comandas.
- **Cocina:** preparación y entrega de pedidos.
- **Cajero:** cobro y registro del método de pago.

Cada módulo está protegido por rol en el nivel de ruta. Supabase Row Level Security es la barrera definitiva para el acceso a datos.

## Tecnología

- Next.js 16, React 19 y TypeScript.
- Supabase Auth, PostgreSQL, Storage y Realtime.
- ExcelJS para exportar reportes.
- Aplicación Android nativa en Kotlin.

La web está organizada por rutas, componentes, contextos y hooks de dominio. No se presenta como una implementación estricta de Clean Architecture: la prioridad es mantener límites claros entre interfaz, autorización, sincronización y acceso a datos.

## Desarrollo

1. Copia `env.example.txt` a `.env.local`.
2. Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Instala y valida:

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Supabase

El esquema de producción vive en Supabase y no se duplica como un esquema local potencialmente obsoleto. Las tablas, políticas, funciones RPC, Storage y configuración Realtime requeridas están documentadas en [docs/SUPABASE.md](docs/SUPABASE.md).

Las operaciones compuestas de pedidos se ejecutan mediante una única función RPC por acción. De esa forma, PostgreSQL confirma todos los cambios o revierte la operación completa.

## Android

`android-app/` contiene la aplicación Android nativa en Kotlin. El proyecto web no depende de Capacitor.

## Despliegue web

```bash
docker build -t delicias-moran .
docker run -d -p 80:80 --name delicias-moran delicias-moran
```
