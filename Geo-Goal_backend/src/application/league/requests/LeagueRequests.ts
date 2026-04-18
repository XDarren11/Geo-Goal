import type { Request } from "../../mediator/Request";
import type {
  CreateLeagueDTO,
  GenerateFixtureOptionsDTO,
  RestructureFixtureAuditDTO,
  UpdateLeagueDTO,
} from "../dto/LeagueDTOs";

abstract class LeagueRequest<TResponse> implements Request<TResponse> {
  abstract readonly requestName: string;
}

export class CreateLeagueRequest extends LeagueRequest<string> {
  readonly requestName = "league.create";
  constructor(
    public readonly managerId: number,
    public readonly payload: CreateLeagueDTO
  ) {
    super();
  }
}

export class GetAllLeaguesRequest extends LeagueRequest<unknown> {
  readonly requestName = "league.getAll";
  constructor(public readonly managerId: number) {
    super();
  }
}

export class GetLeagueByIdRequest extends LeagueRequest<unknown> {
  readonly requestName = "league.getById";
  constructor(
    public readonly leagueId: string,
    public readonly managerId: number
  ) {
    super();
  }
}

export class UpdateLeagueRequest extends LeagueRequest<string> {
  readonly requestName = "league.update";
  constructor(
    public readonly leagueId: string,
    public readonly managerId: number,
    public readonly payload: UpdateLeagueDTO
  ) {
    super();
  }
}

export class DeleteLeagueRequest extends LeagueRequest<string> {
  readonly requestName = "league.delete";
  constructor(
    public readonly leagueId: string,
    public readonly managerId: number
  ) {
    super();
  }
}

export class GetTrainerTeamsRequest extends LeagueRequest<unknown> {
  readonly requestName = "league.getTrainerTeams";
  constructor(
    public readonly leagueId: string,
    public readonly managerId: number,
    public readonly email: string
  ) {
    super();
  }
}

export class GetTeamsLeagueRequest extends LeagueRequest<unknown> {
  readonly requestName = "league.getTeams";
  constructor(
    public readonly leagueId: string,
    public readonly managerId: number
  ) {
    super();
  }
}

export class RemoveTeamFromLeagueRequest extends LeagueRequest<string> {
  readonly requestName = "league.removeTeam";
  constructor(
    public readonly leagueId: string,
    public readonly teamId: string,
    public readonly managerId: number
  ) {
    super();
  }
}

export class GenerateFixtureRequest extends LeagueRequest<{
  message: string;
  totalMatches: number;
}> {
  readonly requestName = "league.generateFixture";
  constructor(
    public readonly leagueId: string,
    public readonly managerId: number,
    public readonly type: "round-robin" | "knockout",
    public readonly options?: GenerateFixtureOptionsDTO
  ) {
    super();
  }
}

export class GetLeagueFixtureRequest extends LeagueRequest<unknown> {
  readonly requestName = "league.getFixture";
  constructor(public readonly leagueId: string) {
    super();
  }
}

export class GetFixtureWithLocationsRequest extends LeagueRequest<unknown> {
  readonly requestName = "league.getFixtureWithLocations";
  constructor(public readonly leagueId: string) {
    super();
  }
}

export class AddTeamToLeagueRequest extends LeagueRequest<string> {
  readonly requestName = "league.addTeam";
  constructor(
    public readonly leagueId: string,
    public readonly teamId: number
  ) {
    super();
  }
}

export class GetStandingsRequest extends LeagueRequest<unknown> {
  readonly requestName = "league.getStandings";
  constructor(
    public readonly leagueId: string,
    public readonly userId: number | undefined,
    public readonly role: string | undefined
  ) {
    super();
  }
}

export class GetLeagueMatchesGroupedRequest extends LeagueRequest<Record<string, unknown[]>> {
  readonly requestName = "league.getLeagueMatchesGrouped";
  constructor(
    public readonly leagueId: string,
    public readonly userId: number | undefined,
    public readonly role: string | undefined
  ) {
    super();
  }
}

export class RestructureLeagueFixtureRequest extends LeagueRequest<{
  message: string;
  newMatchesGenerated: number;
}> {
  readonly requestName = "league.restructureFixture";
  constructor(
    public readonly leagueId: string,
    public readonly audit: RestructureFixtureAuditDTO
  ) {
    super();
  }
}

export class UpdateLeagueLogoRequest extends LeagueRequest<{ logoUrl: string }> {
  readonly requestName = "league.updateLogo";
  constructor(
    public readonly leagueId: string,
    public readonly logoFilename: string
  ) {
    super();
  }
}

