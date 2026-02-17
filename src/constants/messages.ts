/**
 * Mensajes de error centralizados
 */
export const ERROR_MESSAGES = {
    // Autenticación
    AUTH: {
        INVALID_CREDENTIALS: 'Email o contraseña incorrectos',
        USER_NOT_FOUND: 'Usuario no encontrado',
        USER_ALREADY_EXISTS: 'El usuario ya está registrado',
        ACCOUNT_NOT_CONFIRMED: 'Cuenta no confirmada, revisa tu email',
        INVALID_TOKEN: 'Token no válido o expirado',
        UNAUTHORIZED: 'No autorizado',
        FORBIDDEN: 'No tienes permisos para realizar esta acción',
        INVALID_ROLE: 'Rol no válido'
    },

    // Validación
    VALIDATION: {
        REQUIRED_FIELD: 'Este campo es obligatorio',
        INVALID_EMAIL: 'Email no válido',
        PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres',
        PASSWORDS_NOT_MATCH: 'Las contraseñas no coinciden',
        INVALID_ID: 'ID no válido'
    },

    // Recursos
    RESOURCE: {
        NOT_FOUND: 'Recurso no encontrado',
        ALREADY_EXISTS: 'El recurso ya existe',
        CANNOT_DELETE: 'No se puede eliminar el recurso'
    },

    // CORS
    CORS: {
        ERROR: 'Error de CORS - Origen no permitido'
    },

    // General
    GENERAL: {
        INTERNAL_ERROR: 'Error interno del servidor',
        BAD_REQUEST: 'Solicitud incorrecta'
    }
} as const;

/**
 * Mensajes de éxito centralizados
 */
export const SUCCESS_MESSAGES = {
    AUTH: {
        ACCOUNT_CREATED: 'Cuenta creada exitosamente. Revisa tu email para confirmar',
        ACCOUNT_CONFIRMED: 'Cuenta confirmada exitosamente',
        LOGIN_SUCCESS: 'Inicio de sesión exitoso',
        PASSWORD_RESET_EMAIL_SENT: 'Email de recuperación enviado',
        PASSWORD_UPDATED: 'Contraseña actualizada exitosamente',
        CODE_SENT: 'Código de confirmación enviado'
    },

    RESOURCE: {
        CREATED: 'Recurso creado exitosamente',
        UPDATED: 'Recurso actualizado exitosamente',
        DELETED: 'Recurso eliminado exitosamente'
    }
} as const;

