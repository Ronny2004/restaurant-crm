# 🍽️ Restaurant CRM (DeliciasMoran)

Sistema de gestión integral para restaurantes basado en **Clean Architecture**. Diseñado para ser altamente modular, escalable y con sincronización en tiempo real.

## 📋 Características Principales

### 👥 Roles y Permisos Especializados
- **Admin**: Gestión global, inventarios, reportes avanzados de ventas y auditoría de pedidos.
- **Mesero**: Toma de comandas optimizada con gestión de stock en tiempo real y edición de pedidos.
- **Cocinero**: Panel de control de comandas con estados dinámicos (Pendiente, Preparando, Listo).
- **Cajero**: Módulo de cobros rápido con soporte para múltiples métodos de pago (Efectivo, Transferencia).

### 🎯 Innovaciones Técnicas
- ✅ **Modularity**: Arquitectura desacoplada basada en Hooks independientes por dominio.
- ✅ **Real-time Engine**: Sincronización bidireccional mediante Supabase Postgres Changes.
- ✅ **Optimistic UI**: Actualizaciones instantáneas en la interfaz para una experiencia fluida.
- ✅ **N8n Integration**: Asistente virtual inteligente integrado para soporte y análisis de datos.

## 🛠️ Stack Tecnológico
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS / Vanilla CSS.
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, RLS).
- **Integraciones**: n8n (Chatbot con IA), ExcelJS (Reportes analíticos).

## 📂 Estructura del Proyecto (Clean Architecture)
```
restaurant-crm/
├── src/
│   ├── app/            # Rutas y páginas (App Router)
│   ├── components/
│   │   ├── layout/     # Componentes core (Header, Providers)
│   │   ├── ui/         # Componentes atómicos (Modal, Toast)
│   │   └── integrations/# Widgets de terceros (n8n Chat)
│   ├── hooks/          # Lógica de dominio encapsulada (useOrders, useMenu, useSales)
│   ├── lib/            # Clientes y utilidades (Supabase Client)
│   ├── types/          # Definiciones de TypeScript centralizadas
│   └── context/        # Proveedores de estado global (Auth, Toast)
├── android-app/        # Backend-compatible native app (Kotlin)
├── supabase-schema.sql # Estructura y lógica de base de datos
└── README.md
```

## 🚀 Instalación y Desarrollo

### 1. Configuración de Entorno
Crea un archivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Ejecución
```bash
npm install
npm run dev
```

## 🐳 Despliegue con Docker
```bash
docker build -t restaurant-crm .
docker run -d -p 80:80 --name restaurant-crm-app restaurant-crm
```

---
Optimizado para entornos de alta demanda operativa. Basado en principios SOLID y diseño orientado a transacciones rápidas.

