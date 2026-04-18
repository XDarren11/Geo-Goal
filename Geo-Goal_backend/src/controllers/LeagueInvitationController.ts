import type { Request, Response } from "express";
import { LeagueInvitationService } from "../services/LeagueInvitationService";

/**
 * Handlers de invitaciones de liga
 */
export class LeagueInvitationController {
  /**
   * Generar nuevo código de invitación para una liga
   * POST /api/leagues/:leagueId/invitation
   */
  static generateInvitation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { leagueId } = req.params;
    const { expiresIn } = req.body; // Minutos (opcional)

    const result = await LeagueInvitationService.generateInvitationCode(
      Number(leagueId),
      req.user!.id,
      expiresIn
    );

    res.json(result);
  };

  /**
   * Obtener código de invitación actual
   * GET /api/leagues/:leagueId/invitation
   */
  static getInvitation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { leagueId } = req.params;

    const result = await LeagueInvitationService.getInvitationCode(
      Number(leagueId),
      req.user!.id
    );

    res.json(result);
  };

  /**
   * Unir equipo a liga usando código
   * POST /api/leagues/join-by-code
   */
  static joinByCode = async (req: Request, res: Response): Promise<void> => {
    const { code, teamId } = req.body;

    const result = await LeagueInvitationService.joinLeagueByCode(
      code,
      req.user!.id,
      req.user!.role,
      teamId != null ? Number(teamId) : undefined
    );

    res.send(result);
  };

  /**
   * Revocar código de invitación
   * DELETE /api/leagues/:leagueId/invitation
   */
  static revokeInvitation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { leagueId } = req.params;

    const result = await LeagueInvitationService.revokeInvitationCode(
      Number(leagueId),
      req.user!.id
    );

    res.send(result);
  };
}
