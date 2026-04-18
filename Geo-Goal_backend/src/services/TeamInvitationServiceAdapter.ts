import { TeamInvitationService } from "./TeamInvitationService";
import type { ITeamInvitationService } from "./contracts/ITeamInvitationService";

export class TeamInvitationServiceAdapter implements ITeamInvitationService {
  generateInvitationCode(
    teamId: number,
    userId: number,
    expiresIn?: number
  ): Promise<{ code: string; expiresAt: Date | null }> {
    return TeamInvitationService.generateInvitationCode(teamId, userId, expiresIn);
  }

  getInvitationCode(teamId: number, userId: number): Promise<unknown> {
    return TeamInvitationService.getInvitationCode(teamId, userId);
  }

  joinTeamByCode(
    code: string,
    userId: number,
    playerName: string,
    jerseyNumber: number
  ): Promise<string> {
    return TeamInvitationService.joinTeamByCode(code, userId, playerName, jerseyNumber);
  }

  revokeInvitationCode(teamId: number, userId: number): Promise<string> {
    return TeamInvitationService.revokeInvitationCode(teamId, userId);
  }
}
