import { LeagueService } from "./LeagueService";
import type { ILeagueService } from "./contracts/ILeagueService";
import type { UploadedImageFile } from "../utils/supabaseStorage";
import type {
  CreateLeagueDTO,
  GenerateFixtureOptionsDTO,
  RestructureFixtureAuditDTO,
  UpdateLeagueDTO,
} from "../application/league/dto/LeagueDTOs";

export class LeagueServiceAdapter implements ILeagueService {
  createLeague(managerId: number, payload: CreateLeagueDTO): Promise<string> {
    return LeagueService.createLeague(managerId, payload);
  }

  getAllLeagues(managerId: number): Promise<unknown> {
    return LeagueService.getAllLeagues(managerId);
  }

  getLeagueById(leagueId: string, managerId: number): Promise<unknown> {
    return LeagueService.getLeagueById(leagueId, managerId);
  }

  updateLeague(
    leagueId: string,
    managerId: number,
    payload: UpdateLeagueDTO
  ): Promise<string> {
    return LeagueService.updateLeague(leagueId, managerId, payload);
  }

  deleteLeague(leagueId: string, managerId: number): Promise<string> {
    return LeagueService.deleteLeague(leagueId, managerId);
  }

  getTrainerTeams(leagueId: string, managerId: number, email: string): Promise<unknown> {
    return LeagueService.getTrainerTeams(leagueId, managerId, email);
  }

  getTeamsLeague(leagueId: string, managerId: number): Promise<unknown> {
    return LeagueService.getTeamsLeague(leagueId, managerId);
  }

  removeTeamFromLeague(
    leagueId: string,
    teamId: string,
    managerId: number
  ): Promise<string> {
    return LeagueService.removeTeamFromLeague(leagueId, teamId, managerId);
  }

  generateFixture(
    leagueId: string,
    managerId: number,
    type: "round-robin" | "knockout",
    options?: GenerateFixtureOptionsDTO
  ): Promise<{ message: string; totalMatches: number }> {
    return LeagueService.generateFixture(leagueId, managerId, type, options);
  }

  getLeagueFixture(leagueId: string): Promise<unknown> {
    return LeagueService.getLeagueFixture(leagueId);
  }

  getFixtureWithLocations(leagueId: string): Promise<unknown> {
    return LeagueService.getFixtureWithLocations(leagueId);
  }

  addTeamToLeague(leagueId: string, teamId: number): Promise<string> {
    return LeagueService.addTeamToLeague(leagueId, teamId);
  }

  getStandings(
    leagueId: string,
    userId: number | undefined,
    role: string | undefined
  ): Promise<unknown> {
    return LeagueService.getStandings(leagueId, userId, role);
  }

  getLeagueMatchesGrouped(
    leagueId: string,
    userId: number | undefined,
    role: string | undefined
  ): Promise<Record<string, unknown[]>> {
    return LeagueService.getLeagueMatchesGrouped(leagueId, userId, role);
  }

  restructureFixture(
    leagueId: string,
    audit: RestructureFixtureAuditDTO
  ): Promise<{ message: string; newMatchesGenerated: number }> {
    return LeagueService.restructureFixture(leagueId, audit);
  }

  updateLeagueLogo(leagueId: string, logoFile: UploadedImageFile): Promise<{ logoUrl: string }> {
    return LeagueService.updateLeagueLogo(leagueId, logoFile);
  }
}
