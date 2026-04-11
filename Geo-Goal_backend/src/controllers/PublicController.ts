import type { Request, Response } from "express";
import { PublicService } from "../services/PublicService";

export class PublicController {
  static getNews = async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const data = await PublicService.getNews(Number.isInteger(limit) && limit! > 0 ? limit : 12);
    res.json(data);
  };

  static getLeagues = async (req: Request, res: Response): Promise<void> => {
    const data = await PublicService.getLeagues();
    res.json(data);
  };

  static getLeagueDetail = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await PublicService.getLeagueDetail(leagueId);
    res.json(data);
  };

  static getStandings = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await PublicService.getStandings(leagueId);
    res.json(data);
  };

  static getFixture = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await PublicService.getFixture(leagueId);
    res.json(data);
  };

  static getFixtureWithLocations = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await PublicService.getFixtureWithLocations(leagueId);
    res.json(data);
  };

  static getTeamProfile = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, teamId } = req.params;
    const data = await PublicService.getTeamProfile(leagueId, teamId);
    res.json(data);
  };
}
