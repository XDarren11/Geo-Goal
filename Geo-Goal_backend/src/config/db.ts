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
            if (process.env.NODE_ENV === 'production') {
                console.log(colors.red.bold('DB_SYNC=true está bloqueado en producción. Usa migraciones en su lugar.'))
                process.exit(1)
            }

            await db.sync()
            console.log(colors.yellow.bold('DB_SYNC=true: sync ejecutado (solo desarrollo local). Las migraciones son la fuente oficial de cambios de esquema.'))
        }

        console.log(colors.magenta.bold(`Conexion exitosa a la BD`))
    } catch (error) {
        console.log(error)
        console.log(colors.red.bold('Error al conectar a la Base de Datos'))
        process.exit(1)
    }
}

