import type { Request, Response } from "express";
import { buildLeagueInvitationMediator } from "../application/invitations/league/LeagueInvitationMediator";
import { LeagueInvitationServiceAdapter } from "../services/LeagueInvitationServiceAdapter";
import {
  GenerateLeagueInvitationRequest,
  GetLeagueInvitationRequest,
  JoinLeagueByCodeRequest,
  RevokeLeagueInvitationRequest,
} from "../application/invitations/league/requests/LeagueInvitationRequests";

const leagueInvitationMediator = buildLeagueInvitationMediator(
  new LeagueInvitationServiceAdapter()
);

export class LeagueInvitationController {
  static generateInvitation = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const { expiresIn } = req.body;
    const result = await leagueInvitationMediator.send(
      new GenerateLeagueInvitationRequest(Number(leagueId), req.user!.id, expiresIn)
    );
    res.json(result);
  };

  static getInvitation = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await leagueInvitationMediator.send(
      new GetLeagueInvitationRequest(Number(leagueId), req.user!.id)
    );
    res.json(result);
  };

  static joinByCode = async (req: Request, res: Response): Promise<void> => {
    const { code, teamId } = req.body;
    const result = await leagueInvitationMediator.send(
      new JoinLeagueByCodeRequest(
        code,
        req.user!.id,
        req.user!.role,
        teamId != null ? Number(teamId) : undefined
      )
    );
    res.send(result);
  };

  static revokeInvitation = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await leagueInvitationMediator.send(
      new RevokeLeagueInvitationRequest(Number(leagueId), req.user!.id)
    );
    res.send(result);
  };
}
