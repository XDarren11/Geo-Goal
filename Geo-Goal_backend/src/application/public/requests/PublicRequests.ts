import type { Request } from "../../mediator/Request";

abstract class PublicRequest<TResponse> implements Request<TResponse> {
  abstract readonly requestName: string;
}

export class GetNewsRequest extends PublicRequest<unknown> {
  readonly requestName = "public.getNews";
  constructor(public readonly limit: number) {
    super();
  }
}

export class GetLeaguesRequest extends PublicRequest<unknown> {
  readonly requestName = "public.getLeagues";
  constructor(
    public readonly page = 1,
    public readonly pageSize = 50
  ) {
    super();
  }
}

export class GetLeagueDetailRequest extends PublicRequest<unknown> {
  readonly requestName = "public.getLeagueDetail";
  constructor(public readonly leagueId: string) {
    super();
  }
}

export class GetPublicStandingsRequest extends PublicRequest<unknown> {
  readonly requestName = "public.getStandings";
  constructor(public readonly leagueId: string) {
    super();
  }
}

export class GetPublicFixtureRequest extends PublicRequest<unknown> {
  readonly requestName = "public.getFixture";
  constructor(public readonly leagueId: string) {
    super();
  }
}

export class GetPublicFixtureWithLocationsRequest extends PublicRequest<unknown> {
  readonly requestName = "public.getFixtureWithLocations";
  constructor(public readonly leagueId: string) {
    super();
  }
}

export class GetTeamProfileRequest extends PublicRequest<unknown> {
  readonly requestName = "public.getTeamProfile";
  constructor(
    public readonly leagueId: string,
    public readonly teamId: string
  ) {
    super();
  }
}

export class GetPublicMatchAnalyticsRequest extends PublicRequest<unknown> {
  readonly requestName = "public.getMatchAnalytics";
  constructor(public readonly matchId: string) {
    super();
  }
}

export class ExportPublicFramesRequest extends PublicRequest<unknown> {
  readonly requestName = "public.exportFrames";
  constructor(
    public readonly matchId: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 1000,
  ) {
    super();
  }
}
