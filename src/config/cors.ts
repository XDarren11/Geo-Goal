import {CorsOptions} from 'cors'

export const corsConfig: CorsOptions = {
    origin: function(origin, callback) {
        const whitelist = [process.env.FRONTEND_URL]
        
        // Permitir peticiones sin origin (mismo origen, como Swagger UI y archivos estáticos)
        if(!origin) {
            return callback(null, true)
        }

        // Permitir localhost en desarrollo
        if(origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true)
        }

        // Permitir en modo desarrollo con --api
        if(process.argv[2] === '--api') {
            return callback(null, true)
        }

        if(whitelist.includes(origin)) {
            return callback(null, true)
        } else {
            // No lanzar error, simplemente rechazar
            return callback(null, false)
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}