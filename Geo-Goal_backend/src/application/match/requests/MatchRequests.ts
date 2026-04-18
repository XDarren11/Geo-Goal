import type { Request } from "../../mediator/Request";
import type {
  MatchScheduleAudit,
  MatchScoreAudit,
} from "../../../services/contracts/IMatchOperationsService";

abstract class MR<T> implements Request<T> {
  abstract readonly requestName: string;
}

export class ScheduleMatchRequest extends MR<{ message: string; match: unknown }> {
  readonly requestName = "match.schedule";
  constructor(
    public readonly matchId: string,
    public readonly dateIso: string,
    public readonly userId: number | undefined,
    public readonly audit: MatchScheduleAudit
  ) {
    super();
  }
}

export class UpdateMatchScoreRequest extends MR<{ message: string }> {
  readonly requestName = "match.updateScore";
  constructor(
    public readonly matchId: string,
    public readonly homeScore: number,
    public readonly awayScore: number,
    public readonly homePenaltiesScore: number | undefined,
    public readonly awayPenaltiesScore: number | undefined,
    public readonly audit: MatchScoreAudit
  ) {
    super();
  }
}
