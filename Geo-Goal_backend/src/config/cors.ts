import {CorsOptions} from 'cors'

// ajustar puertos
const whitelist = [
    'https://geo-goal-ai-service.onrender.com',
    'https://geo-goal-1.onrender.com', 
    'https://geo-goal-ai-service-bukpi.ondigitalocean.app/',
    undefined
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