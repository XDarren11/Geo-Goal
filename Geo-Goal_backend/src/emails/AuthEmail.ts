import { transporter } from "../config/nodemailer";

export interface IEmail {
  email: string;
  name: string;
  token: string;
}

export class AuthEmail {
  static sendConfirmationEmail = async (user: IEmail) => {
    await transporter.sendMail({
      from: "GeoGoal <correo@correo.com>",
      to: user.email,
      subject: "GeoGoal - Confirma tu cuenta",
      text: "GeoGoal - Confirma tu cuenta",
      html: `<p>Hola: ${user.name}, has creado tu cuenta en GeoGoal, ya casi está
            todo listo, solo debes confirmar tu cuenta</p>
                <p>Visita el siguiente enlace:</p>
                <a href='${process.env.FRONTEND_URL}/auth/confirm-account'>Confirmar cuenta</a>
                <p>E ingresa el código: <b>${user.token}</b></p>
                <p>Este Token expira en 10 minutos</p>`,
    });
  };

  static sendPasswordResetToken = async (user: IEmail) => {
    await transporter.sendMail({
      from: "GeoGoal <correo@correo.com>",
      to: user.email,
      subject: "GeoGoal - Restablece tu contraseña",
      text: "GeoGoal - Restablece tu contraseña",
      html: `<p>Hola: ${user.name}, has solicitado restablecer tu contraseña</p>
                <p>Visita el siguiente enlace:</p>
                <a href='${process.env.FRONTEND_URL}/auth/new-password'>Restablecer contraseña</a>
                <p>E ingresa el código: <b>${user.token}</b></p>
                <p>Este Token expira en 10 minutos</p>`,
    });
  };
}
