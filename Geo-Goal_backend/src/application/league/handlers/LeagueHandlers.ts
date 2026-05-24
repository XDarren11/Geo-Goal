import type { RequestHandler } from "../../mediator/RequestHandler";
import type { ILeagueService } from "../../../services/contracts/ILeagueService";
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
} from "../requests/LeagueRequests";

export class CreateLeagueHandler implements RequestHandler<CreateLeagueRequest, string> {
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: CreateLeagueRequest): Promise<string> {
    return this.leagueService.createLeague(request.managerId, request.payload);
  }
}

export class GetAllLeaguesHandler implements RequestHandler<GetAllLeaguesRequest, unknown> {
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: GetAllLeaguesRequest): Promise<unknown> {
    return this.leagueService.getAllLeagues(request.managerId, request.page, request.pageSize);
  }
}

export class GetLeagueByIdHandler implements RequestHandler<GetLeagueByIdRequest, unknown> {
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: GetLeagueByIdRequest): Promise<unknown> {
    return this.leagueService.getLeagueById(request.leagueId, request.managerId);
  }
}

export class UpdateLeagueHandler implements RequestHandler<UpdateLeagueRequest, string> {
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: UpdateLeagueRequest): Promise<string> {
    return this.leagueService.updateLeague(
      request.leagueId,
      request.managerId,
      request.payload
    );
  }
}

export class DeleteLeagueHandler implements RequestHandler<DeleteLeagueRequest, string> {
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: DeleteLeagueRequest): Promise<string> {
    return this.leagueService.deleteLeague(request.leagueId, request.managerId);
  }
}

export class GetTrainerTeamsHandler
  implements RequestHandler<GetTrainerTeamsRequest, unknown>
{
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: GetTrainerTeamsRequest): Promise<unknown> {
    return this.leagueService.getTrainerTeams(
      request.leagueId,
      request.managerId,
      request.email
    );
  }
}

export class GetTeamsLeagueHandler implements RequestHandler<GetTeamsLeagueRequest, unknown> {
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: GetTeamsLeagueRequest): Promise<unknown> {
    return this.leagueService.getTeamsLeague(request.leagueId, request.managerId);
  }
}

export class RemoveTeamFromLeagueHandler
  implements RequestHandler<RemoveTeamFromLeagueRequest, string>
{
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: RemoveTeamFromLeagueRequest): Promise<string> {
    return this.leagueService.removeTeamFromLeague(
      request.leagueId,
      request.teamId,
      request.managerId
    );
  }
}

export class GenerateFixtureHandler
  implements RequestHandler<GenerateFixtureRequest, { message: string; totalMatches: number }>
{
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: GenerateFixtureRequest): Promise<{ message: string; totalMatches: number }> {
    return this.leagueService.generateFixture(
      request.leagueId,
      request.managerId,
      request.type,
      request.options
    );
  }
}

export class GetLeagueFixtureHandler
  implements RequestHandler<GetLeagueFixtureRequest, unknown>
{
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: GetLeagueFixtureRequest): Promise<unknown> {
    return this.leagueService.getLeagueFixture(request.leagueId);
  }
}

export class GetFixtureWithLocationsHandler
  implements RequestHandler<GetFixtureWithLocationsRequest, unknown>
{
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: GetFixtureWithLocationsRequest): Promise<unknown> {
    return this.leagueService.getFixtureWithLocations(request.leagueId);
  }
}

export class AddTeamToLeagueHandler implements RequestHandler<AddTeamToLeagueRequest, string> {
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: AddTeamToLeagueRequest): Promise<string> {
    return this.leagueService.addTeamToLeague(request.leagueId, request.teamId);
  }
}

export class GetStandingsHandler implements RequestHandler<GetStandingsRequest, unknown> {
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: GetStandingsRequest): Promise<unknown> {
    return this.leagueService.getStandings(
      request.leagueId,
      request.userId,
      request.role
    );
  }
}

export class GetLeagueMatchesGroupedHandler
  implements RequestHandler<GetLeagueMatchesGroupedRequest, Record<string, unknown[]>>
{
  constructor(private readonly leagueService: ILeagueService) {}

  handle(
    request: GetLeagueMatchesGroupedRequest
  ): Promise<Record<string, unknown[]>> {
    return this.leagueService.getLeagueMatchesGrouped(
      request.leagueId,
      request.userId,
      request.role
    );
  }
}

export class RestructureLeagueFixtureHandler
  implements
    RequestHandler<
      RestructureLeagueFixtureRequest,
      { message: string; newMatchesGenerated: number }
    >
{
  constructor(private readonly leagueService: ILeagueService) {}

  handle(
    request: RestructureLeagueFixtureRequest
  ): Promise<{ message: string; newMatchesGenerated: number }> {
    return this.leagueService.restructureFixture(request.leagueId, request.audit);
  }
}

export class UpdateLeagueLogoHandler
  implements RequestHandler<UpdateLeagueLogoRequest, { logoUrl: string }>
{
  constructor(private readonly leagueService: ILeagueService) {}

  handle(request: UpdateLeagueLogoRequest): Promise<{ logoUrl: string }> {
    return this.leagueService.updateLeagueLogo(request.leagueId, request.logoFile);
  }
}

