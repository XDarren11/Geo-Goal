import { LeagueInvitation } from "../models/LeagueInvitation";
import { League } from "../models/League";
import { Team } from "../models/Team";
import { LeagueAdmin } from "../models/LeagueAdmin";
import { AppError } from "../types/errors";
import { Op } from "sequelize";

export class LeagueInvitationService {
  /**
   * Genera un código de invitación único para una liga
   */
  static async generateInvitationCode(
    leagueId: number,
    userId: number,
    expiresIn?: number // Minutos
  ): Promise<{ code: string; expiresAt: Date | null }> {
    // Verificar que la liga existe y el usuario es el manager
    const league = await League.findOne({
      where: { id: leagueId, managerId: userId },
    });

    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes acceso");
    }

    // Generar código único (6-8 caracteres alfanuméricos)
    const code = this.generateUniqueCode();

    // Calcular expiración si se proporciona
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);
    }

    // Crear o actualizar invitación (solo una activa por liga)
    const [invitation] = await LeagueInvitation.findOrCreate({
      where: { leagueId },
      defaults: {
        code,
        leagueId,
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
   * Obtiene el código de invitación actual de una liga
   */
  static async getInvitationCode(
    leagueId: number,
    userId: number
  ): Promise<LeagueInvitation | null> {
    const league = await League.findOne({
      where: { id: leagueId, managerId: userId },
    });

    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes acceso");
    }

    return LeagueInvitation.findOne({ where: { leagueId } });
  }

  /**
   * Permite que un equipo se una a una liga usando un código
   */
  static async joinLeagueByCode(
    code: string,
    userId: number,
    userRole: string,
    teamId?: number
  ): Promise<string> {
    // Buscar la invitación
    const invitation = await LeagueInvitation.findOne({
      where: { code },
      include: [League],
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

    if (userRole === "referee") {
      const league = invitation.league;
      if (!league) {
        throw new AppError(404, "Liga no encontrada");
      }

      if (league.managerId === userId) {
        throw new AppError(409, "Ya perteneces a la liga como administrador principal");
      }

      const [assignment, created] = await LeagueAdmin.findOrCreate({
        where: {
          leagueId: invitation.leagueId,
          userId,
        },
        defaults: {
          leagueId: invitation.leagueId,
          userId,
          leagueRole: "assistant",
          assignedBy: invitation.createdBy ?? null,
        },
      });

      if (!created) {
        throw new AppError(409, "Ya perteneces a esta liga");
      }

      invitation.usesCount += 1;
      await invitation.save();

      return "Te uniste a la liga como árbitro";
    }

    if (userRole !== "coach") {
      throw new AppError(403, "Tu rol no puede unirse a ligas por código");
    }

    if (!teamId) {
      throw new AppError(400, "Debes enviar un equipo para unirte a la liga");
    }

    // Verificar que el equipo existe
    const team = await Team.findByPk(teamId);
    if (!team) {
      throw new AppError(404, "Equipo no encontrado");
    }

    if (team.trainerId !== userId) {
      throw new AppError(403, "Solo puedes unir tu propio equipo a la liga");
    }

    // Verificar que el equipo no está ya en la liga
    if (team.leagueId === invitation.leagueId) {
      throw new AppError(400, "Este equipo ya está en la liga");
    }

    if (team.leagueId && team.leagueId !== invitation.leagueId) {
      throw new AppError(400, "Este equipo ya pertenece a otra liga");
    }

    const coachTeamInLeague = await Team.findOne({
      where: {
        trainerId: team.trainerId,
        leagueId: invitation.leagueId,
        id: { [Op.ne]: team.id },
      },
      attributes: ["id", "name"],
    });

    if (coachTeamInLeague) {
      throw new AppError(
        409,
        `El entrenador ya dirige otro equipo en esta liga (${coachTeamInLeague.name})`
      );
    }

    // Agregar equipo a la liga
    team.leagueId = invitation.leagueId;
    await team.save();

    // Incrementar contador de usos
    invitation.usesCount += 1;
    await invitation.save();

    return `Equipo ${team.name} se unió a la liga correctamente`;
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
    leagueId: number,
    userId: number
  ): Promise<string> {
    const league = await League.findOne({
      where: { id: leagueId, managerId: userId },
    });

    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes acceso");
    }

    await LeagueInvitation.destroy({ where: { leagueId } });
    return "Código de invitación revocado";
  }
}
