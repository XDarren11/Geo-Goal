import { Mediator } from "../mediator/Mediator";
import type { ITeamService } from "../../services/contracts/ITeamService";
import {
  AddPlayerToTeamHandler,
  CreateTeamHandler,
  DeleteTeamHandler,
  FindPlayerHandler,
  GetCoachActiveLeaguesHandler,
  GetCoachDashboardHandler,
  GetMyTeamsHandler,
  GetPlayerDashboardHandler,
  GetPlayerTeamsHandler,
  GetPlayersTeamHandler,
  GetTeamByIdHandler,
  GetTeamDashboardHandler,
  RemovePlayerFromTeamHandler,
  UpdatePlayerAvatarHandler,
  UpdatePlayerProfileHandler,
  UpdateTeamHandler,
} from "./handlers/TeamHandlers";

export function buildTeamMediator(teamService: ITeamService): Mediator {
  const m = new Mediator();
  m.register("team.getPlayerDashboard", new GetPlayerDashboardHandler(teamService));
  m.register("team.getCoachDashboard", new GetCoachDashboardHandler(teamService));
  m.register("team.getMyTeams", new GetMyTeamsHandler(teamService));
  m.register("team.getPlayerTeams", new GetPlayerTeamsHandler(teamService));
  m.register("team.getById", new GetTeamByIdHandler(teamService));
  m.register("team.create", new CreateTeamHandler(teamService));
  m.register("team.update", new UpdateTeamHandler(teamService));
  m.register("team.delete", new DeleteTeamHandler(teamService));
  m.register("team.findPlayer", new FindPlayerHandler(teamService));
  m.register("team.addPlayer", new AddPlayerToTeamHandler(teamService));
  m.register("team.getPlayers", new GetPlayersTeamHandler(teamService));
  m.register("team.removePlayer", new RemovePlayerFromTeamHandler(teamService));
  m.register("team.getCoachActiveLeagues", new GetCoachActiveLeaguesHandler(teamService));
  m.register("team.getTeamDashboard", new GetTeamDashboardHandler(teamService));
  m.register("team.updatePlayerAvatar", new UpdatePlayerAvatarHandler(teamService));
  m.register("team.updatePlayerProfile", new UpdatePlayerProfileHandler(teamService));
  return m;
}
