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
    { name: "Ligas", description: "CRUD de ligas (admin)" },
    { name: "Ligas - Equipos", description: "Equipos en una liga" },
    { name: "Ligas - Fixture", description: "Calendario de partidos" },
    { name: "Equipos", description: "CRUD equipos y jugadores (coach)" },
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
                  role: { type: "string", enum: ["coach", "player", "admin"] },
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
    "/api/league/{id}/fixture": {
      get: {
        tags: ["Ligas - Fixture"],
        summary: "Obtener fixture de la liga",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Partidos agrupados por jornada" } },
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
