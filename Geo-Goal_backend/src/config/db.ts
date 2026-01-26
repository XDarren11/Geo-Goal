import colors from 'colors'
import { Sequelize } from "sequelize-typescript";
import dotenv from 'dotenv'

dotenv.config()

const db = new Sequelize(process.env.DATABASE_URL!, {
    models: [__dirname + '/../models/**/*.ts']
})

export const connetDB = async () => {
    try {
        await db.authenticate()
        await db.sync({ alter: true }); //para crear tablas nuevas sin borrar datos
        console.log(colors.magenta.bold(`Conexion exitosa a la BD`))
    } catch (error) {
        console.log(error)
        console.log(colors.red.bold('Error al conectar a la Base de Datos'))
        process.exit(1)
    }
}

