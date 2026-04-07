/**
 * Especificación OpenAPI 3.0 para Geo-Goal API.
 * Sirve como única fuente de verdad para la documentación Swagger.
 */
export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Geo-Goal API",
    version: "1.0.0",
    description:
      "API REST para gestión de ligas, equipos y partidos de fútbol. Autenticación JWT y roles: admin, coach, player.",
  },
  servers: [{ url: "http://localhost:4000", description: "Servidor local" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token de POST /api/auth/login. Header: Authorization: Bearer <token>",
      },
    },
  },
  tags: [
    { name: "Auth", description: "Registro, login, confirmación y contraseña" },
    { name: "Público", description: "Datos visibles sin sesión" },
    { name: "Ligas", description: "CRUD de ligas (admin)" },
    { name: "Ligas - Equipos", description: "Equipos en una liga" },
    { name: "Ligas - Fixture", description: "Calendario de partidos" },
    { name: "Equipos", description: "CRUD equipos y jugadores (coach)" },
    { name: "Admin - Usuarios", description: "Gestión completa de usuarios (admin)" },
    { name: "Admin - Liga Admins", description: "Asignación de admin principal/asistente por liga" },
    { name: "Admin - Campos", description: "Gestión logística de campos de juego" },
    { name: "Admin - Temporadas", description: "Gestión formal de temporadas por liga" },
    { name: "Admin - Auditoría", description: "Bitácora y trazabilidad de cambios oficiales" },
  ],
  paths: {
    // ----- AUTH -----
    "/api/auth/create-account": {
      post: {
        tags: ["Auth"],
        summary: "Registrar nueva cuenta",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "password_confirmation", "role"],
                properties: {
                  name: { type: "string", example: "Juan Pérez" },
                  email: { type: "string", format: "email", example: "juan@example.com" },
                  password: { type: "string", minLength: 8 },
                  password_confirmation: { type: "string" },
                  role: { type: "string", enum: ["coach", "player", "admin", "referee"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Cuenta creada, revisa tu email" },
          "400": { description: "Validación fallida o rol no seleccionado" },
          "409": { description: "El usuario ya está registrado" },
        },
      },
    },
    "/api/auth/confirm-account": {
      post: {
        tags: ["Auth"],
        summary: "Confirmar cuenta con token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: { token: { type: "string", description: "Código de 6 dígitos" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Cuenta confirmada" },
          "404": { description: "Token no válido" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Iniciar sesión",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "JWT devuelto (token, tokenType, expiresIn)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    tokenType: { type: "string" },
                    expiresIn: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Credenciales inválidas o cuenta no confirmada" },
          "404": { description: "Usuario no encontrado" },
        },
      },
    },
    "/api/auth/request-code": {
      post: {
        tags: ["Auth"],
        summary: "Solicitar nuevo código de confirmación",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Código enviado al email" },
          "403": { description: "Usuario ya confirmado" },
          "404": { description: "Usuario no registrado" },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Solicitar recuperación de contraseña",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Instrucciones enviadas al correo" },
          "404": { description: "Usuario no registrado" },
        },
      },
    },
    "/api/auth/validate-token": {
      post: {
        tags: ["Auth"],
        summary: "Validar token de recuperación de contraseña",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: { token: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Token válido" },
          "404": { description: "Token no válido" },
        },
      },
    },
    "/api/auth/update-password/{token}": {
      post: {
        tags: ["Auth"],
        summary: "Actualizar contraseña con token",
        parameters: [
          { in: "path", name: "token", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["password", "password_confirmation"],
                properties: {
                  password: { type: "string", minLength: 8 },
                  password_confirmation: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Contraseña actualizada" },
          "404": { description: "Token o usuario no válido" },
        },
      },
    },
    "/api/auth/user": {
      get: {
        tags: ["Auth"],
        summary: "Obtener usuario autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Usuario actual",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string" },
                  },
                },
              },
            },
          },
          "401": { description: "No autorizado" },
        },
      },
    },
    "/api/public/leagues": {
      get: {
        tags: ["Público"],
        summary: "Listar ligas públicas",
        responses: {
          "200": { description: "Listado público de ligas" },
        },
      },
    },
    "/api/public/leagues/{leagueId}": {
      get: {
        tags: ["Público"],
        summary: "Obtener detalle público de una liga",
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Detalle público de la liga" },
          "404": { description: "Liga no encontrada" },
        },
      },
    },
    "/api/public/leagues/{leagueId}/standings": {
      get: {
        tags: ["Público"],
        summary: "Obtener tabla pública de una liga",
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Tabla pública de posiciones" },
          "404": { description: "Liga no encontrada" },
        },
      },
    },
    "/api/public/leagues/{leagueId}/fixture": {
      get: {
        tags: ["Público"],
        summary: "Obtener fixture público de una liga",
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Calendario público agrupado por jornada" },
          "404": { description: "Liga no encontrada" },
        },
      },
    },
    "/api/public/leagues/{leagueId}/fixture/locations": {
      get: {
        tags: ["Público"],
        summary: "Obtener fixture público con ubicaciones",
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Partidos con ubicación para el mapa" },
          "404": { description: "Liga no encontrada" },
        },
      },
    },
    "/api/public/leagues/{leagueId}/teams/{teamId}/profile": {
      get: {
        tags: ["Público"],
        summary: "Obtener perfil público de un equipo",
        parameters: [
          { in: "path", name: "leagueId", required: true, schema: { type: "integer" } },
          { in: "path", name: "teamId", required: true, schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "Perfil público del equipo" },
          "404": { description: "Liga o equipo no encontrado" },
        },
      },
    },
    // ----- LEAGUES -----
    "/api/league": {
      post: {
        tags: ["Ligas"],
        summary: "Crear liga",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "description"],
                properties: {
                  name: { type: "string", example: "Liga Profesional 2024" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Liga creada" }, "401": { description: "No autorizado" }, "403": { description: "Solo admin" } },
      },
      get: {
        tags: ["Ligas"],
        summary: "Listar mis ligas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de ligas",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, description: { type: "string" } } },
                },
              },
            },
          },
        },
      },
    },
    "/api/league/{leagueId}": {
      get: {
        tags: ["Ligas"],
        summary: "Obtener liga por ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Liga con equipos" }, "404": { description: "Liga no encontrada" } },
      },
      put: {
        tags: ["Ligas"],
        summary: "Actualizar liga",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "description"],
                properties: { name: { type: "string" }, description: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Liga actualizada" }, "404": { description: "Liga no encontrada" } },
      },
      delete: {
        tags: ["Ligas"],
        summary: "Eliminar liga",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Liga eliminada" }, "404": { description: "Liga no encontrada" } },
      },
    },
    "/api/league/{leagueId}/teams/find": {
      post: {
        tags: ["Ligas - Equipos"],
        summary: "Buscar equipos de un entrenador por email",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: { "200": { description: "Lista de equipos del entrenador" }, "404": { description: "Entrenador no encontrado" } },
      },
    },
    "/api/league/{leagueId}/teams": {
      get: {
        tags: ["Ligas - Equipos"],
        summary: "Obtener equipos de la liga",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Equipos de la liga" }, "404": { description: "Liga no encontrada" } },
      },
      post: {
        tags: ["Ligas - Equipos"],
        summary: "Agregar equipo a la liga",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["teamId"],
                properties: { teamId: { type: "integer" } },
              },
            },
          },
        },
        responses: { "200": { description: "Equipo agregado" }, "404": { description: "Liga o equipo no encontrado" }, "409": { description: "Equipo ya en otra liga" } },
      },
    },
    "/api/league/{leagueId}/teams/{teamId}": {
      delete: {
        tags: ["Ligas - Equipos"],
        summary: "Quitar equipo de la liga",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "leagueId", required: true, schema: { type: "integer" } },
          { in: "path", name: "teamId", required: true, schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Equipo quitado" }, "404": { description: "Liga o equipo no encontrado" } },
      },
    },
    "/api/league/{id}/calculate-fixture": {
      post: {
        tags: ["Ligas - Fixture"],
        summary: "Generar fixture (calendario)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type"],
                properties: { type: { type: "string", enum: ["round-robin", "knockout"] } },
              },
            },
          },
        },
        responses: { "200": { description: "Fixture generado" }, "400": { description: "Menos de 2 equipos o tipo inválido" }, "404": { description: "Liga no encontrada" } },
      },
    },
    "/api/league/{id}/fixture/locations": {
      get: {
        tags: ["Ligas - Fixture"],
        summary: "Partidos con ubicación para el mapa",
        description:
          "Lista de partidos con datos de ubicación (lat, lng, fieldAddress del equipo local). Si un partido no tiene ubicación (equipo sin coordenadas), location es null: el front puede mostrar \"ubicación no disponible\". Si no hay partidos o ninguno tiene ubicación, devuelve [] (mostrar \"sin ubicaciones registradas\").",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: {
          "200": {
            description: "Lista de partidos con ubicación",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      roundName: { type: "string" },
                      date: { type: "string", nullable: true },
                      homeTeamId: { type: "integer" },
                      awayTeamId: { type: "integer" },
                      homeTeamName: { type: "string" },
                      awayTeamName: { type: "string" },
                      location: {
                        type: "object",
                        nullable: true,
                        properties: { lat: { type: "number" }, lng: { type: "number" }, fieldAddress: { type: "string", nullable: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/league/{id}/fixture": {
      get: {
        tags: ["Ligas - Fixture"],
        summary: "Obtener fixture de la liga",
        description:
          "Partidos agrupados por jornada. Cada partido incluye homeTeam y awayTeam con id, name, logoUrl, lat, lng, fieldAddress. Si un equipo no tiene coordenadas, esos campos serán null (front puede mostrar \"ubicación no disponible\").",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Partidos agrupados por jornada (objeto por nombre de jornada)" } },
      },
    },
    // ----- ADMIN -----
    "/api/admin/users": {
      get: {
        tags: ["Admin - Usuarios"],
        summary: "Listar usuarios",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Lista de usuarios" },
          "401": { description: "No autorizado" },
          "403": { description: "Solo admin" },
        },
      },
      post: {
        tags: ["Admin - Usuarios"],
        summary: "Crear usuario",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "role"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  role: { type: "string", enum: ["coach", "player", "admin", "referee"] },
                  confirmed: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Usuario creado" },
          "400": { description: "Validación fallida" },
          "409": { description: "Email ya registrado" },
        },
      },
    },
    "/api/admin/users/{userId}": {
      put: {
        tags: ["Admin - Usuarios"],
        summary: "Actualizar usuario",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "userId", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  role: { type: "string", enum: ["coach", "player", "admin", "referee"] },
                  confirmed: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Usuario actualizado" },
          "404": { description: "Usuario no encontrado" },
          "409": { description: "Email ya en uso" },
        },
      },
      delete: {
        tags: ["Admin - Usuarios"],
        summary: "Eliminar usuario",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "userId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Usuario eliminado" },
          "400": { description: "No puedes eliminar tu propia cuenta" },
          "404": { description: "Usuario no encontrado" },
        },
      },
    },
    "/api/admin/leagues/{leagueId}/users": {
      get: {
        tags: ["Admin - Usuarios"],
        summary: "Listar usuarios vinculados a una liga",
        description:
          "Devuelve solo usuarios que pertenecen a la liga: admin dueño, admins asignados, coaches con equipos en la liga y jugadores de esos equipos.",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Lista de usuarios de la liga" },
          "403": { description: "No tienes acceso a esta liga" },
          "404": { description: "Liga no encontrada" },
        },
      },
    },
    "/api/admin/leagues/{leagueId}/admins": {
      get: {
        tags: ["Admin - Liga Admins"],
        summary: "Listar admins asignados a una liga",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Listado de admins de la liga" },
          "404": { description: "Liga no encontrada" },
        },
      },
      post: {
        tags: ["Admin - Liga Admins"],
        summary: "Asignar admin a una liga",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "leagueRole"],
                properties: {
                  userId: { type: "integer" },
                  leagueRole: { type: "string", enum: ["principal", "assistant"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Admin asignado o actualizado" },
          "400": { description: "Usuario no tiene rol admin" },
          "404": { description: "Liga o usuario no encontrado" },
          "409": { description: "La liga ya tiene admin principal" },
        },
      },
    },
    "/api/admin/leagues/{leagueId}/admins/{userId}": {
      put: {
        tags: ["Admin - Liga Admins"],
        summary: "Cambiar rol de admin de liga",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "leagueId", required: true, schema: { type: "integer" } },
          { in: "path", name: "userId", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["leagueRole"],
                properties: {
                  leagueRole: { type: "string", enum: ["principal", "assistant"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Rol actualizado" },
          "404": { description: "Asignación no encontrada" },
          "409": { description: "La liga ya tiene admin principal" },
        },
      },
      delete: {
        tags: ["Admin - Liga Admins"],
        summary: "Remover admin de una liga",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "leagueId", required: true, schema: { type: "integer" } },
          { in: "path", name: "userId", required: true, schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "Admin removido" },
          "404": { description: "Asignación no encontrada" },
        },
      },
    },
    "/api/admin/fields": {
      get: {
        tags: ["Admin - Campos"],
        summary: "Listar campos",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Listado de campos" },
          "401": { description: "No autorizado" },
          "403": { description: "Solo admin" },
        },
      },
      post: {
        tags: ["Admin - Campos"],
        summary: "Crear campo",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "address", "lat", "lng"],
                properties: {
                  name: { type: "string" },
                  address: { type: "string" },
                  lat: { type: "number" },
                  lng: { type: "number" },
                  city: { type: "string", nullable: true },
                  state: { type: "string", nullable: true },
                  country: { type: "string", nullable: true },
                  capacity: { type: "integer", minimum: 0, nullable: true },
                  isActive: { type: "boolean", default: true },
                  notes: { type: "string", nullable: true },
                  leagueId: { type: "integer", nullable: true },
                  teamId: { type: "integer", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Campo creado" },
          "404": { description: "Liga o equipo no encontrado" },
        },
      },
    },
    "/api/admin/fields/{fieldId}": {
      get: {
        tags: ["Admin - Campos"],
        summary: "Obtener campo por ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "fieldId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Detalle del campo" },
          "404": { description: "Campo no encontrado" },
        },
      },
      put: {
        tags: ["Admin - Campos"],
        summary: "Actualizar campo",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "fieldId", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  address: { type: "string" },
                  lat: { type: "number" },
                  lng: { type: "number" },
                  city: { type: "string", nullable: true },
                  state: { type: "string", nullable: true },
                  country: { type: "string", nullable: true },
                  capacity: { type: "integer", minimum: 0, nullable: true },
                  isActive: { type: "boolean" },
                  notes: { type: "string", nullable: true },
                  leagueId: { type: "integer", nullable: true },
                  teamId: { type: "integer", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Campo actualizado" },
          "404": { description: "Campo, liga o equipo no encontrado" },
        },
      },
      delete: {
        tags: ["Admin - Campos"],
        summary: "Eliminar campo",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "fieldId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Campo eliminado" },
          "404": { description: "Campo no encontrado" },
        },
      },
    },
    "/api/admin/leagues/{leagueId}/seasons": {
      get: {
        tags: ["Admin - Temporadas"],
        summary: "Listar temporadas de una liga",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Lista de temporadas" },
          "403": { description: "No tienes acceso a esta liga" },
          "404": { description: "Liga no encontrada" },
        },
      },
      post: {
        tags: ["Admin - Temporadas"],
        summary: "Crear temporada en liga",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "leagueId", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "year", "startDate", "endDate"],
                properties: {
                  name: { type: "string", example: "Temporada Apertura" },
                  year: { type: "integer", example: 2026 },
                  startDate: { type: "string", format: "date", example: "2026-01-15" },
                  endDate: { type: "string", format: "date", example: "2026-06-30" },
                  status: { type: "string", enum: ["draft", "active", "finished", "archived"] },
                  isCurrent: { type: "boolean", default: false },
                  reason: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Temporada creada" },
          "400": { description: "Fechas inválidas o validación fallida" },
          "403": { description: "No tienes acceso a esta liga" },
          "404": { description: "Liga no encontrada" },
          "409": { description: "La liga ya tiene una temporada activa" },
        },
      },
    },
    "/api/admin/seasons/{seasonId}": {
      get: {
        tags: ["Admin - Temporadas"],
        summary: "Obtener detalle de temporada",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "seasonId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Detalle de temporada" },
          "403": { description: "No tienes acceso a la liga de esta temporada" },
          "404": { description: "Temporada no encontrada" },
        },
      },
      put: {
        tags: ["Admin - Temporadas"],
        summary: "Actualizar temporada",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "seasonId", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  year: { type: "integer" },
                  startDate: { type: "string", format: "date" },
                  endDate: { type: "string", format: "date" },
                  status: { type: "string", enum: ["draft", "active", "finished", "archived"] },
                  isCurrent: { type: "boolean" },
                  reason: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Temporada actualizada" },
          "400": { description: "Datos inválidos" },
          "403": { description: "No autorizado sobre esta liga" },
          "404": { description: "Temporada no encontrada" },
          "409": { description: "Conflicto de temporada activa" },
        },
      },
      delete: {
        tags: ["Admin - Temporadas"],
        summary: "Eliminar temporada",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "seasonId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Temporada eliminada" },
          "403": { description: "No autorizado sobre esta liga" },
          "404": { description: "Temporada no encontrada" },
          "409": { description: "No se puede eliminar si tiene partidos asociados" },
        },
      },
    },
    "/api/admin/seasons/{seasonId}/status": {
      patch: {
        tags: ["Admin - Temporadas"],
        summary: "Cambiar estado de temporada",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "seasonId", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["draft", "active", "finished", "archived"] },
                  reason: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Estado actualizado" },
          "403": { description: "No autorizado sobre esta liga" },
          "404": { description: "Temporada no encontrada" },
          "409": { description: "Conflicto de temporada activa" },
        },
      },
    },
    "/api/admin/audit-logs": {
      get: {
        tags: ["Admin - Auditoría"],
        summary: "Listar registros de auditoría",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "leagueId", required: false, schema: { type: "integer" } },
          { in: "query", name: "seasonId", required: false, schema: { type: "integer" } },
          { in: "query", name: "actorUserId", required: false, schema: { type: "integer" } },
          { in: "query", name: "entityType", required: false, schema: { type: "string" } },
          { in: "query", name: "action", required: false, schema: { type: "string", enum: ["create", "update", "delete", "status_change", "manual_fix"] } },
          { in: "query", name: "from", required: false, schema: { type: "string", format: "date-time" } },
          { in: "query", name: "to", required: false, schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": { description: "Listado de auditoría" },
          "401": { description: "No autorizado" },
          "403": { description: "Solo admin" },
        },
      },
    },
    "/api/admin/audit-logs/{logId}": {
      get: {
        tags: ["Admin - Auditoría"],
        summary: "Obtener registro de auditoría por ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "logId", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Detalle del registro" },
          "404": { description: "Registro no encontrado" },
        },
      },
    },
    // ----- TEAMS -----
    "/api/teams": {
      get: {
        tags: ["Equipos"],
        summary: "Mis equipos (coach)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Lista de equipos del entrenador" } },
      },
      post: {
        tags: ["Equipos"],
        summary: "Crear equipo",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name", "lat", "lng", "fieldAddress"],
                properties: {
                  name: { type: "string" },
                  lat: { type: "number" },
                  lng: { type: "number" },
                  fieldAddress: { type: "string" },
                  logo: { type: "string", format: "binary", description: "Archivo de imagen (opcional)" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Equipo creado" } },
      },
    },
    "/api/teams/{id}": {
      get: {
        tags: ["Equipos"],
        summary: "Obtener equipo por ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Detalle del equipo" }, "404": { description: "Equipo no encontrado" } },
      },
      put: {
        tags: ["Equipos"],
        summary: "Actualizar equipo",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  lat: { type: "number" },
                  lng: { type: "number" },
                  fieldAddress: { type: "string" },
                  logo: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Equipo actualizado" }, "404": { description: "Equipo no encontrado" } },
      },
      delete: {
        tags: ["Equipos"],
        summary: "Eliminar equipo",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Equipo eliminado" }, "404": { description: "Equipo no encontrado" } },
      },
    },
    "/api/teams/{id}/player/find": {
      post: {
        tags: ["Equipos"],
        summary: "Buscar jugador por email",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: { "200": { description: "Datos del jugador" }, "404": { description: "Equipo o usuario no encontrado" } },
      },
    },
    "/api/teams/{id}/player": {
      get: {
        tags: ["Equipos"],
        summary: "Listar jugadores del equipo",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Lista de jugadores" }, "404": { description: "Equipo no encontrado" } },
      },
      post: {
        tags: ["Equipos"],
        summary: "Agregar jugador al equipo",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["playerId"],
                properties: { playerId: { type: "integer" } },
              },
            },
          },
        },
        responses: { "200": { description: "Jugador agregado" }, "404": { description: "Equipo o jugador no encontrado" }, "409": { description: "Jugador ya en el equipo" } },
      },
    },
    "/api/teams/{id}/player/{playerId}": {
      delete: {
        tags: ["Equipos"],
        summary: "Quitar jugador del equipo",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "integer" } },
          { in: "path", name: "playerId", required: true, schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Jugador eliminado" }, "404": { description: "Equipo o jugador no encontrado" } },
      },
    },
  },
};
