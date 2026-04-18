import type { RequestHandler } from "../../mediator/RequestHandler";
import type { IMatchOperationsService } from "../../../services/contracts/IMatchOperationsService";
import { ScheduleMatchRequest, UpdateMatchScoreRequest } from "../requests/MatchRequests";

export class ScheduleMatchHandler
  implements RequestHandler<ScheduleMatchRequest, { message: string; match: unknown }>
{
  constructor(private readonly svc: IMatchOperationsService) {}
  handle(request: ScheduleMatchRequest): Promise<{ message: string; match: unknown }> {
    return this.svc.scheduleMatch(
      request.matchId,
      request.dateIso,
      request.userId,
      request.audit
    ) as Promise<{ message: string; match: unknown }>;
  }
}

export class UpdateMatchScoreHandler
  implements RequestHandler<UpdateMatchScoreRequest, { message: string }>
{
  constructor(private readonly svc: IMatchOperationsService) {}
  handle(request: UpdateMatchScoreRequest): Promise<{ message: string }> {
    return this.svc.updateScore(
      request.matchId,
      request.homeScore,
      request.awayScore,
      request.homePenaltiesScore,
      request.awayPenaltiesScore,
      request.audit
    );
  }
}
