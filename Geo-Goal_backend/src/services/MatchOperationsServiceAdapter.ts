import { MatchOperationsService } from "./MatchOperationsService";
import type {
  IMatchOperationsService,
  MatchScheduleAudit,
  MatchScoreAudit,
} from "./contracts/IMatchOperationsService";

export class MatchOperationsServiceAdapter implements IMatchOperationsService {
  scheduleMatch(
    matchId: string,
    dateIso: string,
    userId: number | undefined,
    audit: MatchScheduleAudit
  ) {
    return MatchOperationsService.scheduleMatch(matchId, dateIso, userId, audit);
  }

  updateScore(
    matchId: string,
    homeScore: number,
    awayScore: number,
    homePenaltiesScore: number | undefined,
    awayPenaltiesScore: number | undefined,
    audit: MatchScoreAudit
  ) {
    return MatchOperationsService.updateScore(
      matchId,
      homeScore,
      awayScore,
      homePenaltiesScore,
      awayPenaltiesScore,
      audit
    );
  }

  // 👇 ESTO ES LO ÚNICO QUE VA AQUÍ, EL PUENTE
  getMatchPlayers(matchId: string): Promise<any[]> {
    return MatchOperationsService.getMatchPlayers(matchId);
  }
}