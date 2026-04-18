/**
 * Detalle de partido + flujo de árbitro (MatchDetailService + RefereeService).
 */
export interface IMatchFlowService {
  getByMatchId(matchId: string): Promise<unknown>;
  upsertByMatchId(
    matchId: string,
    actorUserId: number,
    body: Record<string, unknown>
  ): Promise<unknown>;
  assignRefereeToMatch(
    matchId: string,
    body: Record<string, unknown>,
    actorUserId: number
  ): Promise<string>;
  getTodayAssignedMatches(userId: number): Promise<unknown>;
  getRefereeDashboard(userId: number): Promise<unknown>;
  registerEvent(
    matchId: string,
    userId: number,
    body: Record<string, unknown>
  ): Promise<unknown>;
  registerBulkEvents(
    matchId: string,
    userId: number,
    body: Record<string, unknown>
  ): Promise<unknown>;
  registerTrackingFrame(
    matchId: string,
    userId: number,
    body: Record<string, unknown>
  ): Promise<unknown>;
  getLeagueReferees(leagueId: number, actorUserId: number): Promise<unknown>;
  getUpcomingLeagueMatches(leagueId: number, actorUserId: number): Promise<unknown>;
  getMatchAnalytics(matchId: number): Promise<unknown>;
}
