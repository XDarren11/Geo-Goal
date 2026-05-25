import type { RequestHandler } from "../../mediator/RequestHandler";
import type { IMatchFlowService } from "../../../services/contracts/IMatchFlowService";
import type { AutoAssignRefereesResultDTO } from "../dto/MatchDetailDTOs";
import {
  AssignRefereeRequest,
  AutoAssignRefereesRequest,
  ExportFlowFramesRequest,
  GetFlowMatchAnalyticsRequest,
  GetLeagueRefereesRequest,
  GetRefereeDashboardRequest,
  GetTodayRefereeMatchesRequest,
  GetUpcomingLeagueMatchesRequest,
  MatchDetailGetRequest,
  MatchDetailUpsertRequest,
  RegisterBulkEventsRequest,
  RegisterEventRequest,
  RegisterTrackingBatchRequest,
  RegisterTrackingFrameRequest,
} from "../requests/MatchDetailRequests";

export class MatchDetailGetHandler implements RequestHandler<MatchDetailGetRequest, unknown> {
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: MatchDetailGetRequest): Promise<unknown> {
    return this.svc.getByMatchId(request.matchId);
  }
}

export class MatchDetailUpsertHandler
  implements RequestHandler<MatchDetailUpsertRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: MatchDetailUpsertRequest): Promise<unknown> {
    return this.svc.upsertByMatchId(request.matchId, request.actorUserId, request.body);
  }
}

export class AssignRefereeHandler implements RequestHandler<AssignRefereeRequest, string> {
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: AssignRefereeRequest): Promise<string> {
    return this.svc.assignRefereeToMatch(
      request.matchId,
      request.body,
      request.actorUserId
    );
  }
}

export class GetTodayRefereeMatchesHandler
  implements RequestHandler<GetTodayRefereeMatchesRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: GetTodayRefereeMatchesRequest): Promise<unknown> {
    return this.svc.getTodayAssignedMatches(request.userId);
  }
}

export class GetRefereeDashboardHandler
  implements RequestHandler<GetRefereeDashboardRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: GetRefereeDashboardRequest): Promise<unknown> {
    return this.svc.getRefereeDashboard(request.userId);
  }
}

export class RegisterEventHandler implements RequestHandler<RegisterEventRequest, unknown> {
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: RegisterEventRequest): Promise<unknown> {
    return this.svc.registerEvent(request.matchId, request.userId, request.body);
  }
}

export class RegisterBulkEventsHandler
  implements RequestHandler<RegisterBulkEventsRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: RegisterBulkEventsRequest): Promise<unknown> {
    return this.svc.registerBulkEvents(request.matchId, request.userId, request.body);
  }
}

export class RegisterTrackingFrameHandler
  implements RequestHandler<RegisterTrackingFrameRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: RegisterTrackingFrameRequest): Promise<unknown> {
    return this.svc.registerTrackingFrame(request.matchId, request.userId, request.body);
  }
}

export class RegisterTrackingBatchHandler
  implements RequestHandler<RegisterTrackingBatchRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: RegisterTrackingBatchRequest): Promise<unknown> {
    return this.svc.registerTrackingBatch(request.matchId, request.userId, request.body);
  }
}

export class GetLeagueRefereesHandler
  implements RequestHandler<GetLeagueRefereesRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: GetLeagueRefereesRequest): Promise<unknown> {
    return this.svc.getLeagueReferees(request.leagueId, request.actorUserId);
  }
}

export class GetUpcomingLeagueMatchesHandler
  implements RequestHandler<GetUpcomingLeagueMatchesRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: GetUpcomingLeagueMatchesRequest): Promise<unknown> {
    return this.svc.getUpcomingLeagueMatches(request.leagueId, request.actorUserId, request.page, request.pageSize);
  }
}

export class AutoAssignRefereesHandler
  implements RequestHandler<AutoAssignRefereesRequest, AutoAssignRefereesResultDTO>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: AutoAssignRefereesRequest): Promise<AutoAssignRefereesResultDTO> {
    return this.svc.autoAssignRefereesForLeague(
      request.leagueId,
      request.actorUserId
    ) as Promise<AutoAssignRefereesResultDTO>;
  }
}

export class GetFlowMatchAnalyticsHandler
  implements RequestHandler<GetFlowMatchAnalyticsRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: GetFlowMatchAnalyticsRequest): Promise<unknown> {
    return this.svc.getMatchAnalytics(request.matchId);
  }
}

export class ExportFlowFramesHandler
  implements RequestHandler<ExportFlowFramesRequest, unknown>
{
  constructor(private readonly svc: IMatchFlowService) {}
  handle(request: ExportFlowFramesRequest): Promise<unknown> {
    return this.svc.exportFrames(request.matchId, request.page, request.pageSize);
  }
}
