import { transporter } from "../config/nodemailer"

interface IEmail {
    email: string
    name: string
    token: string 
}

export class AuthEmail {
    static sendConfirmationEmail = async (user: IEmail) => {
        await transporter.sendMail({
            from: 'GeoGoal <correo@correo.com>',
            to: user.email,
            subject: 'GeoGoal - Confirma tu cuenta',
            text: 'GeoGoal - Confrima tu cuenta',
            html: `<p>Hola: ${user.name}, has creado tu cuenta en GeoGoal, ya casi esta
            todo listo, solo debes confirmar tu cuenta</p>
                <p>Vista el siguiente enlace:</p>
                <a href='${process.env.FRONTEND_URL}/auth/confirm-account'>Confirmar cuenta</a>
                <p>E ingresa el codigo: <b>${user.token}</b></p>
                <p>Este Token expira en 10 minutos</p>           
            `
        })
    }

    static sendPasswordResetToken = async (user: IEmail) => {
        await transporter.sendMail({
            from: 'GeoGoal <correo@correo.com>',
            to: user.email,
            subject: 'GeoGoal - Reestablece tu contraseña',
            text: 'GeoGoal - Reestablece tu contraseña',
            html: `<p>Hola: ${user.name}, has solicitado reestablecer tu contraseña </p>
                <p>Vista el siguiente enlace:</p>
                <a href='${process.env.FRONTEND_URL}/auth/new-password'>Reestablecer contraseña</a>
                <p>E ingresa el codigo: <b>${user.token}</b></p>
                <p>Este Token expira en 10 minutos</p>           
            `
        })
    }
}