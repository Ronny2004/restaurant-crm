# Delicias Morán

Sistema interno para coordinar pedidos, cocina, caja, inventario, usuarios y
reportes del restaurante Delicias Morán.

## Módulos

- **Administrador:** usuarios, productos, inventario, pedidos, auditoría y ventas.
- **Mesero:** creación y modificación de comandas.
- **Cocina:** preparación y entrega de pedidos.
- **Cajero:** cobro y registro del método de pago.
- **Campañas:** formularios públicos editables, enlaces únicos, códigos QR y
  recopilación consentida de datos para análisis.

Cada módulo está protegido por rol en el servidor. Supabase Row Level Security
es la barrera definitiva para el acceso a datos.

## Tecnología

- Next.js 16, React 19 y TypeScript.
- Supabase Auth, PostgreSQL, Storage y Realtime.
- Autenticación SSR mediante cookies.
- Nodemailer para recuperación de PIN.
- CSV UTF-8 compatible con Excel para exportar reportes sin dependencias
  vulnerables de generación XLSX.
- Aplicación Android nativa en Kotlin.

La web está organizada por rutas, componentes, servicios y hooks de dominio. No
se presenta como una implementación estricta de Clean Architecture: la prioridad
es mantener límites claros entre interfaz, autorización, sincronización y acceso
a datos.

## Desarrollo

1. Copia `env.example.txt` a `.env.local`.
2. Configura las variables públicas, `SUPABASE_SERVICE_ROLE_KEY`,
   `AUTH_PIN_PEPPER` y SMTP.
3. Instala y valida:

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Supabase

El esquema se conserva como migraciones versionadas en `supabase/migrations/`.
La base local es el entorno de validación y producción se actualiza únicamente
después de aprobar las migraciones y sus pruebas.

- [Documentación de Supabase](docs/SUPABASE.md)
- [Autenticación y usuarios](docs/AUTHENTICATION.md)

Las operaciones compuestas de pedidos se ejecutan mediante una única función RPC
por acción. PostgreSQL confirma todos los cambios o revierte la operación
completa.

## Android

`android-app/` contiene la aplicación Android nativa en Kotlin. El proyecto web
no depende de Capacitor.

## Despliegue web con Docker

```bash
docker build -t delicias-moran .
docker run --env-file .env.production -p 3000:3000 delicias-moran
```

La imagen ejecuta el servidor standalone de Next.js porque autenticación,
cookies y Route Handlers requieren un runtime Node.js.
