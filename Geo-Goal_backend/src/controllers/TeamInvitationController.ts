import type { Request, Response } from "express";
import { TeamInvitationService } from "../services/TeamInvitationService";

/**
 * Handlers de invitaciones de equipo
 */
export class TeamInvitationController {
  /**
   * Generar nuevo código de invitación para un equipo
   * POST /api/teams/:teamId/invitation
   */
  static generateInvitation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { teamId } = req.params;
    const { expiresIn } = req.body; // Minutos (opcional)

    const result = await TeamInvitationService.generateInvitationCode(
      Number(teamId),
      req.user!.id,
      expiresIn
    );

    res.json(result);
  };

  /**
   * Obtener código de invitación actual
   * GET /api/teams/:teamId/invitation
   */
  static getInvitation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { teamId } = req.params;

    const result = await TeamInvitationService.getInvitationCode(
      Number(teamId),
      req.user!.id
    );

    res.json(result);
  };

  /**
   * Unir jugador a equipo usando código
   * POST /api/teams/join-by-code
   */
  static joinByCode = async (req: Request, res: Response): Promise<void> => {
    const { code, playerName, jerseyNumber } = req.body;

    const result = await TeamInvitationService.joinTeamByCode(
      code,
      req.user!.id,
      playerName,
      Number(jerseyNumber)
    );

    res.send(result);
  };

  /**
   * Revocar código de invitación
   * DELETE /api/teams/:teamId/invitation
   */
  static revokeInvitation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { teamId } = req.params;

    const result = await TeamInvitationService.revokeInvitationCode(
      Number(teamId),
      req.user!.id
    );

    res.send(result);
  };
}
