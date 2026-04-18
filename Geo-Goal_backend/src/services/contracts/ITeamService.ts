export type CreateTeamPayload = {
  name: string;
  lat: number;
  lng: number;
  fieldAddress: string;
  logoUrl: string | null;
};

export interface ITeamService {
  getPlayerDashboard(userId: number): Promise<unknown>;
  getCoachDashboard(trainerId: number): Promise<unknown>;
  getMyTeams(trainerId: number): Promise<unknown>;
  getPlayerTeams(userId: number): Promise<unknown>;
  getTeamById(teamId: string, userId: number, role: string): Promise<unknown>;
  createTeam(trainerId: number, payload: CreateTeamPayload): Promise<string>;
  updateTeam(
    teamId: string,
    trainerId: number,
    payload: Record<string, unknown> & { logoUrl?: string }
  ): Promise<string>;
  deleteTeam(teamId: string, trainerId: number): Promise<string>;
  findPlayer(teamId: string, trainerId: number, email: string): Promise<unknown>;
  addPlayerToTeam(teamId: string, trainerId: number, playerId: number): Promise<string>;
  getPlayersTeam(teamId: string, userId: number, role: string): Promise<unknown>;
  removePlayerFromTeam(
    teamId: string,
    playerId: string,
    trainerId: number
  ): Promise<string>;
  getCoachActiveLeagues(trainerId: number): Promise<unknown>;
  getTeamDashboard(leagueId: string, teamId: string): Promise<unknown>;
  updatePlayerAvatar(teamId: string, userId: number, avatarFilename: string): Promise<{ avatarUrl: string }>;
}
