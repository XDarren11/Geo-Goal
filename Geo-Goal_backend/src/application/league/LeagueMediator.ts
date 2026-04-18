import { Mediator } from "../mediator/Mediator";
import type { ILeagueService } from "../../services/contracts/ILeagueService";
import {
  AddTeamToLeagueHandler,
  CreateLeagueHandler,
  DeleteLeagueHandler,
  GenerateFixtureHandler,
  GetAllLeaguesHandler,
  GetFixtureWithLocationsHandler,
  GetLeagueByIdHandler,
  GetLeagueFixtureHandler,
  GetLeagueMatchesGroupedHandler,
  GetStandingsHandler,
  GetTeamsLeagueHandler,
  GetTrainerTeamsHandler,
  RemoveTeamFromLeagueHandler,
  RestructureLeagueFixtureHandler,
  UpdateLeagueHandler,
  UpdateLeagueLogoHandler,
} from "./handlers/LeagueHandlers";
import {
  AddTeamToLeagueRequest,
  CreateLeagueRequest,
  DeleteLeagueRequest,
  GenerateFixtureRequest,
  GetAllLeaguesRequest,
  GetFixtureWithLocationsRequest,
  GetLeagueByIdRequest,
  GetLeagueFixtureRequest,
  GetLeagueMatchesGroupedRequest,
  GetStandingsRequest,
  GetTeamsLeagueRequest,
  GetTrainerTeamsRequest,
  RemoveTeamFromLeagueRequest,
  RestructureLeagueFixtureRequest,
  UpdateLeagueLogoRequest,
  UpdateLeagueRequest,
} from "./requests/LeagueRequests";

export function buildLeagueMediator(leagueService: ILeagueService): Mediator {
  const mediator = new Mediator();

  mediator.register("league.create", new CreateLeagueHandler(leagueService));
  mediator.register("league.getAll", new GetAllLeaguesHandler(leagueService));
  mediator.register("league.getById", new GetLeagueByIdHandler(leagueService));
  mediator.register("league.update", new UpdateLeagueHandler(leagueService));
  mediator.register("league.delete", new DeleteLeagueHandler(leagueService));
  mediator.register("league.getTrainerTeams", new GetTrainerTeamsHandler(leagueService));
  mediator.register("league.getTeams", new GetTeamsLeagueHandler(leagueService));
  mediator.register("league.removeTeam", new RemoveTeamFromLeagueHandler(leagueService));
  mediator.register("league.generateFixture", new GenerateFixtureHandler(leagueService));
  mediator.register("league.getFixture", new GetLeagueFixtureHandler(leagueService));
  mediator.register("league.getFixtureWithLocations", new GetFixtureWithLocationsHandler(leagueService));
  mediator.register("league.addTeam", new AddTeamToLeagueHandler(leagueService));
  mediator.register("league.getStandings", new GetStandingsHandler(leagueService));
  mediator.register("league.getLeagueMatchesGrouped", new GetLeagueMatchesGroupedHandler(leagueService));
  mediator.register("league.restructureFixture", new RestructureLeagueFixtureHandler(leagueService));
  mediator.register("league.updateLogo", new UpdateLeagueLogoHandler(leagueService));

  return mediator;
}

export type LeagueRequests =
  | CreateLeagueRequest
  | GetAllLeaguesRequest
  | GetLeagueByIdRequest
  | UpdateLeagueRequest
  | DeleteLeagueRequest
  | GetTrainerTeamsRequest
  | GetTeamsLeagueRequest
  | RemoveTeamFromLeagueRequest
  | GenerateFixtureRequest
  | GetLeagueFixtureRequest
  | GetFixtureWithLocationsRequest
  | AddTeamToLeagueRequest
  | GetStandingsRequest
  | GetLeagueMatchesGroupedRequest
  | RestructureLeagueFixtureRequest
  | UpdateLeagueLogoRequest;
