import { TeamInvitation } from "../models/TeamInvitation";
import { Team } from "../models/Team";
import { TeamMember } from "../models/TeamMember";
import { User } from "../models/User";
import { AppError } from "../types/errors";

export class TeamInvitationService {
  /**
   * Genera un código de invitación único para un equipo
   */
  static async generateInvitationCode(
    teamId: number,
    userId: number,
    expiresIn?: number // Minutos
  ): Promise<{ code: string; expiresAt: Date | null }> {
    // Verificar que el equipo existe y el usuario es el entrenador
    const team = await Team.findOne({
      where: { id: teamId, trainerId: userId },
    });

    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no tienes acceso");
    }

    // Generar código único
    const code = this.generateUniqueCode();

    // Calcular expiración si se proporciona
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);
    }

    // Crear o actualizar invitación (solo una activa por equipo)
    const [invitation] = await TeamInvitation.findOrCreate({
      where: { teamId },
      defaults: {
        code,
        teamId,
        createdBy: userId,
        expiresAt,
        usesCount: 0,
        maxUses: null,
      },
    });

    // Si ya existía, actualizar el código
    if (invitation.code !== code) {
      invitation.code = code;
      invitation.expiresAt = expiresAt;
      invitation.usesCount = 0;
      await invitation.save();
    }

    return {
      code: invitation.code,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Obtiene el código de invitación actual de un equipo
   */
  static async getInvitationCode(
    teamId: number,
    userId: number
  ): Promise<TeamInvitation | null> {
    const team = await Team.findOne({
      where: { id: teamId, trainerId: userId },
    });

    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no tienes acceso");
    }

    return TeamInvitation.findOne({ where: { teamId } });
  }

  /**
   * Permite que un jugador se una a un equipo usando un código
   */
  static async joinTeamByCode(code: string, userId: number): Promise<string> {
    // Buscar la invitación
    const invitation = await TeamInvitation.findOne({
      where: { code },
      include: [Team],
    });

    if (!invitation) {
      throw new AppError(400, "Código de invitación inválido");
    }

    // Validar que no haya expirado
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      throw new AppError(400, "El código de invitación ha expirado");
    }

    // Validar límite de usos
    if (
      invitation.maxUses !== null &&
      invitation.usesCount >= invitation.maxUses
    ) {
      throw new AppError(400, "El código ha alcanzado el límite de usos");
    }

    // Verificar que el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    // Idempotencia: si ya pertenece al mismo equipo, no fallar
    const sameTeamMembership = await TeamMember.findOne({
      where: { userId, teamId: invitation.teamId },
    });

    if (sameTeamMembership) {
      return `Ya perteneces al equipo ${invitation.team.name}`;
    }

    // Regla de negocio: puede estar en varios equipos, pero no en la misma liga
    if (invitation.team.leagueId) {
      const memberships = await TeamMember.findAll({
        where: { userId },
        attributes: ["teamId"],
      });

      const existingTeamIds = memberships.map((m) => m.teamId);

      if (existingTeamIds.length > 0) {
        const teamInSameLeague = await Team.findOne({
          where: {
            id: existingTeamIds,
            leagueId: invitation.team.leagueId,
          },
          attributes: ["id", "name"],
        });

        if (teamInSameLeague) {
          throw new AppError(
            400,
            `Ya perteneces a un equipo de esta liga (${teamInSameLeague.name})`
          );
        }
      }
    }

    // Agregar usuario al equipo
    await TeamMember.create({
      userId,
      teamId: invitation.teamId,
    });

    // Incrementar contador de usos
    invitation.usesCount += 1;
    await invitation.save();

    return `¡Bienvenido! Te uniste al equipo ${invitation.team.name}`;
  }

  /**
   * Genera un código único y aleatorio
   */
  private static generateUniqueCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const length = 8;
    let code = "";
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Revoca un código de invitación
   */
  static async revokeInvitationCode(
    teamId: number,
    userId: number
  ): Promise<string> {
    const team = await Team.findOne({
      where: { id: teamId, trainerId: userId },
    });

    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no tienes acceso");
    }

    await TeamInvitation.destroy({ where: { teamId } });
    return "Código de invitación revocado";
  }
}
