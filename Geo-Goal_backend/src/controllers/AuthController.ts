import type { Request, Response } from "express"
import { checkPassword, hashPassword } from "../utils/auth"
import Token from "../models/Token"
import { generateToken } from "../utils/token"
import { AuthEmail } from "../emails/AutEmail"
import { generateJWT } from "../utils/jwt"
import { User } from "../models/User"

export class AuthController {

    static createAccount = async (req:Request, res: Response) => {
        try {
            const {password, email, name, role} = req.body

            const validRoles = ['coach', 'player', 'admin']

            // Si el rol que envían NO está en la lista o no lo enviaron...
            if (!role || !validRoles.includes(role)) {
                const error = new Error('Rol no seleccionado');
                return res.status(400).json({ error: error.message });
            }

            // Prevenir duplicados
            const userExists = await User.findOne({where: {email}}) 
            if(userExists) {
                const error = new Error('El usuario ya esta registrado')
                return res.status(409).json({error: error.message})
            }

            // Hash Password
            const hashedPassword = await hashPassword(password)

            // Crea un usuario
            const user = await User.create({
                name,
                email,
                password: hashedPassword,
                role
            })

            // Generar Token
            const token = await Token.create({
                token : generateToken(),
                userId : user.id
            })

            // Enviar Email
            AuthEmail.sendConfirmationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            res.send('Cuenta creada, revisa tu email para confirmarla')
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
            console.log(error)
        }
    }

    static confirmAccount = async (req:Request, res: Response) => {
        try {
            
            const {token} = req.body

            const tokenExists = await Token.findOne({where : {token}})
            if(!tokenExists) {
                const error = new Error('Token no valido')
                return res.status(404).json({error: error.message})
            }

            const user = await User.findByPk(tokenExists.userId)
            user.confirmed = true

            await user.save()
            await tokenExists.destroy()

            res.send('Cuenta confirmada correctamente')

        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static login = async (req:Request, res: Response) => {
        try {
            
            const {email, password} = req.body
            const user = await User.findOne({ where : {email}})

            // Validar si el usuario existe
            if(!user) {
                const error = new Error('Usuario no encontrado')
                return res.status(404).json({error: error.message})
            }

            // Validar que la cuenta este confirmada
            if(!user.confirmed) {

                // Generar Token
                const token = await Token.create({
                    token : generateToken(),
                    userId : user.id
                })

                // Enviar Email
                AuthEmail.sendConfirmationEmail({
                    email: user.email,
                    name: user.name,
                    token: token.token
                })

                const error = new Error('La cuenta no ha sido confirmada, hemos enviado un e-mail de confirmacion')
                return res.status(401).json({error: error.message})
            }

            // Validar la contraseña este correcta
            const isPasswordCorrect = await checkPassword(password, user.password)

            if(!isPasswordCorrect) {
                const error = new Error('Contraseña Incorrecta')
                return res.status(401).json({error: error.message})
            }

            // Traemos el JWT   
            const token = generateJWT({ id: user.id });
            res.send(token)

        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static requestConfirmationCode = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;

            // 1. Buscar usuario con sintaxis Sequelize
            const user = await User.findOne({ where: { email } });

            if (!user) {
                const error = new Error('El usuario no está registrado111');
                return res.status(404).json({ error: error.message });
            }

            if (user.confirmed) {
                const error = new Error('El usuario ya está confirmado');
                return res.status(403).json({ error: error.message });
            }

            // 2. Generar y Guardar Token
            const token = await Token.create({
                token: generateToken(),
                userId: user.id // Usamos la columna FK y el ID numérico
            });

            // 3. Enviar Email
            AuthEmail.sendConfirmationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            });

            res.send('Se envió un nuevo Token a tu e-mail');
            
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    }

    static forgotPassword = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;

            // 1. Buscar usuario (Sintaxis Sequelize)
            const user = await User.findOne({ where: { email } });
            
            if (!user) {
                const error = new Error('El usuario no está registrado');
                return res.status(404).json({ error: error.message });
            }

            // 2. Generar Token
            // Usamos .create para guardarlo directamente
            const token = await Token.create({
                token: generateToken(),
                userId: user.id // Usamos la columna FK y el ID numérico
            });

            // 3. Enviar Email
            AuthEmail.sendPasswordResetToken({
                email: user.email,
                name: user.name,
                token: token.token
            });

            res.send('Se enviaron las instrucciones a tu correo');
            
        } catch (error) {
            console.log(error); // Importante para ver errores
            res.status(500).json({ error: 'Hubo un error' });
        }
    }
    
    static validateToken = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;

            // Buscamos si el token existe en la base de datos
            const tokenExists = await Token.findOne({ where: { token } });

            if (!tokenExists) {
                const error = new Error('Token no válido');
                return res.status(404).json({ error: error.message });
            }

            res.send('Token válido, Define tu nueva contraseña');

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    }

    static updatePasswordWithToken = async (req: Request, res: Response) => {
        try {
            const { token } = req.params;
            const { password } = req.body;

            // 1. Buscar el token
            const tokenExists = await Token.findOne({ where: { token } });

            if (!tokenExists) {
                const error = new Error('Token no válido');
                return res.status(404).json({ error: error.message });
            }

            // 2. Buscar al usuario asociado
            const user = await User.findByPk(tokenExists.userId);

            if (!user) {
                 const error = new Error('Usuario no existe');
                 return res.status(404).json({ error: error.message });
            }

            // 3. Hashear la nueva contraseña
            user.password = await hashPassword(password);

            // 4. Guardar cambios y eliminar token
            await user.save();
            
            await tokenExists.destroy();

            res.send('La contraseña se modificó correctamente');

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un error' });
        }
    }

    static user = async (req:Request, res: Response) => {
        return res.json(req.user)
    }
}
