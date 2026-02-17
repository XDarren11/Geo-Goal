import { Request, Response, NextFunction } from 'express';
import { ERROR_MESSAGES } from '../constants/messages';

/**
 * Clase personalizada para errores de la aplicación
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational: boolean = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Middleware global para manejo de errores
 */
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Si es un error operacional conocido
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    // Error de validación de Sequelize
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            error: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    // Error de JWT
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: ERROR_MESSAGES.AUTH.INVALID_TOKEN
        });
    }

    // Error no controlado
    console.error('Error no controlado:', err);

    return res.status(500).json({
        error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR,
        ...(process.env.NODE_ENV === 'development' && {
            message: err.message,
            stack: err.stack
        })
    });
};

/**
 * Middleware para rutas no encontradas
 */
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
};

