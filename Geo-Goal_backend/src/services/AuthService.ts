import { User } from "../models/User";
import Token from "../models/Token";
import { checkPassword, hashPassword } from "../utils/auth";
import { generateToken } from "../utils/token";
import { generateJWT } from "../utils/jwt";
import { AuthEmail } from "../emails/AuthEmail";
import { AppError } from "../types/errors";

const VALID_ROLES = ["coach", "player", "admin"] as const;

export type CreateAccountInput = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export class AuthService {
  static async createAccount(input: CreateAccountInput): Promise<string> {
    const { name, email, password, role } = input;

    if (!role || !VALID_ROLES.includes(role as any)) {
      throw new AppError(400, "Rol no seleccionado");
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      throw new AppError(409, "El usuario ya está registrado");
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const tokenRecord = await Token.create({
      token: generateToken(),
      userId: user.id,
    });

    await AuthEmail.sendConfirmationEmail({
      email: user.email,
      name: user.name,
      token: tokenRecord.token,
    });

    return "Cuenta creada, revisa tu email para confirmarla";
  }

  static async confirmAccount(token: string): Promise<string> {
    const tokenExists = await Token.findOne({ where: { token } });
    if (!tokenExists) {
      throw new AppError(404, "Token no válido");
    }

    const user = await User.findByPk(tokenExists.userId);
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    user.confirmed = true;
    await user.save();
    await tokenExists.destroy();

    return "Cuenta confirmada correctamente";
  }

  static async login(input: LoginInput): Promise<string> {
    const { email, password } = input;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    if (!user.confirmed) {
      const tokenRecord = await Token.create({
        token: generateToken(),
        userId: user.id,
      });
      await AuthEmail.sendConfirmationEmail({
        email: user.email,
        name: user.name,
        token: tokenRecord.token,
      });
      throw new AppError(
        401,
        "La cuenta no ha sido confirmada, hemos enviado un e-mail de confirmación"
      );
    }

    const isPasswordCorrect = await checkPassword(password, user.password);
    if (!isPasswordCorrect) {
      throw new AppError(401, "Contraseña incorrecta");
    }

    return generateJWT({ id: user.id });
  }

  static async requestConfirmationCode(email: string): Promise<string> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError(404, "El usuario no está registrado");
    }
    if (user.confirmed) {
      throw new AppError(403, "El usuario ya está confirmado");
    }

    const tokenRecord = await Token.create({
      token: generateToken(),
      userId: user.id,
    });
    await AuthEmail.sendConfirmationEmail({
      email: user.email,
      name: user.name,
      token: tokenRecord.token,
    });

    return "Se envió un nuevo Token a tu e-mail";
  }

  static async forgotPassword(email: string): Promise<string> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError(404, "El usuario no está registrado");
    }

    const tokenRecord = await Token.create({
      token: generateToken(),
      userId: user.id,
    });
    await AuthEmail.sendPasswordResetToken({
      email: user.email,
      name: user.name,
      token: tokenRecord.token,
    });

    return "Se enviaron las instrucciones a tu correo";
  }

  static async validateToken(token: string): Promise<string> {
    const tokenExists = await Token.findOne({ where: { token } });
    if (!tokenExists) {
      throw new AppError(404, "Token no válido");
    }
    return "Token válido, Define tu nueva contraseña";
  }

  static async updatePasswordWithToken(
    token: string,
    password: string
  ): Promise<string> {
    const tokenExists = await Token.findOne({ where: { token } });
    if (!tokenExists) {
      throw new AppError(404, "Token no válido");
    }

    const user = await User.findByPk(tokenExists.userId);
    if (!user) {
      throw new AppError(404, "Usuario no existe");
    }

    user.password = await hashPassword(password);
    await user.save();
    await tokenExists.destroy();

    return "La contraseña se modificó correctamente";
  }
}
