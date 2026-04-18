import type { RequestHandler } from "../../mediator/RequestHandler";
import type { IPublicService } from "../../../services/contracts/IPublicService";
import {
  GetLeagueDetailRequest,
  GetLeaguesRequest,
  GetNewsRequest,
  GetPublicFixtureRequest,
  GetPublicFixtureWithLocationsRequest,
  GetPublicMatchAnalyticsRequest,
  GetPublicStandingsRequest,
  GetTeamProfileRequest,
} from "../requests/PublicRequests";

export class GetNewsHandler implements RequestHandler<GetNewsRequest, unknown> {
  constructor(private readonly svc: IPublicService) {}
  handle(request: GetNewsRequest): Promise<unknown> {
    return this.svc.getNews(request.limit);
  }
}

export class GetLeaguesHandler implements RequestHandler<GetLeaguesRequest, unknown> {
  constructor(private readonly svc: IPublicService) {}
  handle(_request: GetLeaguesRequest): Promise<unknown> {
    return this.svc.getLeagues();
  }
}

export class GetLeagueDetailHandler implements RequestHandler<GetLeagueDetailRequest, unknown> {
  constructor(private readonly svc: IPublicService) {}
  handle(request: GetLeagueDetailRequest): Promise<unknown> {
    return this.svc.getLeagueDetail(request.leagueId);
  }
}

export class GetPublicStandingsHandler
  implements RequestHandler<GetPublicStandingsRequest, unknown>
{
  constructor(private readonly svc: IPublicService) {}
  handle(request: GetPublicStandingsRequest): Promise<unknown> {
    return this.svc.getStandings(request.leagueId);
  }
}

export class GetPublicFixtureHandler implements RequestHandler<GetPublicFixtureRequest, unknown> {
  constructor(private readonly svc: IPublicService) {}
  handle(request: GetPublicFixtureRequest): Promise<unknown> {
    return this.svc.getFixture(request.leagueId);
  }
}

export class GetPublicFixtureWithLocationsHandler
  implements RequestHandler<GetPublicFixtureWithLocationsRequest, unknown>
{
  constructor(private readonly svc: IPublicService) {}
  handle(request: GetPublicFixtureWithLocationsRequest): Promise<unknown> {
    return this.svc.getFixtureWithLocations(request.leagueId);
  }
}

export class GetTeamProfileHandler implements RequestHandler<GetTeamProfileRequest, unknown> {
  constructor(private readonly svc: IPublicService) {}
  handle(request: GetTeamProfileRequest): Promise<unknown> {
    return this.svc.getTeamProfile(request.leagueId, request.teamId);
  }
}

export class GetPublicMatchAnalyticsHandler
  implements RequestHandler<GetPublicMatchAnalyticsRequest, unknown>
{
  constructor(private readonly svc: IPublicService) {}
  handle(request: GetPublicMatchAnalyticsRequest): Promise<unknown> {
    return this.svc.getMatchAnalytics(request.matchId);
  }
}
