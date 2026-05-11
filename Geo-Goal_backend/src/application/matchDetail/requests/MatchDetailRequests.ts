import type { Request } from "../../mediator/Request";
import type {
  AssignRefereeBodyDTO,
  MatchDetailUpsertBodyDTO,
  RegisterBulkEventsBodyDTO,
  RegisterMatchEventBodyDTO,
  RegisterTrackingBatchBodyDTO,
  RegisterTrackingFrameBodyDTO,
} from "../dto/MatchDetailDTOs";

abstract class MFR<T> implements Request<T> {
  abstract readonly requestName: string;
}

export class MatchDetailGetRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.getByMatchId";
  constructor(public readonly matchId: string) {
    super();
  }
}

export class MatchDetailUpsertRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.upsertByMatchId";
  constructor(
    public readonly matchId: string,
    public readonly actorUserId: number,
    public readonly body: MatchDetailUpsertBodyDTO
  ) {
    super();
  }
}

export class AssignRefereeRequest extends MFR<string> {
  readonly requestName = "matchDetail.assignReferee";
  constructor(
    public readonly matchId: string,
    public readonly body: AssignRefereeBodyDTO,
    public readonly actorUserId: number
  ) {
    super();
  }
}

export class GetTodayRefereeMatchesRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.getTodayRefereeMatches";
  constructor(public readonly userId: number) {
    super();
  }
}

export class GetRefereeDashboardRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.getRefereeDashboard";
  constructor(public readonly userId: number) {
    super();
  }
}

export class RegisterEventRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.registerEvent";
  constructor(
    public readonly matchId: string,
    public readonly userId: number,
    public readonly body: RegisterMatchEventBodyDTO
  ) {
    super();
  }
}

export class RegisterBulkEventsRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.registerBulkEvents";
  constructor(
    public readonly matchId: string,
    public readonly userId: number,
    public readonly body: RegisterBulkEventsBodyDTO
  ) {
    super();
  }
}

export class RegisterTrackingFrameRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.registerTrackingFrame";
  constructor(
    public readonly matchId: string,
    public readonly userId: number,
    public readonly body: RegisterTrackingFrameBodyDTO
  ) {
    super();
  }
}

export class RegisterTrackingBatchRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.registerTrackingBatch";
  constructor(
    public readonly matchId: string,
    public readonly userId: number,
    public readonly body: RegisterTrackingBatchBodyDTO
  ) {
    super();
  }
}

export class GetLeagueRefereesRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.getLeagueReferees";
  constructor(
    public readonly leagueId: number,
    public readonly actorUserId: number
  ) {
    super();
  }
}

export class GetUpcomingLeagueMatchesRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.getUpcomingLeagueMatches";
  constructor(
    public readonly leagueId: number,
    public readonly actorUserId: number
  ) {
    super();
  }
}

export class GetFlowMatchAnalyticsRequest extends MFR<unknown> {
  readonly requestName = "matchDetail.getMatchAnalytics";
  constructor(public readonly matchId: number) {
    super();
  }
}
