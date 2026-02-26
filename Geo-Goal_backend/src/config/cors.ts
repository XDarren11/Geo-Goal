import {CorsOptions} from 'cors'

// ajustar puertos
const whitelist = [
    process.env.FRONTEND_URL,
    process.env.SWAGGER_URL,
    'http://localhost:4000', // Swagger UI
    'http://localhost:5173', // Frontend
    undefined // Permitir solicitudes sin origin (Swagger UI local)
]

export const corsConfig: CorsOptions = {
    origin: function(origin, callback) {
        if(process.argv[2] === '--api') {
            whitelist.push(undefined)
        }

        if(whitelist.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Error de CORS'))
        }
    }
}