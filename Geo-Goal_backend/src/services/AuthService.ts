import { User } from "../models/User";
import Token from "../models/Token";
import { checkPassword, hashPassword } from "../utils/auth";
import { generateToken } from "../utils/token";
import { generateJWT } from "../utils/jwt";
import { AuthEmail } from "../emails/AuthEmail";
import { AppError } from "../types/errors";
import { RefreshToken } from "../models/RefreshToken";
import { generateRefreshToken, hashRefreshToken } from "../utils/refreshToken";

const VALID_ROLES = ["coach", "player", "admin", "referee"] as const;

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

export type AuthTokens = {
  token: string;
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
};

const REFRESH_EXPIRES_DAYS = 30;

export class AuthService {
  private static buildAuthTokens(user: User, refreshToken: string): AuthTokens {
    const accessToken = generateJWT({ id: user.id, tokenVersion: user.tokenVersion });
    return {
      token: accessToken,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
    };
  }

  private static async issueRefreshToken(userId: number): Promise<string> {
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      replacedByTokenHash: null,
      revokedReason: null,
    });

    return refreshToken;
  }

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

  static async login(input: LoginInput): Promise<AuthTokens> {
    const { email, password } = input;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Mensaje genérico para evitar enumeración de cuentas.
      throw new AppError(401, "Credenciales inválidas");
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
      // Mensaje genérico para evitar enumeración de cuentas.
      throw new AppError(401, "Credenciales inválidas");
    }

    const refreshToken = await this.issueRefreshToken(user.id);
    return this.buildAuthTokens(user, refreshToken);
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
      // Respuesta indistinguible para no revelar si el e-mail existe.
      return "Si la cuenta existe, enviamos instrucciones al correo";
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

    return "Si la cuenta existe, enviamos instrucciones al correo";
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
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await tokenExists.destroy();
    await RefreshToken.update(
      { revokedAt: new Date(), revokedReason: "password_reset" },
      { where: { userId: user.id, revokedAt: null } }
    );

    return "La contraseña se modificó correctamente";
  }

  static async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await RefreshToken.findOne({ where: { tokenHash } });
    if (!stored) {
      throw new AppError(401, "Refresh token inválido");
    }
    if (stored.revokedAt) {
      throw new AppError(401, "Refresh token revocado");
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new AppError(401, "Refresh token expirado");
    }

    const user = await User.findByPk(stored.userId);
    if (!user || !user.confirmed) {
      throw new AppError(401, "Sesión inválida");
    }

    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    stored.revokedAt = new Date();
    stored.replacedByTokenHash = newTokenHash;
    stored.revokedReason = "rotated";
    await stored.save();

    await RefreshToken.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
      revokedAt: null,
      replacedByTokenHash: null,
      revokedReason: null,
    });

    return this.buildAuthTokens(user, newRefreshToken);
  }

  static async revokeRefreshToken(refreshToken: string): Promise<string> {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await RefreshToken.findOne({ where: { tokenHash } });
    if (!stored) return "Sesión cerrada";
    if (!stored.revokedAt) {
      stored.revokedAt = new Date();
      stored.revokedReason = "manual_logout";
      await stored.save();
    }
    return "Sesión cerrada";
  }

  static async revokeAllSessions(userId: number): Promise<string> {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError(404, "Usuario no encontrado");

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await RefreshToken.update(
      { revokedAt: new Date(), revokedReason: "logout_all" },
      { where: { userId, revokedAt: null } }
    );

    return "Se cerraron todas las sesiones";
  }
}
