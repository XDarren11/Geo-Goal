import jwt from 'jsonwebtoken'

type UserPayload = {
    id: number // Cambiamos ObjectId por number (para SQL)
}

export const generateJWT = (payload: UserPayload) => {
    
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '180d'
    })

    return token
}