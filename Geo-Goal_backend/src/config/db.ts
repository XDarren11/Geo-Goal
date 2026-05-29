import colors from 'colors'
import { Sequelize } from "sequelize-typescript";
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true })

const db = new Sequelize(process.env.DATABASE_URL!, {
    models: [__dirname + '/../models/**/*.*'],
    logging: process.env.SQL_LOG === 'true' ? console.log : false,   // bonus: silenciar logs
    // Pool y timeouts robustos para Supabase Postgres (corta conexiones idle agresivamente)
    pool: {
        max: 10,                  // conexiones concurrentes
        min: 0,                   // sin mantener conexiones idle
        acquire: 60000,           // 60s para obtener conexión del pool (default: 30s)
        idle: 10000,              // 10s antes de soltar una conexión idle
    },
    dialectOptions: {
        statement_timeout: 120000,           // 2 min máx por statement (default ilimitado)
        idle_in_transaction_session_timeout: 60000,  // 1 min idle dentro de tx
        keepAlive: true,                     // TCP keepalive: evita que NAT/firewall corte
    },
    retry: {
        max: 3,
        match: [
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/,
            /Connection terminated unexpectedly/,
        ],
    },
})

export const connectDB = async () => {
    try {
        await db.authenticate()

        // Sync SOLO en desarrollo local explícito — nunca en producción
        if (process.env.DB_SYNC === 'true') {
            await db.sync({ alter: true })
            console.log(colors.yellow.bold('[DB] sync({alter:true}) activado — solo para dev local'))
        }

        console.log(colors.magenta.bold('Conexión exitosa a la BD'))
    } catch (error) {
        console.log(error)
        console.log(colors.red.bold('Error al conectar a la Base de Datos'))
        process.exit(1)
    }
}

export default db