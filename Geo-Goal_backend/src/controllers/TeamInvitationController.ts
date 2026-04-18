import type { Request, Response } from "express";
import { buildTeamInvitationMediator } from "../application/invitations/team/TeamInvitationMediator";
import { TeamInvitationServiceAdapter } from "../services/TeamInvitationServiceAdapter";
import {
  GenerateTeamInvitationRequest,
  GetTeamInvitationRequest,
  JoinTeamByCodeRequest,
  RevokeTeamInvitationRequest,
} from "../application/invitations/team/requests/TeamInvitationRequests";

const teamInvitationMediator = buildTeamInvitationMediator(new TeamInvitationServiceAdapter());

export class TeamInvitationController {
  static generateInvitation = async (req: Request, res: Response): Promise<void> => {
    const { teamId } = req.params;
    const { expiresIn } = req.body;
    const result = await teamInvitationMediator.send(
      new GenerateTeamInvitationRequest(Number(teamId), req.user!.id, expiresIn)
    );
    res.json(result);
  };

  static getInvitation = async (req: Request, res: Response): Promise<void> => {
    const { teamId } = req.params;
    const result = await teamInvitationMediator.send(
      new GetTeamInvitationRequest(Number(teamId), req.user!.id)
    );
    res.json(result);
  };

  static joinByCode = async (req: Request, res: Response): Promise<void> => {
    const { code, playerName, jerseyNumber } = req.body;
    const result = await teamInvitationMediator.send(
      new JoinTeamByCodeRequest(code, req.user!.id, playerName, Number(jerseyNumber))
    );
    res.send(result);
  };

  static revokeInvitation = async (req: Request, res: Response): Promise<void> => {
    const { teamId } = req.params;
    const result = await teamInvitationMediator.send(
      new RevokeTeamInvitationRequest(Number(teamId), req.user!.id)
    );
    res.send(result);
  };
}
