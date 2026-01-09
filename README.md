# 🍽️ Restaurant CRM

Sistema de gestión integral para restaurantes con interfaces especializadas para diferentes roles: Administrador, Mesero, Chef y Cajero. Construido con Next.js y Supabase.

## 📋 Características Principales

### 👥 Roles y Permisos

- **Administrador**: Gestión completa de inventario, productos, ventas y usuarios
- **Mesero**: Creación y gestión de órdenes de las mesas
- **Chef**: Visualización y actualización del estado de las órdenes en cocina
- **Cajero**: Procesamiento de pagos y cierre de órdenes

### 🎯 Funcionalidades

- ✅ Sistema de autenticación seguro con Supabase Auth
- ✅ Gestión de productos con categorías (Principal, Acompañante, Bebida, Postre)
- ✅ Control de inventario en tiempo real
- ✅ Seguimiento de órdenes con estados (pendiente, preparando, listo, pagado)
- ✅ Panel de administración con estadísticas de ventas
- ✅ Panel de "Pedidos Activos" para meseros (seguimiento en tiempo real)
- ✅ Interfaz responsiva y moderna

- ✅ Row Level Security (RLS) para seguridad de datos
- ✅ Sistema de notificaciones (Toast) personalizado
- ✅ Modo Demo offline (funciona sin conexión a Supabase si faltan credenciales)

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 + React 19
- **Estilos**: CSS Vanilla con diseño moderno
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Iconos**: Lucide React
- **Lenguaje**: TypeScript

## 📦 Estructura del Proyecto

```
restaurant-crm/
├── src/
│   ├── app/
│   │   ├── admin/          # Panel de administrador
│   │   ├── mesero/         # Interfaz de mesero
│   │   ├── cocina/         # Interfaz de chef
│   │   ├── cajero/         # Interfaz de cajero
│   │   ├── login/          # Página de inicio de sesión
│   │   └── page.tsx        # Página principal
│   ├── components/         # Componentes reutilizables
│   ├── context/           # Contextos de React (Auth, etc.)
│   └── lib/               # Utilidades y configuración
├── public/               # Archivos estáticos
└── supabase-schema.sql   # Esquema de base de datos
```

## 🗄️ Esquema de Base de Datos

### Tablas Principales

1. **profiles** - Perfiles de usuario con roles
2. **products** - Catálogo de productos
3. **orders** - Órdenes de las mesas
4. **order_items** - Items individuales de cada orden

### Productos Precargados

El sistema incluye 18 productos de ejemplo en 4 categorías:
- Principales: Hamburguesas, Pizzas, Tacos
- Acompañantes: Ensaladas, Papas, Alitas
- Bebidas: Refrescos, Agua, Jugos, Cerveza, Café
- Postres: Pastel, Helado, Flan

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js** 20 o superior
- **Cuenta de Supabase**

### Paso 1: Inicialización del Sistema

> [!IMPORTANT]
> **Requisito Crítico**: Asegúrate de tener **Node.js v20+** instalado y en tu PATH.

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```

### Paso 2: Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve al SQL Editor y ejecuta el archivo `supabase-schema.sql`
3. Crea los usuarios de prueba en Authentication > Users:
   - `admin@restaurant.com` (password: admin123)
   - `waiter@restaurant.com` (password: waiter123)
   - `chef@restaurant.com` (password: chef123)
   - `cashier@restaurant.com` (password: cashier123)
4. Actualiza los roles ejecutando los comandos SQL del archivo `supabase-schema.sql`

### Paso 3: Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### Paso 4: Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.



## 👤 Usuarios de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@restaurant.com | admin123 |
| Mesero | waiter@restaurant.com | waiter123 |
| Chef | chef@restaurant.com | chef123 |
| Cajero | cashier@restaurant.com | cashier123 |

## 🎨 Características de Diseño

- Interfaz moderna con gradientes y efectos glassmorphism
- Modo oscuro por defecto
- Animaciones suaves y micro-interacciones
- Diseño responsivo para móviles y tablets
- Iconos intuitivos con Lucide React

## 📝 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Compilar para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Ejecutar linter
```

## 🔒 Seguridad

- Row Level Security (RLS) habilitado en todas las tablas
- Políticas de acceso basadas en roles
- Autenticación segura con Supabase Auth
- Validaciones en base de datos (constraints)

## 📄 Archivos Importantes

### SQL
- `supabase-schema.sql` - Esquema completo de la base de datos
- `fix-rls-policies.sql` - Correcciones de políticas RLS
- `verify-and-fix-roles.sql` - Verificación y corrección de roles

### Documentación
- `README.md` - Este archivo

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si encuentras algún problema o tienes preguntas, por favor abre un issue en el repositorio.

## 📜 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

---

Desarrollado con ❤️ para la gestión eficiente de restaurantes
