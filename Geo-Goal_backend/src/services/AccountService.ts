import { Op } from "sequelize";
import { User } from "../models/User";
import Token from "../models/Token";
import { checkPassword, hashPassword } from "../utils/auth";
import { generateToken } from "../utils/token";
import { AuthEmail } from "../emails/AuthEmail";
import { AppError } from "../types/errors";

export class AccountService {
  static async updateUsername(userId: number, username: string): Promise<{ username: string | null }> {
    const normalized = AccountService.normalizeUsername(username);
    if (!normalized) {
      throw new AppError(400, "El nombre de usuario no puede estar vacío");
    }
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      throw new AppError(400, "El nombre de usuario debe tener 3-20 caracteres y solo puede contener letras, números y guiones bajos");
    }

    const existing = await User.findOne({
      where: {
        username: normalized,
        id: { [Op.ne]: userId },
      },
    });

    if (existing) {
      throw new AppError(409, "El nombre de usuario ya está en uso");
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    user.username = normalized;
    await user.save();
    return { username: user.username };
  }

  static async updatePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Promise<string> {
    if (newPassword !== newPasswordConfirmation) {
      throw new AppError(400, "Las contraseñas no coinciden");
    }
    if (newPassword.length < 8) {
      throw new AppError(400, "La contraseña es muy corta, mínimo 8 caracteres");
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    const valid = await checkPassword(currentPassword, user.password);
    if (!valid) {
      throw new AppError(401, "La contraseña actual no es correcta");
    }

    user.password = await hashPassword(newPassword);
    user.tokenVersion += 1;
    await user.save();
    return "Contraseña actualizada correctamente";
  }

  static async resendConfirmationEmail(userId: number): Promise<string> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }
    if (user.confirmed) {
      throw new AppError(400, "La cuenta ya está confirmada");
    }

    await Token.destroy({ where: { userId } });
    const tokenRecord = await Token.create({ token: generateToken(), userId });
    await AuthEmail.sendConfirmationEmail({
      email: user.email,
      name: user.name,
      token: tokenRecord.token,
    });

    return "Te enviamos un nuevo correo de confirmación";
  }

  static async getProfile(userId: number): Promise<Pick<User, "id" | "name" | "email" | "username" | "confirmed" | "role">> {
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "username", "confirmed", "role"],
    });

    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    return user;
  }

  private static normalizeUsername(username: string): string {
    return username.trim().replace(/^@+/, "").toLowerCase();
  }
}
