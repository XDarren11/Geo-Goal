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

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    
    const bearer = req.headers.authorization
    if(!bearer) {
        const error = new Error('No Autorizado')
        return res.status(401).json({error: error.message})
    }

    // Extraemos el JWT que se manda
    const [, token] = bearer.split(' ')

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        if(typeof decoded === 'object' && decoded.id) {

            const user = await User.findByPk(decoded.id, {
                attributes: ['id', 'name', 'email', 'role'] 
            });

            if(user) {
                req.user = user
                next()
            } else {
                res.status(500).json({error: 'Token No Valido'})
            }
        }
        
    } catch (error) {
        res.status(500).json({error: 'Token No Valido'})
    }
    
}