import type {
  CreateLeagueDTO,
  GenerateFixtureOptionsDTO,
  RestructureFixtureAuditDTO,
  UpdateLeagueDTO,
} from "../../application/league/dto/LeagueDTOs";

export interface ILeagueService {
  createLeague(managerId: number, payload: CreateLeagueDTO): Promise<string>;
  getAllLeagues(managerId: number): Promise<unknown>;
  getLeagueById(leagueId: string, managerId: number): Promise<unknown>;
  updateLeague(leagueId: string, managerId: number, payload: UpdateLeagueDTO): Promise<string>;
  deleteLeague(leagueId: string, managerId: number): Promise<string>;
  getTrainerTeams(leagueId: string, managerId: number, email: string): Promise<unknown>;
  getTeamsLeague(leagueId: string, managerId: number): Promise<unknown>;
  removeTeamFromLeague(leagueId: string, teamId: string, managerId: number): Promise<string>;
  generateFixture(
    leagueId: string,
    managerId: number,
    type: "round-robin" | "knockout",
    options?: GenerateFixtureOptionsDTO
  ): Promise<{ message: string; totalMatches: number }>;
  getLeagueFixture(leagueId: string): Promise<unknown>;
  getFixtureWithLocations(leagueId: string): Promise<unknown>;

  addTeamToLeague(leagueId: string, teamId: number): Promise<string>;
  getStandings(
    leagueId: string,
    userId: number | undefined,
    role: string | undefined
  ): Promise<unknown>;
  getLeagueMatchesGrouped(
    leagueId: string,
    userId: number | undefined,
    role: string | undefined
  ): Promise<Record<string, unknown[]>>;
  restructureFixture(
    leagueId: string,
    audit: RestructureFixtureAuditDTO
  ): Promise<{ message: string; newMatchesGenerated: number }>;
}
