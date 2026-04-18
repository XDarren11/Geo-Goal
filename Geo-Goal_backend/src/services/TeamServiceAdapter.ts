import { TeamService } from "./TeamService";
import type { CreateTeamPayload, ITeamService } from "./contracts/ITeamService";

export class TeamServiceAdapter implements ITeamService {
  getPlayerDashboard(userId: number): Promise<unknown> {
    return TeamService.getPlayerDashboard(userId);
  }

  getCoachDashboard(trainerId: number): Promise<unknown> {
    return TeamService.getCoachDashboard(trainerId);
  }

  getMyTeams(trainerId: number): Promise<unknown> {
    return TeamService.getMyTeams(trainerId);
  }

  getPlayerTeams(userId: number): Promise<unknown> {
    return TeamService.getPlayerTeams(userId);
  }

  getTeamById(teamId: string, userId: number, role: string): Promise<unknown> {
    return TeamService.getTeamById(teamId, userId, role);
  }

  createTeam(trainerId: number, payload: CreateTeamPayload): Promise<string> {
    return TeamService.createTeam(trainerId, payload);
  }

  updateTeam(
    teamId: string,
    trainerId: number,
    payload: Record<string, unknown> & { logoUrl?: string }
  ): Promise<string> {
    return TeamService.updateTeam(teamId, trainerId, payload as never);
  }

  deleteTeam(teamId: string, trainerId: number): Promise<string> {
    return TeamService.deleteTeam(teamId, trainerId);
  }

  findPlayer(teamId: string, trainerId: number, email: string): Promise<unknown> {
    return TeamService.findPlayer(teamId, trainerId, email);
  }

  addPlayerToTeam(
    teamId: string,
    trainerId: number,
    playerId: number
  ): Promise<string> {
    return TeamService.addPlayerToTeam(teamId, trainerId, playerId);
  }

  getPlayersTeam(teamId: string, userId: number, role: string): Promise<unknown> {
    return TeamService.getPlayersTeam(teamId, userId, role);
  }

  removePlayerFromTeam(
    teamId: string,
    playerId: string,
    trainerId: number
  ): Promise<string> {
    return TeamService.removePlayerFromTeam(teamId, playerId, trainerId);
  }

  getCoachActiveLeagues(trainerId: number): Promise<unknown> {
    return TeamService.getCoachActiveLeagues(trainerId);
  }

  getTeamDashboard(leagueId: string, teamId: string): Promise<unknown> {
    return TeamService.getTeamDashboard(leagueId, teamId);
  }
}
