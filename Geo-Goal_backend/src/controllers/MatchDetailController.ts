import type { Request, Response } from "express";
import { buildMatchDetailMediator } from "../application/matchDetail/MatchDetailMediator";
import type {
  AssignRefereeBodyDTO,
  RegisterBulkEventsBodyDTO,
  RegisterMatchEventBodyDTO,
  RegisterTrackingFrameBodyDTO,
} from "../application/matchDetail/dto/MatchDetailDTOs";
import { MatchFlowServiceAdapter } from "../services/MatchFlowServiceAdapter";
import {
  AssignRefereeRequest,
  GetFlowMatchAnalyticsRequest,
  GetLeagueRefereesRequest,
  GetRefereeDashboardRequest,
  GetTodayRefereeMatchesRequest,
  GetUpcomingLeagueMatchesRequest,
  MatchDetailGetRequest,
  MatchDetailUpsertRequest,
  RegisterBulkEventsRequest,
  RegisterEventRequest,
  RegisterTrackingFrameRequest,
} from "../application/matchDetail/requests/MatchDetailRequests";

const matchDetailMediator = buildMatchDetailMediator(new MatchFlowServiceAdapter());

export class MatchDetailController {
  static getByMatchId = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(new MatchDetailGetRequest(matchId));
    res.json(data);
  };

  static upsertByMatchId = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const result = await matchDetailMediator.send(
      new MatchDetailUpsertRequest(matchId, req.user!.id, req.body)
    );
    res.json(result);
  };

  static assignReferee = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const message = await matchDetailMediator.send(
      new AssignRefereeRequest(matchId, req.body as AssignRefereeBodyDTO, req.user!.id)
    );
    res.json({ message });
  };

  static getTodayRefereeMatches = async (req: Request, res: Response): Promise<void> => {
    const data = await matchDetailMediator.send(
      new GetTodayRefereeMatchesRequest(req.user!.id)
    );
    res.json(data);
  };

  static getRefereeDashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await matchDetailMediator.send(
      new GetRefereeDashboardRequest(req.user!.id)
    );
    res.json(data);
  };

  static registerEvent = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(
      new RegisterEventRequest(
        matchId,
        req.user!.id,
        req.body as RegisterMatchEventBodyDTO
      )
    );
    res.status(201).json(data);
  };

  static registerBulkEvents = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(
      new RegisterBulkEventsRequest(
        matchId,
        req.user!.id,
        req.body as RegisterBulkEventsBodyDTO
      )
    );
    res.status(201).json(data);
  };

  static registerTrackingFrame = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(
      new RegisterTrackingFrameRequest(
        matchId,
        req.user!.id,
        req.body as RegisterTrackingFrameBodyDTO
      )
    );
    res.status(201).json(data);
  };

  static getLeagueReferees = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await matchDetailMediator.send(
      new GetLeagueRefereesRequest(Number(leagueId), req.user!.id)
    );
    res.json(data);
  };

  static getUpcomingLeagueMatches = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await matchDetailMediator.send(
      new GetUpcomingLeagueMatchesRequest(Number(leagueId), req.user!.id)
    );
    res.json(data);
  };

  static getMatchAnalytics = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(
      new GetFlowMatchAnalyticsRequest(Number(matchId))
    );
    res.json(data);
  };
}
