import type { Request, Response } from "express";
import { buildLeagueMediator } from "../application/league/LeagueMediator";
import { LeagueServiceAdapter } from "../services/LeagueServiceAdapter";
import {
  AddTeamToLeagueRequest,
  CreateLeagueRequest,
  DeleteLeagueRequest,
  GenerateFixtureRequest,
  GetAllLeaguesRequest,
  GetFixtureWithLocationsRequest,
  GetLeagueByIdRequest,
  GetLeagueFixtureRequest,
  GetLeagueMatchesGroupedRequest,
  GetStandingsRequest,
  GetTeamsLeagueRequest,
  GetTrainerTeamsRequest,
  RemoveTeamFromLeagueRequest,
  RestructureLeagueFixtureRequest,
  UpdateLeagueLogoRequest,
  UpdateLeagueRequest,
} from "../application/league/requests/LeagueRequests";

const leagueMediator = buildLeagueMediator(new LeagueServiceAdapter());

/**
 * Handlers de ligas: extraen params/body y user, delegan al mediador y envían respuesta.
 */
export class LeagueController {
  static createLeague = async (req: Request, res: Response): Promise<void> => {
    const logoFile = req.file ?? null;
    const result = await leagueMediator.send(
      new CreateLeagueRequest(req.user!.id, {
        ...req.body,
        logoFile,
      })
    );
    res.send(result);
  };

  static getAllLeagues = async (req: Request, res: Response): Promise<void> => {
    const data = await leagueMediator.send(new GetAllLeaguesRequest(req.user!.id));
    res.json(data);
  };

  static getLeagueById = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await leagueMediator.send(
      new GetLeagueByIdRequest(leagueId, req.user!.id)
    );
    res.json(data);
  };

  static updateLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await leagueMediator.send(
      new UpdateLeagueRequest(leagueId, req.user!.id, req.body)
    );
    res.send(result);
  };

  static deleteLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await leagueMediator.send(
      new DeleteLeagueRequest(leagueId, req.user!.id)
    );
    res.send(result);
  };

  static getTrainerTeams = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const { email } = req.body;
    const data = await leagueMediator.send(
      new GetTrainerTeamsRequest(leagueId, req.user!.id, email)
    );
    res.json(data);
  };

  static addTeamToLeague = async (req: Request, res: Response): Promise<void> => {
    const { teamId } = req.body;
    const { leagueId } = req.params;
    const result = await leagueMediator.send(
      new AddTeamToLeagueRequest(leagueId, Number(teamId))
    );
    res.send(result);
  };

  static getTeamsLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await leagueMediator.send(
      new GetTeamsLeagueRequest(leagueId, req.user!.id)
    );
    res.json(data);
  };

  static removeTeamFromLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, teamId } = req.params;
    const result = await leagueMediator.send(
      new RemoveTeamFromLeagueRequest(leagueId, teamId, req.user!.id)
    );
    res.send(result);
  };

  static generateFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { type, scheduleStartDate, matchTime, daysBetweenRounds, matchDuration } = req.body;
    const data = await leagueMediator.send(
      new GenerateFixtureRequest(id, req.user!.id, type, {
        scheduleStartDate,
        matchTime,
        daysBetweenRounds,
        matchDuration,
      })
    );
    res.json(data);
  };

  static getLeagueFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(new GetLeagueFixtureRequest(id));
    res.json(data);
  };

  static getFixtureWithLocations = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(new GetFixtureWithLocationsRequest(id));
    res.json(data);
  };

  static getStandings = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(
      new GetStandingsRequest(id, req.user?.id, req.user?.role)
    );
    res.json(data);
  };

  static getLeagueMatches = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(
      new GetLeagueMatchesGroupedRequest(id, req.user?.id, req.user?.role)
    );
    res.json(data);
  };

  static restructureFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(
      new RestructureLeagueFixtureRequest(id, {
        actorUserId: req.user?.id ?? null,
        reason: req.body?.reason,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
      })
    );
    res.json(data);
  };

  static updateLeagueLogo = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const logoFile = req.file ?? null;
    if (!logoFile) {
      res.status(400).json({ error: "No se recibió ningún archivo" });
      return;
    }
    const data = await leagueMediator.send(
      new UpdateLeagueLogoRequest(leagueId, logoFile)
    );
    res.json(data);
  };
}
