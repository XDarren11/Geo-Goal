import { MatchDetailService } from "./MatchDetailService";
import { RefereeService } from "./RefereeService";
import type { IMatchFlowService } from "./contracts/IMatchFlowService";

export class MatchFlowServiceAdapter implements IMatchFlowService {
  getByMatchId(matchId: string): Promise<unknown> {
    return MatchDetailService.getByMatchId(matchId);
  }

  upsertByMatchId(
    matchId: string,
    actorUserId: number,
    body: Record<string, unknown>
  ): Promise<unknown> {
    return MatchDetailService.upsertByMatchId(matchId, actorUserId, body as never);
  }

  assignRefereeToMatch(
    matchId: string,
    body: Record<string, unknown>,
    actorUserId: number
  ): Promise<string> {
    return RefereeService.assignRefereeToMatch(matchId, body as never, actorUserId);
  }

  getTodayAssignedMatches(userId: number): Promise<unknown> {
    return RefereeService.getTodayAssignedMatches(userId);
  }

  getRefereeDashboard(userId: number): Promise<unknown> {
    return RefereeService.getRefereeDashboard(userId);
  }

  registerEvent(
    matchId: string,
    userId: number,
    body: Record<string, unknown>
  ): Promise<unknown> {
    return RefereeService.registerEvent(matchId, userId, body as never);
  }

  registerBulkEvents(
    matchId: string,
    userId: number,
    body: Record<string, unknown>
  ): Promise<unknown> {
    return RefereeService.registerBulkEvents(matchId, userId, body as never);
  }

  registerTrackingFrame(
    matchId: string,
    userId: number,
    body: Record<string, unknown>
  ): Promise<unknown> {
    return RefereeService.registerTrackingFrame(matchId, userId, body as never);
  }

  registerTrackingBatch(
    matchId: string,
    userId: number,
    body: Record<string, unknown>
  ): Promise<unknown> {
    return RefereeService.registerTrackingBatch(matchId, userId, body as never);
  }

  getLeagueReferees(leagueId: number, actorUserId: number): Promise<unknown> {
    return RefereeService.getLeagueReferees(leagueId, actorUserId);
  }

  getUpcomingLeagueMatches(leagueId: number, actorUserId: number): Promise<unknown> {
    return RefereeService.getUpcomingLeagueMatches(leagueId, actorUserId);
  }

  getMatchAnalytics(matchId: number): Promise<unknown> {
    return RefereeService.getMatchAnalytics(matchId);
  }
}
