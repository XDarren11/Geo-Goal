import { Mediator } from "../mediator/Mediator";
import type { IMatchOperationsService } from "../../services/contracts/IMatchOperationsService";
import { ScheduleMatchHandler, UpdateMatchScoreHandler } from "./handlers/MatchHandlers";

export function buildMatchMediator(svc: IMatchOperationsService): Mediator {
  const m = new Mediator();
  m.register("match.schedule", new ScheduleMatchHandler(svc));
  m.register("match.updateScore", new UpdateMatchScoreHandler(svc));
  return m;
}
