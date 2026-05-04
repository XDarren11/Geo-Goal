import { Request, Response, NextFunction } from 'express';

export const hasRole = (...roles: string[]) => {
    return(req: Request, res: Response, next: NextFunction) => {
        if (req.client?.permissions?.includes('*')) {
            return next();
        }
        if(!req.user) {
            return res.status(401).json({error: 'No autorizado'})
        }
        if(!roles.includes(req.user.role)) {
            return res.status(403).json({error: 'Accion no permitida'})
        }
        next()
    }
}