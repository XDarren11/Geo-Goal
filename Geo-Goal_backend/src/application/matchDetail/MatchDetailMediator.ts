import { Mediator } from "../mediator/Mediator";
import type { IMatchFlowService } from "../../services/contracts/IMatchFlowService";
import {
  AssignRefereeHandler,
  AutoAssignRefereesHandler,
  ExportFlowFramesHandler,
  GetFlowMatchAnalyticsHandler,
  GetLeagueRefereesHandler,
  GetRefereeDashboardHandler,
  GetTodayRefereeMatchesHandler,
  GetUpcomingLeagueMatchesHandler,
  MatchDetailGetHandler,
  MatchDetailUpsertHandler,
  RegisterBulkEventsHandler,
  RegisterEventHandler,
  RegisterTrackingBatchHandler,
  RegisterTrackingFrameHandler,
} from "./handlers/MatchDetailHandlers";

export function buildMatchDetailMediator(svc: IMatchFlowService): Mediator {
  const m = new Mediator();
  m.register("matchDetail.getByMatchId", new MatchDetailGetHandler(svc));
  m.register("matchDetail.upsertByMatchId", new MatchDetailUpsertHandler(svc));
  m.register("matchDetail.assignReferee", new AssignRefereeHandler(svc));
  m.register("matchDetail.getTodayRefereeMatches", new GetTodayRefereeMatchesHandler(svc));
  m.register("matchDetail.getRefereeDashboard", new GetRefereeDashboardHandler(svc));
  m.register("matchDetail.registerEvent", new RegisterEventHandler(svc));
  m.register("matchDetail.registerBulkEvents", new RegisterBulkEventsHandler(svc));
  m.register("matchDetail.registerTrackingFrame", new RegisterTrackingFrameHandler(svc));
  m.register("matchDetail.registerTrackingBatch", new RegisterTrackingBatchHandler(svc));
  m.register("matchDetail.autoAssignReferees", new AutoAssignRefereesHandler(svc));
  m.register("matchDetail.getLeagueReferees", new GetLeagueRefereesHandler(svc));
  m.register("matchDetail.getUpcomingLeagueMatches", new GetUpcomingLeagueMatchesHandler(svc));
  m.register("matchDetail.getMatchAnalytics", new GetFlowMatchAnalyticsHandler(svc));
  m.register("matchDetail.exportFrames", new ExportFlowFramesHandler(svc));
  return m;
}
