import {CorsOptions} from 'cors'

export const corsConfig: CorsOptions = {
    origin: function(origin, callback) {
        const whitelist = [process.env.FRONTEND_URL]
        
        // Permitir peticiones sin origin (mismo origen, como Swagger UI)
        if(!origin) {
            return callback(null, true)
        }

        // Permitir en modo desarrollo con --api
        if(process.argv[2] === '--api') {
            return callback(null, true)
        }

        if(whitelist.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Error de CORS'))
        }
    }
}