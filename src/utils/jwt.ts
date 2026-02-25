import jwt from 'jsonwebtoken'

type UserPayload = {
    id: number
    role: string
}

const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '7d'

export const generateTokens = (payload: UserPayload) => {
    const secret = process.env.JWT_SECRET!

    const accessToken = jwt.sign(payload, secret, {
        expiresIn: ACCESS_EXPIRES_IN
    })

    const refreshToken = jwt.sign(payload, secret, {
        expiresIn: REFRESH_EXPIRES_IN
    })

    return {
        tokenType: 'Bearer',
        accessToken,
        expiresIn: ACCESS_EXPIRES_IN,
        refreshToken,
        refreshExpiresIn: REFRESH_EXPIRES_IN
    }
}