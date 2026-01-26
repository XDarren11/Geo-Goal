import  express  from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { corsConfig } from './config/cors' 
import { connetDB } from './config/db'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes'
import leagueRoutes from './routes/leagueRoutes'
import teamsRoutes from './routes/teamsRoutes'

dotenv.config()

connetDB()

const app = express()
app.use(cors(corsConfig))

app.use('/uploads', express.static('public/uploads'))

// Logging
app.use(morgan('dev'))

//Leer datos del formulario
app.use(express.json())  //esto es para que en el postman si mandamos algon en json lo lea

//Routes
app.use('/api/auth', authRoutes)
app.use('/api/league', leagueRoutes)
app.use('/api/teams', teamsRoutes)

export default app