# ⚽ Geo-Goal API

API REST para la gestión de ligas y equipos deportivos con autenticación JWT, roles de usuario y geolocalización.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Variables de Entorno](#variables-de-entorno)
- [Ejecución](#ejecución)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Endpoints](#endpoints)
- [Autenticación](#autenticación)
- [Roles](#roles)
- [Documentación API](#documentación-api)
- [Tecnologías](#tecnologías)

---

## ✅ Requisitos Previos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 14.x
- **TypeScript** >= 5.x

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/Geo-Goal.git
cd Geo-Goal
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

O crea el archivo manualmente (ver sección [Variables de Entorno](#variables-de-entorno)).

### 4. Configurar la base de datos

Asegúrate de tener PostgreSQL corriendo y crea una base de datos:

```sql
CREATE DATABASE geo_goal;
```

> Las tablas se crean automáticamente al iniciar el servidor gracias a Sequelize (`sync({ alter: true })`).

---

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Base de Datos (PostgreSQL)
DATABASE_URL=postgres://usuario:contraseña@localhost:5432/geo_goal

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000

# Servidor
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=tu_clave_secreta_aqui

# SMTP (Configuración de correo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu_correo@gmail.com
SMTP_PASSWORD=tu_contraseña_de_aplicacion
```

### Notas sobre las variables

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | URL de conexión a PostgreSQL |
| `FRONTEND_URL` | ✅ | URL del frontend (para CORS y emails) |
| `BACKEND_URL` | ❌ | URL del backend (default: `http://localhost:4000`) |
| `PORT` | ❌ | Puerto del servidor (default: `4000`) |
| `NODE_ENV` | ❌ | Entorno de ejecución (default: `development`) |
| `JWT_SECRET` | ⚠️ | Clave secreta para firmar tokens JWT. **Obligatoria en producción** |
| `SMTP_HOST` | ✅ | Host del servidor SMTP |
| `SMTP_PORT` | ✅ | Puerto del servidor SMTP |
| `SMTP_USER` | ✅ | Usuario SMTP (correo electrónico) |
| `SMTP_PASSWORD` | ✅ | Contraseña de aplicación SMTP |

> **Tip para Gmail:** Debes generar una [contraseña de aplicación](https://support.google.com/accounts/answer/185833) en tu cuenta de Google para usar SMTP.

---

## ▶️ Ejecución

### Modo desarrollo

```bash
npm run dev
```

### Modo desarrollo (solo API)

```bash
npm run dev:api
```

El servidor se iniciará en `http://localhost:4000` (o el puerto configurado en `.env`).

---

## 📁 Estructura del Proyecto

```
Geo-Goal/
├── public/
│   └── uploads/            # Archivos subidos (logos de equipos, etc.)
├── src/
│   ├── index.ts            # Punto de entrada de la aplicación
│   ├── server.ts           # Configuración de Express
│   ├── config/
│   │   ├── cors.ts         # Configuración de CORS
│   │   ├── db.ts           # Conexión a PostgreSQL con Sequelize
│   │   ├── env.ts          # Validación de variables de entorno
│   │   ├── nodemailer.ts   # Configuración del servicio de email
│   │   └── swagger.ts      # Configuración de Swagger/OpenAPI
│   ├── constants/
│   │   ├── messages.ts     # Mensajes de error y éxito
│   │   └── roles.ts        # Definición de roles (admin, coach, player)
│   ├── controllers/
│   │   ├── AuthController.ts    # Autenticación y gestión de cuentas
│   │   ├── LeagueController.ts  # CRUD de ligas
│   │   └── TeamController.ts    # CRUD de equipos
│   ├── emails/
│   │   └── AutEmail.ts     # Templates de emails
│   ├── middleware/
│   │   ├── auth.ts         # Middleware de autenticación JWT
│   │   ├── errorHandler.ts # Manejo global de errores
│   │   ├── rateLimiter.ts  # Rate limiting
│   │   ├── role.ts         # Middleware de autorización por rol
│   │   ├── upload.ts       # Middleware para subida de archivos (Multer)
│   │   └── validation.ts   # Validación de inputs (express-validator)
│   ├── models/
│   │   ├── League.ts       # Modelo de Liga
│   │   ├── Team.ts         # Modelo de Equipo
│   │   ├── TeamMember.ts   # Modelo de Miembro de Equipo
│   │   ├── Token.ts        # Modelo de Token (confirmación/reset)
│   │   └── User.ts         # Modelo de Usuario
│   ├── routes/
│   │   ├── authRoutes.ts   # Rutas de autenticación
│   │   ├── leagueRoutes.ts # Rutas de ligas
│   │   └── teamsRoutes.ts  # Rutas de equipos
│   ├── services/
│   │   └── AuthEmailService.ts  # Servicio de envío de emails
│   └── utils/
│       ├── auth.ts         # Utilidades de hashing de contraseñas
│       ├── jwt.ts          # Generación de tokens JWT
│       └── token.ts        # Generación de tokens de confirmación
├── .env                    # Variables de entorno (no incluido en git)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔗 Endpoints

### 🔑 Autenticación (`/api/auth`)

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/create-account` | Crear una nueva cuenta | ❌ |
| `POST` | `/confirm-account` | Confirmar cuenta con token | ❌ |
| `POST` | `/login` | Iniciar sesión (devuelve JWT) | ❌ |
| `POST` | `/request-code` | Re-enviar código de confirmación | ❌ |
| `POST` | `/forgot-password` | Solicitar recuperación de contraseña | ❌ |
| `POST` | `/validate-token` | Validar token de recuperación | ❌ |
| `POST` | `/update-password/:token` | Actualizar contraseña con token | ❌ |
| `GET` | `/user` | Obtener usuario autenticado | ✅ |

### 🏆 Ligas (`/api/league`)

| Método | Ruta | Descripción | Auth | Rol |
|---|---|---|---|---|
| `POST` | `/` | Crear liga | ✅ | admin |
| `GET` | `/` | Listar ligas | ✅ | - |
| `GET` | `/:id` | Obtener liga por ID | ✅ | - |
| `PUT` | `/:id` | Actualizar liga | ✅ | admin |
| `DELETE` | `/:id` | Eliminar liga | ✅ | admin |

### ⚽ Equipos (`/api/teams`)

| Método | Ruta | Descripción | Auth | Rol |
|---|---|---|---|---|
| `GET` | `/` | Obtener mis equipos | ✅ | coach |
| `POST` | `/` | Crear equipo | ✅ | coach |
| `GET` | `/:id` | Obtener equipo por ID | ✅ | - |
| `PUT` | `/:id` | Actualizar equipo | ✅ | coach |
| `DELETE` | `/:id` | Eliminar equipo | ✅ | coach |

---

## 🔒 Autenticación

La API utiliza **JWT (JSON Web Tokens)** para la autenticación.

### Respuesta del Login

```json
{
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshExpiresIn": "7d"
}
```

### Uso del Token

Incluye el `accessToken` en el header `Authorization` de tus peticiones:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Tiempos de expiración

| Token | Expiración |
|---|---|
| Access Token | 15 minutos |
| Refresh Token | 7 días |

---

## 👥 Roles

El sistema maneja 3 roles de usuario:

| Rol | Descripción |
|---|---|
| `admin` | Gestión completa de ligas y administración general |
| `coach` | Gestión de equipos y jugadores |
| `player` | Acceso como jugador |

---

## 📖 Documentación API

La documentación interactiva de la API está disponible con **Swagger UI**:

```
http://localhost:4000/api/docs
```

---

## 🛠️ Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| **Node.js** | 18+ | Runtime |
| **Express** | 5.x | Framework web |
| **TypeScript** | 5.x | Lenguaje |
| **Sequelize** | 6.x | ORM |
| **PostgreSQL** | 14+ | Base de datos |
| **JWT** | 9.x | Autenticación |
| **Bcrypt** | 6.x | Hashing de contraseñas |
| **Multer** | 2.x | Subida de archivos |
| **Nodemailer** | 7.x | Envío de emails |
| **Swagger** | 6.x | Documentación API |
| **Morgan** | 1.x | Logging HTTP |
| **Express Rate Limit** | 8.x | Rate limiting |
| **express-validator** | 7.x | Validación de inputs |

---

## 📄 Licencia

ISC

