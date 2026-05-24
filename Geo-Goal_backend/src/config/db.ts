import colors from 'colors'
import { Sequelize } from "sequelize-typescript";
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true })

const db = new Sequelize(process.env.DATABASE_URL!, {
    models: [__dirname + '/../models/**/*.ts'],
    logging: process.env.SQL_LOG === 'true' ? console.log : false,   // bonus: silenciar logs
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