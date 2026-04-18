import colors from 'colors'
import { Sequelize } from "sequelize-typescript";
import dotenv from 'dotenv'

dotenv.config()

const db = new Sequelize(process.env.DATABASE_URL!, {
    models: [__dirname + '/../models/**/*.ts']
})

export const connectDB = async () => {
    try {
        await db.authenticate()
        if (process.env.DB_SYNC === 'true') {
            await db.sync()
            console.log(colors.yellow.bold('DB_SYNC=true: sincronización automática activada solo para desarrollo local.'))
        }
        await db.sync({ alter: true });
        console.log(colors.magenta.bold(`Conexion exitosa a la BD`))
    } catch (error) {
        console.log(error)
        console.log(colors.red.bold('Error al conectar a la Base de Datos'))
        process.exit(1)
    }
}

