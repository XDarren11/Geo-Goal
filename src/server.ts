import  express  from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { corsConfig } from './config/cors' 
import { connetDB } from './config/db'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec, swaggerUiOptions } from './config/swagger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { generalLimiter } from './middleware/rateLimiter'
import { validateEnvVariables } from './config/env'
import authRoutes from './routes/authRoutes'
import leagueRoutes from './routes/leagueRoutes'
import teamsRoutes from './routes/teamsRoutes'

dotenv.config()

// Validar variables de entorno al inicio
validateEnvVariables()

connetDB()

const app = express()

// Middleware de seguridad - Rate limiting
app.use(generalLimiter)

app.use(cors(corsConfig))

app.use('/uploads', express.static('public/uploads'))

// Logging
app.use(morgan('dev'))

//Leer datos del formulario
app.use(express.json())  //esto es para que en el postman si mandamos algon en json lo lea

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions))

//Routes
app.use('/api/auth', authRoutes)
app.use('/api/league', leagueRoutes)
app.use('/api/teams', teamsRoutes)

// Manejo de rutas no encontradas (debe ir después de todas las rutas)
app.use(notFoundHandler)

// Manejo global de errores (debe ir al final)
app.use(errorHandler)

export default app