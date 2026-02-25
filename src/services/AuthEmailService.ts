import { transporter } from "../config/nodemailer";

interface IEmail {
    email: string;
    name: string;
    token: string;
}

/**
 * Servicio para envío de emails de autenticación
 */
export class AuthEmailService {
    /**
     * Envía email de confirmación de cuenta
     */
    static sendConfirmationEmail = async (user: IEmail): Promise<void> => {
        try {
            await transporter.sendMail({
                from: 'GeoGoal <noreply@geogoal.com>',
                to: user.email,
                subject: 'GeoGoal - Confirma tu cuenta',
                text: 'GeoGoal - Confirma tu cuenta',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">¡Bienvenido a GeoGoal!</h2>
                        <p>Hola <strong>${user.name}</strong>,</p>
                        <p>Has creado tu cuenta en GeoGoal. Ya casi está todo listo, solo debes confirmar tu cuenta.</p>
                        <p>Visita el siguiente enlace:</p>
                        <a href="${process.env.FRONTEND_URL}/auth/confirm-account" 
                           style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
                            Confirmar cuenta
                        </a>
                        <p>E ingresa el siguiente código:</p>
                        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                            ${user.token}
                        </div>
                        <p style="color: #666; font-size: 14px;">Este código expira en 10 minutos.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px;">Si no creaste esta cuenta, por favor ignora este email.</p>
                    </div>
                `
            });
            console.log(`✅ Email de confirmación enviado a ${user.email}`);
        } catch (error) {
            console.error('❌ Error al enviar email de confirmación:', error);
            throw new Error('Error al enviar email de confirmación');
        }
    };

    /**
     * Envía email de recuperación de contraseña
     */
    static sendPasswordResetToken = async (user: IEmail): Promise<void> => {
        try {
            await transporter.sendMail({
                from: 'GeoGoal <noreply@geogoal.com>',
                to: user.email,
                subject: 'GeoGoal - Restablece tu contraseña',
                text: 'GeoGoal - Restablece tu contraseña',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Restablece tu contraseña</h2>
                        <p>Hola <strong>${user.name}</strong>,</p>
                        <p>Has solicitado restablecer tu contraseña en GeoGoal.</p>
                        <p>Visita el siguiente enlace:</p>
                        <a href="${process.env.FRONTEND_URL}/auth/new-password" 
                           style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px;">
                            Restablecer contraseña
                        </a>
                        <p>E ingresa el siguiente código:</p>
                        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                            ${user.token}
                        </div>
                        <p style="color: #666; font-size: 14px;">Este código expira en 10 minutos.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px;">Si no solicitaste este cambio, por favor ignora este email y tu contraseña permanecerá sin cambios.</p>
                    </div>
                `
            });
            console.log(`✅ Email de recuperación enviado a ${user.email}`);
        } catch (error) {
            console.error('❌ Error al enviar email de recuperación:', error);
            throw new Error('Error al enviar email de recuperación');
        }
    };
}

// Mantener exportación con nombre anterior para compatibilidad
export const AuthEmail = AuthEmailService;

