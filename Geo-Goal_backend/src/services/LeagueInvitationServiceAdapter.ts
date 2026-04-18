import { LeagueInvitationService } from "./LeagueInvitationService";
import type { ILeagueInvitationService } from "./contracts/ILeagueInvitationService";

export class LeagueInvitationServiceAdapter implements ILeagueInvitationService {
  generateInvitationCode(
    leagueId: number,
    userId: number,
    expiresIn?: number
  ): Promise<{ code: string; expiresAt: Date | null }> {
    return LeagueInvitationService.generateInvitationCode(leagueId, userId, expiresIn);
  }

  getInvitationCode(leagueId: number, userId: number): Promise<unknown> {
    return LeagueInvitationService.getInvitationCode(leagueId, userId);
  }

  joinLeagueByCode(
    code: string,
    userId: number,
    role: string,
    teamId?: number
  ): Promise<string> {
    return LeagueInvitationService.joinLeagueByCode(code, userId, role, teamId);
  }

  revokeInvitationCode(leagueId: number, userId: number): Promise<string> {
    return LeagueInvitationService.revokeInvitationCode(leagueId, userId);
  }
}
