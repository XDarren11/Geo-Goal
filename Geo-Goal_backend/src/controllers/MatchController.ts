import type { Request, Response } from "express";
import { buildMatchMediator } from "../application/match/MatchMediator";
import { MatchOperationsServiceAdapter } from "../services/MatchOperationsServiceAdapter";
import { ScheduleMatchRequest, UpdateMatchScoreRequest } from "../application/match/requests/MatchRequests";

const matchMediator = buildMatchMediator(new MatchOperationsServiceAdapter());

export class MatchController {
  static scheduleMatch = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const { date } = req.body;
    const data = await matchMediator.send(
      new ScheduleMatchRequest(matchId, date, req.user?.id, {
        actorUserId: req.user?.id ?? null,
        reason: req.body?.reason,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
      })
    );
    res.json(data);
  };

  static updateScore = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const { homeScore, awayScore, homePenaltiesScore, awayPenaltiesScore } = req.body;
    const data = await matchMediator.send(
      new UpdateMatchScoreRequest(
        matchId,
        homeScore,
        awayScore,
        homePenaltiesScore,
        awayPenaltiesScore,
        {
          actorUserId: req.user?.id ?? null,
          reason: req.body?.reason,
          ip: req.ip,
          userAgent: req.get("user-agent") ?? null,
        }
      )
    );
    res.json(data);
  };
}
