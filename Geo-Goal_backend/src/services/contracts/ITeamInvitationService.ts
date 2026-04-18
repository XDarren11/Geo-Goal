export interface ITeamInvitationService {
  generateInvitationCode(
    teamId: number,
    userId: number,
    expiresIn?: number
  ): Promise<{ code: string; expiresAt: Date | null }>;
  getInvitationCode(teamId: number, userId: number): Promise<unknown>;
  joinTeamByCode(
    code: string,
    userId: number,
    playerName: string,
    jerseyNumber: number
  ): Promise<string>;
  revokeInvitationCode(teamId: number, userId: number): Promise<string>;
}
