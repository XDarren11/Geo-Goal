import {Request, Response, NextFunction} from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'

declare global {
    namespace Express {
        interface Request {
            user?: User
        }
    }
}

export const authnticate = async (req: Request, res: Response, next: NextFunction) => {
    
    const bearer = req.headers.authorization
    if(!bearer) {
        return res.status(401).json({error: 'No Autorizado'})
    }

    const [, token] = bearer.split(' ')

    if(!token) {
        return res.status(401).json({error: 'Token no proporcionado'})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!)

        if(typeof decoded === 'object' && decoded.id) {

            const user = await User.findByPk(decoded.id, {
                attributes: ['id', 'name', 'email', 'role'] 
            });

            if(user) {
                req.user = user
                next()
            } else {
                res.status(401).json({error: 'Token No Válido'})
            }
        }
        
    } catch (error) {
        res.status(401).json({error: 'Token No Válido'})
    }
    
}