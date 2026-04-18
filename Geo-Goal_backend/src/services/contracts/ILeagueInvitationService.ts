export interface ILeagueInvitationService {
  generateInvitationCode(
    leagueId: number,
    userId: number,
    expiresIn?: number
  ): Promise<{ code: string; expiresAt: Date | null }>;
  getInvitationCode(leagueId: number, userId: number): Promise<unknown>;
  joinLeagueByCode(
    code: string,
    userId: number,
    role: string,
    teamId?: number
  ): Promise<string>;
  revokeInvitationCode(leagueId: number, userId: number): Promise<string>;
}
