import type { Request, Response } from "express";
import { MatchDetailService } from "../services/MatchDetailService";
import { RefereeService } from "../services/RefereeService";

export class MatchDetailController {
  static getByMatchId = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await MatchDetailService.getByMatchId(matchId);
    res.json(data);
  };

  static upsertByMatchId = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const result = await MatchDetailService.upsertByMatchId(
      matchId,
      req.user!.id,
      req.body
    );
    res.json(result);
  };

  static assignReferee = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const message = await RefereeService.assignRefereeToMatch(
      matchId,
      req.body,
      req.user!.id
    );
    res.json({ message });
  };

  static getTodayRefereeMatches = async (req: Request, res: Response): Promise<void> => {
    const data = await RefereeService.getTodayAssignedMatches(req.user!.id);
    res.json(data);
  };

  static getRefereeDashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await RefereeService.getRefereeDashboard(req.user!.id);
    res.json(data);
  };

  static registerEvent = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await RefereeService.registerEvent(matchId, req.user!.id, req.body);
    res.status(201).json(data);
  };

  static registerBulkEvents = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await RefereeService.registerBulkEvents(matchId, req.user!.id, req.body);
    res.status(201).json(data);
  };

  static registerTrackingFrame = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await RefereeService.registerTrackingFrame(matchId, req.user!.id, req.body);
    res.status(201).json(data);
  };

  static getLeagueReferees = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await RefereeService.getLeagueReferees(Number(leagueId), req.user!.id);
    res.json(data);
  };

  static getUpcomingLeagueMatches = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await RefereeService.getUpcomingLeagueMatches(Number(leagueId), req.user!.id);
    res.json(data);
  };

  static getMatchAnalytics = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await RefereeService.getMatchAnalytics(Number(matchId));
    res.json(data);
  };
}
