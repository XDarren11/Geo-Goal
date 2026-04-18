import type { Match } from "../../models/Match";

export type MatchScheduleAudit = {
  actorUserId: number | null;
  reason?: string;
  ip?: string | null;
  userAgent?: string | null;
};

export type MatchScoreAudit = {
  actorUserId: number | null;
  reason?: string;
  ip?: string | null;
  userAgent?: string | null;
};

export interface IMatchOperationsService {
  scheduleMatch(
    matchId: string,
    dateIso: string,
    userId: number | undefined,
    audit: MatchScheduleAudit
  ): Promise<{ message: string; match: Match }>;
  updateScore(
    matchId: string,
    homeScore: number,
    awayScore: number,
    homePenaltiesScore: number | undefined,
    awayPenaltiesScore: number | undefined,
    audit: MatchScoreAudit
  ): Promise<{ message: string }>;
}
