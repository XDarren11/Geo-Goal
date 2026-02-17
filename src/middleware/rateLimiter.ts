import rateLimit from 'express-rate-limit';

/**
 * Rate limiter general para todas las rutas
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // límite de 100 requests por windowMs
    message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter estricto para autenticación
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // límite de 5 intentos de login
    message: 'Demasiados intentos de inicio de sesión, por favor intenta de nuevo después de 15 minutos.',
    skipSuccessfulRequests: true, // No cuenta requests exitosos
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter para registro de cuentas
 */
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // máximo 3 registros por hora desde la misma IP
    message: 'Demasiados registros desde esta IP, por favor intenta de nuevo después de 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter para endpoints de email (recuperación de contraseña, confirmación)
 */
export const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // máximo 5 emails por hora
    message: 'Demasiadas solicitudes de email, por favor intenta de nuevo después de 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});

