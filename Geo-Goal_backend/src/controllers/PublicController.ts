import type { Request, Response } from "express";
import { buildPublicMediator } from "../application/public/PublicMediator";
import { PublicServiceAdapter } from "../services/PublicServiceAdapter";
import {
  ExportPublicFramesRequest,
  GetLeagueDetailRequest,
  GetLeaguesRequest,
  GetNewsRequest,
  GetPublicFixtureRequest,
  GetPublicFixtureWithLocationsRequest,
  GetPublicMatchAnalyticsRequest,
  GetPublicStandingsRequest,
  GetTeamProfileRequest,
} from "../application/public/requests/PublicRequests";

const publicMediator = buildPublicMediator(new PublicServiceAdapter());

export class PublicController {
  static getNews = async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const n = Number.isInteger(limit) && limit! > 0 ? limit! : 12;
    const data = await publicMediator.send(new GetNewsRequest(n));
    res.json(data);
  };

  static getLeagues = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50;
    const data = await publicMediator.send(new GetLeaguesRequest(page, pageSize));
    res.json(data);
  };

  static getLeagueDetail = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await publicMediator.send(new GetLeagueDetailRequest(leagueId));
    res.json(data);
  };

  static getStandings = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await publicMediator.send(new GetPublicStandingsRequest(leagueId));
    res.json(data);
  };

  static getFixture = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await publicMediator.send(new GetPublicFixtureRequest(leagueId));
    res.json(data);
  };

  static getFixtureWithLocations = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await publicMediator.send(
      new GetPublicFixtureWithLocationsRequest(leagueId)
    );
    res.json(data);
  };

  static getTeamProfile = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, teamId } = req.params;
    const data = await publicMediator.send(new GetTeamProfileRequest(leagueId, teamId));
    res.json(data);
  };

  static getMatchAnalytics = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await publicMediator.send(new GetPublicMatchAnalyticsRequest(matchId));
    res.json(data);
  };

  static getAdvancedAnalytics = async (req: Request, res: Response): Promise<void> => {
    const matchId = Number(req.params.matchId);
    const { TrackingAnalyticsService } = await import("../services/TrackingAnalyticsService.js");
    const data = await TrackingAnalyticsService.getOrCompute(matchId);
    res.json(data);
  };

  static getMatchPrediction = async (req: Request, res: Response): Promise<void> => {
    const matchId = Number(req.params.matchId);
    const { EloService } = await import("../services/EloService.js");
    const { DixonColesService } = await import("../services/DixonColesService.js");

    const [elo, poisson] = await Promise.all([
      EloService.predictMatch(matchId).catch(() => null),
      DixonColesService.predictMatch(matchId).catch(() => null),
    ]);

    res.json({ elo, poisson });
  };

  static exportFrames = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 1000;
    const data = await publicMediator.send(
      new ExportPublicFramesRequest(matchId, page, pageSize)
    );
    res.json(data);
  };
}
