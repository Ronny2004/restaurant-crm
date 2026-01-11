# 🍽️ DeliciasMoran (Restaurant CRM)

Sistema de gestión integral para restaurantes con interfaces especializadas para diferentes roles: Administrador, Mesero, Chef y Cajero. Este ecosistema incluye una plataforma Web moderna y una aplicación Android nativa optimizada.

## 📋 Características Principales

### 👥 Roles y Permisos (Web & Android)
- **Administrador**: Gestión completa de inventario, productos, ventas y usuarios. Panel de estadísticas con flitrado por periodos.
- **Mesero**: Creación y gestión de órdenes de las mesas. Vista de pedidos activos.
- **Chef**: Visualización y actualización del estado de las órdenes en cocina.
- **Cajero**: Procesamiento de pagos, facturación y cierre de órdenes.

### 🎯 Funcionalidades Destacadas
- ✅ **Sincronización Total**: Datos compartidos en tiempo real entre Web y Android.
- ✅ **Filtrado Avanzado**: Estadísticas detalladas de ventas en el dashboard de administración.
- ✅ **Identidad Corporativa**: Totalmente brandeado para "DeliciasMoran" con logo e iconografía personalizada.
- ✅ **Seguridad Robusta**: Row Level Security (RLS) en base de datos y confirmación de acciones críticas en móvil.

## 🛠️ Stack Tecnológico
- **Web**: Next.js 16, React 19, CSS Vanilla.
- **Mobile**: Android nativo (Kotlin, MVVM, Material Design 3).
- **Backend**: Supabase (PostgreSQL, Auth, RLS).

## 🚀 Guía de Instalación (Producción)

### 1. Preparación de Base de Datos (Supabase)
Cada implementación requiere su propio proyecto en Supabase:
1. Crea un nuevo proyecto en [Supabase](https://supabase.com).
2. Abre el **SQL Editor** y ejecuta íntegramente el archivo `supabase-schema.sql` ubicado en la raíz de este repositorio. Esto creará las tablas, índices y lógica necesaria.
3. En **Authentication > Users**, crea manualmente los usuarios necesarios para tu personal.
4. Asigna los roles correspondientes de cada usuario en la tabla `profiles` (`admin`, `waiter`, `chef`, `cashier`).

### 2. Configuración del Servidor Web
1. Crea un archivo `.env.local` basado en tus credenciales de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
   ```
2. Instala dependencias y compila:
   ```bash
   npm install
   npm run build
   npm run start
   ```

### 3. Configuración de la App Android
1. Abre el proyecto en **Android Studio**.
2. Configura tus credenciales de Supabase en el archivo `local.properties` (Este archivo está excluido del control de versiones por seguridad).
3. Genera el APK de producción:
   ```bash
   ./gradlew assembleRelease
   ```

## 🐳 Despliegue con Docker (Recomendado para Producción)

Para garantizar la máxima compatibilidad con cualquier dominio y hosting que soporte contenedores, hemos incluido una configuración de Docker optimizada con Nginx.

### Paso 1: Construir la Imagen
Desde la raíz del proyecto, ejecuta:
```bash
docker build -t deliciasmoran-web .
```

### Paso 2: Ejecutar el Contenedor
```bash
docker run -d -p 80:80 --name deliciasmoran deliciasmoran-web
```
La aplicación estará disponible en el puerto 80. La configuración interna de Nginx se encarga de servir los archivos estáticos y manejar el enrutamiento de la aplicación (SPA).

---

## 📦 Estructura del Proyecto
```
deliciasmoran/
├── src/                # Código fuente Web (Next.js)
├── android-app/        # Aplicación Android nativa (Kotlin)
├── public/             # Archivos estáticos
├── Dockerfile          # Configuración de Docker para Web
├── nginx.conf          # Configuración de servidor para Docker
├── supabase-schema.sql # Estructura de base de datos
└── README.md           # Documentación
```

---
Este proyecto ha sido optimizado para la eficiencia operativa en entornos de restauración real.
